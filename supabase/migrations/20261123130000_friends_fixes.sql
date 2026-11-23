-- ===========================================================================
-- Friends fixes (2026-11-23), on top of 20261123120000_friends.sql.
-- 1. A person who hasn't picked a username yet looks gone to everyone (their code opens as "not found", and they
--    are left out of lists and news), and gets no friend code until they pick one.
-- 2. Marking news as read only marks what the Notifications page has shown: notification_mark_read now takes the
--    newest shown news's time, so news that came after it stays unread.
-- ===========================================================================

-- True when the other person should look gone to the caller: no such profile, the system profile, no username
-- yet, an account being deleted, or a block either way.
create or replace function private.friend_hidden(p_caller uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profile p where p.id = p_other and not p.is_system and p.username is not null)
      or private.deletion_pending(p_other)
      or private.is_blocked_either_way(p_caller, p_other)
$$;

-- The small card the phone shows for a person: {"id","username","avatarKind","avatarSettings"}, or null for
-- someone with no username yet (every caller already leaves those people out).
create or replace function private.friend_person(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'username', p.username, 'avatarKind', p.avatar_kind,
                            'avatarSettings', p.avatar_settings)
    from public.profile p where p.id = p_id and p.username is not null
$$;

-- Looks up a code for the caller, as before, except the caller's own code also reads 'not_found' while they have
-- no username. Each not_found counts as a wrong guess; after 10 wrong guesses in 10 minutes every lookup answers
-- 'slow_down' until the oldest one is 10 minutes old.
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
  if person_id is null or private.friend_hidden(p_caller, person_id) then
    delete from private.friend_code_miss m where m.profile_id = p_caller and m.missed_at <= now() - interval '10 minutes';
    insert into private.friend_code_miss (profile_id) values (p_caller);
    status := 'not_found';
    person_id := null;
    return;
  end if;
  status := 'ok';
end $$;

revoke all on function private.friend_hidden(uuid, uuid), private.friend_person(uuid), private.friend_code_find(uuid, text)
  from public, anon, authenticated;

-- Refuses a caller who hasn't picked a username yet, so nobody shares a code that opens as "not found".
create or replace function private.friend_code_caller() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  if not exists (select 1 from public.profile p where p.id = v_caller and p.username is not null) then
    raise exception 'pick a username first' using errcode = '42501';
  end if;
  return v_caller;
end $$;
revoke all on function private.friend_code_caller() from public, anon, authenticated;

-- The caller's friend code, made the first time it is asked for. Refused until they have a username.
create or replace function public.friend_code_mine() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.friend_code_caller(); v_code text;
begin
  select c.code into v_code from private.friend_code c where c.profile_id = v_caller;
  if v_code is not null then return v_code; end if;
  return private.friend_code_save(v_caller, false);
end $$;

-- A new code for the caller. The old one stops working at once; current friends stay friends. Refused until they
-- have a username.
create or replace function public.friend_code_renew() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.friend_code_caller();
begin
  return private.friend_code_save(v_caller, true);
end $$;

-- Marks the caller's news read, up to and including the newest news the page showed (p_up_to, its createdAt).
-- News that came after it stays unread, so the bell's dot comes back for it.
drop function public.notification_mark_read();
create function public.notification_mark_read(p_up_to timestamptz) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  if p_up_to is null then raise exception 'say up to when' using errcode = '22004'; end if;
  update public.notification set read_at = now()
   where profile_id = v_caller and read_at is null and created_at <= p_up_to;
end $$;

revoke all on function public.friend_code_mine(), public.friend_code_renew(), public.notification_mark_read(timestamptz)
  from public, anon, authenticated;
grant execute on function public.friend_code_mine(), public.friend_code_renew(), public.notification_mark_read(timestamptz)
  to authenticated;
