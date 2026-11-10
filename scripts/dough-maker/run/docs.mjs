// The lesson docs, frozen when the run starts (models.md "Caching" rule 4): each file is read once, byte for byte,
// and kept for the whole run with its fingerprint, so an edit made mid-run never changes the start of a call.
//
//   doc('passages.md')   the frozen text
//   fingerprints()       { 'passages.md': '3f9a…', ... } for every doc read so far
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const DOCS_DIR = path.join(import.meta.dirname, '..', 'lesson-docs');
const frozen = new Map();

export const sha = (text) => createHash('sha256').update(text).digest('hex');

export function doc(name) {
  if (!frozen.has(name)) {
    const text = fs.readFileSync(path.join(DOCS_DIR, name), 'utf8');
    frozen.set(name, { text, sha: sha(text).slice(0, 12) });
  }
  return frozen.get(name).text;
}

export function fingerprints() {
  return Object.fromEntries([...frozen].map(([name, d]) => [name, d.sha]));
}
