// Character web: the scripture-proved links between character cards, from links.json, as SQL for
// public.character_connection.
//
//   node scripts/character-web/load.mjs        # check links.json, write .cache/character-connections.sql
//   npx -y supabase@2.122.0 db query --linked -f scripts/character-web/.cache/character-connections.sql
//
// links.json is the source of truth: [{ from, to, type, why, ref, ref2? }], one entry per pair of cards.
// from/to are bible_character lookups; ref (and ref2, the fulfillment, for a prophecy) are 2.12
// references ("Genesis 4:8", "1 Samuel 17:45–50"). For a prophecy, from is the one who spoke it.
// The load reads the linked project (read-only) for which cards exist. A link whose card is not in
// character_card yet is skipped and listed; it loads once that card does.
import fs from 'node:fs';
import path from 'node:path';
import { loadReference, expand, agg } from '../dough-maker/lib.mjs';

const DIR = import.meta.dirname;
const TYPES = ['family', 'marriage', 'friends', 'teacher', 'leader', 'enemies', 'message', 'story', 'prophecy'];
const links = JSON.parse(fs.readFileSync(path.join(DIR, 'links.json'), 'utf8'));
const ref = loadReference();

// --- check -------------------------------------------------------------------
const errors = [], seen = new Set();
const range = (l, r) => { if (r.includes(';')) { errors.push(`${l.from}–${l.to}: "${r}" must be one passage`); return [null, null]; } try { const v = expand(ref, r); return [v[0], v.at(-1)]; } catch (e) { errors.push(`${l.from}–${l.to}: ${e.message}`); return [null, null]; } };
const rows = links.map((l) => {
  const pair = [l.from, l.to].sort().join('|');
  if (seen.has(pair)) errors.push(`${pair}: linked twice`);
  seen.add(pair);
  if (l.from === l.to) errors.push(`${l.from}: linked to itself`);
  if (!TYPES.includes(l.type)) errors.push(`${l.from}–${l.to}: unknown type ${l.type}`);
  if (!l.why?.trim()) errors.push(`${l.from}–${l.to}: no why`);
  if ((l.type === 'prophecy') !== Boolean(l.ref2)) errors.push(`${l.from}–${l.to}: a prophecy, and only a prophecy, has ref2`);
  const [a, b] = range(l, l.ref), [c, d] = l.ref2 ? range(l, l.ref2) : [null, null];
  return { ...l, a, b, c, d };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const cards = new Set(agg(`select b.lookup from public.character_card k join public.bible_character b on b.id = k.bible_character_id`).map((r) => r.lookup));
const ready = rows.filter((r) => cards.has(r.from) && cards.has(r.to));
const waiting = rows.filter((r) => !ready.includes(r));

// --- SQL -----------------------------------------------------------------------
const q = (s) => (s == null ? 'null' : `'${s.replaceAll("'", "''")}'`);
const values = ready.map((r) => `(${[r.from, r.to, r.type, r.why, r.a, r.b, r.c, r.d].map(q).join(', ')})`);
const out = `-- Written by node scripts/character-web/load.mjs. Do not edit; re-run the script.
-- Upserts ${ready.length} character connections as published and removes any not in links.json.
begin;
create temp table src (from_lookup text, to_lookup text, type text, why text,
  ref_first text, ref_last text, ful_first text, ful_last text) on commit drop;
insert into src values
${values.join(',\n')};

create temp table res on commit drop as
select fk.bible_character_id as from_id, tk.bible_character_id as to_id, s.type, s.why,
  v1.id as v1, v2.id as v2, v3.id as v3, v4.id as v4
from src s
join public.bible_character fb on fb.lookup = s.from_lookup
join public.character_card fk on fk.bible_character_id = fb.id
join public.bible_character tb on tb.lookup = s.to_lookup
join public.character_card tk on tk.bible_character_id = tb.id
join public.verse v1 on v1.osis_ref = s.ref_first
join public.verse v2 on v2.osis_ref = s.ref_last
left join public.verse v3 on v3.osis_ref = s.ful_first
left join public.verse v4 on v4.osis_ref = s.ful_last;

do $$ begin
  -- every link must resolve: both cards, every verse
  if (select count(*) from res) <> (select count(*) from src)
     or (select count(*) from res where v3 is not null and v4 is not null) <> (select count(*) from src where ful_first is not null) then
    raise exception 'character connections: % of % links resolved (a lookup or verse did not match)',
      (select count(*) from res), (select count(*) from src);
  end if;
end $$;

delete from public.character_connection c
where not exists (select 1 from res r where least(r.from_id, r.to_id) = least(c.from_card_id, c.to_card_id)
                                        and greatest(r.from_id, r.to_id) = greatest(c.from_card_id, c.to_card_id));

insert into public.character_connection (from_card_id, to_card_id, type, why, from_verse_id, to_verse_id,
  fulfilled_from_verse_id, fulfilled_to_verse_id, status)
select from_id, to_id, type, why, v1, v2, v3, v4, 'published' from res
on conflict ((least(from_card_id, to_card_id)), (greatest(from_card_id, to_card_id))) do update set
  from_card_id = excluded.from_card_id, to_card_id = excluded.to_card_id, type = excluded.type, why = excluded.why,
  from_verse_id = excluded.from_verse_id, to_verse_id = excluded.to_verse_id,
  fulfilled_from_verse_id = excluded.fulfilled_from_verse_id, fulfilled_to_verse_id = excluded.fulfilled_to_verse_id,
  status = excluded.status;

do $$ begin
  if (select count(*) from public.character_connection) <> ${ready.length} then
    raise exception 'expected ${ready.length} character connections';
  end if;
end $$;
commit;

-- Cards with no published connection yet (expected only while their linking cards await review)
select b.lookup from public.character_card k join public.bible_character b on b.id = k.bible_character_id
where not exists (select 1 from public.character_connection c where c.status = 'published'
  and k.bible_character_id in (c.from_card_id, c.to_card_id)) order by 1;
`;
fs.mkdirSync(path.join(DIR, '.cache'), { recursive: true });
const file = path.join(DIR, '.cache', 'character-connections.sql');
fs.writeFileSync(file, out);
console.log(`wrote ${file}: ${ready.length} links${waiting.length ? `; ${waiting.length} wait for cards not loaded yet:` : ''}`);
for (const w of waiting) console.log(`  ${w.from} – ${w.to} (${[w.from, w.to].filter((x) => !cards.has(x)).join(', ')} has no card)`);
