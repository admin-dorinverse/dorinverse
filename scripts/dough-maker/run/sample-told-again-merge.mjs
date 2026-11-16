// Sample Table: combine the two agents' verdicts on told-again-candidates.json (see sample-told-again.mjs).
// A verse is kept only when both agents kept it. When both kept it but with different ranges, the shorter
// (the verses both agree on) is kept. Everything else is listed as not kept, with each agent's view.
//
//   node scripts/dough-maker/run/sample-told-again-merge.mjs
//
// Writes output/sample/told-again.json, which the loader reads.
import fs from 'node:fs';
import path from 'node:path';

const DIR = import.meta.dirname;
const OUT = path.join(DIR, '..', 'output', 'sample');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const cand = read(path.join(OUT, 'told-again-candidates.json')).items;
const A = read(path.join(DIR, '.cache', 'told-again-judge-A.json')).items;
const B = read(path.join(DIR, '.cache', 'told-again-judge-B.json')).items;
if (A.length !== cand.length || B.length !== cand.length) throw new Error('a verdict file does not have every item');

const first = (r) => r.replace(/-\d+$/, '');
const span = (r) => { const m = r.match(/:(\d+)(?:-(\d+))?$/); return m ? Number(m[2] ?? m[1]) - Number(m[1]) : 0; };
const items = cand.map((c, i) => {
  const a = A[i], b = B[i];
  if (a.key !== c.key || b.key !== c.key || (a.line ?? null) !== (c.line ?? null) || (b.line ?? null) !== (c.line ?? null)) throw new Error(`item ${i + 1} is out of order`);
  const ok = new Set(c.candidates.map((x) => x.reference));
  const keep = [], not = [];
  const byFirst = (list) => new Map(list.map((x) => [first(x.reference), x]));
  const ak = byFirst(a.keep), bk = byFirst(b.keep), au = byFirst(a.unsure ?? []), bu = byFirst(b.unsure ?? []);
  for (const f of new Set([...ak.keys(), ...bk.keys(), ...au.keys(), ...bu.keys()])) {
    if (!ok.has(f)) throw new Error(`${c.key}: ${f} is not a candidate`);
    if (ak.has(f) && bk.has(f)) {
      const ra = ak.get(f).reference, rb = bk.get(f).reference;
      keep.push({ reference: span(ra) <= span(rb) ? ra : rb, why: ak.get(f).why });
    } else {
      not.push({ reference: f, a: ak.has(f) ? 'keep' : au.has(f) ? 'unsure' : 'drop', b: bk.has(f) ? 'keep' : bu.has(f) ? 'unsure' : 'drop',
        why_a: (ak.get(f) ?? au.get(f))?.why ?? null, why_b: (bk.get(f) ?? bu.get(f))?.why ?? null });
    }
  }
  return { key: c.key, line: c.line ?? null, text: c.text, reference: c.reference, keep, not_agreed: not };
});
fs.writeFileSync(path.join(OUT, 'told-again.json'), JSON.stringify({ made: new Date().toISOString(),
  how: 'Verses that give or repeat the same command. Kept only when two agents, judging separately, both kept it.', items }, null, 2) + '\n');
const k = items.reduce((n, x) => n + x.keep.length, 0), d = items.reduce((n, x) => n + x.not_agreed.length, 0);
console.log(`kept ${k} (both agreed) | not agreed ${d}`);
for (const x of items) for (const n of x.not_agreed) console.log(`  ${x.text.slice(0, 40)} | ${n.reference}: A ${n.a}, B ${n.b}`);
