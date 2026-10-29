// Step 2: pull every video from the owner's chosen playlists and drop the ones that
// can't air (Shorts, live, private, not embeddable, owner-blocked).
//
//   node scripts/tv/fetch-videos.mjs      → candidates.json, review.md
//
// A video in several playlists takes its series from the smallest one, which is the
// most specific (Torah Series over Old Testament).
import fs from 'node:fs';
import path from 'node:path';
import { DIR, youtube, youtubeAll, readJson, writeJson, seconds } from './lib.mjs';

const MIN_SECONDS = 180;   // Shorts and teasers are under 3 minutes

const allowed = readJson('allowed-playlists.json');
const blocklist = new Set(readJson('blocklist.json', []).map((b) => b.id ?? b));

const found = new Map();   // video id → { playlists: [{ id, title, size, position }] }
for (const pl of allowed) {
  const items = await youtubeAll('playlistItems', { part: 'snippet', playlistId: pl.id });
  items.forEach((it, position) => {
    const id = it.snippet.resourceId.videoId;
    if (!found.has(id)) found.set(id, { playlists: [] });
    found.get(id).playlists.push({ id: pl.id, title: pl.title, size: items.length, position });
  });
}

const ids = [...found.keys()];
const details = new Map();
for (let i = 0; i < ids.length; i += 50) {
  const page = await youtube('videos', { part: 'snippet,contentDetails,status', id: ids.slice(i, i + 50).join(',') });
  for (const v of page.items) details.set(v.id, v);
}

const kept = [], dropped = [];
for (const [id, { playlists }] of found) {
  const v = details.get(id);
  const home = playlists.toSorted((a, b) => a.size - b.size)[0];
  const row = {
    id,
    title: v?.snippet.title ?? '(unavailable)',
    series: home.title,
    playlistId: home.id,
    position: home.position,
    seconds: v ? seconds(v.contentDetails.duration) : 0,
    thumbnail: v && (v.snippet.thumbnails.maxres ?? v.snippet.thumbnails.high ?? v.snippet.thumbnails.default).url,
    alsoIn: playlists.filter((p) => p !== home).map((p) => p.title),
  };
  const reason =
    !v ? 'deleted or private'
    : v.status.privacyStatus !== 'public' ? v.status.privacyStatus
    : !v.status.embeddable ? 'not embeddable'
    : v.snippet.liveBroadcastContent !== 'none' ? 'live or upcoming'
    : row.seconds < MIN_SECONDS ? 'under 3 minutes'
    : blocklist.has(id) ? 'blocked by owner'
    : null;
  (reason ? dropped : kept).push(reason ? { ...row, reason } : row);
}

const bySeries = Object.groupBy(kept.toSorted((a, b) => a.position - b.position), (r) => r.series);
writeJson('candidates.json', { fetchedAt: new Date().toISOString(), kept, dropped });

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const hours = (kept.reduce((n, r) => n + r.seconds, 0) / 3600).toFixed(1);
let md = `# Dorin TV — videos to review\n\n${kept.length} videos, ${hours} hours. ${dropped.length} dropped automatically (listed at the end).\n`;
for (const pl of allowed) {
  const rows = bySeries[pl.title];
  if (!rows) continue;
  md += `\n## ${pl.title} (${rows.length})\n\n`;
  for (const r of rows) md += `- [ ] ${r.title} — ${mmss(r.seconds)} — https://youtu.be/${r.id}\n`;
}
md += `\n## Dropped automatically\n\n`;
for (const r of dropped) md += `- ${r.title} — ${mmss(r.seconds)} — ${r.reason}\n`;
fs.writeFileSync(path.join(DIR, 'review.md'), md);

console.log(`kept ${kept.length} (${hours} h), dropped ${dropped.length}`);
for (const pl of allowed) console.log(`${String(bySeries[pl.title]?.length ?? 0).padStart(3)}  ${pl.title}`);
