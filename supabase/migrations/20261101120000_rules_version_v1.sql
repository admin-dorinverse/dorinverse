-- Question Rules restarted its numbering at "v1" (question-rules.md header, 8.1, 10.37). v1 keeps the
-- 47 checklist lines of 3.3 (10.1–10.47, same recipe lines 10.38–10.47), so only the version label is new.
alter table public.cookie_lesson drop constraint cookie_lesson_rules_version_check;
alter table public.cookie_lesson add constraint cookie_lesson_rules_version_check
  check (rules_version ~ '^([0-9]+\.[0-9]+|v[0-9]+)$');

-- 8.6, 10 lead-in: the lines of each rules version (add a branch when the rules gain a version)
create or replace function private.checklist_lines(p_rules_version text) returns setof text
language sql immutable set search_path = '' as $$
  select '10.' || n from generate_series(1, case p_rules_version when '3.3' then 47 when 'v1' then 47 end) n
$$;
