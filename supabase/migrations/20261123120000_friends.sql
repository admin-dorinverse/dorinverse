-- ===========================================================================
-- Friends (owner, 2026-11-23). Every account has one friend code, shown as a QR code and a share link. Opening a
-- code shows that person; "Add friend" sends a request they approve or reject on the Notifications page. Approving
-- makes the two follow rows that public.follow and private.is_friend() already treat as a friendship.
--
-- The server decides everything; the phone only calls the functions at the end of this file. Players can no longer
-- add follow rows themselves, so a friendship only starts from an approved request. Blocks (either way) and
-- accounts being deleted make the other person look gone. Every new row goes away with its profile.
-- ===========================================================================

-- ---- Tables ----------------------------------------------------------------

-- One code per account, about 10 letters and digits. The unique rule is what makes two people never share one.
create table private.friend_code (
  profile_id uuid primary key references public.profile (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Za-z0-9]{10}$'),
  made_at    timestamptz not null default now()
);

-- One row for each wrong code someone tried; rows older than 10 minutes don't count and get cleared.
create table private.friend_code_miss (
  profile_id uuid not null references public.profile (id) on delete cascade,
  missed_at  timestamptz not null default now()
);
create index friend_code_miss_profile on private.friend_code_miss (profile_id, missed_at);

revoke all on private.friend_code, private.friend_code_miss from public, anon, authenticated;

-- A friend request from one person to another. It starts pending and is answered once, by the person it was sent to.
create table public.friend_request (
  id              uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profile (id) on delete cascade,
  to_profile_id   uuid not null references public.profile (id) on delete cascade,
  state           text not null default 'pending' check (state in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now(),
  answered_at     timestamptz,
  check (from_profile_id <> to_profile_id),
  check ((state = 'pending') = (answered_at is null))
);
comment on table public.friend_request is 'Written only by the friend functions. No player reads it directly, so a sender never sees a rejection.';

-- At most one pending request between two people, whichever way it goes.
create unique index friend_request_one_pending on public.friend_request
  (least(from_profile_id, to_profile_id), greatest(from_profile_id, to_profile_id)) where state = 'pending';
create index friend_request_from on public.friend_request (from_profile_id);
create index friend_request_to on public.friend_request (to_profile_id);

-- Something to tell a person about: someone asked to be their friend, or someone approved their request.
create table public.notification (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profile (id) on delete cascade,   -- who it is for
  kind            text not null check (kind in ('friend_request', 'friend_accepted')),
  from_profile_id uuid not null references public.profile (id) on delete cascade,   -- who it is about
  request_id      uuid references public.friend_request (id) on delete cascade,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index notification_profile on public.notification (profile_id, created_at desc);
create index notification_from on public.notification (from_profile_id);
create index notification_request on public.notification (request_id);

-- Requests: no direct access at all. Notifications: each person may read their own; only functions write.
alter table public.friend_request enable row level security;
alter table public.notification enable row level security;
create policy "notification: owner may read" on public.notification
  for select to authenticated using (profile_id = (select auth.uid()));
revoke all on public.friend_request, public.notification from anon, authenticated;
grant select on public.notification to authenticated;

-- ---- Follow rows only come from an approved request -------------------------
-- Nothing in the app or the functions added follow rows directly; this closes the old "anyone may follow" door.
drop policy "follow: follower may insert" on public.follow;
revoke insert on public.follow from authenticated;

-- ---- Accounts being deleted and blocks ---------------------------------------

-- A friend request or notification is refused when either person's account is being deleted.
create or replace function private.friend_refuse_if_deleting() returns trigger
language plpgsql set search_path = '' as $$
declare v_row jsonb := to_jsonb(new);
begin
  if private.deletion_pending((v_row ->> 'from_profile_id')::uuid)
     or private.deletion_pending(coalesce(v_row ->> 'to_profile_id', v_row ->> 'profile_id')::uuid) then
    raise exception 'account deletion is in progress' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.friend_refuse_if_deleting() from public, anon, authenticated;

create trigger friend_code_refuse_if_deleting      before insert or update on private.friend_code   for each row execute function private.refuse_if_deleting();
create trigger friend_code_miss_refuse_if_deleting before insert on private.friend_code_miss         for each row execute function private.refuse_if_deleting();
create trigger friend_request_refuse_if_deleting   before insert on public.friend_request            for each row execute function private.friend_refuse_if_deleting();
create trigger notification_refuse_if_deleting     before insert on public.notification              for each row execute function private.friend_refuse_if_deleting();

-- A new block closes any pending request between the two people, so nothing is waiting if they unblock later.
create or replace function private.friend_block_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.friend_request set state = 'rejected', answered_at = now()
   where state = 'pending'
     and ((from_profile_id = new.blocker_id and to_profile_id = new.blocked_id)
       or (from_profile_id = new.blocked_id and to_profile_id = new.blocker_id));
  return new;
end $$;
revoke all on function private.friend_block_after_insert() from public, anon, authenticated;
create trigger friend_block_after_insert after insert on public.block
  for each row execute function private.friend_block_after_insert();

-- ---- Helpers (private) --------------------------------------------------------

-- True when the other person should look gone to the caller: no such profile, the system profile, an account
-- being deleted, or a block either way.
create or replace function private.friend_hidden(p_caller uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profile p where p.id = p_other and not p.is_system)
      or private.deletion_pending(p_other)
      or private.is_blocked_either_way(p_caller, p_other)
$$;

-- The small card the phone shows for a person: {"id","username","avatarKind","avatarSettings"}.
create or replace function private.friend_person(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'username', p.username, 'avatarKind', p.avatar_kind,
                            'avatarSettings', p.avatar_settings)
    from public.profile p where p.id = p_id
$$;

-- A new random code: 10 characters from A-Z, a-z and 0-9. Bytes of 248 and up are skipped so every character
-- is equally likely.
create or replace function private.friend_code_make() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_code  text := '';
  v_bytes bytea;
  v_byte  integer;
begin
  while length(v_code) < 10 loop
    v_bytes := extensions.gen_random_bytes(16);
    for i in 0..15 loop
      v_byte := get_byte(v_bytes, i);
      if v_byte < 248 and length(v_code) < 10 then
        v_code := v_code || substr(v_chars, v_byte % 62 + 1, 1);
      end if;
    end loop;
  end loop;
  return v_code;
end $$;

-- Saves a fresh code for a person and returns their code. With p_replace false it keeps a code they already
-- have (so two calls at once agree); with true it swaps it. A clash with someone else's code just tries again.
create or replace function private.friend_code_save(p_profile_id uuid, p_replace boolean) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_code text;
begin
  for attempt in 1..5 loop
    begin
      if p_replace then
        insert into private.friend_code (profile_id, code) values (p_profile_id, private.friend_code_make())
        on conflict (profile_id) do update set code = excluded.code, made_at = now();
      else
        insert into private.friend_code (profile_id, code) values (p_profile_id, private.friend_code_make())
        on conflict (profile_id) do nothing;
      end if;
      select c.code into v_code from private.friend_code c where c.profile_id = p_profile_id;
      return v_code;
    exception when unique_violation then
      null;   -- someone else holds that code; make another
    end;
  end loop;
  raise exception 'could not make a friend code' using errcode = 'P0001';
end $$;

-- Looks up a code for the caller. status is 'ok' (with person_id), 'not_found' (no such code, or that person is
-- hidden from the caller) or 'slow_down'. Each not_found counts as a wrong guess; after 10 wrong guesses in
-- 10 minutes every lookup answers 'slow_down' until the oldest one is 10 minutes old.
create or replace function private.friend_code_find(p_caller uuid, p_code text, out status text, out person_id uuid)
language plpgsql volatile security definer set search_path = '' as $$
begin
  -- one lookup at a time per caller, so many guesses sent at once can't slip past the count
  perform pg_advisory_xact_lock(hashtextextended('friend_code_miss:' || p_caller::text, 0));
  if (select count(*) from private.friend_code_miss m
       where m.profile_id = p_caller and m.missed_at > now() - interval '10 minutes') >= 10 then
    status := 'slow_down';
    return;
  end if;
  select c.profile_id into person_id from private.friend_code c where c.code = p_code;
  if person_id is null or (person_id <> p_caller and private.friend_hidden(p_caller, person_id)) then
    delete from private.friend_code_miss m where m.profile_id = p_caller and m.missed_at <= now() - interval '10 minutes';
    insert into private.friend_code_miss (profile_id) values (p_caller);
    status := 'not_found';
    person_id := null;
    return;
  end if;
  status := 'ok';
end $$;

-- How the caller and another person stand: 'self', 'friends', 'received' (they asked the caller), 'sent' (the
-- caller asked them) or 'none', with the request's id for 'received' and 'sent'. A request they rejected in the
-- last 30 days still reads 'sent' to the caller, so a rejection is never shown and can't be re-sent over and over.
create or replace function private.friend_relation(p_caller uuid, p_other uuid, out relation text, out request_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_caller = p_other then relation := 'self'; return; end if;
  if private.is_friend(p_caller, p_other) then relation := 'friends'; return; end if;
  select r.id into request_id from public.friend_request r
   where r.from_profile_id = p_other and r.to_profile_id = p_caller and r.state = 'pending';
  if request_id is not null then relation := 'received'; return; end if;
  select r.id into request_id from public.friend_request r
   where r.from_profile_id = p_caller and r.to_profile_id = p_other
     and (r.state = 'pending' or (r.state = 'rejected' and r.answered_at > now() - interval '30 days'))
   order by r.created_at desc limit 1;
  if request_id is not null then relation := 'sent'; return; end if;
  relation := 'none';
end $$;

revoke all on function private.friend_hidden(uuid, uuid), private.friend_person(uuid), private.friend_code_make(),
  private.friend_code_save(uuid, boolean), private.friend_code_find(uuid, text), private.friend_relation(uuid, uuid)
  from public, anon, authenticated;

-- ---- Player functions ---------------------------------------------------------
-- Each one refuses a signed-out caller and an account being deleted (private.caller()).

-- The caller's friend code, made the first time it is asked for.
create or replace function public.friend_code_mine() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_code text;
begin
  select c.code into v_code from private.friend_code c where c.profile_id = v_caller;
  if v_code is not null then return v_code; end if;
  return private.friend_code_save(v_caller, false);
end $$;

-- A new code for the caller. The old one stops working at once; current friends stay friends.
create or replace function public.friend_code_renew() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  return private.friend_code_save(v_caller, true);
end $$;

-- What opening a code shows: {"status":"ok","person","relation","requestId"}, {"status":"not_found"} or
-- {"status":"slow_down"}. Only the person's card is shared until they are friends.
create or replace function public.friend_code_open(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_find record; v_rel record;
begin
  select * into v_find from private.friend_code_find(v_caller, p_code);
  if v_find.status <> 'ok' then return jsonb_build_object('status', v_find.status); end if;
  select * into v_rel from private.friend_relation(v_caller, v_find.person_id);
  return jsonb_build_object('status', 'ok', 'person', private.friend_person(v_find.person_id),
                            'relation', v_rel.relation, 'requestId', v_rel.request_id);
end $$;

-- Asks the code's owner to be friends: 'sent', 'already_sent', 'already_friends', 'they_asked_you', 'self',
-- 'not_found' or 'slow_down'. 'sent' makes a pending request and tells the other person.
create or replace function public.friend_request_send(p_code text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_find record; v_rel record; v_request_id uuid;
begin
  select * into v_find from private.friend_code_find(v_caller, p_code);
  if v_find.status <> 'ok' then return v_find.status; end if;
  select * into v_rel from private.friend_relation(v_caller, v_find.person_id);
  case v_rel.relation
    when 'self'     then return 'self';
    when 'friends'  then return 'already_friends';
    when 'received' then return 'they_asked_you';
    when 'sent'     then return 'already_sent';
    else null;
  end case;
  begin
    insert into public.friend_request (from_profile_id, to_profile_id) values (v_caller, v_find.person_id)
    returning id into v_request_id;
  exception when unique_violation then
    -- the two people asked each other at the same moment; the other request got there first
    select * into v_rel from private.friend_relation(v_caller, v_find.person_id);
    return case when v_rel.relation = 'received' then 'they_asked_you' else 'already_sent' end;
  end;
  insert into public.notification (profile_id, kind, from_profile_id, request_id)
  values (v_find.person_id, 'friend_request', v_caller, v_request_id);
  return 'sent';
end $$;

-- Answers a request sent to the caller: 'approved', 'rejected' or 'gone' (not theirs, already answered, or the
-- sender is now hidden). Approving makes the friendship and tells the sender; rejecting tells no one.
create or replace function public.friend_request_answer(p_request_id uuid, p_approve boolean) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_from uuid;
begin
  if p_approve is null then raise exception 'say yes or no' using errcode = '22004'; end if;
  select r.from_profile_id into v_from from public.friend_request r
   where r.id = p_request_id and r.to_profile_id = v_caller and r.state = 'pending'
   for update;
  if v_from is null or private.friend_hidden(v_caller, v_from) then return 'gone'; end if;
  update public.friend_request set state = case when p_approve then 'approved' else 'rejected' end, answered_at = now()
   where id = p_request_id;
  if not p_approve then return 'rejected'; end if;
  insert into public.follow (follower_id, followed_id) values (v_caller, v_from), (v_from, v_caller)
  on conflict do nothing;
  insert into public.notification (profile_id, kind, from_profile_id, request_id)
  values (v_from, 'friend_accepted', v_caller, p_request_id);
  return 'approved';
end $$;

-- The caller's friends, newest friendship first: each person's card plus "friendsSince".
create or replace function public.friend_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  return (
    select coalesce(jsonb_agg(private.friend_person(mine.followed_id)
                              || jsonb_build_object('friendsSince', greatest(mine.since, theirs.since))
                              order by greatest(mine.since, theirs.since) desc), '[]'::jsonb)
      from public.follow mine
      join public.follow theirs on theirs.follower_id = mine.followed_id and theirs.followed_id = mine.follower_id
     where mine.follower_id = v_caller and not private.friend_hidden(v_caller, mine.followed_id));
end $$;

-- Ends a friendship from the caller's side: both follow rows go. The other person is not told.
create or replace function public.friend_remove(p_friend_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  delete from public.follow
   where (follower_id = v_caller and followed_id = p_friend_id)
      or (follower_id = p_friend_id and followed_id = v_caller);
end $$;

-- The caller's last 100 notifications, newest first, each with who it is from and where its request stands.
-- Notifications from people now hidden from the caller are left out.
create or replace function public.notification_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  return (
    select coalesce(jsonb_agg(x.item order by x.created_at desc), '[]'::jsonb)
      from (select n.created_at,
                   jsonb_build_object('id', n.id, 'kind', n.kind, 'from', private.friend_person(n.from_profile_id),
                                      'requestId', n.request_id, 'requestState', r.state,
                                      'createdAt', n.created_at, 'read', n.read_at is not null) as item
              from public.notification n
              left join public.friend_request r on r.id = n.request_id
             where n.profile_id = v_caller and not private.friend_hidden(v_caller, n.from_profile_id)
             order by n.created_at desc
             limit 100) x);
end $$;

-- How many of the notifications notification_list() shows are not read yet.
create or replace function public.notification_unread_count() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  return (
    select count(*) filter (where x.read_at is null)::integer
      from (select n.read_at from public.notification n
             where n.profile_id = v_caller and not private.friend_hidden(v_caller, n.from_profile_id)
             order by n.created_at desc
             limit 100) x);
end $$;

-- Marks all of the caller's notifications read.
create or replace function public.notification_mark_read() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  update public.notification set read_at = now() where profile_id = v_caller and read_at is null;
end $$;

-- A friend's universe: {"status":"ok","person","joinedAt","streak","bestStreak","friendCount"}, or
-- {"status":"not_friends"} for anyone who isn't the caller's friend. The streak reads 0 once a whole bake day
-- (Chicago time) was missed, the same rule the next finished lesson uses to start it again.
create or replace function public.friend_universe(p_friend_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_today date := private.chicago_today();
begin
  if p_friend_id is null or not private.is_friend(v_caller, p_friend_id) or private.friend_hidden(v_caller, p_friend_id) then
    return jsonb_build_object('status', 'not_friends');
  end if;
  return (
    select jsonb_build_object(
             'status', 'ok',
             'person', private.friend_person(p.id),
             'joinedAt', p.joined_at,
             'streak', case when s.last_active_day >= v_today - 1 then s.current_streak else 0 end,
             'bestStreak', coalesce(s.best_streak, 0),
             'friendCount', (select count(*)::integer
                               from public.follow theirs
                               join public.follow back
                                 on back.follower_id = theirs.followed_id and back.followed_id = theirs.follower_id
                              where theirs.follower_id = p.id and not private.friend_hidden(p.id, theirs.followed_id)))
      from public.profile p
      left join public.day_streak s on s.profile_id = p.id
     where p.id = p_friend_id);
end $$;

revoke all on function
  public.friend_code_mine(), public.friend_code_renew(), public.friend_code_open(text), public.friend_request_send(text),
  public.friend_request_answer(uuid, boolean), public.friend_list(), public.friend_remove(uuid),
  public.notification_list(), public.notification_unread_count(), public.notification_mark_read(),
  public.friend_universe(uuid)
  from public, anon, authenticated;
grant execute on function
  public.friend_code_mine(), public.friend_code_renew(), public.friend_code_open(text), public.friend_request_send(text),
  public.friend_request_answer(uuid, boolean), public.friend_list(), public.friend_remove(uuid),
  public.notification_list(), public.notification_unread_count(), public.notification_mark_read(),
  public.friend_universe(uuid)
  to authenticated;
