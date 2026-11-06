// Jesus Prophecy Links: public.jesus_prophecy_link from data/prophecy-links.json (the approved list).
//
//   node scripts/dough-maker/prophecy-links.mjs     # write .cache/prophecy-links.sql
//   supabase db query --linked -f scripts/dough-maker/.cache/prophecy-links.sql
//
// One row per prophecy -> fulfillment pair, approved, support "stated in NT" (the fulfillment passage is
// where the New Testament says it; stated in verse = its first verse). Rows cannot be deleted, so an
// existing row for the same prophecy whose fulfillment is not in the file is rewritten to a pair that is.
import fs from 'node:fs';
import path from 'node:path';
import { loadReference } from './lib.mjs';

const DIR = import.meta.dirname;
const ref = loadReference();
const links = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'prophecy-links.json'), 'utf8'));

const lit = (s) => `'${s.replaceAll("'", "''")}'`;
function osis(p, verse) {
  const book = ref.books.find((b) => b.name === (p.book === 'Psalm' ? 'Psalms' : p.book));
  if (!book) throw new Error(`${p.ref}: unknown book "${p.book}"`);
  const n = ref.chapterVerses[`${book.order}:${p.chapter}`];
  if (!n || verse < 1 || verse > n) throw new Error(`${p.ref}: ${p.book} ${p.chapter} has no verse ${verse}`);
  return `${book.osis}.${p.chapter}.${verse}`;
}

const pairs = [];
for (const l of links) {
  if (l.promise.length !== 1) throw new Error(`link ${l.id}: expected one promise passage, found ${l.promise.length}`);
  const [p] = l.promise;
  for (const f of l.fulfillment) {
    if (p.verse_end < p.verse_start || f.verse_end < f.verse_start) throw new Error(`link ${l.id}: a range runs backward`);
    pairs.push([l.title, osis(p, p.verse_start), osis(p, p.verse_end), osis(f, f.verse_start), osis(f, f.verse_end)]);
  }
}

fs.mkdirSync(path.join(DIR, '.cache'), { recursive: true });
fs.writeFileSync(path.join(DIR, '.cache', 'prophecy-links.sql'), `-- Written by node scripts/dough-maker/prophecy-links.mjs: ${pairs.length} links from ${links.length} prophecies.
begin;
create temp table src (title text, p1 text, p2 text, f1 text, f2 text) on commit drop;
insert into src values
${pairs.map((r) => `(${r.map(lit).join(', ')})`).join(',\n')};

create temp table want on commit drop as
select s.title, p1.id p1, p2.id p2, f1.id f1, f2.id f2
from src s
join public.verse p1 on p1.osis_ref = s.p1 join public.verse p2 on p2.osis_ref = s.p2
join public.verse f1 on f1.osis_ref = s.f1 join public.verse f2 on f2.osis_ref = s.f2;

do $$ declare w record; k uuid; begin
  if (select count(*) from want) <> (select count(*) from src) then raise exception 'a reference has no verse row'; end if;
  for w in select * from want loop
    select id into k from public.jesus_prophecy_link where prophecy_verse_id = w.p1 and fulfillment_verse_id = w.f1;
    if k is null then   -- reuse a row for this prophecy whose fulfillment the file no longer names
      select j.id into k from public.jesus_prophecy_link j
       where j.prophecy_verse_id = w.p1
         and not exists (select 1 from want x where x.p1 = j.prophecy_verse_id and x.f1 = j.fulfillment_verse_id)
       order by j.id limit 1;
    end if;
    if k is null then
      insert into public.jesus_prophecy_link (prophecy_verse_id, prophecy_to_verse_id, fulfillment_verse_id, fulfillment_to_verse_id,
        support, stated_in_verse_id, proposed_from, approved, title)
      values (w.p1, w.p2, w.f1, w.f2, 'stated in NT', w.f1, null, true, w.title);
    else
      update public.jesus_prophecy_link set prophecy_to_verse_id = w.p2, fulfillment_verse_id = w.f1, fulfillment_to_verse_id = w.f2,
        support = 'stated in NT', stated_in_verse_id = w.f1, proposed_from = null, approved = true, title = w.title
       where id = k;
    end if;
  end loop;
end $$;

-- Every row now matches the file; one left over would be a link the file does not hold
do $$ begin
  if exists (select 1 from public.jesus_prophecy_link j where not exists
             (select 1 from want w where w.p1 = j.prophecy_verse_id and w.f1 = j.fulfillment_verse_id)) then
    raise exception 'jesus_prophecy_link has rows the file does not hold';
  end if;
end $$;
commit;
`);
console.log(`${pairs.length} links from ${links.length} prophecies written to .cache/prophecy-links.sql`);
