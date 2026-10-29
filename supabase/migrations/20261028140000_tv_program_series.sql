-- Dorin TV: each program's BibleProject series (for the guide) and, for two-part videos, the
-- pair it belongs to so Part 1 always airs right before Part 2. Filled by scripts/tv/load.mjs.
alter table public.tv_program
  add column series              text,
  add column youtube_playlist_id text,
  add column part_group          text,
  add column part_number         integer check (part_number > 0),
  add constraint tv_program_part_pair check ((part_group is null) = (part_number is null));
comment on column public.tv_program.series is 'BibleProject playlist the video airs under (the most specific one it is in).';
comment on column public.tv_program.part_group is 'Shared by the parts of one multi-part video; they air together in part_number order. Null: stands alone.';

-- The channel runs back to back around the clock: every allowed program once per lap, laps
-- repeating. Each lap is a fresh shuffle of single videos and part groups, keyed on the lap's
-- start time so a rebuild gives the same order; a lap never opens with what just aired. Slots
-- are whole minutes in absolute time, so daylight saving never gaps or overlaps them.
-- Written slots are never moved (reminders hang off them); laps are added from the last end.
comment on table public.tv_schedule is 'Materialised slots written by materialise_tv_schedule() (R14). Never edited by hand.';
comment on table public.tv_pattern is 'Unused: the schedule is built from tv_program by materialise_tv_schedule().';

create or replace function public.materialise_tv_schedule() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_at timestamptz; v_key text; v_last text; v_units integer; v_minutes integer; p record; n integer := 0;
begin
  -- showings that ended over a week ago are cleared (their reminders cascade); the table stays ~3 weeks
  delete from public.tv_schedule where end_at < now() - interval '7 days';
  select count(distinct coalesce(part_group, id::text)) into v_units
    from public.tv_program where allowed and available and duration_seconds is not null;
  if v_units = 0 then
    return 0;
  end if;
  select max(end_at) into v_at from public.tv_schedule;
  if v_at is null or v_at < now() then
    v_at := date_trunc('minute', now()) + interval '1 minute';
  end if;
  while v_at < now() + interval '14 days' loop
    select coalesce(t.part_group, t.id::text) into v_last
      from public.tv_schedule s join public.tv_program t on t.id = s.program_id
     order by s.start_at desc limit 1;
    v_key := v_at::text;
    while v_units > 1 and v_last = (select coalesce(part_group, id::text) from public.tv_program
                                     where allowed and available and duration_seconds is not null
                                     order by md5(v_key || coalesce(part_group, id::text)) limit 1) loop
      v_key := v_key || '+';
    end loop;
    for p in select id, duration_seconds from public.tv_program
              where allowed and available and duration_seconds is not null
              order by md5(v_key || coalesce(part_group, id::text)), part_number loop
      v_minutes := ceil(p.duration_seconds / 60.0)::integer;
      insert into public.tv_schedule (program_id, start_at, end_at)
      values (p.id, v_at, v_at + make_interval(mins => v_minutes));
      v_at := v_at + make_interval(mins => v_minutes);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;

-- Daily: clear last week's showings and keep tv_schedule 14 days ahead. Scheduling the same job name again replaces it.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('materialise-tv-schedule', '15 5 * * *', 'select public.materialise_tv_schedule()');
