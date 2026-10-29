// Step 1: list every BibleProject playlist so the owner can pick which ones stay.
//
//   node scripts/tv/list-playlists.mjs      → scripts/tv/playlists.json
//
// The owner's picks live in allowed-playlists.json.
import { CHANNEL_ID, youtubeAll, writeJson } from './lib.mjs';

const playlists = await youtubeAll('playlists', { part: 'snippet,contentDetails', channelId: CHANNEL_ID });
writeJson('playlists.json', playlists.map((p) => ({ id: p.id, title: p.snippet.title, videos: p.contentDetails.itemCount })));
for (const p of playlists) console.log(`${String(p.contentDetails.itemCount).padStart(3)}  ${p.snippet.title}`);
console.log(`${playlists.length} playlists`);
