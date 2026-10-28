// Memory verses: the 250 rows of public.memory_verse, one per lesson in ingredients/verses.md
// (the verse after " — " on each lesson line), in file order.
//
//   node scripts/dough-maker/memory-verses.mjs list   # write memory-verses/verses.json
//   node scripts/dough-maker/memory-verses.mjs sql    # write .cache/memory-verses.sql
//   node scripts/dough-maker/memory-verses.mjs texts  # write .cache/memory-verse-texts.sql
//
// verses.json is the input for translation work: [{ order, ref, osis, kjv }], order 1..250.
// The load leaves cookie_dough_flavor_id null (no flavors on staging yet) and approved false:
// the owner approves.
//
// texts loads the other translations from memory-verses/<code>.json ([{ order, osis, text, source }],
// one file per entry in TRANSLATIONS) into public.translation and public.memory_verse_text.
// KJV stays in public.verse.text and gets no memory_verse_text rows.
import fs from 'node:fs';
import path from 'node:path';
import { DIR, INGREDIENTS_DIR, loadReference, parseIngredients, expand } from './lib.mjs';

const COUNT = 250;   // the memory_verse trigger caps approved rows at 250
const OUT_DIR = path.join(DIR, 'memory-verses');
const ref = loadReference({ text: true });

const TRANSLATIONS = [
  { code: 'ESV', name: 'English Standard Version',
    licence: 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.' },
  { code: 'NLT', name: 'New Living Translation',
    licence: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.' },
  { code: 'CSB', name: 'Christian Standard Bible',
    licence: 'Scripture quotations marked CSB have been taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission. Christian Standard Bible® and CSB® are federally registered trademarks of Holman Bible Publishers.' },
  { code: 'NASB', name: 'New American Standard Bible (2020)',
    licence: 'Scripture quotations taken from the (NASB®) New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. Used by permission. All rights reserved. lockman.org' },
  { code: 'BSB', name: 'Berean Standard Bible',
    licence: 'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.info, and the Berean Bible Translation Committee. This text of God’s Word has been dedicated to the public domain.' },
];

const cmd = process.argv[2];
if (cmd === 'list') list();
else if (cmd === 'sql') sql();
else if (cmd === 'texts') texts();
else { console.error('usage: memory-verses.mjs list | sql | texts'); process.exit(1); }

// Every lesson's memory verse, checked: one verse each, all known, no repeats, exactly COUNT.
function memoryVerses() {
  const file = 'ingredients/verses.md';
  const { flavors } = parseIngredients(fs.readFileSync(path.join(INGREDIENTS_DIR, 'verses.md'), 'utf8'), file);
  const errors = [], out = [], seen = new Map();
  for (const l of flavors.flatMap((f) => f.lessons)) {
    if (!l.note) { errors.push(`${l.at}: lesson has no memory verse after " — "`); continue; }
    let vs;
    try { vs = expand(ref, l.note); } catch (e) { errors.push(`${l.at}: ${e.message}`); continue; }
    if (vs.length !== 1) { errors.push(`${l.at}: "${l.note}" is ${vs.length} verses, not one`); continue; }
    const [osis] = vs;
    if (!ref.verses[osis]) { errors.push(`${l.at}: ${osis} has no KJV text in the cache`); continue; }
    if (seen.has(osis)) { errors.push(`${l.at}: ${l.note} repeats ${seen.get(osis)}`); continue; }
    seen.set(osis, l.at);
    out.push({ order: out.length + 1, ref: l.note, osis, kjv: ref.verses[osis] });
  }
  if (!errors.length && out.length !== COUNT) errors.push(`${out.length} memory verses, expected ${COUNT}`);
  if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
  return out;
}

function list() {
  const rows = memoryVerses();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, 'verses.json');
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`wrote ${rows.length} verses to ${file}`);
}

function sql() {
  const rows = memoryVerses();
  // osis refs are [A-Za-z0-9.] only, so they need no escaping
  const values = rows.map((r) => `(${r.order}, '${r.osis}')`);
  const out = `-- Written by node scripts/dough-maker/memory-verses.mjs sql. Upserts the ${rows.length} memory verses
-- from ingredients/verses.md, ordered as in the file, unapproved and without a flavor.
begin;
create temp table src (ord int, osis text) on commit drop;
insert into src values
${values.join(',\n')};

do $$ begin
  if exists (select 1 from src s left join public.verse v on v.osis_ref = s.osis where v.id is null) then
    raise exception 'unresolved osis refs: %', (select string_agg(s.osis, ', ') from src s
      left join public.verse v on v.osis_ref = s.osis where v.id is null);
  end if;
end $$;

insert into public.memory_verse (verse_id, "order")
select v.id, s.ord from src s join public.verse v on v.osis_ref = s.osis
on conflict (verse_id) do update set "order" = excluded."order";

do $$ begin
  if (select count(*) from public.memory_verse) <> ${rows.length} then
    raise exception 'expected ${rows.length} memory verses';
  end if;
  if (select count(distinct "order") from public.memory_verse where "order" between 1 and ${rows.length}) <> ${rows.length} then
    raise exception 'memory verse orders are not 1..${rows.length}';
  end if;
end $$;
commit;
`;
  const file = path.join(DIR, '.cache', 'memory-verses.sql');
  fs.writeFileSync(file, out);
  console.log(`wrote ${file}`);
}

// A SQL string literal; standard_conforming_strings is on, so only ' needs doubling.
function lit(s) { return `'${s.replaceAll("'", "''")}'`; }

// Each translation file, checked against verses.json: COUNT entries, the same osis set, no empty text.
function translationTexts() {
  const verses = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'verses.json'), 'utf8'));
  const want = new Set(verses.map((v) => v.osis));
  const errors = [], out = [];
  for (const t of TRANSLATIONS) {
    const file = `memory-verses/${t.code.toLowerCase()}.json`;
    const rows = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (rows.length !== COUNT) errors.push(`${file}: ${rows.length} entries, expected ${COUNT}`);
    const seen = new Set();
    for (const r of rows) {
      if (!want.has(r.osis)) errors.push(`${file}: ${r.osis} is not in verses.json`);
      if (seen.has(r.osis)) errors.push(`${file}: ${r.osis} repeats`);
      seen.add(r.osis);
      if (typeof r.text !== 'string' || !r.text.trim()) errors.push(`${file}: ${r.osis} has no text`);
      out.push({ code: t.code, osis: r.osis, text: r.text });
    }
    for (const o of want) if (!seen.has(o)) errors.push(`${file}: missing ${o}`);
  }
  if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
  return out;
}

function texts() {
  const rows = translationTexts();
  const translations = TRANSLATIONS.map((t) => `(${lit(t.code)}, ${lit(t.name)}, ${lit(t.licence)}, true)`);
  const values = rows.map((r) => `(${lit(r.code)}, '${r.osis}', ${lit(r.text)})`);   // osis needs no escaping
  const out = `-- Written by node scripts/dough-maker/memory-verses.mjs texts. Upserts the ${TRANSLATIONS.length} enabled
-- translations and their ${COUNT} memory verse texts each, from memory-verses/<code>.json.
begin;
insert into public.translation (code, name, licence_note, enabled) values
${translations.join(',\n')}
on conflict (code) do update set name = excluded.name, licence_note = excluded.licence_note, enabled = excluded.enabled;

create temp table src (code text, osis text, text text) on commit drop;
insert into src values
${values.join(',\n')};

do $$ begin
  if exists (select 1 from src s left join public.verse v on v.osis_ref = s.osis
             left join public.memory_verse mv on mv.verse_id = v.id where mv.id is null) then
    raise exception 'osis refs with no memory verse: %', (select string_agg(distinct s.osis, ', ') from src s
      left join public.verse v on v.osis_ref = s.osis left join public.memory_verse mv on mv.verse_id = v.id
      where mv.id is null);
  end if;
end $$;

insert into public.memory_verse_text (memory_verse_id, translation_code, text)
select mv.id, s.code, s.text from src s
join public.verse v on v.osis_ref = s.osis
join public.memory_verse mv on mv.verse_id = v.id
on conflict (memory_verse_id, translation_code) do update set text = excluded.text;

do $$ begin
  if exists (select 1 from (values ${TRANSLATIONS.map((t) => `(${lit(t.code)})`).join(', ')}) c(code)
             where (select count(*) from public.memory_verse_text t where t.translation_code = c.code) <> ${COUNT}) then
    raise exception 'expected ${COUNT} memory verse texts per translation';
  end if;
end $$;
commit;
`;
  const file = path.join(DIR, '.cache', 'memory-verse-texts.sql');
  fs.writeFileSync(file, out);
  console.log(`wrote ${rows.length} texts in ${TRANSLATIONS.length} translations to ${file}`);
}
