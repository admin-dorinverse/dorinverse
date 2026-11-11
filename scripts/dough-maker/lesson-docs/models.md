# Models Plan

This file says which model does each job in the lesson run, and how the run uses caching. It's for the person running the lessons and for whoever builds the run script. The lesson steps never load it.

## The models

| Model | What it's for | How it's paid |
|---|---|---|
| **Opus 5.5**, medium effort | The writing that needs judgment and Papa Dorin's voice, and its fixes | The Claude subscription (weekly limit) |
| **Kimi K3.1 Pro** | Final checks on Opus's writing, and the structured steps | Per token |
| **Scripts** | Rules with one clear right answer | Free |

- Opus always runs at **medium** effort. It worked in round 5.
- Skip the cheap "Flash" models. They made too many mistakes in an earlier run.
- Kimi thinks before it answers, and the thinking counts as output. Give every Kimi call a large output limit, or the answer can come back empty.

## The roles

- **Writer:** makes the first version.
- **Reviewer:** checks 1 and 2. Lists the problems.
- **Fixer:** fixes only what the reviewer found.
- **Final checker:** the last word. Anything still wrong goes on the tracker.
- **Script checks:** run before every check, for free.

## The rule

**The final checker is never the fixer.** Opus fixes, so Kimi does the final check. Kimi fixes, so Opus does.

## Who does what, in order

| When | Step | Writer | Reviewer (checks 1–2) | Fixer | Final checker |
|---|---|---|---|---|---|
| 1. Once, first | Passages (whole Bible) | Opus | Kimi + script | Opus | Kimi + script |
| 2. Each passage | Prep walkthrough | Opus | Opus + script | Opus | Kimi + script |
| 3. Each passage, after Prep | Burnt Cookies | Opus | Kimi + script | Opus | Kimi + script |
| | The Big Idea | Opus | Kimi + script | Opus | Kimi + script |
| | Answer explanations | Opus | Kimi + script | Opus | Kimi + script |
| | Definitions | Kimi | Kimi + script | Kimi | Opus |
| | Sample Table | Kimi | Kimi + script | Kimi | Opus |
| 4. Last, across all passages | Idioms | Kimi | Kimi + script | Kimi | Opus |
| 5. After the run | Tracker + flags | script | — | — | the person |

## "Kimi + script"

Every check has two parts, in this order:

1. **The script.** Instant, free, never misses. It checks only rules with one right answer:
   - Words in quotation marks match the BSB exactly
   - Every Bible reference exists
   - Only allowed food words are used
   - No banned words
   - Each step's own rules that have one right answer, like the Passages list below
2. **Kimi.** Checks the judgment calls against the docs: Papa Dorin's voice, the joke logic test, retelling rules, and each step's own rules.

The fixer gets one list with both sets of findings. The script writes its findings the same way the checker does (checker.md "Output"): covered, with the rule's link and exact words.

### What the script checks for Passages

Every rule in passages.md that has one right answer:

- Every verse belongs to exactly one passage. No verse is skipped, and no verse is in two passages.
- Verses the BSB leaves out belong to no passage, and no passage starts or ends on one.
- Every start and end is a real verse, written with the book names in the BSB text.
- Each passage is one unbroken range, and its start comes before its end.
- The type is one of the six.
- Every field is there. Only story_group and position can be null.
- ids start at 1 and go up by one, in Bible order.
- Each included parable or sermon sits inside its passage, and its kind is "parable" or "sermon".
- A story group's passages are next to each other, skipping only side stories that have no story group, and their positions count up: "1 of 3", "2 of 3", "3 of 3".
- A passage with no story group has no position.

### What the script checks for Prep

The rules in prep-walkthrough.md and papa-dorin.md that have one right answer:

- The JSON shape: the passage, stops numbered from 1, cards numbered from 1 in each stop, every field there.
- Every reference is a real BSB verse. The stops run through the passage in order, with no gap and no overlap.
- Each included parable or sermon has a stop of its own.
- No more than 20 cards in a stop, and at least as many choice cards as story cards.
- The answers: 3 for multiple choice, True and False for true or false, 3 for one blank, 5 single words for two blanks, the right number marked right, no commas or periods, and no small word like "and" as a blank.
- Words in quotation marks match the BSB exactly, when they are meant as Bible words.
- No em dashes or en dashes outside a quotation.
- Never "my baker," "kids" or "sweetie."
- No food that isn't a cookie, unless it's in the passage.

## Fresh calls

- **Every check is a fresh call.** The checker sees only the docs, the passage text and the output. It never sees the writer's conversation.
- **Every step is its own call.** No step carries a conversation over from another step or another passage.

## When the weekly limit runs out

- If Opus hits the weekly limit, **the run pauses and notifies the person.** Kimi never takes over Opus's writing, fixing or checking.
- Everything finished is saved. After the limit resets, running it again picks up from the last saved stage.

## How many agents at once

- **Passage 1: one agent.** Run every step for it before anything else, and check the results.
- **Then 5 to 10 agents at once.** Each agent works on its own passage.
- **Up to 20** only if the provider's rate limits allow it and the run is clean so far.
- **Never more.** Too many agents hit rate limits, burn the Opus weekly limit in minutes, and multiply a doc mistake before anyone sees it.
- **More agents make the run faster, not cheaper.** They use the same tokens, just sooner.

## Keeping the person updated

The person follows the run on their dashboard. Every update is written for a person, not a developer: plain words, short lines, no file paths, ids or logs.

**What the dashboard shows**

- **Passages:** how many are made, and how many of each type
- **Lessons:** how many passages are complete, out of the total, and how many of each step are done
- **Running now:** which passages are being worked on, the step, and which model is on it
- **Flags so far:** how many items are `needs_agent_fix` and how many are `needs_human_decision`
- **Models:** what each model is doing right now, how much of the Opus weekly limit is used, and what Kimi has cost so far
- **Caching:** the share of input tokens that came from the cache
- **Problems:** any stop, pause or retry, in one plain sentence each

**When it updates**

- After every passage finishes
- Whenever the run stops, pauses or retries a step
- A short summary at the end of each day, and when the run finishes

**Example update**

> 212 of 1,483 passages complete. 8 running now: Opus is writing Prep for 1 Samuel 17, Kimi is checking Burnt Cookies for Ruth 2. Flags so far: 41 need an agent fix, 6 need your decision. Opus weekly limit: 34% used. Kimi cost so far: $38. Cache: 71% of input from the cache.

## Caching: very important

Caching is the biggest money saver in the whole run. **The run script must be built around it from the start.**

**What it is.** Most of every call is the same docs: `papa-dorin.md`, the step's doc and `checker.md`. When a call starts exactly the same as a recent call, the provider reuses that part and charges about a tenth of the price or less. In round 5, about 60 to 70% of every call was the same docs.

**What it saves.** The whole run is about 600 million input tokens. With caching done right, most of them get the cheap rate, so input costs drop by more than half.

### The rules

1. **Same files first, in the same order, every call:**
   1. `papa-dorin.md` (when the step uses it)
   2. The step's doc
   3. `checker.md` (checks only)
   4. Then the parts that change, from the most shared to the least: the passage's type and group, its BSB text, its Prep cards, the output to check, the findings to fix.
   5. **The job's own instructions go last.** "Write", "check" or "fix only these" is the last thing in the call.

   Every check and every fix of a passage reads the same BSB text, so it goes before the output and the findings. Then the 2nd and 3rd check, and every fix, reuse it.
2. **Nothing that changes goes before the docs.** No dates, run numbers, passage IDs or counts at the top. One changed character at the top makes the whole call full price.
3. **Load files exactly as they are.** Never trim, reformat or reorder them. Byte-for-byte the same every time, line endings included. Anything the run writes into a call (BSB text, Prep cards, an output to check) is written out the same way every time.
4. **Freeze the docs when the run starts.** The run reads each md file once, keeps that copy for the whole run, and records each file's fingerprint. An edit made during the run is used from the next run on, never halfway through.
5. **Keep calls flowing.** A cache lasts about 5 minutes after its last use. Every call that reuses it restarts the clock. A run that never pauses keeps it warm.
6. **Each model has its own cache.** Opus calls share one, Kimi calls share another. The same step should always go to the same model, and Kimi always to the same company (see "By provider").
7. **Log cached tokens on every call.** Every response says how many tokens came from the cache. If that number is 0 call after call, something at the top is changing. Fix it before the run goes on.
8. **Catch misses automatically.** The run remembers a fingerprint of each call's shared part. When the same shared part went to the same model a few minutes earlier and the new call reused nothing, that's a miss, and it goes in the log. After 3 misses in a row, the run pauses and notifies the person.

### Running several agents

- **Agents on the same model share one cache** and keep it warm for each other. See "How many agents at once."
- **Start the first call alone, then the rest a few seconds later.** If they all start at once, each one pays to save the docs before any can reuse them.

### By provider

- **Opus on the subscription (Claude Code):** caches by itself, as long as nothing Claude Code adds to the call changes. Every Opus call:
  - runs from an empty folder, so no project files, folder names or git details get added
  - has no tools and no plugins, so their descriptions don't get added

  **Opus reuses a call only up to the end of its instructions part (the system prompt).** Anything in the message is never reused by a different call. So the instructions part holds what the most calls share:
  - **Passages:** the docs and the BSB text being split. Every fix of that text reuses all of it. Only the docs are sent again for the next text, and they are small.
  - **Every lesson step:** the docs only. They are the big part and the same for every passage. The passage's text, its Prep cards and the rest go in the message.

  Opus's cache lasts **1 hour** on the subscription, so a fix that starts long after the first call still reuses it.

  Caching test, November 2026: the same Ruth text again, 91% reused. Jonah after Ruth with only the docs in the instructions part, 45% reused (the docs).

  Prep caching test, November 2026: the docs (papa-dorin.md and prep-walkthrough.md) were 14,723 tokens, and the 2nd and 3rd calls reused all of them, on the same passage and on the next one.
- **Opus on the API:** needs a cache marker at the end of the shared docs. Saving costs 1.25 times the normal price once. Every reuse after that is cheap.
- **Kimi through OpenRouter:** every call goes to **Moonshot AI only**, with no switching to another company. Otherwise OpenRouter spreads calls across about 20 companies that run Kimi, and each keeps its own cache. Kimi reuses any matching start by itself, with no cache marker. Caching test, November 2026: the same Ruth call again, 99% reused. Jonah after Ruth, 52% reused (the docs). Reused tokens cost $0.20 per million instead of $2.00. Prep caching test, November 2026: a check of the same passage again reused 98% (the docs and the passage), and a check of a different passage reused the docs (10,496 tokens). One call in four reused nothing, then the docs came back, so a single miss is not a problem; 3 in a row pauses the run.

## Costs

Prices as of November 2026. Check the current pages before the run.

| Model | Input | Cached input | Output |
|---|---|---|---|
| Opus 5.5 | subscription | subscription | subscription |
| Kimi K3.1 Pro | $2.00 / million | $0.20 / million | $10.00 / million |

- The weekly limit shows as a percentage, not tokens. Note it before and after a test run to see how much one passage uses.
- Kimi's batch mode is about 40% off, for work that doesn't need answers right away.

## Before the full run

1. **Caching test.** Before any real step, a few tiny calls with the real docs at the top:
   - Opus: three calls that start the same way. The 2nd and 3rd must reuse almost all of the shared part.
   - Kimi: the same, with the checker's files.
   - Two different passages in a row: the docs part must still be reused.

   If anything isn't reused, fix it before going on. Run it again whenever the way calls are built changes: `node scripts/dough-maker/run/cache-test.mjs`.
2. **Passages first.** Split the whole Bible with Opus. A person reviews the list before anything else.
3. **Test on passage 1.** Run every step for it with this plan.
4. **Measure three things:**
   - How much the weekly percentage moved
   - What Kimi cost
   - Whether the cached-token log shows the cache working
5. **Then run the rest,** 5 to 10 agents at a time.
