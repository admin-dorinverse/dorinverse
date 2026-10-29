// Step 5: load the approved videos into tv_program and fill tv_schedule.
//
//   node scripts/tv/load.mjs      → scripts/tv/.cache/tv-load.sql
//   npx supabase db query --linked -f scripts/tv/.cache/tv-load.sql
//
// Programs no longer in the list are retired (allowed = false), never deleted. Slots not yet
// started are cleared so the new list takes over right after the show that is on now;
// materialise_tv_schedule() then lays laps back to back, each freshly shuffled.
import fs from 'node:fs';
import path from 'node:path';
import { DIR, readJson } from './lib.mjs';

const { kept } = readJson('candidates.json');
const q = (s) => (s == null ? 'null' : `'${String(s).replaceAll("'", "''")}'`);

// "… (Part 1)", "… • Part 2 • …", "… - Part 1": parts of one video share a group and air together.
const part = (v) => {
  const m = v.title.match(/^(.*?)\s*(?:\(|•|-)\s*Part\s+(\d+)\b/i);
  return m ? { group: `${v.series} / ${m[1]}`, number: +m[2] } : { group: null, number: null };
};

const programs = kept.map((v) => {
  const { group, number } = part(v);
  return `(${q(v.id)}, ${q(v.title)}, ${v.seconds}, ${q(v.thumbnail)}, ${q(v.series)}, ${q(v.playlistId)}, ${q(group)}, ${number ?? 'null'}, true)`;
});
const groups = Object.groupBy(kept.filter((v) => part(v).group), (v) => part(v).group);

const out = `-- Written by scripts/tv/load.mjs. Do not edit; re-run the script.
begin;

insert into public.tv_program
  (youtube_video_id, title, duration_seconds, thumbnail_url, series, youtube_playlist_id, part_group, part_number, allowed)
values
  ${programs.join(',\n  ')}
on conflict (youtube_video_id) do update set
  title = excluded.title, duration_seconds = excluded.duration_seconds, thumbnail_url = excluded.thumbnail_url,
  series = excluded.series, youtube_playlist_id = excluded.youtube_playlist_id,
  part_group = excluded.part_group, part_number = excluded.part_number,
  embeddable = true, available = true, allowed = true, fetched_at = now(), last_checked_at = now();

update public.tv_program set allowed = false
 where youtube_video_id not in (${kept.map((v) => q(v.id)).join(', ')});

delete from public.tv_schedule where start_at > now();
select public.materialise_tv_schedule();

do $$ begin
  if (select count(*) from public.tv_program where allowed) <> ${kept.length} then
    raise exception 'expected ${kept.length} allowed programs';
  end if;
  if (select max(end_at) from public.tv_schedule) < now() + interval '14 days' then
    raise exception 'the schedule does not reach 14 days ahead';
  end if;
end $$;
commit;
`;

fs.mkdirSync(path.join(DIR, '.cache'), { recursive: true });
const file = path.join(DIR, '.cache', 'tv-load.sql');
fs.writeFileSync(file, out);
console.log(`wrote ${file}: ${kept.length} programs, ${Object.keys(groups).length} part groups`);
