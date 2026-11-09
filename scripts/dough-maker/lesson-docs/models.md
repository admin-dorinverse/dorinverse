# Models Plan

This file says which model does each job in the lesson run, and how the run uses caching. It's for the person running the lessons and for whoever builds the run script. The lesson steps never load it.

## The models

| Model | What it's for | How it's paid |
|---|---|---|
| **Opus 5.5**, medium effort | The writing that needs judgment and Papa Dorin's voice, and its fixes | The Claude subscription (weekly limit) |
| **Kimi K3.1 Pro** | Reviewing, the structured steps, and overflow writing | Per token |
| **Scripts** | Rules with one clear right answer | Free |

- Opus always runs at **medium** effort. It worked in round 5.
- Skip the cheap "Flash" models. They made too many mistakes in an earlier run.

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
| 2. Each passage | Prep walkthrough | Opus | Kimi + script | Opus | Kimi + script |
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
   - Passages: every verse is in exactly one passage, with none skipped
   - Only allowed food words are used
   - No banned words
2. **Kimi.** Checks the judgment calls against the docs: Papa Dorin's voice, the joke logic test, retelling rules, and each step's own rules.

The fixer gets one list with both sets of findings.

## Fresh calls

- **Every check is a fresh call.** The checker sees only the docs, the passage text and the output. It never sees the writer's conversation.
- **Every step is its own call.** No step carries a conversation over from another step or another passage.

## Overflow

- If Opus hits the weekly limit, **Kimi takes over Opus's writing and fixing** until the limit resets. The run never fully stops.
- Final checks that belong to Opus wait for the reset.
- When the limit resets, Opus takes its jobs back.

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
- **Problems:** any stop, retry or switch to overflow, in one plain sentence each

**When it updates**

- After every passage finishes
- Whenever the run stops, retries a step, or switches to overflow
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
   4. Then the parts that change: the passage's type and group, its BSB text, its Prep cards, the output to check
2. **Nothing that changes goes before the docs.** No dates, run numbers, passage IDs or counts at the top. One changed character at the top makes the whole call full price.
3. **Load files exactly as they are.** Never trim, reformat or reorder them. Byte-for-byte the same every time.
4. **Keep calls flowing.** A cache lasts about 5 minutes after its last use. Every call that reuses it restarts the clock. A run that never pauses keeps it warm.
5. **Each model has its own cache.** Opus calls share one, Kimi calls share another. The same step should always go to the same model.
6. **Log cached tokens on every call.** Every response says how many tokens came from the cache. If that number is 0 call after call, something at the top is changing. Fix it before the run goes on.

### Running several agents

- **Agents on the same model share one cache** and keep it warm for each other. See "How many agents at once."
- **Start the first call alone, then the rest a few seconds later.** If they all start at once, each one pays to save the docs before any can reuse them.

### By provider

- **Opus on the subscription (Claude Code):** caches by itself.
- **Opus on the API:** needs a cache marker at the end of the shared docs. Saving costs 1.25 times the normal price once. Every reuse after that is cheap.
- **Kimi:** reused tokens cost $0.20 per million instead of $2.00. Check Moonshot's docs for whether it needs a marker.
- **Through OpenRouter:** caching passes through to the provider, but some providers need a marker. Check the model's page.

## Costs

Prices as of November 2026. Check the current pages before the run.

| Model | Input | Cached input | Output |
|---|---|---|---|
| Opus 5.5 | subscription | subscription | subscription |
| Kimi K3.1 Pro | $2.00 / million | $0.20 / million | $10.00 / million |

- The weekly limit shows as a percentage, not tokens. Note it before and after a test run to see how much one passage uses.
- Kimi's batch mode is about 40% off, for work that doesn't need answers right away.

## Before the full run

1. **Passages first.** Split the whole Bible with Opus. A person reviews the list before anything else.
2. **Test on passage 1.** Run every step for it with this plan.
3. **Measure three things:**
   - How much the weekly percentage moved
   - What Kimi cost
   - Whether the cached-token log shows the cache working
4. **Then run the rest,** 5 to 10 agents at a time.
