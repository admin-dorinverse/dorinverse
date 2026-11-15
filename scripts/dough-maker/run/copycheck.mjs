// The Definitions copy check (definitions.md "Sources"): a meaning that shares RUN (8) or more words in a row with a
// dictionary's entry for that word isn't in our own words. Compared with the public-domain sources the writer is
// given (data/dictionaries) and with WordNet, which stands in for how modern dictionaries phrase a meaning.
// Free: no model, only the files.
//
//   import { copied } from './copycheck.mjs';
//   copied('winnow', 'To separate the chaff from grain by using air currents.')
//     -> { source: 'WordNet', words: 'separate the chaff from grain by using air currents' }   (or null)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUN = 8;
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'dictionaries');
const words = (s) => String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? [];

let books = null;
function load() {
  if (books) return books;
  const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const byTerm = (j, name) => {
    const m = new Map();
    for (const e of j.entries) {
      const k = String(e.term ?? e.word).toLowerCase();
      const texts = e.senses ? e.senses.map((s) => (typeof s === 'string' ? s : s.text)) : [e.definition];
      m.set(k, [...(m.get(k) ?? []), ...texts]);
    }
    return { name, m };
  };
  const wn = read('wordnet/glosses.json');
  books = [
    byTerm(read('smith.json'), "Smith's Bible Dictionary"),
    byTerm(read('schaff.json'), "Schaff's Dictionary of the Bible"),
    byTerm(read('hitchcock.json'), "Hitchcock's Bible Names"),
    byTerm(read('webster-1913.json'), "Webster's 1913"),
    byTerm(read('webster-1828.json'), "Webster's 1828"),
    { name: 'WordNet', m: new Map(Object.entries(wn.entries)) },
  ];
  return books;
}

// The word and its plain forms, so "debtors" also looks under "debtor"
const forms = (w) => {
  const k = String(w).toLowerCase().trim();
  return [...new Set([k, k.replace(/'s$/, ''), k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ed$/, ''), k.replace(/ed$/, 'e'), k.replace(/ing$/, ''), k.replace(/ing$/, 'e')])].filter(Boolean);
};

// extra: more entry texts to compare with, like the Easton's entry from the database
export function copied(word, meaning, extra = []) {
  const m = words(meaning);
  if (m.length < RUN) return null;
  const runs = new Set();
  for (let i = 0; i + RUN <= m.length; i++) runs.add(m.slice(i, i + RUN).join(' '));
  const sources = [...load().map((b) => ({ name: b.name, texts: forms(word).flatMap((f) => b.m.get(f) ?? []) })), { name: 'the given entry', texts: extra }];
  for (const s of sources) for (const t of s.texts) {
    const w = words(t);
    for (let i = 0; i + RUN <= w.length; i++) {
      const r = w.slice(i, i + RUN).join(' ');
      if (runs.has(r)) {
        // grow the shared run to its full length, for the message
        let a = m.join(' ').indexOf(r), seen = r;
        for (let k = i + RUN; k < w.length; k++) { const longer = seen + ' ' + w[k]; if (m.join(' ').includes(longer)) seen = longer; else break; }
        return { source: s.name, words: seen, at: a };
      }
    }
  }
  return null;
}
