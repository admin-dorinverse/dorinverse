// Shared helpers for the Dorin TV scripts. The key comes from .env.local (git-ignored)
// and is only ever used here, on the owner's computer — never in the app.
import fs from 'node:fs';
import path from 'node:path';

export const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const CHANNEL_ID = 'UCVfwlh9XpX2Y_tQfjeln9QA';   // BibleProject

const env = fs.readFileSync(path.join(DIR, '../../.env.local'), 'utf8');
const KEY = env.match(/^YOUTUBE_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!KEY) throw new Error('YOUTUBE_API_KEY missing from .env.local');

export async function youtube(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) if (v != null) url.searchParams.set(k, v);
  const body = await (await fetch(url)).json();
  if (body.error) throw new Error(`YouTube ${endpoint}: ${body.error.code} ${body.error.message}`);
  return body;
}

// Every page of a paged list endpoint.
export async function youtubeAll(endpoint, params) {
  const items = [];
  let pageToken;
  do {
    const page = await youtube(endpoint, { ...params, maxResults: 50, pageToken });
    items.push(...page.items);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

export const readJson = (name, fallback) =>
  fs.existsSync(path.join(DIR, name)) ? JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8')) : fallback;
export const writeJson = (name, data) => fs.writeFileSync(path.join(DIR, name), JSON.stringify(data, null, 2) + '\n');

// ISO 8601 duration (PT1H2M3S) to seconds.
export function seconds(iso) {
  const [, h = 0, m = 0, s = 0] = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return +h * 3600 + +m * 60 + +s;
}
