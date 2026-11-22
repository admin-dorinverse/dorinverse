-- ===========================================================================
-- Usernames (owner, 2026-11-22). Every account picks one unique username, shown to other people on family voice
-- calls. It goes on the existing public.profile row that sign-up already makes (empty until picked). Names are
-- stored as typed and compared without case. The server decides whether a name is allowed; the phone only asks.
--
-- The username changes only through public.set_username(): the old "owner may update own" rule still lets a
-- player change other columns of their row, so private.profile_protect() now refuses a direct username change.
-- display_name and the rest of the old design are left as they are.
-- ===========================================================================

alter table public.profile add column username text;
comment on column public.profile.username is 'Picked by the player through set_username(); empty until then. Unique without case.';

-- Two people can't hold the same name in any mix of capitals. This index is also what stops two people grabbing
-- one name at the same moment.
create unique index profile_username_lower on public.profile (lower(username)) where username is not null;

-- Profile: protected columns, as before, plus username (only set_username(), which runs as postgres, changes it)
create or replace function private.profile_protect() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'postgres' then return new; end if;
  if old.is_system then
    raise exception 'the system profile cannot be changed' using errcode = '42501';
  end if;
  if new.id <> old.id or new.is_system <> old.is_system or new.joined_at <> old.joined_at
     or new.username is distinct from old.username then
    raise exception 'protected column' using errcode = '42501';
  end if;
  return new;
end $$;

-- Names nobody may pick: staff-like names, the app's own names, and the Bible guests the app plays.
-- Matched as the whole name, ignoring capitals and underscores (so "Papa_Dorin" and "PAPADORIN" both match).
create table private.reserved_username (
  name text primary key check (name = lower(name) and name !~ '_')
);
insert into private.reserved_username (name) values
  ('admin'), ('administrator'), ('support'), ('moderator'), ('mod'), ('staff'), ('official'), ('team'),
  ('dorinverse'), ('papadorin'), ('dorin'), ('system'), ('root'), ('null'), ('undefined'), ('help'),
  ('deletedplayer'), ('guest'), ('host'),
  ('peter'), ('jesus'), ('christ'), ('jesuschrist'), ('god'), ('moses'), ('paul');

-- Words a name may not contain. "anywhere" words are matched inside the name (after the clean-up in
-- private.username_problem); "whole" words are short ones that sit inside common words ("class", "therapist",
-- "Scunthorpe"), so they only count as a whole piece of the name, between underscores or digits.
create table private.blocked_username_word (
  word  text primary key check (word = lower(word) and word ~ '^[a-z]+$'),
  match text not null check (match in ('anywhere', 'whole'))
);
insert into private.blocked_username_word (word, match) values
  ('fuck', 'anywhere'), ('shit', 'anywhere'), ('bitch', 'anywhere'), ('nigger', 'anywhere'), ('nigga', 'anywhere'),
  ('faggot', 'anywhere'), ('whore', 'anywhere'), ('slut', 'anywhere'), ('penis', 'anywhere'), ('vagina', 'anywhere'),
  ('porn', 'anywhere'), ('dildo', 'anywhere'), ('bastard', 'anywhere'), ('wanker', 'anywhere'), ('asshole', 'anywhere'),
  ('pussy', 'anywhere'), ('hitler', 'anywhere'), ('jizz', 'anywhere'), ('hentai', 'anywhere'),
  ('molest', 'anywhere'), ('pedophil', 'anywhere'),
  ('ass', 'whole'), ('arse', 'whole'), ('cunt', 'whole'), ('cock', 'whole'), ('dick', 'whole'), ('fag', 'whole'),
  ('rape', 'whole'), ('rapist', 'whole'), ('cum', 'whole'), ('sex', 'whole'), ('sexy', 'whole'), ('tits', 'whole'),
  ('twat', 'whole'), ('anal', 'whole'), ('prick', 'whole'), ('horny', 'whole'), ('retard', 'whole'),
  ('retarded', 'whole'), ('pedo', 'whole'), ('kkk', 'whole'), ('milf', 'whole'),
  ('nazi', 'whole'), ('nazis', 'whole'), ('boob', 'whole'), ('boobs', 'whole');

revoke all on private.reserved_username, private.blocked_username_word from public, anon, authenticated;

-- What's wrong with a name on its own, before looking at who holds it: 'ok', 'invalid' or 'not_allowed'.
-- Digits used as letters (0 o, 1 i, 3 e, 4 a, 5 s) count as those letters when looking for blocked words.
create or replace function private.username_problem(p_username text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_plain text := replace(lower(p_username), '_', '');                -- lowercase, no underscores
  v_leet  text := translate(lower(p_username), '01345', 'oieas');     -- lowercase, digits read as letters
begin
  if p_username is null or p_username !~ '^[A-Za-z][A-Za-z0-9_]{2,19}$' then return 'invalid'; end if;
  if exists (select 1 from private.reserved_username r where r.name in (v_plain, replace(v_leet, '_', ''))) then
    return 'not_allowed';
  end if;
  if exists (select 1 from private.blocked_username_word w
             where (w.match = 'anywhere' and position(w.word in regexp_replace(v_leet, '[^a-z]', '', 'g')) > 0)
                or (w.match = 'whole' and w.word = any (regexp_split_to_array(v_leet, '[^a-z]+')))) then
    return 'not_allowed';
  end if;
  return 'ok';
end $$;
revoke all on function private.username_problem(text) from public, anon, authenticated;

-- Checks a name for the signed-in player: 'ok', 'taken', 'invalid' or 'not_allowed'. Their own current name
-- (in any capitals) is 'ok'. It only answers; set_username() makes the change.
create or replace function public.username_check(p_username text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_problem text;
begin
  if (select auth.uid()) is null then raise exception 'sign in' using errcode = '42501'; end if;
  v_problem := private.username_problem(p_username);
  if v_problem <> 'ok' then return v_problem; end if;
  if exists (select 1 from public.profile p
             where lower(p.username) = lower(p_username) and p.id <> (select auth.uid())) then
    return 'taken';
  end if;
  return 'ok';
end $$;

-- Gives the signed-in player this name, with the same checks and answers as username_check(). It changes the
-- profile row sign-up made and never makes one. When two people ask for one name at the same moment, the unique
-- index lets one through and the other gets 'taken'.
create or replace function public.set_username(p_username text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare v_caller uuid := (select auth.uid()); v_answer text;
begin
  if v_caller is null then raise exception 'sign in' using errcode = '42501'; end if;
  v_answer := public.username_check(p_username);
  if v_answer <> 'ok' then return v_answer; end if;
  update public.profile set username = p_username where id = v_caller and not is_system;
  if not found then raise exception 'no profile for this account' using errcode = 'P0002'; end if;
  return 'ok';
exception when unique_violation then
  return 'taken';
end $$;

revoke all on function public.username_check(text), public.set_username(text) from public, anon, authenticated;
grant execute on function public.username_check(text), public.set_username(text) to authenticated;
