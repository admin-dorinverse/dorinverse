// Sample Table: other verses that tell the same commandment or command (owner, 2026-11-16: a cookie appears
// wherever its words are told; the app decides whether to show it). Free: no model is called here.
//
//   node scripts/dough-maker/run/sample-told-again.mjs
//
// Writes output/sample/told-again-candidates.json: for each of the Ten Commandments and the 52 commands, the
// BSB verses whose words come close to it (at least 60% of its main words, in any order). Agents then keep only the
// verses that really tell the same command; their verdicts go in output/sample/told-again.json, which the
// loader reads.
import fs from 'node:fs';
import path from 'node:path';
import { agg } from '../lib.mjs';

const OUT = path.join(import.meta.dirname, '..', 'output', 'sample');
const sample = JSON.parse(fs.readFileSync(path.join(OUT, 'sample-table.json'), 'utf8')).cookies;
const bsb = agg(`select v.osis_ref, v.sequence, b.name book, c.chapter_number chapter, v.verse_number verse, t.text
  from public.verse v join public.verse_text t on t.verse_id = v.id and t.translation_code = 'BSB' and t.included
  join public.book b on b.id = v.book_id join public.chapter c on c.id = v.chapter_id order by v.sequence`);

const STOP = new Set(('a an and the of to in on for with as by at from or but not no nor so be is are was were am it its this that these ' +
  'those you your yours he him his she her they them their we us our i me my all any every who whom which what then there here do does ' +
  'did shall will let into out up one').split(' '));
const words = (t) => t.toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g) ?? [];
const main = (t) => [...new Set(words(t).filter((w) => !STOP.has(w)))];
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
const verseStems = bsb.map((v) => new Set(words(v.text).map(stem)));

const items = [];
for (const c of sample) {
  if (c.type === 'ten_commandments') c.commandments.forEach((x, i) => items.push({ key: 'ten_commandments', line: i + 1, text: x.text, reference: x.reference }));
  if (c.type === 'instruction') items.push({ key: `instruction:${c.reference}`, text: c.instruction, reference: c.reference });
}

// A long commandment is often quoted by its first part only ("Honor your father and mother", Matthew 15:4), so
// each item is searched by its whole text and by its first part.
const firstPart = (t) => t.split(/[,;:.]/)[0].trim();
const out = items.map((it) => {
  const full = find(it.text);
  const part = firstPart(it.text);
  const extra = part !== it.text.replace(/[.!]$/, '') && words(part).length >= 3 ? find(part) : [];
  const seen = new Set(full.map((c) => c.reference));
  return { ...it, candidates: [...full, ...extra.filter((c) => !seen.has(c.reference))] };
});
function find(text) {
  const it = { text };
  const m = main(it.text).map(stem);
  // a short command ("You shall not murder", "be holy in all you do") needs nearly all its words, small ones too
  const LOOSE = new Set(['you', 'your', 'shall', 'let', 'us', 'the', 'a', 'an', 'and', 'to', 'be']);
  const m2 = m.length <= 2 ? [...new Set(words(it.text).filter((w) => !LOOSE.has(w)).map(stem))] : m;
  const need = m.length <= 2 ? m2.length : Math.ceil(m.length * 0.6);
  const phrase = words(it.text).join(' ');
  const candidates = bsb.flatMap((v, i) => {
    const hit = m2.filter((w) => verseStems[i].has(w)).length;
    const exact = words(v.text).join(' ').includes(phrase);
    if (!(exact || (m2.length && hit >= need))) return [];
    return [{ reference: `${v.book === 'Psalms' ? 'Psalm' : v.book} ${v.chapter}:${v.verse}`, text: v.text, exact }];
  });
  return candidates;
}
fs.writeFileSync(path.join(OUT, 'told-again-candidates.json'), JSON.stringify({ made: new Date().toISOString(), items: out }, null, 2) + '\n');
console.log(out.map((o) => `${o.candidates.length}\t${o.text.slice(0, 60)}`).join('\n'));
console.log('total', out.reduce((n, o) => n + o.candidates.length, 0));
