// Builds the main-characters review list from the ingredients files and writes
// scripts/dough-maker/roster.md, for the owner to mark adds and removals before any
// character summaries are written.
//
//   node scripts/dough-maker/roster.mjs [--fetch] [--matches]
//
// Works offline from .cache/ (fetch-reference.mjs). Timeline-event counts and Easton's
// entry lengths are not in that cache: the first run (or --fetch) reads them read-only
// from the linked project into .cache/events.json and .cache/dictionary.json. --matches
// prints every title match, for checking the title rule by hand.
//
// A person linked to any lesson's verses is considered when any of these holds:
//   title     a flavor or lesson title names them (not Words or Idioms: fixed terms).
//             When a title name fits several people in that range, only the one named
//             in the most verses of that range counts.
//   featured  one of the 3 most-named people in a lesson (ties included), and named in
//             3+ of its verses
//   20+       named in 20+ verses in the whole Bible
//   events    in 2+ timeline events
//   big       named in 5+ verses of a single lesson
// Each person considered is then checked against three signs of a story worth revealing:
//   title       as above
//   scenes      named in 2+ verses of each of 2+ chapters, outside genealogies and name lists
//   dictionary  Easton's gives them 600+ characters (an entry naming several people is
//               shared out among them)
// 2 or 3 signs, or an owner add: on the list. Everyone else is left off.
// The finished list is the owner's, stored on its own; these rules only draft it.
// People are always handled by lookup: display names are shared (two Elijahs).
import fs from 'node:fs';
import path from 'node:path';
import {
  DIR, INGREDIENTS_DIR, RECIPES, FIXED_LESSON_TITLES, loadReference, expand, parseIngredients, agg,
} from './lib.mjs';

const args = process.argv.slice(2);

// Owner decision: God, the Holy Spirit, angels and evil spirits, and false gods are not
// characters for this list. Jesus Christ (jesus_905) stays.
const EXCLUDE = {
  god_1324: 'God',
  holy_spirit_7400: 'the Holy Spirit',
  satan_2476: 'Satan',
  gabriel_1261: 'an angel',
  michael_2068: 'an angel (the archangel)',
  baal_573: 'a false god',
  'baal-zebub_579': 'a false god',
  molech_2104: 'a false god',
  milcom_2084: 'a false god',
  chemosh_931: 'a false god',
  dagon_969: 'a false god',
  diana_1008: 'a false god',
  ashtoreth_341: 'a false god',
  jesus_904: 'Jesus called Justus (Colossians 4:11), not Jesus Christ',
};

// Owner decision (2026-10-28): on the list whatever their signs.
const OWNER_ADDS = new Set(['eve_1231', 'mary_1943', 'delilah_1005', 'luke_1836', 'bartimaeus_406', 'elisabeth_1152',
  'cornelius_956', 'lydia_1837', 'priscilla_2370', 'methuselah_2042',
  // from the one-sign and no-sign sections: each has two moments a player would remember
  'enoch_1192', 'reuben_2429', 'simeon_2741', 'potiphar_2368', 'tamar_2821', 'daughter_of_pharaoh_988', 'manoah_1933',
  'nabal_2126', 'gomer_1329', 'darius_980', 'herod_1504', 'herod_1505', 'james_719', 'simeon_2742', 'philip_2347',
  'simon_2752', 'dorcas_2810', 'herod_1506', 'aquila_279',
  'sanballat_2470', 'tobiah_2872', 'shem_2613', 'japheth_726', 'amnon_232', 'tamar_2822', 'ananias_259']);

// Owner decision: Jesus is listed with the Gospels, not with his first prophecy (Genesis 49:10).
const JESUS = 'jesus_905';

// Genealogies and name lists: a name there is not a scene in the person's story.
const NAME_LISTS = 'Genesis 5; Genesis 10; Genesis 11:10–32; Genesis 25:1–4; Genesis 25:12–18; Genesis 35:22–29; ' +
  'Genesis 36; Genesis 46:8–27; Exodus 6:14–25; Numbers 1–3; Numbers 7; Numbers 13:4–16; Numbers 26; Numbers 33; ' +
  'Numbers 34:16–29; Joshua 15–21; 1 Chronicles 1–9; 1 Chronicles 11:26–47; 1 Chronicles 12; 1 Chronicles 15; ' +
  '1 Chronicles 23–27; Ezra 2; Ezra 8:1–14; Ezra 10:18–44; Nehemiah 3; Nehemiah 7; Nehemiah 10–12; Matthew 1:1–17; ' +
  'Luke 3:23–38; Romans 16';
const DICTIONARY_MIN = 600;

// Title matches checked by hand and found wrong: the word in the title is a place, or
// names a different person than the one the reference layer picked.
// The reference layer files a nation or tribe under its ancestor (Moab, Dan), so "Road
// to Moab" matches the man. Unused entries are reported, so stale ones show up.
const NOT_TITLE_MATCH = [
  ...[['gilead_1318', 'Jephthah: The Outcast Who Led Gilead'],
    ['midian_2075', 'Gideon: Three Hundred Against Midian'],
    ['midian_2075', 'Chasing the Kings of Midian'],
    ['midian_2075', 'Moses Flees to Midian'],
    ['moab_2103', 'Israel: The Road to Moab'],
    ['moab_2103', 'A Covenant Made in Moab'],
    ['moab_2103', 'Moab Defeated at the Jordan'],
    ['moab_2103', 'Passing Edom, Moab, and Ammon'],
    ['moab_2103', 'Ammon, Moab, Edom, Philistines'],
    ['moab_2103', 'Moab Will Be Destroyed'],
    ['moab_2103', 'Philistia and Moab Will Howl'],
    ['canaan_914', 'Israel: Ready to Enter Canaan'],
    ['canaan_914', 'Joshua: Crossing the Jordan into Canaan'],
    ['canaan_914', 'Leaving Haran for Canaan'],
    ['amalek_197', 'Hands Held Up Against Amalek'],
    ['haran_1407', 'Leaving Haran for Canaan'],
    ['dan_973', 'Dan Takes Micah’s Gods'],
    ['dan_973', 'Invited from Beersheba to Dan'],
    ['gad_1262', 'Reuben and Gad Ask for Land'],
    ['reuben_2429', 'Reuben and Gad Ask for Land'],
    ['ephraim_1206', 'The Drunkards of Ephraim'],
    ['benjamin_463', 'Benjamin: A Tribe Nearly Destroyed'],
    ['benjamin_463', 'Arrested at the Gate of Benjamin'],
    ['benjamin_463', 'Finding Wives for Benjamin'],
    ['benjamin_463', 'Israel at War with Benjamin'],
    ['judah_1751', 'Hezekiah: None Like Him in Judah'],
    ['judah_1751', 'Judah: Turning Back to God'],
    ['shechem_2588', 'Dinah and the Men of Shechem'],
    ['israel_682', 'A Star Out of Jacob'],
    ['israel_682', 'The LORD Who Chose Jacob'],
  ].map(([lookup, title]) => ({ lookup, title, why: 'a place, nation or tribe, not the person' })),
  // the Gospel of John, not John the Baptist (named in John 10:40–41)
  { lookup: 'john_1676', title: 'John: Jesus the Good Shepherd', why: 'the book of John, not this John' },
];

// Ancestors whose name is also a nation, tribe or land: their verse counts include
// verses about the people descended from them.
const NATION_NAMES = new Set(['israel_682', 'esau_1216', 'reuben_2429', 'simeon_2741', 'levi_1820', 'judah_1751',
  'dan_973', 'naphtali_2149', 'gad_1262', 'asher_337', 'issachar_645', 'zebulun_3002', 'benjamin_463',
  'ephraim_1206', 'manasseh_1928', 'canaan_914', 'moab_2103', 'midian_2075', 'amalek_197', 'heth_1510',
  'ham_1359', 'cush_962']);

const RULES = [
  ['title', 'title'],
  ['featured', 'featured'],
  ['twenty', '20+ verses'],
  ['events', 'events'],
  ['big', 'big in one lesson'],
];

// --- data -------------------------------------------------------------------------

const ref = loadReference();
const eventsFile = path.join(DIR, '.cache', 'events.json');
if (args.includes('--fetch') || !fs.existsSync(eventsFile)) {
  const rows = agg(`select c.lookup, count(*)::int as n from public.event_bible_character e
    join public.bible_character c on c.id = e.bible_character_id group by c.lookup`);
  fs.writeFileSync(eventsFile, JSON.stringify(Object.fromEntries(rows.map((r) => [r.lookup, r.n]))));
  console.log(`timeline events cached for ${rows.length} people in ${eventsFile}`);
}
const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));

const dictionaryFile = path.join(DIR, '.cache', 'dictionary.json');
if (args.includes('--fetch') || !fs.existsSync(dictionaryFile)) {
  const rows = agg(`select c.lookup, max(length(d.text) / n.people)::int as n
    from public.dictionary_entry_bible_character x
    join public.bible_character c on c.id = x.bible_character_id
    join public.dictionary_entry d on d.id = x.dictionary_entry_id
    join (select dictionary_entry_id, count(*) as people from public.dictionary_entry_bible_character
          group by dictionary_entry_id) n on n.dictionary_entry_id = d.id
    group by c.lookup`);
  fs.writeFileSync(dictionaryFile, JSON.stringify(Object.fromEntries(rows.map((r) => [r.lookup, r.n]))));
  console.log(`Easton's entry lengths cached for ${rows.length} people in ${dictionaryFile}`);
}
const dictionary = JSON.parse(fs.readFileSync(dictionaryFile, 'utf8'));

const bookByOsis = Object.fromEntries(ref.books.map((b) => [b.osis, b]));
const seqKey = (r) => { const [b, c, v] = r.split('.'); return bookByOsis[b].order * 1e6 + Number(c) * 1e3 + Number(v); };
const refText = (r) => { const [b, c, v] = r.split('.'); return `${bookByOsis[b].name} ${c}:${v}`; };

// Every person's named verses (canonical order) and the places linked to those verses.
const versesOf = new Map(), placesOf = new Map();
for (const [r, x] of Object.entries(ref.links)) {
  for (const k of x.p) {
    (versesOf.get(k) ?? versesOf.set(k, []).get(k)).push(r);
    const s = placesOf.get(k) ?? placesOf.set(k, new Set()).get(k);
    for (const l of x.l) s.add(l);
  }
}
for (const vs of versesOf.values()) vs.sort((a, b) => seqKey(a) - seqKey(b));

// scenes: chapters, outside the name lists, with 2+ verses that name the person
const inNameList = new Set(expand(ref, NAME_LISTS));
const scenesOf = (k) => {
  const perChapter = new Map();
  for (const v of versesOf.get(k) ?? []) {
    if (inNameList.has(v)) continue;
    const c = v.split('.').slice(0, 2).join('.');
    perChapter.set(c, (perChapter.get(c) ?? 0) + 1);
  }
  return [...perChapter.values()].filter((n) => n >= 2).length;
};

const nameOf = (k) => ref.people[k];
const shared = new Map();
for (const n of Object.values(ref.people)) shared.set(n, (shared.get(n) ?? 0) + 1);
// The names a title can call someone by: "Mary (Mother of Jesus)" -> "Mary", and
// "John the Apostle" -> "John the Apostle" or "John". Matched on whole words, without 's.
const titleNames = (k) => {
  const base = nameOf(k).replace(/\s*\(.*\)$/, '');
  const short = base.split(' the ')[0];
  return short === base ? [base] : [base, short];
};
const words = (s) => ` ${s.replace(/[’']s\b/g, '').replace(/[^A-Za-z]+/g, ' ')} `;

const isReference = (title) => /^(\d )?[A-Z][a-z]+( [A-Z][a-z]+)* \d+(:\d+)?([–-]\d+(:\d+)?)?$/.test(title);

function countPeople(osisRefs) {
  const m = new Map();
  for (const v of osisRefs) for (const k of ref.links[v]?.p ?? []) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

// --- rules ------------------------------------------------------------------------

const st = new Map();   // lookup -> { rules:Set, maxLesson, box }
const entry = (k) => st.get(k) ?? st.set(k, { rules: new Set(), maxLesson: 0, box: null }).get(k);
const matches = [];     // { k, word, title, where, dropped? }
const unread = [];

const files = fs.readdirSync(INGREDIENTS_DIR).filter((f) => f.endsWith('.md') && f !== 'coverage.md');
const parsed = files.map((f) => parseIngredients(fs.readFileSync(path.join(INGREDIENTS_DIR, f), 'utf8'), f))
  .sort((a, b) => RECIPES.indexOf(a.recipe) - RECIPES.indexOf(b.recipe));

for (const { recipe, flavors } of parsed) {
  for (const fl of flavors) {
    const box = `${recipe} — ${fl.title}`;
    const all = new Map();
    const lessons = fl.lessons.map((l) => {
      let vs = [];
      try { vs = expand(ref, l.range); } catch (e) { unread.push(`${l.at}: ${e.message}`); }
      const m = countPeople(vs);
      for (const [k, n] of m) all.set(k, (all.get(k) ?? 0) + n);
      return { title: l.note.split(/\r?\n/)[0], m };
    });

    for (const { m } of lessons) {
      for (const [k, n] of m) {
        const e = entry(k);
        e.box ??= box;
        e.maxLesson = Math.max(e.maxLesson, n);
        // one of the 3 most-named: fewer than 3 people named in more of its verses
        const above = [...m.values()].filter((x) => x > n).length;
        if (above < 3 && n >= 3) e.rules.add('featured');
        if (n >= 5) e.rules.add('big');
      }
    }

    if (FIXED_LESSON_TITLES.includes(recipe)) continue;
    const check = (title, m, where) => {
      const best = new Map();   // title word -> [lookup, verses in range]
      for (const [k, n] of m) {
        for (const b of titleNames(k)) {
          if (b.length <= 2 || !words(title).includes(words(b))) continue;
          if (!best.has(b) || best.get(b)[1] < n) best.set(b, [k, n]);
        }
      }
      for (const [word, [k]] of best) {
        const wrong = NOT_TITLE_MATCH.find((x) => x.lookup === k && x.title === title);
        if (wrong) wrong.used = true;
        matches.push({ k, word, title, where, dropped: !!wrong });
        if (!wrong) entry(k).rules.add('title');
      }
    };
    check(fl.title, all, `${recipe} flavor`);
    // Verses lesson titles are the verse reference ("Joshua 1:9"): a book, not a person.
    for (const l of lessons) if (!isReference(l.title)) check(l.title, l.m, `${recipe} lesson`);
  }
}

for (const [k, e] of st) {
  const vc = versesOf.get(k)?.length ?? 0;
  if (vc >= 20) e.rules.add('twenty');
  if ((events[k] ?? 0) >= 2) e.rules.add('events');
}

const qualified = [...st].filter(([, e]) => e.rules.size);
const excluded = qualified.filter(([k]) => EXCLUDE[k]);
const list = qualified.filter(([k]) => !EXCLUDE[k]).map(([k, e]) => {
  const vs = versesOf.get(k) ?? [];
  const chapters = new Set(vs.map((v) => v.split('.').slice(0, 2).join('.')));
  const first = k === JESUS ? vs.find((v) => bookByOsis[v.split('.')[0]].testament === 'NT') : vs[0];
  const signs = [e.rules.has('title') && 'title', scenesOf(k) >= 2 && 'scenes',
    (dictionary[k] ?? 0) >= DICTIONARY_MIN && 'dictionary'].filter(Boolean);
  const section = signs.length >= 2 || OWNER_ADDS.has(k) ? 'on' : signs.length === 1 ? 'pick' : 'skim';
  return {
    k, e, vc: vs.length, first, signs, section,
    book: bookByOsis[first.split('.')[0]],
    oneChapter: chapters.size === 1,
    noPlace: (placesOf.get(k)?.size ?? 0) === 0,
  };
}).sort((a, b) => seqKey(a.first) - seqKey(b.first) || nameOf(a.k).localeCompare(nameOf(b.k)));
for (const k of OWNER_ADDS) if (!list.some((p) => p.k === k)) console.error(`owner add ${k} is not among the people considered`);

if (args.includes('--matches')) {
  for (const m of matches) {
    const other = [...st.get(m.k).rules].filter((r) => r !== 'title').join(',') || 'title only';
    console.log(`${m.dropped ? 'DROPPED ' : ''}${m.k} [${nameOf(m.k)}] (${other}) <- "${m.word}" in ${m.where}: ${m.title}`);
  }
}
for (const x of NOT_TITLE_MATCH) if (!x.used) console.error(`unused title correction: ${x.lookup} "${x.title}"`);
if (unread.length) console.error(`${unread.length} lesson ranges could not be read:\n  ${unread.join('\n  ')}`);

// --- roster.md --------------------------------------------------------------------

const label = (k) => {
  const n = nameOf(k);
  return shared.get(n) > 1 ? `${n} _(first named ${refText(versesOf.get(k)[0])})_` : n;
};
const chosen = list.filter((p) => p.section === 'on');

const md = [
  '# Main characters',
  '',
  '_Written by `node scripts/dough-maker/roster.mjs`. Edit the script, not this file._',
  '',
  'These are the characters a cookie box can reveal. Once saved to the database the list stands on its own, ' +
  'so changing a lesson title or reloading the Bible data never changes who is on it.',
  '',
  `Drafted from everyone the lessons lean on (${list.length} people): those with at least two of three signs ` +
  '(a title names them; scenes in 2+ chapters, not counting genealogies; a dictionary entry of their own), ' +
  'plus the people you added. God, the Holy Spirit, Satan, angels and false gods are left off. Jesus is listed with the Gospels.',
  '',
  '**Flags** in the last column:',
  '',
  '- **one chapter — check for 2 moments**: every verse that names them is in one chapter.',
  '- **no place named with them**: their places will be picked by hand.',
  '- **also a nation or tribe**: their verse count includes verses about the nation, so it runs high.',
  '',
  'When two people share a name, the row says where the Bible first names this one.',
  '',
  `**${chosen.length} characters**, ${chosen.filter((p) => OWNER_ADDS.has(p.k)).length} of them added by you (marked _added_).`,
];

let book = null;
for (const p of chosen) {
  if (p.book !== book) {
    book = p.book;
    const n = chosen.filter((x) => x.book === book).length;
    md.push('', `## ${book.name} (${n})`, '', '| Name | Verses | Signs | First cookie box | Check |', '|---|---|---|---|---|');
  }
  const signs = [...p.signs, OWNER_ADDS.has(p.k) && '_added_'].filter(Boolean).join(', ') || '—';
  const flags = [p.oneChapter && 'one chapter — check for 2 moments', p.noPlace && 'no place named with them',
    NATION_NAMES.has(p.k) && 'also a nation or tribe'].filter(Boolean).join('; ');
  md.push(`| ${label(p.k)} | ${p.vc} | ${signs} | ${p.e.box} | ${flags} |`);
}

fs.writeFileSync(path.join(DIR, 'roster.md'), md.join('\n') + '\n');
// The list by lookup, for the character-card tools (cards.mjs)
fs.writeFileSync(path.join(DIR, 'roster.json'), JSON.stringify(chosen.map((p) => ({
  lookup: p.k, name: nameOf(p.k), shared: shared.get(nameOf(p.k)) > 1, verses: p.vc, box: p.e.box,
})), null, 1) + '\n');
console.log(`${chosen.length} characters (from ${list.length} considered; ${excluded.length} left off: ` +
  `${excluded.map(([k]) => nameOf(k)).join(', ')}); wrote roster.md and roster.json`);
