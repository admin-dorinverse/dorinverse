# Lesson maker — readiness fixes + fully automated generation pipeline

## Context
Goal: generate every lesson in the app (579 flavors, 1,774 lessons, ~27K questions, per the dough-maker
plan in `scripts/dough-maker/ingredients/`) with no manual steps. Priorities, in order:
1. **Accuracy** — every question true to its KJV verses, wrong options ruled out by named verses.
2. **Flow** — each lesson follows its recipe's learning flow so the player walks away with the goal.
3. Protect the Claude subscription — bulk work on DeepSeek V4.1 Flash via opencode (pay per token).
Rules: `scripts/dough-maker/question-rules.md` (v1). Owner has signed off on the master lists and psalm
headings — no approval prompts for them. Owner reviews finished lessons later (method TBD).

## Part 1 — Readiness (verified on staging, read-only)
Ready: lesson tables + GRANTs; strict DB checks (option shapes, lengths, status gate that refuses
`reviewed` without 47 passing writer + checker rows); KJV 31,102 verses; Easton's 6,360; people 3,067;
places 1,298; 250 memory verses; ingredients cover every verse with no errors.

Phase 0 fixes (automated, before any lesson):
1. **Version mismatch** — rules say `"v1"`, DB only accepts `'3.3'` (`20261026221655_initial_schema.sql:335`,
   `:1166`). New migration: accept `v1` in the CHECK and in `private.checklist_lines` (47 lines).
2. **Recipes + flavors** — load 11 recipes and 579 flavors from the ingredients files.
3. **Master lists** — load Word (+ dictionary_entry link, form), Idiom + Idiom Verse, Jesus Prophecy Link,
   and mark the 250 memory verses approved, recording the owner's sign-off.
4. **Psalm headings** — load the KJV superscriptions (only 1 row today), recorded as owner-approved.

## Part 2 — Who does what (model assignments still to confirm with owner)
Plain code: builds each lesson's packet with the exact KJV text, runs every mechanical checklist line,
resolves references to verse ids, loads the DB, runs the watchdog (Part 4).
Proposed models (writer and every checker are always different models):
| Job | Proposed |
|---|---|
| Writer | DeepSeek V4.1 Flash, looping free against code checks until clean |
| Scripture pre-check | DeepSeek (fresh run) — cheap filter |
| **Scripture verifier** (authoritative) | Claude Opus 5.5 — every question vs its cited verses; names the verse that rules out each wrong option |
| **Flow reviewer** (authoritative) | Claude Opus 5.5 — see Part 3 |
| Other judgment lines (odd-one-out, clues, titles, register…) | Claude Sonnet 5.5 |
| Fixer | DeepSeek with the reviewers' notes; Opus after 2 failed rounds |
| Tie-breaker + audits | Claude Fable 5.1 |

## Part 3 — Flow is checked, not just citations
The flow reviewer reads the whole lesson as the player would (rule 0.11: setups hidden, in order) against
its recipe's flow, and fails the lesson if any part is missing or out of order:
- Every recipe: one-sentence goal served by every question (0.5); each question grows from the last
  (0.7); clue on every question (0.6); repeats of the facts that matter (0.10, 4.Q6); the player can
  say the goal at the end.
- Per recipe: Stories — events in order, cause to effect, natural stop, picks up where the last ended;
  Verses — scene → what it says → plain words (7.V5–7.V8); Words/Idioms — meaning → recognize → use,
  closing all-four match (7.W8); Wisdom — say → mean → apply; Parables — setting → teaching → stated
  meaning → modern example; Jesus Prophecies — The Promise then The Fulfillment; Prophets — prophet,
  audience, sin/need, warning/promise, response; Letters — who/to whom/why, then the teaching step by step;
  Poems — situation, main point, movement, key pictures; Revelation — what John sees and hears, in order.
- Flavor level: lessons connect in order, no gaps or repeats between lessons.
Output: per-lesson pass/fail with a plain note for lines 10.2, 10.3, 10.9, 10.10, 10.38–10.47.

## Part 4 — Watchdog: stop, explain, fix
Code tracks every check result and pauses the run when something looks broken:
- **Failure patterns** — the same checklist line failing across several lessons in a row, a recipe's
  failure rate jumping, or a lesson failing 3 rounds. → Pause.
- **Too-clean passing (false positives)** —
  - Planted test lessons: each batch includes known-bad copies (wrong answer, wrong verse, a wrong option
    that is actually true, scrambled flow). A checker that passes one is broken. → Pause.
  - Random audits: Fable re-checks a sample of passed lessons from scratch; any disagreement → Pause.
  - A long 100% pass streak triggers an extra audit.
- **On pause**: write a plain-English report (what failed, examples, likely cause, proposed fix, and
  whether owner input is needed) to `scripts/lesson-maker/.cache/reports/`, and alert the owner (Remote Control push + dashboard inbox).
  Fixes that need no owner input are applied, re-tested on the failing lessons, then the run resumes.

## Part 4b — Dashboard + notifications
Runner: one Node script drives everything unattended. DeepSeek via
`opencode run -m opencode/deepseek-v4.1-flash --format json` (V4 Flash retired 2026-10-26 on opencode;
$0.30/$1.20 per M). Claude via `claude -p --model <opus|sonnet|fable> --output-format json --json-schema …`
with tools locked to read-only — runs on the subscription (preflight `claude auth status`; make sure
`ANTHROPIC_API_KEY` is not set or it bills the API instead).
Local dashboard page (`http://localhost:<port>`), served by `scripts/lesson-maker/dashboard.mjs`, reading
the runner's event log:
- Progress: lessons done / in progress / failed, per recipe and overall.
- Live log: which model is doing which job on which lesson, pass/fail, with a note written for a person:
  exactly what happened, in plain sentences, naming the question and the verse — e.g. "Question 6 asked
  where Jonah was going. The answer 'Tarshish' is right (Jonah 1:3), but the wrong option 'Joppa' is
  also in that verse, so a player could argue for it. Sent back to the writer." No rule numbers, codes,
  or JSON. Reviewers return a plain `summary` alongside the machine fields; the DB `lesson_check` notes
  keep the technical detail.
- Inbox: watchdog reports needing owner input; owner replies on the page; runner reads the reply and resumes.
- DeepSeek: total tokens and cost (per-run usage, cross-checked with `opencode stats`). No balance.
- Claude: tokens per model from each `claude -p` result; 5-hour and weekly limit % when available
  (only exposed through Claude Code's status line); runner pauses itself on a limit hit and shows the reset time.
Owner decisions:
- **Alerts via Remote Control.** A Claude Code session with `/rc` on is the supervisor: it starts the
  runner in the background, watches the alert file, and pushes plain-English alerts to the Claude app
  when the watchdog pauses, needs input, or a recipe finishes. Owner can reply from the app or the dashboard.
- **Machine:** owner may move the run to an always-on desktop PC. Same setup either way: repo clone, Node,
  Supabase CLI linked to staging, Claude Code signed in, opencode, Tailscale.
- **Dashboard on the phone.** Served from the run machine; reached privately over Tailscale (owner has an
  account; app on laptop + phone), bookmarked link. Replies typed on the phone go to the runner's inbox.
- Keep the machine awake: `powercfg /change standby-timeout-ac 0`, `powercfg /change hibernate-timeout-ac 0`
  (laptop also: lid action "do nothing" when plugged in); set Windows Update active hours / pause updates
  for the run so it can't auto-restart. If the Claude login expires, the dashboard shows it and the
  runner pauses until the owner signs in again.

## Part 5 — Build (`scripts/lesson-maker/`)
- `packet.mjs` — per-lesson packet; reuse `loadReference`, `expand`, `parseIngredients`, `formatRefs`,
  `peoplePlaces` from `scripts/dough-maker/lib.mjs`.
- `write.mjs` — writer via `opencode run -m opencode/deepseek-v4.1-flash --format json -f <packet>`.
- `lint.mjs` — mechanical lines; reuse `kjvRuns()` from `scripts/character-web/cards.mjs:128`.
- Reviewers — `claude -p` calls on the subscription for verifier, flow reviewer, judgment lines.
- `watchdog.mjs` — patterns, planted tests, audits, reports, notifications.
- `load.mjs` — one transaction per lesson, osis → `verse.id`, pattern from
  `scripts/memory-verses/memory-verses.mjs:44-106`; `supabase db query --linked -f`. Writes draft +
  writer/checker Lesson Check rows, then `reviewed`.
- `.cache/state.json` — stage per lesson; runs resume after a pause.
- Phase 0: migration + loaders for recipes/flavors, master lists, psalm headings.

## Order of work
0. Make the plan portable: copy this plan to `scripts/lesson-maker/PLAN.md`, commit on main, push
   (owner asked). On the PC: clone/pull the repo, open Claude Code, "read scripts/lesson-maker/PLAN.md
   and continue from step 1".
1. Setup, in this order:
   a. Decide the machine (this laptop or the always-on PC).
   b. Install opencode from the terminal; owner signs in to opencode.ai (`opencode auth login`);
      test `opencode run -m opencode/deepseek-v4.1-flash` and confirm the JSON reports tokens/cost.
   c. Tailscale: install on the machine and the iPhone (App Store), same account; confirm the phone
      can reach the machine.
   d. Remote Control: `/rc` in VS Code, Claude app on iPhone, push toggles on in `/config`.
   e. Power settings above; confirm `ANTHROPIC_API_KEY` is not set; `claude auth status` shows claude.ai.
   f. Build the dashboard; owner opens it on the iPhone over Tailscale.
   g. Phase 0 fixes (migration, recipes/flavors, master lists, psalm headings) + runner + watchdog.
2. Confirm model assignments with the owner.
3. Pilot ~6 lessons (Letters, Prophets, Parables) incl. planted bad lessons; tune prompts.
4. Full automated run: Prophets, Revelation, Letters, Parables, Wisdom, Poems, Verses, Words, Idioms,
   Jesus Prophecies; Stories last (rules 2.13, 9.4).
5. Owner review (method decided later).

## Verification
- Migration applied; a test lesson with `rules_version 'v1'` inserts.
- Planted bad lessons are all caught in the pilot (proves the checkers work).
- Pilot lessons load as `reviewed` through the DB status gate.
- `node scripts/dough-maker/coverage.mjs` clean; `npx expo lint`; `npx tsc --noEmit`.
- Commit on main; ask before pushing.
