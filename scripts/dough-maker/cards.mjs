// Character cards: the written content of public.character_card, for the 233 people in
// roster.json (roster.mjs).
//
//   node scripts/dough-maker/cards.mjs pack     # source packs, one per character, in .cache/card-packs/
//   node scripts/dough-maker/cards.mjs text "1 Kings 18:20–40"   # KJV text of a passage, with its places
//   node scripts/dough-maker/cards.mjs check [lookup ...]       # check the files in cards/ (all, or these)
//   node scripts/dough-maker/cards.mjs sql      # check, then write .cache/character-cards.sql
//
// pack reads the linked project (read-only) for what reference.json does not hold: also
// called, timeline events and their places, and Easton's (a planning aid, never a source).
// The cards themselves are written from the KJV text in the pack: cards/<lookup>.json.
//
// A card file:
//   { "lookup": "elijah_1131", "name": "Elijah", "name_tag": null, "also_known_as": null,
//     "summary": "...", "key_moments": [{ "title": "...", "description": "...",
//     "passage": "1 Kings 18:20–40", "place": "mount_carmel_..." }] }
// name_tag is required when two cards share a name, and only then. also_known_as null keeps
// bible_character.also_called; a list replaces it ([] shows none). place is a place lookup or null.
import fs from 'node:fs';
import path from 'node:path';
import { DIR, loadReference, expand, formatRefs, agg } from './lib.mjs';

const CARDS_DIR = path.join(DIR, 'cards');
const PACKS_DIR = path.join(DIR, '.cache', 'card-packs');
const roster = JSON.parse(fs.readFileSync(path.join(DIR, 'roster.json'), 'utf8'));
const ref = loadReference({ text: true });

// The name a card shows before any tag: the display name without its "(...)" note, or the
// name the KJV uses where the display name is a historians' label or misspelt.
const CARD_NAMES = { israel_682: 'Jacob', esau_1216: 'Esau', herod_1505: 'Herod', herod_1506: 'Herod',
  philip_2344: 'Philip', philip_2347: 'Philip', portius_2367: 'Festus', john_1676: 'John', john_1677: 'John', simon_2752: 'Simon' };
const cardName = (p) => CARD_NAMES[p.lookup] ?? p.name.replace(/\s*\(.*\)$/, '');
const nameCount = new Map();
for (const p of roster) nameCount.set(cardName(p), (nameCount.get(cardName(p)) ?? 0) + 1);

const versesOf = new Map();
for (const [r, x] of Object.entries(ref.links)) for (const k of x.p) (versesOf.get(k) ?? versesOf.set(k, []).get(k)).push(r);
const bookByOsis = Object.fromEntries(ref.books.map((b) => [b.osis, b]));
const seqKey = (r) => { const [b, c, v] = r.split('.'); return bookByOsis[b].order * 1e6 + Number(c) * 1e3 + Number(v); };
for (const vs of versesOf.values()) vs.sort((a, b) => seqKey(a) - seqKey(b));
const refText = (r) => formatRefs(ref, [r]);

const SUMMARY_MAX_SENTENCES = 2;
const sentences = (s) => (s.match(/[.!?](?=\s|$)/g) ?? []).length;

const cmd = process.argv[2];
if (cmd === 'pack') pack();
else if (cmd === 'text') text(process.argv.slice(3).join(' '));
else if (cmd === 'check') report(check(process.argv.slice(3)));
else if (cmd === 'sql') sql(report(check()));
else { console.error('usage: cards.mjs pack | text <passage> | check [lookup ...] | sql'); process.exit(1); }

function text(passage) {
  for (const v of expand(ref, passage)) {
    const l = ref.links[v];
    const tags = [...(l?.p ?? []).map((k) => `@${k}`), ...(l?.l ?? []).map((k) => `#${k}`)].join(' ');
    console.log(`${refText(v)} ${ref.verses[v]}${tags ? `  [${tags}]` : ''}`);
  }
}

// --- pack -----------------------------------------------------------------------

function pack() {
  const lookups = roster.map((p) => `'${p.lookup}'`).join(',');
  const also = Object.fromEntries(agg(`select lookup, also_called from public.bible_character
    where lookup in (${lookups})`).map((r) => [r.lookup, r.also_called]));
  const events = agg(`select c.lookup, e.title, e.start_date, e.sort_key,
      (select json_agg(v.osis_ref order by v.sequence) from public.event_verse ev join public.verse v on v.id = ev.verse_id
        where ev.event_id = e.id) as verses,
      (select json_agg(p.lookup) from public.event_place ep join public.place p on p.id = ep.place_id
        where ep.event_id = e.id) as places
    from public.event_bible_character x join public.event e on e.id = x.event_id
    join public.bible_character c on c.id = x.bible_character_id
    where c.lookup in (${lookups}) order by e.sort_key`);
  const easton = agg(`select c.lookup, d.term, d.text from public.dictionary_entry_bible_character x
    join public.dictionary_entry d on d.id = x.dictionary_entry_id
    join public.bible_character c on c.id = x.bible_character_id where c.lookup in (${lookups})`);

  fs.mkdirSync(PACKS_DIR, { recursive: true });
  for (const p of roster) {
    const vs = versesOf.get(p.lookup) ?? [];
    const places = new Map();
    for (const v of vs) for (const l of ref.links[v]?.l ?? []) places.set(l, (places.get(l) ?? 0) + 1);
    const evs = events.filter((e) => e.lookup === p.lookup);
    const name = cardName(p);
    const out = [
      `# ${p.name} — ${p.lookup}`,
      '',
      `- Card name: ${name}${nameCount.get(name) > 1 ? ` (shared with ${roster.filter((x) => x.lookup !== p.lookup && cardName(x) === name).map((x) => `${x.lookup} "${x.name}"`).join(', ')}: a name_tag is required)` : (p.shared ? ' (no other card has it, but other Bible people do: name_tag optional, only if the plain name would mislead)' : ' (not shared: name_tag must be null)')}`,
      `- Also called (bible_character.also_called): ${also[p.lookup]?.join(', ') || '—'}`,
      `- Named in ${vs.length} verses. First cookie box: ${p.box}`,
      '',
      '## Places named in their verses (lookup — name — verses)',
      '',
      ...[...places].sort((a, b) => b[1] - a[1]).map(([l, n]) => `- ${l} — ${ref.places[l]} — ${n}`),
      '',
      '## Timeline events (title — passage — places)',
      '',
      ...evs.map((e) => `- ${e.title} — ${e.verses ? formatRefs(ref, e.verses) : '(no verses)'} — ${e.places?.join(', ') || '—'}`),
      '',
      "## Easton's (planning aid only: never a source, never quoted, nothing added from it)",
      '',
      ...easton.filter((e) => e.lookup === p.lookup).map((e) => `**${e.term}.** ${e.text}\n`),
      '',
      '## Every verse that names them (KJV)',
      '',
      ...vs.map((v) => `- ${refText(v)} — ${ref.verses[v]}`),
      '',
    ];
    fs.writeFileSync(path.join(PACKS_DIR, `${p.lookup}.md`), out.join('\n'));
  }
  console.log(`${roster.length} packs in ${PACKS_DIR}`);
}

// --- check ----------------------------------------------------------------------

// Runs of 6+ words a text shares with these verses, longest first, overlaps merged.
function wordsOf(s) { return s.toLowerCase().replace(/[’']/g, '').match(/[a-z]+/g) ?? []; }
function kjvRuns(text, osisRefs) {
  const RUN = 6;
  const grams = new Set();
  for (const v of osisRefs) {
    const w = wordsOf(ref.verses[v] ?? '');
    for (let i = 0; i + RUN <= w.length; i++) grams.add(w.slice(i, i + RUN).join(' '));
  }
  const w = wordsOf(text ?? ''), runs = [];
  for (let i = 0; i + RUN <= w.length; i++) {
    if (!grams.has(w.slice(i, i + RUN).join(' '))) continue;
    let j = i + RUN;
    while (j < w.length && grams.has(w.slice(j - RUN + 1, j + 1).join(' '))) j++;
    runs.push(w.slice(i, j).join(' '));
    i = j - 1;
  }
  return runs;
}

function check(only = []) {
  const errors = [], warnings = [], cards = [];
  const known = new Set(roster.map((p) => p.lookup));
  const files = (fs.existsSync(CARDS_DIR) ? fs.readdirSync(CARDS_DIR).filter((f) => f.endsWith('.json')) : [])
    .filter((f) => !only.length || only.includes(f.slice(0, -5)));
  for (const f of files) {
    const at = `cards/${f}`;
    let c;
    try { c = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, f), 'utf8')); } catch (e) { errors.push(`${at}: ${e.message}`); continue; }
    const p = roster.find((x) => x.lookup === c.lookup);
    if (!known.has(c.lookup) || f !== `${c.lookup}.json`) { errors.push(`${at}: lookup "${c.lookup}" is not on the roster or does not match the file name`); continue; }
    if (c.name !== cardName(p)) errors.push(`${at}: name should be "${cardName(p)}"`);
    const shared = nameCount.get(cardName(p)) > 1;
    if (shared && !c.name_tag?.trim()) errors.push(`${at}: "${c.name}" is shared: name_tag required`);
    // a name no other card has takes a tag only when other Bible people bear it too (Simon)
    if (!shared && !p.shared && c.name_tag != null) errors.push(`${at}: "${c.name}" is not shared: name_tag must be null`);
    if (c.name_tag && c.name_tag.length > 24) errors.push(`${at}: name_tag over 24 characters`);
    if (c.also_known_as != null && !Array.isArray(c.also_known_as)) errors.push(`${at}: also_known_as must be null or a list`);
    if (!c.summary?.trim()) errors.push(`${at}: summary missing`);
    else if (sentences(c.summary) > SUMMARY_MAX_SENTENCES) errors.push(`${at}: summary over ${SUMMARY_MAX_SENTENCES} sentences`);
    const ms = c.key_moments ?? [];
    if (ms.length < 2 || ms.length > 5) errors.push(`${at}: ${ms.length} key moments (2–5)`);
    const own = new Set(versesOf.get(c.lookup) ?? []);
    ms.forEach((m, i) => {
      const where = `${at} moment ${i + 1}`;
      for (const k of ['title', 'description', 'passage']) if (!m[k]?.trim()) errors.push(`${where}: ${k} missing`);
      if (m.place != null && !ref.places[m.place]) errors.push(`${where}: place "${m.place}" is not a place lookup`);
      if (!m.passage) return;
      let vs;
      try { vs = expand(ref, m.passage); } catch (e) { errors.push(`${where}: ${e.message}`); return; }
      // a moment's place is one its passage names
      if (m.place && ref.places[m.place] && !vs.some((v) => ref.links[v]?.l.includes(m.place))) {
        errors.push(`${where}: ${m.passage} does not name place ${m.place}`);
      }
      if (!vs.some((v) => own.has(v))) warnings.push(`${where}: no verse of ${m.passage} names them in the reference layer`);
      for (const run of kjvRuns(m.description, vs)) warnings.push(`${where}: "${run}" is the KJV's own words`);
    });
    cards.push(c);
  }
  const missing = roster.filter((p) => (!only.length || only.includes(p.lookup)) && !files.includes(`${p.lookup}.json`));
  return { errors, warnings, cards, missing };
}

function report(r) {
  for (const w of r.warnings) console.warn(`warning: ${w}`);
  for (const e of r.errors) console.error(e);
  console.log(`${r.cards.length} cards, ${r.missing.length} of ${roster.length} missing, ` +
    `${r.errors.length} errors, ${r.warnings.length} warnings`);
  if (r.missing.length && r.missing.length < 20) console.log(`missing: ${r.missing.map((p) => p.lookup).join(', ')}`);
  return r;
}

// --- sql ------------------------------------------------------------------------

function sql({ errors, cards, missing }) {
  if (errors.length || missing.length) { console.error('fix the cards first'); process.exit(1); }
  const q = (s) => (s == null ? 'null' : `'${s.replaceAll("'", "''")}'`);
  const arr = (a) => (a == null ? 'null' : `array[${a.map(q).join(',')}]::text[]`);
  const rows = cards.map((c) => {
    const moments = c.key_moments.map((m) => ({ title: m.title, description: m.description, passage: m.passage, place: m.place ?? null }));
    return `(${q(c.lookup)}, ${q(c.name)}, ${q(c.name_tag)}, ${arr(c.also_known_as)}, ${q(c.summary)}, ${q(JSON.stringify(moments))}::jsonb)`;
  });
  // Moments are written with place lookups; the table keeps place_id, resolved here.
  const out = `-- Written by node scripts/dough-maker/cards.mjs sql. Upserts all ${cards.length} character cards as published.
begin;
with src (lookup, name, name_tag, also_known_as, summary, moments) as (values
${rows.join(',\n')}
)
insert into public.character_card (bible_character_id, name, name_tag, also_known_as, summary, key_moments, status)
select c.id, s.name, s.name_tag, s.also_known_as, s.summary,
  (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('title', m ->> 'title', 'description', m ->> 'description',
     'passage', m ->> 'passage', 'place_id', pl.id)) order by n)
   from jsonb_array_elements(s.moments) with ordinality as t (m, n)
   left join public.place pl on pl.lookup = m ->> 'place'),
  'published'
from src s join public.bible_character c on c.lookup = s.lookup
on conflict (bible_character_id) do update set name = excluded.name, name_tag = excluded.name_tag,
  also_known_as = excluded.also_known_as, summary = excluded.summary, key_moments = excluded.key_moments,
  status = excluded.status;
do $$ begin
  if (select count(*) from public.character_card) <> ${cards.length} then
    raise exception 'expected ${cards.length} character cards';
  end if;
end $$;
commit;
`;
  const file = path.join(DIR, '.cache', 'character-cards.sql');
  fs.writeFileSync(file, out);
  console.log(`wrote ${file}`);
}
