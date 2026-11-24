-- ===========================================================================
-- Friend request phone notifications (owner, 2026-11-23). When a friend request comes in, the person it was sent
-- to gets "<username> wants to be friends" on every phone they signed in on. Nothing else sends one.
--
-- The phones save their Expo push tokens in public.push_token (initial schema) with register_push_token(), and
-- remove them on sign-out; deleting the account removes them with the profile. The send happens here, on the
-- server, through Expo's free push service. pg_net sends it only after the request is saved, and never holds it up.
-- ===========================================================================

-- pg_net lets the database make a web request in the background, after the change that asked for it is saved.
create extension if not exists pg_net with schema extensions;

-- Sends the phone notification for one new friend-request notification row. It runs once per row and only for
-- 'friend_request' (see the trigger), to the receiver's own phones. Any trouble is only a warning, so a push
-- problem can never stop a friend request.
create or replace function private.friend_request_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text; v_messages jsonb;
begin
  select p.username into v_username from public.profile p where p.id = new.from_profile_id;
  -- One message per phone; Android shows it in the app's "friends" channel and tapping it opens Notifications.
  select jsonb_agg(jsonb_build_object(
           'to', t.device_token,
           'title', 'Friend request',
           'body', v_username || ' wants to be friends',
           'data', jsonb_build_object('url', '/notifications'),
           'channelId', 'friends',
           'sound', 'default',
           'priority', 'high'))
    into v_messages
    from (select pt.device_token from public.push_token pt
           where pt.profile_id = new.profile_id and pt.platform in ('android', 'ios')
           order by pt.updated_at desc limit 20) t;
  if v_username is null or v_messages is null then return new; end if;
  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_messages,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'));
  return new;
exception when others then
  raise warning 'friend request push not sent: %', sqlerrm;
  return new;
end $$;
revoke all on function private.friend_request_push() from public, anon, authenticated;

-- Only new friend requests send a phone notification; "said yes" and anything else stay in the app.
create trigger notification_friend_request_push after insert on public.notification
  for each row when (new.kind = 'friend_request') execute function private.friend_request_push();
