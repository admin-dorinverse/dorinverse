// The free script check for the Passages step (models.md "What the script checks for Passages"): every rule in
// passages.md with one right answer. It runs before every Kimi check. Findings come out the way the checker writes
// them (checker.md "Output"), each with the rule's link and exact words, so the fixer gets one list.
//
//   node scripts/dough-maker/run/check-passages.mjs <passages.json> [--books Ruth,Jonah] [--out findings.json]
//   import { checkPassages } from './check-passages.mjs'
//
// --books checks verse coverage only inside those books, for a run that splits part of the Bible. Without it the
// whole Bible must be covered.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { doc } from './docs.mjs';
import { verses } from './bsb.mjs';

const TYPES = ['Narrative', 'Poetry & Wisdom', 'Letters', 'Prophetic', 'Parables', 'Sermons'];
const FIELDS = ['id', 'title', 'start', 'end', 'type', 'story_group', 'position', 'included'];

// Each rule's section link and exact words in passages.md. Checked against the doc on every run, so a reworded rule
// fails here instead of being quoted wrong.
const RULES = {
  everyVerse: ['the-whole-bible', 'Every verse belongs to exactly one passage. No verse is skipped, and no verse is in two passages.'],
  leftOut: ['the-whole-bible', 'Verses the BSB leaves out are skipped. Some verse numbers appear only in a BSB footnote, like Matthew 23:14. They belong to no passage.'],
  range: ['the-whole-bible', 'Each passage is one unbroken range, from a start verse to an end verse.'],
  output: ['output', 'A JSON list, one entry per passage, in Bible order. Every field is filled in. References use the book names in the BSB text, like Mark 2:1.'],
  id: ['output', 'id: the passage\'s number in Bible order, starting at 1'],
  type: ['output', 'type: Narrative, Poetry & Wisdom, Letters, Prophetic, Parables or Sermons'],
  storyGroup: ['output', 'story_group: the group name, or null'],
  position: ['output', 'position: like "3 of 10", or null'],
  included: ['output', 'included: each included parable or sermon, with kind "parable" or "sermon", or an empty list'],
  inside: ['parables-and-sermons-included-or-standalone', 'Included: a parable or sermon that sits inside a bigger passage stays in that passage, and the passage keeps its own type.'],
  group: ['story-groups', 'When one story runs across more than one passage, those passages form a story group. Each one stays its own passage.'],
  nextTo: ['story-groups', 'Group only passages that are next to each other.'],
};

const plain = (md) => md.replace(/\*\*|`/g, '');
function rule(key) {
  const [section, text] = RULES[key];
  if (!plain(doc('passages.md')).includes(text)) throw new Error(`check-passages.mjs quotes a rule passages.md no longer has: "${text}"`);
  return { link: `passages.md#${section}`, text };
}

export function checkPassages(list, { books = null } = {}) {
  const findings = [];
  const add = (key, where, problem) => findings.push({ covered: true, where, problem, rule: rule(key) });
  if (!Array.isArray(list)) {
    add('output', null, 'The output is not a JSON list.');
    return { step: 'passages', findings };
  }

  const all = verses();
  const index = new Map(all.map((v, i) => [v.ref, i]));
  const name = (p, i) => `Passage ${p?.id ?? `#${i + 1}`}${p?.start ? ` (${p.start}–${p.end})` : ''}`;
  const at = (p, i) => ({ passage: p?.id ?? i + 1 });
  const verse = (ref) => index.get(ref);
  const covered = new Map();   // verse index -> passage name
  const overlaps = [];         // { v, who, other, where }
  let lastStart = -1;

  list.forEach((p, i) => {
    const where = at(p, i), who = name(p, i);
    if (!p || typeof p !== 'object') return add('output', where, `${who} is not an entry with fields.`);

    const missing = FIELDS.filter((f) => !(f in p) || (p[f] === null && f !== 'story_group' && f !== 'position') ||
      (typeof p[f] === 'string' && !p[f].trim()));
    if (missing.length) add('output', where, `${who} is missing ${missing.join(', ')}.`);
    if (p.id !== i + 1) add('id', where, `${who} is entry ${i + 1} in the list, so its id should be ${i + 1}, not ${JSON.stringify(p.id)}.`);
    if ('type' in p && !TYPES.includes(p.type)) add('type', where, `${who} has the type ${JSON.stringify(p.type)}, which is not one of the six.`);

    // The range
    const a = verse(p.start), b = verse(p.end);
    for (const [k, ref, idx] of [['start', p.start, a], ['end', p.end, b]]) {
      if (ref == null) continue;
      if (idx === undefined) add('output', where, `${who}: its ${k}, "${ref}", is not a verse in the BSB text.`);
      else if (all[idx].leftOut) add('leftOut', where, `${who} ${k === 'start' ? 'starts' : 'ends'} on ${ref}, a verse the BSB leaves out.`);
    }
    if (a === undefined || b === undefined) return;
    if (a > b) return add('range', where, `${who} starts after it ends.`);
    if (a < lastStart) add('output', where, `${who} is out of Bible order: it starts before the passage above it.`);
    lastStart = a;
    for (let v = a; v <= b; v++) {
      if (all[v].leftOut) continue;
      if (covered.has(v)) overlaps.push({ v, who, other: covered.get(v), where });
      else covered.set(v, who);
    }

    // Included parables and sermons
    if ('included' in p && !Array.isArray(p.included)) add('included', where, `${who}: "included" is not a list.`);
    for (const inc of Array.isArray(p.included) ? p.included : []) {
      const label = `${inc?.kind ?? 'An included item'} ${inc?.start ?? '?'}–${inc?.end ?? '?'}`;
      if (!['parable', 'sermon'].includes(inc?.kind)) add('included', where, `${who}: the included ${label} has the kind ${JSON.stringify(inc?.kind)}, not "parable" or "sermon".`);
      const s = verse(inc?.start), e = verse(inc?.end);
      if (s === undefined || e === undefined) add('output', where, `${who}: the included ${label} names a verse that is not in the BSB text.`);
      else if (s > e || s < a || e > b) add('inside', where, `${who}: the included ${label} is not inside the passage.`);
    }
  });

  // Every verse once: report each run of verses in two passages, and each run of skipped verses, as one finding
  for (let k = 0; k < overlaps.length; k++) {
    const first = overlaps[k];
    while (k + 1 < overlaps.length && overlaps[k + 1].who === first.who && overlaps[k + 1].other === first.other) k++;
    const span = overlaps[k].v === first.v ? `${all[first.v].ref} is` : `${all[first.v].ref} to ${all[overlaps[k].v].ref} are`;
    add('everyVerse', first.where, `${span} in ${first.who} and also in ${first.other}.`);
  }
  const inScope = (v) => !all[v].leftOut && (books ? books.includes(all[v].book) : true);
  for (let v = 0; v < all.length; v++) {
    if (!inScope(v) || covered.has(v)) continue;
    let w = v;
    while (w + 1 < all.length && inScope(w + 1) && !covered.has(w + 1) && all[w + 1].book === all[v].book) w++;
    add('everyVerse', null, w === v ? `${all[v].ref} is in no passage.` : `${all[v].ref} to ${all[w].ref} are in no passage.`);
    v = w;
  }

  // Story groups and positions
  const groups = new Map();
  list.forEach((p, i) => {
    if (!p || typeof p !== 'object') return;
    if (p.story_group == null) {
      if (p.position != null) add('position', at(p, i), `${name(p, i)} has the position "${p.position}" but no story group.`);
      return;
    }
    if (p.position == null) add('position', at(p, i), `${name(p, i)} is in the story group "${p.story_group}" but has no position.`);
    if (!groups.has(p.story_group)) groups.set(p.story_group, []);
    groups.get(p.story_group).push({ p, i });
  });
  for (const [g, members] of groups) {
    if (members.length === 1) add('group', at(members[0].p, members[0].i), `The story group "${g}" has only one passage.`);
    for (let k = 1; k < members.length; k++) {
      // A group may skip over a side story, which has no story group; whether it truly is one is Kimi's call
      const between = list.slice(members[k - 1].i + 1, members[k].i);
      if (between.some((p) => p?.story_group != null))
        add('nextTo', at(members[k].p, members[k].i), `The story group "${g}" skips over passages in another story group: ${name(members[k - 1].p, members[k - 1].i)} and ${name(members[k].p, members[k].i)} are not next to each other.`);
    }
    members.forEach(({ p, i }, k) => {
      const want = `${k + 1} of ${members.length}`;
      if (p.position != null && p.position !== want) add('position', at(p, i), `${name(p, i)} is passage ${want} in "${g}", but its position says "${p.position}".`);
    });
  }

  return { step: 'passages', findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file] = process.argv.slice(2).filter((a, i, arr) => !a.startsWith('--') && !arr[i - 1]?.startsWith('--'));
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const result = checkPassages(JSON.parse(fs.readFileSync(file, 'utf8')), { books: opt('--books')?.split(',') ?? null });
  const out = JSON.stringify(result, null, 2);
  if (opt('--out')) fs.writeFileSync(opt('--out'), out + '\n'); else console.log(out);
  console.error(result.findings.length ? `${result.findings.length} findings` : 'No findings');
}
