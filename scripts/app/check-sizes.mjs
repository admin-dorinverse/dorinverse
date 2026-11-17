// Checks the speed rules in AGENTS.md that a script can check, and fails if any is broken.
// It runs before every commit (see .githooks/pre-commit) and can be run by hand: npm run check-sizes
// Images must be WebP and at most 150 KB, sounds .m4a and at most 100 KB, no videos in the app, and no file
// in src/ over 300 lines. The app-store icons sitting directly in assets/ are left out: stores need them large.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/** Largest image file allowed, in bytes (150 KB). */
const MAX_IMAGE_BYTES = 150 * 1024;

/** Largest sound file allowed, in bytes (100 KB). */
const MAX_SOUND_BYTES = 100 * 1024;

/** Longest file allowed in src/, in lines. */
const MAX_LINES = 300;

/** File endings that count as pictures, sounds and videos. */
const IMAGE_TYPES = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff'];
const SOUND_TYPES = ['.m4a', '.wav', '.mp3', '.aac', '.ogg', '.flac', '.caf'];
const VIDEO_TYPES = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'];

/** Lists every file under a folder, as paths from the repo root. */
function listFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** Turns a byte count into "123 KB" for messages. */
function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

const problems = [];

for (const file of listFiles('assets')) {
  const type = extname(file).toLowerCase();
  const name = relative('.', file).replaceAll('\\', '/');
  const bytes = statSync(file).size;
  const isAppIcon = type === '.png' && !/[\\/]/.test(relative('assets', file));
  if (isAppIcon) continue;
  if (IMAGE_TYPES.includes(type)) {
    if (type !== '.webp') problems.push(`${name}: images must be WebP`);
    else if (bytes > MAX_IMAGE_BYTES) problems.push(`${name}: ${kb(bytes)}, images must be at most ${kb(MAX_IMAGE_BYTES)}`);
  } else if (SOUND_TYPES.includes(type)) {
    if (type !== '.m4a') problems.push(`${name}: sounds must be .m4a`);
    else if (bytes > MAX_SOUND_BYTES) problems.push(`${name}: ${kb(bytes)}, sounds must be at most ${kb(MAX_SOUND_BYTES)}`);
  } else if (VIDEO_TYPES.includes(type)) {
    problems.push(`${name}: videos stream from the server and are never packed into the app`);
  }
}

for (const file of listFiles('src')) {
  const lines = readFileSync(file, 'utf8').split('\n').length;
  if (lines > MAX_LINES) problems.push(`${file.replaceAll('\\', '/')}: ${lines} lines, files must be at most ${MAX_LINES}`);
}

if (problems.length > 0) {
  console.error('Speed check failed (rules in AGENTS.md, "Speed, security and cost come together"):');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('Speed check passed: images, sounds and file lengths are within the limits.');
