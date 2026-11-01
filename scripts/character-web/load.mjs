// Character web: the scripture-proved links between character cards, from links.json, as SQL for
// public.character_connection and public.character_connection_passage.
//
//   node scripts/character-web/load.mjs        # check links.json, write .cache/character-connections.sql
//   supabase db query --linked -f scripts/character-web/.cache/character-connections.sql
//
// links.json is the source of truth: [{ from, to, type, why, refs: [...], fulfilled?: [...] }], written to
// the standard in link-types.md. A pair may have several links, one per type. from/to are bible_character
// lookups; refs (and fulfilled, for a prophecy) are 2.12 references, each one passage ("Genesis 4:8",
// "1 Samuel 17:45–50"). For a prophecy, from is the one who spoke it.
// The load reads the linked project (read-only) for which cards exist. A link whose card is not in
// character_card yet is skipped and listed; it loads once that card does.
import fs from 'node:fs';
import path from 'node:path';
import { loadReference, expand, agg } from '../dough-maker/lib.mjs';

const DIR = import.meta.dirname;
const TYPES = ['family', 'married', 'loved', 'helped', 'worked_together', 'counseled', 'apostle', 'followed', 'served',
  'anointed', 'blessed', 'rebuked', 'enemies', 'betrayed', 'rivals', 'healed', 'friends', 'covenant', 'judged', 'put_to_death',
  'saved', 'deceived', 'prophesied', 'prophecy', 'crossed_paths'];
const links = JSON.parse(fs.readFileSync(path.join(DIR, 'links.json'), 'utf8'));
const ref = loadReference();

// --- check -------------------------------------------------------------------
const errors = [], seen = new Set();
const range = (at, r) => {
  if (r.includes(';')) { errors.push(`${at}: "${r}" must be one passage`); return null; }
  try { const v = expand(ref, r); return [v[0], v.at(-1)]; } catch (e) { errors.push(`${at}: ${e.message}`); return null; }
};
const rows = links.map((l) => {
  const at = `${l.from}–${l.to} ${l.type}`;
  const key = [l.from, l.to].sort().join('|') + `|${l.type}`;
  if (seen.has(key)) errors.push(`${at}: linked twice with the same type`);
  seen.add(key);
  if (l.from === l.to) errors.push(`${at}: linked to itself`);
  if (!TYPES.includes(l.type)) errors.push(`${at}: unknown type`);
  if (!l.why?.trim()) errors.push(`${at}: no why`);
  if (!l.refs?.length) errors.push(`${at}: no refs`);
  if ((l.type === 'prophecy') !== Boolean(l.fulfilled?.length)) errors.push(`${at}: a prophecy, and only a prophecy, has fulfilled passages`);
  const passages = [
    ...(l.refs ?? []).map((r, i) => ({ kind: 'proof', position: i + 1, r: range(at, r) })),
    ...(l.fulfilled ?? []).map((r, i) => ({ kind: 'fulfilled', position: i + 1, r: range(at, r) })),
  ];
  return { ...l, passages };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const cards = new Set(agg(`select b.lookup from public.character_card k join public.bible_character b on b.id = k.bible_character_id`).map((r) => r.lookup));
const ready = rows.filter((r) => cards.has(r.from) && cards.has(r.to));
const waiting = rows.filter((r) => !ready.includes(r));

// --- SQL -----------------------------------------------------------------------
const q = (s) => (s == null ? 'null' : `'${s.replaceAll("'", "''")}'`);
const linkValues = ready.map((r, i) => `(${i + 1}, ${[r.from, r.to, r.type, r.why].map(q).join(', ')})`);
const passageValues = ready.flatMap((r, i) => r.passages.map((p) => `(${i + 1}, ${q(p.kind)}, ${p.position}, ${q(p.r[0])}, ${q(p.r[1])})`));
const out = `-- Written by node scripts/character-web/load.mjs. Do not edit; re-run the script.
-- Replaces every character connection with the ${ready.length} in links.json (${passageValues.length} passages), all published.
begin;
create temp table src (n int, from_lookup text, to_lookup text, type text, why text) on commit drop;
insert into src values
${linkValues.join(',\n')};
create temp table src_passage (n int, kind text, position smallint, first_ref text, last_ref text) on commit drop;
insert into src_passage values
${passageValues.join(',\n')};

create temp table res on commit drop as
select s.n, gen_random_uuid() as id, fk.bible_character_id as from_id, tk.bible_character_id as to_id, s.type, s.why
from src s
join public.bible_character fb on fb.lookup = s.from_lookup
join public.character_card fk on fk.bible_character_id = fb.id
join public.bible_character tb on tb.lookup = s.to_lookup
join public.character_card tk on tk.bible_character_id = tb.id;

create temp table res_passage on commit drop as
select r.id as connection_id, p.kind, p.position, v1.id as from_verse_id, v2.id as to_verse_id
from src_passage p
join res r on r.n = p.n
join public.verse v1 on v1.osis_ref = p.first_ref
join public.verse v2 on v2.osis_ref = p.last_ref;

do $$ begin
  -- every link must resolve to both cards, and every passage to its verses
  if (select count(*) from res) <> (select count(*) from src) or (select count(*) from res_passage) <> (select count(*) from src_passage) then
    raise exception 'character connections: % of % links and % of % passages resolved (a lookup or verse did not match)',
      (select count(*) from res), (select count(*) from src), (select count(*) from res_passage), (select count(*) from src_passage);
  end if;
end $$;

delete from public.character_connection;
insert into public.character_connection (id, from_card_id, to_card_id, type, why, status)
select id, from_id, to_id, type, why, 'published' from res;
insert into public.character_connection_passage (connection_id, kind, position, from_verse_id, to_verse_id)
select connection_id, kind, position, from_verse_id, to_verse_id from res_passage;

do $$ begin
  if (select count(*) from public.character_connection) <> ${ready.length}
     or (select count(*) from public.character_connection_passage) <> ${passageValues.length} then
    raise exception 'expected ${ready.length} character connections and ${passageValues.length} passages';
  end if;
end $$;
commit;

-- Cards with no published connection (by owner ruling: Nahum, Habakkuk, Zephaniah)
select b.lookup from public.character_card k join public.bible_character b on b.id = k.bible_character_id
where not exists (select 1 from public.character_connection c where c.status = 'published'
  and k.bible_character_id in (c.from_card_id, c.to_card_id)) order by 1;
`;
fs.mkdirSync(path.join(DIR, '.cache'), { recursive: true });
const file = path.join(DIR, '.cache', 'character-connections.sql');
fs.writeFileSync(file, out);
console.log(`wrote ${file}: ${ready.length} links, ${passageValues.length} passages${waiting.length ? `; ${waiting.length} wait for cards not loaded yet:` : ''}`);
for (const w of waiting) console.log(`  ${w.from} – ${w.to} (${[w.from, w.to].filter((x) => !cards.has(x)).join(', ')} has no card)`);
