-- ===========================================================================
-- Development only, like 20261118160000_lesson_read_development.sql: the app may read each lesson's Quality
-- Check lines (Burnt Cookies, with which are burnt and their corrections) and its Big Idea without signing in,
-- so the whole lesson can be played before sign-in and the server exist. Read only.
--
-- Before launch this is replaced: which lines are burnt stays on the server, which checks the baker's picks
-- and sends back the result with the corrections; the phone never holds the answer ahead of time.
-- ===========================================================================

create policy "burnt_line: anyone may read (development)" on public.burnt_line
  for select to anon using (true);
create policy "burnt_line_wrong: anyone may read (development)" on public.burnt_line_wrong
  for select to anon using (true);
create policy "big_idea_paragraph: anyone may read (development)" on public.big_idea_paragraph
  for select to anon using (true);

grant select on public.burnt_line, public.burnt_line_wrong, public.big_idea_paragraph to anon;
