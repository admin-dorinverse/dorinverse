// Builds the Bible reference layer load from the Theographic JSON
// (github.com/admin-dorinverse/theographic-bible-metadata, json/).
//
//   node scripts/theographic/build-load-sql.mjs <json-dir> <out-dir>
//   for f in <out-dir>/*.sql; do npx supabase db query --linked -f "$f"; done
//
// Each output file is one statement, in load order. Rows upsert on source_id and
// links insert on conflict do nothing, so the whole run can be repeated safely.
import fs from 'node:fs';
import path from 'node:path';

const [jsonDir, outDir] = process.argv.slice(2);
if (!jsonDir || !outDir) {
  console.error('usage: build-load-sql.mjs <json-dir> <out-dir>');
  process.exit(1);
}

const load = (name) => JSON.parse(fs.readFileSync(path.join(jsonDir, `${name}.json`), 'utf8'));
const books = load('books');
const chapters = load('chapters');
const verses = load('verses');
const places = load('places');
const people = load('people');
const events = load('events');
const groups = load('peopleGroups');
const easton = load('easton');

// 1.8: psalm titles live in psalm_heading, not verse text. The source prints only this one inline.
const PSALM_TITLES = { 'Ps.132.1': 'A Song of degrees.' };

const int = (s) => (s === undefined || s === null || String(s).trim() === '' ? null : Number.parseInt(s, 10));
const num = (s) => (s === undefined || s === null || String(s).trim() === '' ? null : Number(s));
const first = (a) => (a && a.length ? a[0] : null);
const pairs = (rows, field) => rows.flatMap((r) => (r.fields[field] ?? []).map((x) => [r.id, x]));

// --- rows ------------------------------------------------------------------

const bookRows = books.map(({ id, fields: f }) => ({
  source_id: id,
  order: f.bookOrder,
  name: f.bookName,
  abbreviation: f.osisName,
  division: f.bookDiv ?? null,
  testament: { 'Old Testament': 'OT', 'New Testament': 'NT' }[f.testament],
  chapter_count: f.chapterCount,
  verse_count: f.verseCount,
}));

const chapterRows = chapters.map(({ id, fields: f }) => ({
  source_id: id,
  book: first(f.book),
  chapter_number: f.chapterNum,
  verse_count: f.verses.length,
}));

const psalmHeadings = [];
const verseRows = [...verses]
  .sort((a, b) => a.fields.verseID.localeCompare(b.fields.verseID))
  .map(({ id, fields: f }, i) => {
    let text = f.verseText;
    const title = PSALM_TITLES[f.osisRef];
    if (title) {
      if (!text.startsWith(title)) throw new Error(`${f.osisRef} no longer starts with its title`);
      text = text.slice(title.length).trimStart();
      psalmHeadings.push({ chapter: first(f.chapter), text: title });
    }
    return {
      source_id: id,
      book: first(f.book),
      chapter: first(f.chapter),
      verse_number: int(f.verseNum),
      sequence: i + 1,
      osis_ref: f.osisRef,
      text,
    };
  });

const placeRows = places.map(({ id, fields: f }) => ({
  source_id: id,
  lookup: f.placeLookup,
  name: f.displayTitle,
  feature_type: f.featureType ?? null,
  latitude: num(f.latitude),
  longitude: num(f.longitude),
  verse_count: f.verseCount ?? 0,
}));

const characterRows = people.map(({ id, fields: f }) => ({
  source_id: id,
  lookup: f.personLookup,
  name: f.name,
  display_title: f.displayTitle ?? null,
  gender: f.gender ?? null,
  birth_year: int(f.birthYear),
  death_year: int(f.deathYear),
  birth_place: first(f.birthPlace),
  death_place: first(f.deathPlace),
  verse_count: f.verseCount ?? 0,
  also_called: f.alsoCalled ? f.alsoCalled.split(',').map((s) => s.trim()).filter(Boolean) : null,
}));

const parentRows = people
  .filter((p) => p.fields.father || p.fields.mother)
  .map(({ id, fields: f }) => ({ source_id: id, father: first(f.father), mother: first(f.mother) }));

// a pair is stored once; the SQL orders it by uuid
const partnerPairs = [
  ...new Map(pairs(people, 'partners').map(([a, b]) => [[a, b].sort().join('|'), [a, b]])).values(),
];

const eventRows = events.map(({ id, fields: f }) => ({
  source_id: id,
  title: f.title,
  start_year: int(f.startDate), // "0030-05-01" -> 30
  start_date: f.startDate,
  duration: f.duration ?? null,
  sort_key: f.sortKey ?? null,
}));

const groupRows = groups.map(({ id, fields: f }) => ({ source_id: id, name: f.groupName }));

// Owner ruling (2026-10-26): Easton's entries without text are not loaded. The source has 159 of them
// (e.g. "Alphaeus", "Antioch"); each is a heading whose definitions sit in the numbered entries that
// follow it ("Alphaeus 1", "Alphaeus 2"), and dictionary_entry.text is required. Their person/place
// links are skipped with them.
const eastonWithText = easton.filter((e) => e.fields.dictText && e.fields.dictText.trim());
const dictionaryRows = eastonWithText.map(({ id, fields: f }) => ({
  source_id: id,
  term: f.termLabel,
  text: f.dictText,
  match_type: { person: 'character', place: 'place', multi: 'multi', unmatched: 'none' }[f.matchType],
}));

// --- SQL -------------------------------------------------------------------

const TAG = '$theo$';
const lit = (v) => {
  const s = JSON.stringify(v);
  if (s.includes(TAG)) throw new Error('payload contains the dollar-quote tag');
  return `${TAG}${s}${TAG}::jsonb`;
};
const chunk = (rows, size) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
};

const statements = [];
const add = (name, rows, size, sql) =>
  chunk(rows, size).forEach((part, i) => statements.push({ name: `${name}_${i + 1}`, sql: sql(lit(part)) }));

add('book', bookRows, 100, (j) => `
insert into public.book (source_id, "order", name, abbreviation, division, testament, chapter_count, verse_count)
select source_id, "order", name, abbreviation, division, testament, chapter_count, verse_count
from jsonb_to_recordset(${j}) as x(source_id text, "order" int, name text, abbreviation text, division text,
                                    testament text, chapter_count int, verse_count int)
on conflict (source_id) do update set "order" = excluded."order", name = excluded.name, abbreviation = excluded.abbreviation,
  division = excluded.division, testament = excluded.testament, chapter_count = excluded.chapter_count,
  verse_count = excluded.verse_count;`);

add('chapter', chapterRows, 2000, (j) => `
insert into public.chapter (source_id, book_id, chapter_number, verse_count)
select x.source_id, b.id, x.chapter_number, x.verse_count
from jsonb_to_recordset(${j}) as x(source_id text, book text, chapter_number int, verse_count int)
join public.book b on b.source_id = x.book
on conflict (source_id) do update set book_id = excluded.book_id, chapter_number = excluded.chapter_number,
  verse_count = excluded.verse_count;`);

add('verse', verseRows, 4000, (j) => `
insert into public.verse (source_id, book_id, chapter_id, verse_number, sequence, osis_ref, text)
select x.source_id, b.id, c.id, x.verse_number, x.sequence, x.osis_ref, x.text
from jsonb_to_recordset(${j}) as x(source_id text, book text, chapter text, verse_number int, sequence int,
                                    osis_ref text, text text)
join public.book b on b.source_id = x.book
join public.chapter c on c.source_id = x.chapter
on conflict (source_id) do update set book_id = excluded.book_id, chapter_id = excluded.chapter_id,
  verse_number = excluded.verse_number, sequence = excluded.sequence, osis_ref = excluded.osis_ref, text = excluded.text;`);

add('psalm_heading', psalmHeadings, 200, (j) => `
insert into public.psalm_heading (chapter_id, text)
select c.id, x.text
from jsonb_to_recordset(${j}) as x(chapter text, text text)
join public.chapter c on c.source_id = x.chapter
on conflict (chapter_id) do update set text = excluded.text;`);

add('place', placeRows, 2000, (j) => `
insert into public.place (source_id, lookup, name, feature_type, latitude, longitude, verse_count)
select source_id, lookup, name, feature_type, latitude, longitude, verse_count
from jsonb_to_recordset(${j}) as x(source_id text, lookup text, name text, feature_type text, latitude numeric,
                                    longitude numeric, verse_count int)
on conflict (source_id) do update set lookup = excluded.lookup, name = excluded.name, feature_type = excluded.feature_type,
  latitude = excluded.latitude, longitude = excluded.longitude, verse_count = excluded.verse_count;`);

add('bible_character', characterRows, 2000, (j) => `
insert into public.bible_character (source_id, lookup, name, display_title, gender, birth_year, death_year,
                                    birth_place_id, death_place_id, verse_count, also_called)
select x.source_id, x.lookup, x.name, x.display_title, x.gender, x.birth_year, x.death_year, bp.id, dp.id,
       x.verse_count, x.also_called
from jsonb_to_recordset(${j}) as x(source_id text, lookup text, name text, display_title text, gender text,
                                    birth_year int, death_year int, birth_place text, death_place text,
                                    verse_count int, also_called text[])
left join public.place bp on bp.source_id = x.birth_place
left join public.place dp on dp.source_id = x.death_place
on conflict (source_id) do update set lookup = excluded.lookup, name = excluded.name, display_title = excluded.display_title,
  gender = excluded.gender, birth_year = excluded.birth_year, death_year = excluded.death_year,
  birth_place_id = excluded.birth_place_id, death_place_id = excluded.death_place_id,
  verse_count = excluded.verse_count, also_called = excluded.also_called;`);

add('bible_character_parents', parentRows, 2000, (j) => `
update public.bible_character bc set father_id = f.id, mother_id = m.id
from jsonb_to_recordset(${j}) as x(source_id text, father text, mother text)
left join public.bible_character f on f.source_id = x.father
left join public.bible_character m on m.source_id = x.mother
where bc.source_id = x.source_id;`);

add('bible_character_partner', partnerPairs, 2000, (j) => `
insert into public.bible_character_partner (bible_character_id, partner_id)
select least(a.id, b.id), greatest(a.id, b.id)
from jsonb_array_elements(${j}) e
join public.bible_character a on a.source_id = e->>0
join public.bible_character b on b.source_id = e->>1
on conflict do nothing;`);

const link = (name, rows, table, cols, leftTable, rightTable) =>
  add(name, rows, 8000, (j) => `
insert into public.${table} (${cols[0]}, ${cols[1]})
select l.id, r.id
from jsonb_array_elements(${j}) e
join public.${leftTable} l on l.source_id = e->>0
join public.${rightTable} r on r.source_id = e->>1
on conflict do nothing;`);

link('verse_bible_character', pairs(verses, 'people'), 'verse_bible_character', ['verse_id', 'bible_character_id'], 'verse', 'bible_character');
link('verse_place', pairs(verses, 'places'), 'verse_place', ['verse_id', 'place_id'], 'verse', 'place');

add('event', eventRows, 1000, (j) => `
insert into public.event (source_id, title, start_year, start_date, duration, sort_key)
select source_id, title, start_year, start_date, duration, sort_key
from jsonb_to_recordset(${j}) as x(source_id text, title text, start_year int, start_date text, duration text,
                                    sort_key numeric)
on conflict (source_id) do update set title = excluded.title, start_year = excluded.start_year,
  start_date = excluded.start_date, duration = excluded.duration, sort_key = excluded.sort_key;`);

link('event_verse', pairs(events, 'verses'), 'event_verse', ['event_id', 'verse_id'], 'event', 'verse');
link('event_bible_character', pairs(events, 'participants'), 'event_bible_character', ['event_id', 'bible_character_id'], 'event', 'bible_character');
link('event_place', pairs(events, 'locations'), 'event_place', ['event_id', 'place_id'], 'event', 'place');

add('people_group', groupRows, 100, (j) => `
insert into public.people_group (source_id, name)
select source_id, name from jsonb_to_recordset(${j}) as x(source_id text, name text)
on conflict (source_id) do update set name = excluded.name;`);

link('group_member', pairs(groups, 'members'), 'group_member', ['group_id', 'bible_character_id'], 'people_group', 'bible_character');

add('dictionary_entry', dictionaryRows, 500, (j) => `
insert into public.dictionary_entry (source_id, term, text, match_type)
select source_id, term, text, match_type
from jsonb_to_recordset(${j}) as x(source_id text, term text, text text, match_type text)
on conflict (source_id) do update set term = excluded.term, text = excluded.text, match_type = excluded.match_type;`);

link('dictionary_entry_bible_character', pairs(eastonWithText, 'personLookup'), 'dictionary_entry_bible_character', ['dictionary_entry_id', 'bible_character_id'], 'dictionary_entry', 'bible_character');
link('dictionary_entry_place', pairs(eastonWithText, 'placeLookup'), 'dictionary_entry_place', ['dictionary_entry_id', 'place_id'], 'dictionary_entry', 'place');

fs.mkdirSync(outDir, { recursive: true });
statements.forEach(({ name, sql }, i) =>
  fs.writeFileSync(path.join(outDir, `${String(i + 1).padStart(3, '0')}_${name}.sql`), sql.trim() + '\n'),
);
console.log(`${statements.length} statements written to ${outDir}`);
