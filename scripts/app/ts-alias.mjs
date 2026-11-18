// Lets Node run the app's own TypeScript files, which import each other as "@/..." (meaning src/).
// Used by scripts that time or check app code outside the app:
//   node --import ./scripts/app/ts-alias.mjs scripts/app/time-bible.mjs

import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread } from 'node:worker_threads';

/** The app's src/ folder. */
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

/** Turns "@/data/x" (and "./x" inside src/) into the .ts file it means. */
export async function resolve(spec, context, next) {
  const inSrc = context.parentURL?.startsWith(pathToFileURL(SRC).href);
  const base = spec.startsWith('@/') ? SRC + spec.slice(2) : inSrc && spec.startsWith('.') ? fileURLToPath(new URL(spec, context.parentURL)) : null;
  if (base) {
    for (const ending of ['.ts', '.tsx']) {
      if (existsSync(base + ending)) return { url: pathToFileURL(base + ending).href, shortCircuit: true };
    }
  }
  return next(spec, context);
}

// Loaded with --import on the main thread: hook this file's resolve into Node (the hook itself runs on its own thread).
if (isMainThread) register(import.meta.url);
