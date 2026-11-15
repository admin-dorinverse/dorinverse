// Finishes one answer-explanations passage with Opus on the owner's subscription doing the fixes, for a passage
// whose Sonnet fix OpenRouter's moderation refused (Micah 3:1-12 on 2026-11-15: "tear the skin… chop them up like
// meat"). Same flow as answers.mjs from the first fix on: up to two fixes with Terra rechecking, then a final fix.
//
//   node scripts/dough-maker/run/answers-opus-fix.mjs 1010
import fs from 'node:fs';
import path from 'node:path';
import { PASSAGES } from './events.mjs';
import { doc } from './docs.mjs';
import { opus } from './opus.mjs';
import { chat } from './openrouter.mjs';
import { folder } from './prep.mjs';
import { ANSWERS_DIR, material, RECHECK, FIX, scriptCheck, flatten, merge, finalOut, addEllipses } from './answers.mjs';

const id = Number(process.argv[2]);
const p = JSON.parse(fs.readFileSync(PASSAGES, 'utf8')).find((x) => x.id === id);
const m = material(p), d = path.join(ANSWERS_DIR, folder(p));
const rj = (f) => { try { return JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch { return null; } };
const wj = (f, x) => fs.writeFileSync(path.join(d, f), JSON.stringify(x, null, 2) + '\n');
const json = (t) => { const a = String(t).indexOf('{'), b = String(t).lastIndexOf('}'); try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } };
const key = (x) => `${x.stop}/${x.card}/${x.answer}`;
const docs = [{ name: 'papa-dorin.md', text: doc('papa-dorin.md'), kind: 'doc' }, { name: 'answer-explanations.md', text: doc('answer-explanations.md'), kind: 'doc' }];
const system = docs.map((x) => x.text).join('\n\n');
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 32000 };
const fixQuotes = (list) => list.map((e) => ({ ...e, explanation: addEllipses(e.explanation, p.start, p.end) }));

let all = fixQuotes(flatten(m, rj('written.json')).list);
const c1 = rj('check-1.json');
let found = [...c1.script, ...c1.terra];
const first = found.length;
let cost = (rj('written.json')?.cost ?? 0) + (c1.cost ?? 0);
const opusFix = async (n) => {
  const r = await opus({ system: docs, prompt: FIX(m, all, found), passage: id, step: 'answer_explanations', role: 'fixer' });
  const fixes = json(r.text)?.fixes ?? [];
  wj(`fix-${n}.json`, { fixes, cost: 0, by: 'opus (subscription)', ...(n === 3 && { problems: found }) });
  all = fixQuotes(merge(all, fixes));
  return fixes.length;
};
for (let n = 1; n <= 2 && found.length; n++) {
  console.log(`fix ${n}: ${found.length} problems, Opus fixed ${await opusFix(n)}`);
  const terraHad = found.filter((f) => !/^(It has|It uses|It reuses|A quote isn|There is no)/.test(f.problem));
  const again = all.filter((x) => found.some((f) => key(f) === key(x)));
  const script = [...flatten(m, finalOut(m, all)).missing, ...scriptCheck(m, again.filter((x) => x.explanation))];
  const toCheck = again.filter((x) => terraHad.some((f) => key(f) === key(x)));
  const r = toCheck.length ? await chat({ ...TERRA, system, user: RECHECK(m, toCheck, terraHad), passage: id, step: 'answer_explanations', role: 'reviewer' }) : { text: '{"findings":[]}', cost: 0 };
  const terra = json(r.text)?.findings ?? [];
  cost += r.cost ?? 0;
  wj(`check-${n + 1}.json`, { script, terra, cost: r.cost ?? 0, terraReadable: true });
  found = [...script, ...terra];
}
const left = found.length;
if (left) console.log(`final fix: ${left} problems, Opus fixed ${await opusFix(3)}`);
wj('answer-explanations.json', finalOut(m, all));
wj('flags.json', { passage: m.p.start, flags: [] });
wj('done.json', { explanations: all.length, firstFindings: first, finalFix: left, flags: 0, cost: Math.round(cost * 10000) / 10000, fixedBy: 'opus (subscription)', t: new Date().toISOString() });
console.log(`done: ${all.length} explanations, ${first} needed a fix, ${left} reached the final fix, $${cost.toFixed(3)} on OpenRouter`);
