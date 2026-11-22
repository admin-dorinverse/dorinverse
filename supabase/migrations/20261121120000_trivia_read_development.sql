-- ===========================================================================
-- Development only (owner, 2026-11-21): trivia on the get-together call may read the lessons' trivia questions,
-- their answers and their verses without signing in, so Papa Dorin's call program can host trivia before
-- sign-in and the server exist. Read only.
--
-- Before launch this is replaced: only the server (Papa Dorin's program) reads the questions and answers, and
-- the phones see a question's right answer only after everyone's picks are in.
-- ===========================================================================

create policy "trivia_question: anyone may read (development)" on public.trivia_question
  for select to anon using (true);
create policy "trivia_answer: anyone may read (development)" on public.trivia_answer
  for select to anon using (true);
create policy "trivia_question_verse: anyone may read (development)" on public.trivia_question_verse
  for select to anon using (true);

grant select on public.trivia_question, public.trivia_answer, public.trivia_question_verse to anon;
