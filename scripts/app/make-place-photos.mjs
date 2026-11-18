// Makes the small WebP copies of the place photos the app shows, and (with --upload) puts them in live storage.
// Each original JPEG in the public "place-images" bucket becomes two copies: a round-thumbnail square for grid cells
// ("small/<lookup>.webp", 160 px) and a page-header size ("header/<lookup>.webp", 900 px wide, at most 60 KB).
// Run from the repo root: node scripts/app/make-place-photos.mjs [--upload]
// It reads the database with the public key from .env.local. The copies are written to a temp folder, never into
// git. Uploading uses the Supabase CLI already linked on this PC, so no secret key is read or printed here.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/** Loads sharp from the repo if it is installed there, else from the PC's shared tool folder. */
async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    return createRequire('C:/Users/cassa/pwtool/package.json')('sharp');
  }
}

/** The bucket the photos live in. */
const BUCKET = 'place-images';

/** Thumbnail side, header width and height limit, and the most a header copy may weigh. */
const SMALL_SIDE = 160;
const HEADER_WIDTH = 900;
const HEADER_MAX_HEIGHT = 600;
const HEADER_MAX_BYTES = 60 * 1024;

/** How many originals are downloaded and made at once. */
const AT_ONCE = 3;

/** The temp folder the copies are written to. */
const OUT = join(tmpdir(), 'dorinverse-place-photos');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const database = createClient(url, env.EXPO_PUBLIC_SUPABASE_KEY);
const sharp = await loadSharp();

/** Makes the header copy, lowering the quality (then the size) until it fits the size limit. */
async function headerCopy(original) {
  let best = null;
  for (const scale of [1, 0.85, 0.7]) {
    const resized = sharp(original)
      .rotate()
      .resize({ width: Math.round(HEADER_WIDTH * scale), height: Math.round(HEADER_MAX_HEIGHT * scale), fit: 'inside', withoutEnlargement: true });
    for (const quality of [70, 60, 50, 42]) {
      best = await resized.clone().webp({ quality, effort: 6 }).toBuffer();
      if (best.length <= HEADER_MAX_BYTES) return best;
    }
  }
  return best;
}

/** Downloads one original, waiting and trying again when storage says it is busy. */
async function download(path) {
  for (let attempt = 0; ; attempt++) {
    const reply = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`);
    if (reply.ok) return Buffer.from(await reply.arrayBuffer());
    if (attempt >= 6 || (reply.status !== 429 && reply.status < 500)) throw new Error(`HTTP ${reply.status}`);
    await new Promise((done) => setTimeout(done, 2000 * 2 ** attempt));
  }
}

/** Makes the thumbnail copy: a centered square. */
function smallCopy(original) {
  return sharp(original).rotate().resize(SMALL_SIDE, SMALL_SIDE, { fit: 'cover', position: 'attention' }).webp({ quality: 70, effort: 5 }).toBuffer();
}

const cards = await database.from('place_card').select('lookup, image_path').not('image_path', 'is', null).order('lookup');
if (cards.error) throw cards.error;
mkdirSync(join(OUT, 'small'), { recursive: true });
mkdirSync(join(OUT, 'header'), { recursive: true });

const totals = { original: 0, small: 0, header: 0, maxOriginal: 0, maxSmall: 0, maxHeader: 0, done: 0, failed: [] };
const queue = [...cards.data];
/** Takes photos off the queue one by one until none are left. */
async function worker() {
  for (let card = queue.shift(); card; card = queue.shift()) {
    try {
      const original = await download(card.image_path);
      const [small, header] = await Promise.all([smallCopy(original), headerCopy(original)]);
      writeFileSync(join(OUT, 'small', `${card.lookup}.webp`), small);
      writeFileSync(join(OUT, 'header', `${card.lookup}.webp`), header);
      totals.original += original.length;
      totals.small += small.length;
      totals.header += header.length;
      totals.maxOriginal = Math.max(totals.maxOriginal, original.length);
      totals.maxSmall = Math.max(totals.maxSmall, small.length);
      totals.maxHeader = Math.max(totals.maxHeader, header.length);
      totals.done++;
    } catch (error) {
      totals.failed.push(`${card.lookup}: ${error.message}`);
    }
  }
}
await Promise.all(Array.from({ length: AT_ONCE }, worker));

/** A byte count as KB. */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const n = totals.done || 1;
console.log(`made ${totals.done} of ${cards.data.length} photos into ${OUT}`);
console.log(`originals: ${kb(totals.original / n)} average, ${kb(totals.maxOriginal)} largest, ${(totals.original / 1048576).toFixed(1)} MB total`);
console.log(`small:     ${kb(totals.small / n)} average, ${kb(totals.maxSmall)} largest, ${(totals.small / 1048576).toFixed(2)} MB total`);
console.log(`header:    ${kb(totals.header / n)} average, ${kb(totals.maxHeader)} largest, ${(totals.header / 1048576).toFixed(1)} MB total`);
if (totals.failed.length) console.log(`failed:\n  ${totals.failed.join('\n  ')}`);

// Uploading changes live storage, so the CLI asks first. It only goes ahead when --yes is passed too, which the
// owner does by hand: node scripts/app/make-place-photos.mjs --upload --yes
if (process.argv.includes('--upload')) {
  const repo = process.cwd();
  for (const folder of ['small', 'header']) {
    // The CLI reads a Windows path like "C:\..." as remote, so the folder is given from inside the temp folder.
    const args = ['supabase', 'storage', 'cp', '-r', folder, `ss:///${BUCKET}/${folder}`, '--remote', '--experimental', '-j', '8'];
    args.push('--content-type', 'image/webp', '--cache-control', 'max-age=2592000', '--workdir', `"${repo}"`);
    if (process.argv.includes('--yes')) args.push('--yes');
    console.log(`uploading ${folder}/ ...`);
    const run = spawnSync('npx', ['--prefix', `"${repo}"`, ...args], { stdio: 'inherit', shell: true, cwd: OUT });
    if (run.status !== 0) {
      console.log(`upload of ${folder}/ failed (exit ${run.status})`);
      process.exit(1);
    }
  }
}
