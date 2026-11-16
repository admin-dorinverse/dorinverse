// Loads the finished lesson data into the linked Supabase project (tables from
// supabase/migrations/20261116120000_lesson_content.sql).
//
//   node scripts/dough-maker/load-db.mjs --check     # read and check every file, change nothing
//   node scripts/dough-maker/load-db.mjs             # check, then load (safe to run again)
//   node scripts/dough-maker/load-db.mjs --images    # also upload the place photos to the place-images bucket
//   node scripts/dough-maker/load-db.mjs --verify    # compare the database with the files, change nothing
//
// Safe to run again: every row has a key from the files (passage number, stop, card, word, idiom number,
// place lookup, ...). The rows go into stage.* first, in chunks; then one transaction updates public.* in
// place and removes rows that are no longer in the files. Nothing is merged unless every chunk arrived.
//
// Sources (old/test folders such as *-test*, *-v1, model-test, answers-batch-test are never read):
//   output/passages.json, output/prep/<folder>/prep.json, output/answers/<folder>/answer-explanations.json,
//   output/burnt/<folder>/burnt-cookies.json, output/bigidea/<folder>/big-idea.json,
//   output/definitions/definitions.json, output/idioms/idioms.json, output/sample/sample-table.json,
//   output/sample/prayers.json (retellings of a prayer), output/sample/place-cards.json,
//   data/place-images/images.json, data/prophecy-links.json, output/trivia/trivia.json, data/bsb-footnotes.json.
// Character cookies take their verses from character_card_verse (the character cards already loaded).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadReference, expand, agg, query } from './lib.mjs';

const DIR = import.meta.dirname;
const OUT = path.join(DIR, 'output');
const DATA = path.join(DIR, 'data');
const CACHE = path.join(DIR, 'run', '.cache', 'load-db');
const args = new Set(process.argv.slice(2));
const read = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'));

// ---- tables: name, columns, key columns (parents before children) -------------------------------------
const TABLES = [
  ['passage', ['id', 'folder', 'title', 'start_ref', 'end_ref', 'from_verse_id', 'to_verse_id', 'type', 'story_group', 'story_position'], ['id']],
  ['passage_included', ['passage_id', 'position', 'kind', 'start_ref', 'end_ref', 'from_verse_id', 'to_verse_id'], ['passage_id', 'position']],
  ['passage_stop', ['passage_id', 'stop', 'verses', 'from_verse_id', 'to_verse_id'], ['passage_id', 'stop']],
  ['passage_card', ['passage_id', 'stop', 'card', 'kind', 'verses', 'text', 'question', 'question_type'], ['passage_id', 'stop', 'card']],
  ['card_verse', ['passage_id', 'stop', 'card', 'verse_id'], ['passage_id', 'stop', 'card', 'verse_id']],
  ['card_answer', ['passage_id', 'stop', 'card', 'position', 'text', 'correct', 'blank', 'explanation'], ['passage_id', 'stop', 'card', 'position']],
  ['burnt_line', ['passage_id', 'line', 'verses', 'text', 'burnt'], ['passage_id', 'line']],
  ['burnt_line_wrong', ['passage_id', 'line', 'position', 'wrong', 'true_text', 'verse', 'from_verse_id', 'to_verse_id'], ['passage_id', 'line', 'position']],
  ['burnt_line_verse', ['passage_id', 'line', 'verse_id'], ['passage_id', 'line', 'verse_id']],
  ['big_idea_paragraph', ['passage_id', 'paragraph', 'text'], ['passage_id', 'paragraph']],
  ['lesson_word', ['word', 'forms'], ['word']],
  ['lesson_word_meaning', ['word', 'meaning_no', 'meaning', 'sources'], ['word', 'meaning_no']],
  ['card_word', ['passage_id', 'stop', 'card', 'word', 'meaning_no'], ['passage_id', 'stop', 'card', 'word']],
  ['lesson_idiom', ['id', 'idiom', 'debated'], ['id']],
  ['lesson_idiom_meaning', ['idiom_id', 'meaning_no', 'meaning', 'sources'], ['idiom_id', 'meaning_no']],
  ['lesson_idiom_verse', ['idiom_id', 'verse_id'], ['idiom_id', 'verse_id']],
  ['card_idiom', ['passage_id', 'stop', 'card', 'idiom_id', 'meaning_no'], ['passage_id', 'stop', 'card', 'idiom_id']],
  ['place_card', ['lookup', 'name', 'kind', 'kind_from', 'line', 'sources', 'image_path', 'image_author', 'image_credit',
    'image_credit_url', 'image_license', 'image_description', 'image_source_url', 'image_file_url', 'image_from', 'image_openbible_place',
    'image_openbible_id', 'image_satellite'], ['lookup']],
  ['place_card_place', ['lookup', 'place_id'], ['lookup', 'place_id']],
  ['place_card_moment', ['lookup', 'position', 'title', 'text', 'passage'], ['lookup', 'position']],
  ['place_card_moment_verse', ['lookup', 'position', 'verse_id'], ['lookup', 'position', 'verse_id']],
  ['sample_cookie', ['key', 'type', 'reference', 'instruction', 'who', 'reason', 'what_just_happened', 'key_line', 'prayed_at',
    'passage_id', 'stop', 'card', 'placed_by',
    'prophecy_link_id', 'prophecy_link_no', 'half', 'quote', 'bible_character_id', 'place_lookup'], ['key']],
  ['sample_cookie_line', ['key', 'position', 'text', 'reference'], ['key', 'position']],
  ['sample_cookie_verse', ['key', 'verse_id'], ['key', 'verse_id']],
  ['trivia_question', ['passage_id', 'number', 'from_stop', 'from_card', 'type', 'verses', 'question'], ['passage_id', 'number']],
  ['trivia_answer', ['passage_id', 'number', 'position', 'text', 'correct'], ['passage_id', 'number', 'position']],
  ['trivia_question_verse', ['passage_id', 'number', 'verse_id'], ['passage_id', 'number', 'verse_id']],
  ['bsb_footnote', ['verse_id', 'position', 'after', 'text'], ['verse_id', 'position']],
];
const rows = Object.fromEntries(TABLES.map(([t]) => [t, []]));
const errors = [];
const err = (m) => { if (errors.length < 200) errors.push(m); else if (errors.length === 200) errors.push('... more'); };

// ---- verses ------------------------------------------------------------------------------------------
const ref = loadReference();
const verseRows = agg(`select osis_ref, id, sequence from public.verse`);
const verseId = new Map(verseRows.map((v) => [v.osis_ref, v.id]));
const seqOf = new Map(verseRows.map((v) => [v.id, Number(v.sequence)]));
if (verseId.size !== ref.totalVerses) err(`database has ${verseId.size} verses, the reference cache ${ref.totalVerses}`);
// "Genesis 4:2, 9" / "Genesis 23:4, 19-20" / "Acts 1:8, 2:4" -> "Genesis 4:2; Genesis 4:9" ...
function commas(text) {
  let lastBook = null;
  return text.split(';').map((p) => {
    // "1 Kings 15:33-34; 16:1-4": a part that starts with a chapter number is in the book before it
    let part = p.trim();
    if (/^\d+:/.test(part) && lastBook) part = `${lastBook} ${part}`;
    lastBook = part.match(/^(.+?)\s+\d+(?::|$)/)?.[1] ?? lastBook;
    const bits = part.split(',').map((b) => b.trim());
    const m = bits[0].match(/^(.+?)\s+(\d+):/);
    if (bits.length === 1 || !m) return part;
    let [, book, chapter] = m;
    return bits.map((b, i) => {
      if (i === 0) return b;
      const c = b.match(/^(\d+):/);
      if (c) chapter = c[1];
      // a later bit that starts with a number belongs to the same book (and chapter, unless it names one)
      return /^\d/.test(b) ? (c ? `${book} ${b}` : `${book} ${chapter}:${b}`) : b;
    }).join('; ');
  }).join('; ');
}
// The lesson files write ranges with a hyphen ("Genesis 1:1-13"); the reference parser wants an en dash.
function verses(text, at) {
  try {
    const ids = expand(ref, commas(text).replace(/(\d)\s*-\s*(\d)/g, '$1–$2')).map((o) => {
      const id = verseId.get(o);
      if (!id) throw new Error(`no verse ${o} in the database`);
      return id;
    });
    return [...new Set(ids)];
  } catch (e) { err(`${at}: "${text}": ${e.message}`); return []; }
}

// ---- passages, Prep, answers, Burnt Cookies, Big Idea ------------------------------------------------
const passages = read(OUT, 'passages.json');
const folderOf = new Map();
for (const f of fs.readdirSync(path.join(OUT, 'prep'))) {
  const n = Number(f.slice(0, 4));
  if (!/^\d{4} /.test(f)) continue;
  if (folderOf.has(n)) err(`two prep folders for passage ${n}`);
  folderOf.set(n, f);
}
const cardKey = (p, s, c) => `${p}|${s}|${c}`;
const cards = new Map();   // key -> card row
const passageIds = new Set();
for (const p of passages) {
  const at = `passage ${p.id}`;
  if (passageIds.has(p.id)) err(`${at}: listed twice`);
  passageIds.add(p.id);
  const folder = folderOf.get(p.id);
  if (!folder) { err(`${at}: no prep folder`); continue; }
  const from = verses(p.start, at)[0], to = verses(p.end, at).at(-1);
  rows.passage.push({ id: p.id, folder, title: p.title, start_ref: p.start, end_ref: p.end, from_verse_id: from, to_verse_id: to,
    type: p.type, story_group: p.story_group, story_position: p.position });
  p.included.forEach((x, i) => rows.passage_included.push({ passage_id: p.id, position: i + 1, kind: x.kind, start_ref: x.start, end_ref: x.end,
    from_verse_id: verses(x.start, at)[0], to_verse_id: verses(x.end, at).at(-1) }));

  const prep = read(OUT, 'prep', folder, 'prep.json');
  for (const s of prep.stops) {
    const sv = verses(s.verses, `${at} stop ${s.stop}`);
    rows.passage_stop.push({ passage_id: p.id, stop: s.stop, verses: s.verses, from_verse_id: sv[0], to_verse_id: sv.at(-1) });
    for (const c of s.cards) {
      const k = cardKey(p.id, s.stop, c.card), cat = `${at} stop ${s.stop} card ${c.card}`;
      if (cards.has(k)) err(`${cat}: twice`);
      if (c.needs_agent_fix || c.needs_human_decision) err(`${cat}: still flagged`);
      const row = { passage_id: p.id, stop: s.stop, card: c.card, kind: c.kind, verses: c.verses,
        text: c.kind === 'story' ? c.text : null, question: c.kind === 'choice' ? c.question : null,
        question_type: c.kind === 'choice' ? c.type : null, answers: c.answers };
      cards.set(k, row);
      rows.passage_card.push(row);
      const cv = verses(c.verses, cat);
      if (!cv.length) err(`${cat}: no verses`);
      for (const v of cv) rows.card_verse.push({ passage_id: p.id, stop: s.stop, card: c.card, verse_id: v });
    }
  }

  const ans = read(OUT, 'answers', folder, 'answer-explanations.json');
  const explained = new Set();
  for (const a of ans.cards) {
    const k = cardKey(p.id, a.stop, a.card), cat = `${at} stop ${a.stop} card ${a.card}`;
    const c = cards.get(k);
    if (!c || c.kind !== 'choice') { err(`${cat}: explanations for a card that is not a choice card`); continue; }
    explained.add(k);
    const texts = c.answers.map((x) => x.text);
    if (new Set(texts).size !== texts.length) err(`${cat}: two answers with the same words`);
    // one right answer; a two-blank fill in the blank has one per blank (blank 1 and blank 2) and 5 words
    const right = c.answers.filter((x) => x.correct), blanks = right.map((x) => x.blank ?? null).sort().join(',');
    const twoBlank = c.question_type === 'fill_blank' && (c.question.match(/___/g) ?? []).length === 2;
    if (twoBlank ? blanks !== '1,2' || c.answers.length !== 5 : right.length !== 1 || !['', '1'].includes(blanks)) err(`${cat}: right answers don't fit the card (${right.length} right, blanks "${blanks}")`);
    if (c.answers.some((x) => x.blank != null && !x.correct)) err(`${cat}: a wrong answer has a blank number`);
    if (a.explanations.length !== c.answers.length) err(`${cat}: ${a.explanations.length} explanations for ${c.answers.length} answers`);
    c.answers.forEach((x, i) => {
      const e = a.explanations.find((y) => y.answer === x.text);
      if (!e) err(`${cat}: no explanation for "${x.text}"`);
      rows.card_answer.push({ passage_id: p.id, stop: a.stop, card: a.card, position: i + 1, text: x.text, correct: x.correct === true,
        blank: x.blank ?? null, explanation: e?.explanation });
    });
  }
  for (const [k, c] of cards) if (c.passage_id === p.id && c.kind === 'choice' && !explained.has(k)) err(`${at} card ${k}: no explanations`);

  const burnt = read(OUT, 'burnt', folder, 'burnt-cookies.json');
  for (const l of burnt.lines) {
    rows.burnt_line.push({ passage_id: p.id, line: l.line, verses: l.verses, text: l.text, burnt: l.burnt === true });
    for (const v of verses(l.verses, `${at} burnt line ${l.line}`)) rows.burnt_line_verse.push({ passage_id: p.id, line: l.line, verse_id: v });
    if (l.burnt !== Boolean(l.wrong_details?.length)) err(`${at} burnt line ${l.line}: burnt is ${l.burnt} but it has ${l.wrong_details?.length ?? 0} wrong details`);
    (l.wrong_details ?? []).forEach((w, i) => {
      const wv = verses(w.verse, `${at} burnt line ${l.line} wrong ${i + 1}`);
      rows.burnt_line_wrong.push({ passage_id: p.id, line: l.line, position: i + 1, wrong: w.wrong, true_text: w.true, verse: w.verse,
        from_verse_id: wv[0], to_verse_id: wv.at(-1) });
    });
  }
  const big = read(OUT, 'bigidea', folder, 'big-idea.json');
  if (!big.paragraphs.length) err(`${at}: no Big Idea`);
  big.paragraphs.forEach((t, i) => rows.big_idea_paragraph.push({ passage_id: p.id, paragraph: i + 1, text: t }));
}
for (const n of folderOf.keys()) if (!passageIds.has(n)) err(`prep folder for passage ${n}, which is not in passages.json`);
const needCard = (p, s, c, at) => { if (!cards.has(cardKey(p, s, c))) err(`${at}: points at passage ${p} stop ${s} card ${c}, which does not exist`); };

// ---- definitions and idioms --------------------------------------------------------------------------
const defs = read(OUT, 'definitions', 'definitions.json');
const wordsLeftOut = [];
for (const w of defs.words) {
  // a word with no meaning can't pop up anywhere ("mica" has no meaning and no cards): left out, and listed
  if (!w.meanings.length) {
    if (w.cards.length) err(`word "${w.word}": on cards but has no meaning`);
    wordsLeftOut.push(w.word);
    continue;
  }
  rows.lesson_word.push({ word: w.word, forms: w.forms ?? [] });
  const nos = new Set(w.meanings.map((m) => m.id));
  for (const m of w.meanings) rows.lesson_word_meaning.push({ word: w.word, meaning_no: m.id, meaning: m.meaning, sources: m.sources });
  const seen = new Set();
  for (const c of w.cards) {
    const at = `word "${w.word}"`;
    needCard(c.passage_id, c.stop, c.card, at);
    if (!nos.has(c.meaning)) err(`${at}: card uses meaning ${c.meaning}, which it doesn't have`);
    const k = cardKey(c.passage_id, c.stop, c.card);
    if (seen.has(k)) { err(`${at}: on card ${k} twice`); continue; }
    seen.add(k);
    rows.card_word.push({ passage_id: c.passage_id, stop: c.stop, card: c.card, word: w.word, meaning_no: c.meaning });
  }
}
const idioms = read(OUT, 'idioms', 'idioms.json');
for (const d of idioms.idioms) {
  const at = `idiom ${d.id} "${d.idiom}"`;
  rows.lesson_idiom.push({ id: d.id, idiom: d.idiom, debated: d.debated === true });
  const nos = new Set(d.meanings.map((m) => m.id));
  for (const m of d.meanings) rows.lesson_idiom_meaning.push({ idiom_id: d.id, meaning_no: m.id, meaning: m.meaning, sources: m.sources });
  const vs = new Set(d.occurrences.flatMap((o) => verses(o, at)));
  for (const v of vs) rows.lesson_idiom_verse.push({ idiom_id: d.id, verse_id: v });
  const seen = new Set();
  for (const c of d.cards) {
    needCard(c.passage_id, c.stop, c.card, at);
    if (!nos.has(c.meaning)) err(`${at}: card uses meaning ${c.meaning}, which it doesn't have`);
    const k = cardKey(c.passage_id, c.stop, c.card);
    if (seen.has(k)) { err(`${at}: on card ${k} twice`); continue; }
    seen.add(k);
    rows.card_idiom.push({ passage_id: c.passage_id, stop: c.stop, card: c.card, idiom_id: d.id, meaning_no: c.meaning });
  }
}

// ---- place cards and photos --------------------------------------------------------------------------
const IMG_DIR = path.join(DATA, 'place-images');
const images = new Map(read(IMG_DIR, 'images.json').places.map((p) => [p.lookup, p.image]));
const placeIds = new Set(agg(`select id from public.place`).map((r) => r.id));
const versesOfPlace = new Map();
for (const r of agg(`select place_id, verse_id from public.verse_place`)) {
  if (!versesOfPlace.has(r.place_id)) versesOfPlace.set(r.place_id, []);
  versesOfPlace.get(r.place_id).push(r.verse_id);
}
const placeCards = read(OUT, 'sample', 'place-cards.json').cards;
const cookieVerses = new Map();   // cookie key -> Set of verse ids
const addCookie = (row, vs) => {
  if (cookieVerses.has(row.key)) { err(`sample cookie ${row.key}: twice`); return; }
  rows.sample_cookie.push({ reference: null, instruction: null, who: null, reason: null, what_just_happened: null, key_line: null,
    prayed_at: null, passage_id: null, stop: null, card: null, placed_by: null,
    prophecy_link_id: null, prophecy_link_no: null, half: null, quote: null, bible_character_id: null, place_lookup: null, ...row });
  cookieVerses.set(row.key, new Set(vs));
};
for (const c of placeCards) {
  const at = `place card ${c.lookup}`;
  if (!images.has(c.lookup)) err(`${at}: not in images.json`);
  const im = images.get(c.lookup);
  if (im && !fs.existsSync(path.join(IMG_DIR, im.file))) err(`${at}: photo ${im.file} is missing`);
  rows.place_card.push({ lookup: c.lookup, name: c.name, kind: c.kind, kind_from: c.kind_from, line: c.line, sources: c.sources,
    image_path: im?.file ?? null, image_author: im?.author ?? null, image_credit: im?.credit ?? null, image_credit_url: im?.credit_url ?? null,
    image_license: im?.license ?? null, image_description: im?.description ?? null, image_source_url: im?.url ?? null,
    image_file_url: im?.file_url ?? null, image_from: im?.from ?? null, image_openbible_place: im?.openbible_place ?? null,
    image_openbible_id: im?.image_id ?? null,
    image_satellite: im ? im.satellite === true : null });
  for (const id of new Set(c.place_ids)) {
    if (!placeIds.has(id)) err(`${at}: place ${id} is not in the database`);
    rows.place_card_place.push({ lookup: c.lookup, place_id: id });
  }
  c.moments.forEach((m, i) => {
    rows.place_card_moment.push({ lookup: c.lookup, position: i + 1, title: m.title, text: m.text, passage: m.passage });
    for (const v of verses(m.passage, `${at} moment ${i + 1}`)) rows.place_card_moment_verse.push({ lookup: c.lookup, position: i + 1, verse_id: v });
  });
  // Owner ruling 2026-11-16: the place cookie goes on every verse that names the place. place-cards.json lists
  // them (built from the database's verse_place links); 13 hand-fixed cards have no list, so they take the same
  // links straight from verse_place. The two must agree wherever the file has a list.
  const fromDb = [...new Set(c.place_ids.flatMap((id) => versesOfPlace.get(id) ?? []))];
  const vs = c.verses_all ? c.verses_all.flatMap((r) => verses(r, at)) : fromDb;
  if (c.verses_all && (vs.length !== fromDb.length || vs.some((v) => !fromDb.includes(v)))) err(`${at}: its verse list differs from verse_place`);
  if (!vs.length) err(`${at}: no verses`);
  addCookie({ key: `place:${c.lookup}`, type: 'place', place_lookup: c.lookup }, vs);
}
for (const l of images.keys()) if (!placeCards.some((c) => c.lookup === l)) err(`images.json has ${l}, which has no place card`);

// ---- Sample Table cookies ----------------------------------------------------------------------------
const sample = read(OUT, 'sample', 'sample-table.json');
const prayersFile = read(OUT, 'sample', 'prayers.json');
const prayerRepeats = prayersFile.repeats_removed ?? {};
const prayedAt = new Map(prayersFile.prayers.map((p) => [p.reference, p.prayed_at]));
// The commands shortlist's cut list names where a kept command (or a commandment) is told again:
// "same as <reference>", "a repeat of <words>", "repeats the Ten Commandments". Those verses join that cookie.
const commands = read(OUT, 'sample', 'commands-shortlist.json');
const toldAgain = new Map();   // cookie key -> extra references
const again = (key, r) => { if (!toldAgain.has(key)) toldAgain.set(key, []); toldAgain.get(key).push(r); };
for (const x of commands.cut) {
  let m;
  if (x.why === 'repeats the Ten Commandments') again('ten_commandments', x.reference);
  else if ((m = x.why.match(/^same as (.+)$/))) {
    if (!commands.shortlist.some((c) => c.reference === m[1])) err(`commands cut list: "${x.why}" is not on the shortlist`);
    again(`instruction:${m[1]}`, x.reference);
  } else if ((m = x.why.match(/^a repeat of (.+)$/))) {
    const hit = commands.shortlist.filter((c) => c.instruction.replace(/[.!]$/, '').toLowerCase() === m[1].toLowerCase());
    if (hit.length !== 1) err(`commands cut list: "${x.why}" matches ${hit.length} kept commands`);
    else again(`instruction:${hit[0].reference}`, x.reference);
  }
}
const linkFile = new Map(read(DATA, 'prophecy-links.json').map((l) => [l.id, l]));
// The database keeps one row per promise -> fulfillment pair, so a prophecy told twice has two rows with one
// title. A fulfillment cookie takes the row whose fulfillment holds its verse; a promise cookie the row whose
// promise holds its verse, and if two do, the one for the file's first fulfillment.
const linkRows = agg(`select id, title, prophecy_verse_id, coalesce(prophecy_to_verse_id, prophecy_verse_id) prophecy_to,
  fulfillment_verse_id, coalesce(fulfillment_to_verse_id, fulfillment_verse_id) fulfillment_to from public.jesus_prophecy_link where approved`);
const holds = (from, to, v) => seqOf.get(from) <= seqOf.get(v) && seqOf.get(v) <= seqOf.get(to);
function prophecyRow(link, half, firstVerse, at) {
  const same = linkRows.filter((r) => r.title === link.title);
  let hit = same.filter((r) => half === 'fulfillment' ? holds(r.fulfillment_verse_id, r.fulfillment_to, firstVerse) : holds(r.prophecy_verse_id, r.prophecy_to, firstVerse));
  if (hit.length > 1 && half === 'promise') {
    const f = verses(link.fulfillment[0].ref, at)[0];
    hit = hit.filter((r) => holds(r.fulfillment_verse_id, r.fulfillment_to, f));
  }
  if (hit.length !== 1) { err(`${at}: ${hit.length} database rows fit prophecy link "${link.title}" (${half})`); return null; }
  return hit[0].id;
}
// Prayers told again (prayers.json repeats_removed: retelling -> the prayer kept) join the prayer whose verses
// overlap the kept one ("Matthew 26:39-42" -> the cookie "Matthew 26:39").
const prayerCookies = sample.cookies.filter((c) => c.type === 'prayer');
const prayerAgain = new Map();
for (const [againRef, kept] of Object.entries(prayerRepeats)) {
  const kv = new Set(verses(kept, `prayers.json repeat ${againRef}`));
  const hit = prayerCookies.filter((c) => verses(c.reference, 'prayer').some((v) => kv.has(v)));
  if (hit.length !== 1) { err(`prayers.json: retelling ${againRef} -> ${kept} fits ${hit.length} prayer cookies`); continue; }
  if (!prayerAgain.has(hit[0].reference)) prayerAgain.set(hit[0].reference, []);
  prayerAgain.get(hit[0].reference).push(againRef);
}
const characterCards = new Set(agg(`select bible_character_id from public.character_card`).map((r) => r.bible_character_id));
for (const c of sample.cookies) {
  const at = `sample ${c.type} at passage ${c.passage_id} stop ${c.stop} card ${c.card}`;
  needCard(c.passage_id, c.stop, c.card, at);
  if (cards.get(cardKey(c.passage_id, c.stop, c.card))?.kind !== 'story') err(`${at}: not a story card`);
  const home = { passage_id: c.passage_id, stop: c.stop, card: c.card, placed_by: c.placed_by ?? null };
  if (c.type === 'ten_commandments') {
    const key = 'ten_commandments';
    addCookie({ key, type: c.type, ...home }, [...c.commandments.map((x) => x.reference), ...(toldAgain.get(key) ?? [])].flatMap((r) => verses(r, at)));
    c.commandments.forEach((x, i) => rows.sample_cookie_line.push({ key, position: i + 1, text: x.text, reference: x.reference }));
  } else if (c.type === 'instruction') {
    const key = `instruction:${c.reference}`;
    addCookie({ key, type: c.type, reference: c.reference, instruction: c.instruction, who: c.who, reason: c.reason, ...home },
      [c.reference, ...(toldAgain.get(key) ?? [])].flatMap((r) => verses(r, at)));
  } else if (c.type === 'prayer') {
    // the prayer's own verses, and the verses where the same prayer is told again
    // and the verse that says they prayed, where it sits outside the words (Ezra 10:1, Acts 4:31)
    const told = [c.reference, ...(prayerAgain.get(c.reference) ?? []), ...(prayedAt.get(c.reference) ? [prayedAt.get(c.reference)] : [])];
    addCookie({ key: `prayer:${c.reference}`, type: c.type, reference: c.reference, who: c.who, what_just_happened: c.what_just_happened,
      key_line: c.key_line, prayed_at: prayedAt.get(c.reference) ?? null, ...home }, told.flatMap((r) => verses(r, at)));
    if (!prayedAt.has(c.reference)) err(`${at}: not in prayers.json`);
  } else if (c.type === 'prophecy') {
    const link = linkFile.get(c.link_id);
    if (!link) err(`${at}: prophecy link ${c.link_id} is not in prophecy-links.json`);
    const dbId = link ? prophecyRow(link, c.half, verses(c.reference, at)[0], at) : null;
    addCookie({ key: `prophecy:${c.link_id}:${c.half}:${c.reference}`,   // a half can be told in two places (Acts 3:25, Galatians 3:16)
       type: c.type, reference: c.reference, prophecy_link_id: dbId ?? null,
      prophecy_link_no: c.link_id, half: c.half, quote: c.quote, ...home }, verses(c.reference, at));
  } else if (c.type === 'character') {
    if (!characterCards.has(c.character_id)) err(`${at}: ${c.name} has no character card`);
    addCookie({ key: `character:${c.character_id}`, type: c.type, bible_character_id: c.character_id, ...home }, []);   // verses: character_card_verse
  } else err(`${at}: unknown type`);
}
for (const key of toldAgain.keys()) if (!cookieVerses.has(key)) err(`commands cut list points at ${key}, which is not a cookie`);
for (const [key, vs] of cookieVerses) {
  if (!key.startsWith('character:') && !vs.size) err(`sample cookie ${key}: no verses`);
  for (const v of vs) rows.sample_cookie_verse.push({ key, verse_id: v });
}

// ---- trivia ------------------------------------------------------------------------------------------
const trivia = read(OUT, 'trivia', 'trivia.json');
if (trivia.questions.length !== trivia.count) err(`trivia.json says ${trivia.count} questions but has ${trivia.questions.length}`);
const tNo = new Map();
for (const q of trivia.questions) {
  const number = (tNo.get(q.passage_id) ?? 0) + 1;
  tNo.set(q.passage_id, number);
  const at = `trivia passage ${q.passage_id} #${number}`;
  if (!passageIds.has(q.passage_id)) err(`${at}: no such passage`);
  const [s, c] = q.from_card.split('-').map(Number);
  needCard(q.passage_id, s, c, at);
  rows.trivia_question.push({ passage_id: q.passage_id, number, from_stop: s, from_card: c, type: q.type, verses: q.verses, question: q.question });
  if (q.answers.filter((a) => a.correct).length !== 1) err(`${at}: ${q.answers.filter((a) => a.correct).length} right answers`);
  q.answers.forEach((a, i) => rows.trivia_answer.push({ passage_id: q.passage_id, number, position: i + 1, text: a.text, correct: a.correct === true }));
  for (const v of verses(q.verses, at)) rows.trivia_question_verse.push({ passage_id: q.passage_id, number, verse_id: v });
}

// ---- BSB footnotes -----------------------------------------------------------------------------------
const notePos = new Map();
for (const n of read(DATA, 'bsb-footnotes.json').notes) {
  const v = verses(n.ref, `footnote ${n.ref}`);
  if (v.length !== 1) { err(`footnote ${n.ref}: not one verse`); continue; }
  const position = (notePos.get(v[0]) ?? 0) + 1;
  notePos.set(v[0], position);
  rows.bsb_footnote.push({ verse_id: v[0], position, after: n.after ?? '', text: n.text });
}

// ---- duplicate keys ----------------------------------------------------------------------------------
for (const [t, , key] of TABLES) {
  const seen = new Set();
  for (const r of rows[t]) {
    const k = key.map((c) => r[c]).join('|');
    if (seen.has(k)) err(`${t}: key ${k} twice`);
    seen.add(k);
  }
}

console.log(TABLES.map(([t]) => `${t}: ${rows[t].length}`).join('\n'));
if (errors.length) { console.error(`\n${errors.length} problem(s):\n` + errors.join('\n')); process.exit(1); }
console.log('\nAll files check out.');
if (wordsLeftOut.length) console.log(`Words left out (no meaning, on no card): ${wordsLeftOut.join(', ')}`);
const expected = Object.fromEntries(TABLES.map(([t]) => [t, rows[t].length]));
if (args.has('--check')) process.exit(0);
if (args.has('--verify')) { verify(); process.exit(process.exitCode ?? 0); }

// ---- load --------------------------------------------------------------------------------------------
const TAG = '$load_json$';
fs.rmSync(CACHE, { recursive: true, force: true });
fs.mkdirSync(CACHE, { recursive: true });
// fresh stage tables each run, so they always have the same columns as public.*
query(TABLES.map(([t]) => `drop table if exists stage.${t}; create table stage.${t} (like public.${t} including defaults);`).join('\n'));
const LIMIT = 1_500_000;   // characters per chunk, so each query stays small
let n = 0;
for (const [t, cols] of TABLES) {
  let batch = [], size = 0;
  const flush = () => {
    if (!batch.length) return;
    const json = JSON.stringify(batch);
    if (json.includes(TAG)) throw new Error(`${t}: data contains ${TAG}`);
    const sql = `insert into stage.${t} (${cols.join(', ')}) select ${cols.join(', ')} from jsonb_populate_recordset(null::stage.${t}, ${TAG}${json}${TAG}::jsonb);`;
    fs.writeFileSync(path.join(CACHE, `${String(++n).padStart(3, '0')}-${t}.sql`), sql);
    query(sql);
    batch = []; size = 0;
  };
  for (const r of rows[t]) {
    const o = Object.fromEntries(cols.map((c) => [c, r[c] ?? null]));
    batch.push(o);
    size += JSON.stringify(o).length;
    if (size > LIMIT) flush();
  }
  flush();
  process.stdout.write(`staged ${t}\n`);
}

// One transaction: check every chunk arrived, add character cookie verses, upsert, then prune.
const q = (c) => `"${c}"`;
const merge = [`begin;`, `do $$ begin`];
for (const [t] of TABLES) {
  merge.push(`  if (select count(*) from stage.${t}) <> ${expected[t]} then raise exception 'stage.${t} has %, expected ${expected[t]}', (select count(*) from stage.${t}); end if;`);
}
merge.push(`end $$;`);
merge.push(`insert into stage.sample_cookie_verse (key, verse_id)
  select 'character:' || v.bible_character_id, v.verse_id from public.character_card_verse v
  join stage.sample_cookie s on s.bible_character_id = v.bible_character_id;`);
merge.push(`do $$ begin if exists (select 1 from stage.sample_cookie s where not exists (select 1 from stage.sample_cookie_verse v where v.key = s.key))
  then raise exception 'a sample cookie has no verses'; end if; end $$;`);
for (const [t, cols, key] of TABLES) {
  const rest = cols.filter((c) => !key.includes(c));
  const upd = rest.length
    ? `do update set ${rest.map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')} where (${rest.map((c) => `public.${t}.${q(c)}`).join(', ')}${rest.length === 1 ? ', null' : ''}) is distinct from (${rest.map((c) => `excluded.${q(c)}`).join(', ')}${rest.length === 1 ? ', null' : ''})`
    : 'do nothing';
  merge.push(`insert into public.${t} (${cols.map(q).join(', ')}) select ${cols.map(q).join(', ')} from stage.${t} on conflict (${key.map(q).join(', ')}) ${upd};`);
}
for (const [t, , key] of [...TABLES].reverse()) {
  merge.push(`delete from public.${t} p where not exists (select 1 from stage.${t} s where ${key.map((c) => `s.${q(c)} = p.${q(c)}`).join(' and ')});`);
}
// before commit: every table in public must now hold exactly what the files say (both ways)
merge.push(`do $$ begin`);
for (const [t, cols] of TABLES) {
  const c = cols.map(q).join(', ');
  merge.push(`  if exists (select ${c} from stage.${t} except select ${c} from public.${t}) or exists (select ${c} from public.${t} except select ${c} from stage.${t})
    then raise exception 'public.${t} does not match the files'; end if;`);
}
merge.push(`end $$;`);
merge.push(`truncate ${TABLES.map(([t]) => `stage.${t}`).join(', ')};`, `commit;`);
fs.writeFileSync(path.join(CACHE, 'merge.sql'), merge.join('\n'));
query(merge.join('\n'));
console.log('merged');

if (args.has('--images')) uploadImages();
verify();

// ---- photos ------------------------------------------------------------------------------------------
function uploadImages() {
  const have = new Set(agg(`select name from storage.objects where bucket_id = 'place-images'`).map((r) => r.name));
  const todo = rows.place_card.filter((r) => r.image_path && !have.has(r.image_path));
  for (const r of todo) {
    // run from the photo folder with a ./ path: the CLI reads a "C:\..." path as a remote one
    let res;
    for (let tryNo = 1; tryNo <= 4; tryNo++) {   // storage sometimes answers 520 for a moment: wait and try again
      if (tryNo > 1) spawnSync(process.execPath, ['-e', `setTimeout(() => {}, ${tryNo * 5000})`]);
      res = spawnSync('npx', ['-y', 'supabase@2.122.0', 'storage', 'cp', '--experimental', '--linked', `./${r.image_path}`,
        `ss:///place-images/${r.image_path}`, '--content-type', 'image/jpeg'], { cwd: IMG_DIR, encoding: 'utf8', shell: process.platform === 'win32' });
      if (res.status === 0) break;
    }
    if (res.status !== 0) throw new Error(`upload ${r.image_path}: ${(res.stderr || res.stdout).slice(0, 300)}`);
  }
  console.log(`photos uploaded: ${todo.length} (already there: ${have.size})`);
}

// ---- verify: database against the files --------------------------------------------------------------
function verify() {
  const charVerses = Number(agg(`select count(*) n from public.character_card_verse v join public.sample_cookie s on s.bible_character_id = v.bible_character_id`)[0].n);
  const want = { ...expected, sample_cookie_verse: expected.sample_cookie_verse + charVerses };
  const got = agg(TABLES.map(([t]) => `select '${t}' t, count(*) n from public.${t}`).join(' union all '));
  let bad = 0;
  for (const { t, n } of got) {
    const ok = Number(n) === want[t];
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'BAD '} ${t}: database ${n}, files ${want[t]}`);
  }
  const checks = agg(`
    select 'choice cards whose right answers don''t fit (one, or one per blank)' what, count(*) n from public.passage_card c
      where c.kind = 'choice' and (select count(*) from public.card_answer a where (a.passage_id, a.stop, a.card) = (c.passage_id, c.stop, c.card) and a.correct)
        <> greatest(1, (select count(distinct a.blank) from public.card_answer a where (a.passage_id, a.stop, a.card) = (c.passage_id, c.stop, c.card) and a.correct and a.blank is not null))
    union all select 'two-blank cards without blanks 1 and 2', count(*) from (select passage_id, stop, card from public.card_answer where correct
      group by 1, 2, 3 having count(*) > 1 and array_agg(blank order by blank) <> '{1,2}') x
    union all select 'burnt lines marked burnt without a correction', count(*) from public.burnt_line b
      where b.burnt <> exists (select 1 from public.burnt_line_wrong w where (w.passage_id, w.line) = (b.passage_id, b.line))
    union all select 'choice cards with fewer than 2 answers', count(*) from public.passage_card c
      where c.kind = 'choice' and (select count(*) from public.card_answer a where (a.passage_id, a.stop, a.card) = (c.passage_id, c.stop, c.card)) < 2
    union all select 'story cards with answers', count(*) from public.card_answer a join public.passage_card c using (passage_id, stop, card) where c.kind = 'story'
    union all select 'cards without verses', count(*) from public.passage_card c
      where not exists (select 1 from public.card_verse v where (v.passage_id, v.stop, v.card) = (c.passage_id, c.stop, c.card))
    union all select 'passages without cards', count(*) from public.passage p where not exists (select 1 from public.passage_card c where c.passage_id = p.id)
    union all select 'passages without Burnt Cookies', count(*) from public.passage p where not exists (select 1 from public.burnt_line b where b.passage_id = p.id)
    union all select 'passages without a Big Idea', count(*) from public.passage p where not exists (select 1 from public.big_idea_paragraph b where b.passage_id = p.id)
    union all select 'passages without trivia', count(*) from public.passage p where not exists (select 1 from public.trivia_question t where t.passage_id = p.id)
    union all select 'trivia without exactly one right answer', count(*) from public.trivia_question t
      where (select count(*) from public.trivia_answer a where (a.passage_id, a.number) = (t.passage_id, t.number) and a.correct) <> 1
    union all select 'trivia without verses', count(*) from public.trivia_question t
      where not exists (select 1 from public.trivia_question_verse v where (v.passage_id, v.number) = (t.passage_id, t.number))
    union all select 'sample cookies without verses', count(*) from public.sample_cookie s where not exists (select 1 from public.sample_cookie_verse v where v.key = s.key)
    union all select 'sample cookies told on no lesson card', count(*) from public.sample_cookie s
      where not exists (select 1 from public.sample_cookie_verse v join public.card_verse c using (verse_id) where v.key = s.key)
    union all select 'words with no meaning', count(*) from public.lesson_word w where not exists (select 1 from public.lesson_word_meaning m where m.word = w.word)
    union all select 'idioms with no meaning', count(*) from public.lesson_idiom d where not exists (select 1 from public.lesson_idiom_meaning m where m.idiom_id = d.id)
    union all select 'place cards with no place', count(*) from public.place_card c where not exists (select 1 from public.place_card_place p where p.lookup = c.lookup)
    union all select 'place photos missing from storage', count(*) from public.place_card c
      where c.image_path is not null and not exists (select 1 from storage.objects o where o.bucket_id = 'place-images' and o.name = c.image_path)`);
  for (const c of checks) {
    if (Number(c.n)) bad++;
    console.log(`${Number(c.n) ? 'BAD ' : 'ok  '} ${c.what}: ${c.n}`);
  }
  console.log(bad ? `\n${bad} check(s) failed` : '\nEverything matches.');
  if (bad) process.exitCode = 1;
}
