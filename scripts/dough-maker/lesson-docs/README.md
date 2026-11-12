# Dorinverse Lesson Docs

This file says which file to load for each step. Load only the files the current step needs. Never load every file at once.

These files are the current lesson rules.

## Quick look

**What a baker plays, in order**
- Prep walkthrough
- Burnt Cookies
- The Big Idea
- The cookie box

**How lessons get made**
1. **Passages:** split the whole Bible into passages, each with a type. The text decides where they break, not a target count. Done once, before anything else.
2. **Prep walkthrough:** made for each passage. Everything after this uses the Prep cards.
3. **The rest, for each passage:** Burnt Cookies, The Big Idea, Sample Table, Definitions, Answer explanations.
4. **Idioms:** across the whole passage list.

**Which model does what:** see `models.md`. It also covers caching, which the run script must be built around.

**Every step, every passage**
- Make it
- Check it
- Fix it (up to 2 times, checking after each)
- Anything still wrong goes on the tracker
- Move on. The run never waits.

**What I review**
- **The tracker,** after the run finishes
  - **Needs agent fix:** a rule covers it, but the fixes failed. A rerun handles it.
  - **Needs human decision:** the docs don't cover it. I decide, then a rerun fixes it.
- Every item has two flags, `needs_agent_fix` and `needs_human_decision`. Both false means clean.

**When the run stops**
- Only when a step gives no output, or output the database can't take
- It retries once, then stops and tells me what happened and how to pick up again. If the internet is down, the credits run out, or a server is busy, it doesn't stop: it waits, tries again every 5 minutes, and carries on by itself.

## The lesson

Every lesson is one path, in this order:

1. **Prep walkthrough:** about 1 to 3 stops, with a reveal screen after each one
2. **Burnt Cookies**
3. **The Big Idea**
4. **The cookie box**

## The build order

1. **Passages:** divide the Bible into passages and give each one a type
2. **Prep walkthrough**
3. **Burnt Cookies**
4. **The Big Idea**
5. **Sample Table**

Passages are built for the whole Bible first.

## Checking each step

Each step is checked one passage at a time. The checker looks at the step's whole output for the passage. A fix changes only the items in the findings: a card, a line, a cookie or a word. Everything else stays as it is, unless another rule forces a change to a nearby item. Then the fix can change that item too, as long as it doesn't start a loop.

1. **Make it.** The step runs with its files (see the table below).
2. **Check it.** A separate checker runs with `checker.md`, the md files that step used, the step's output and the passage text in the BSB.
3. **Fix 1.** The same step gets its same files, its output and the covered findings, and fixes only those.
4. **Check it again.**
5. **Fix 2.** Same as Fix 1.
6. **Final check.** Whatever is still found goes in the tracker. There is no third fix.
7. **Keep going.** The next step and the next passage go on. The run never waits on the tracker.

## The tracker

One file for the whole run, for a person to review after the run finishes. It has two lists. Each list is grouped: the same problem in many places is one group, with how many places it hit, a few examples, and every place it hit.

- **Needs agent fix:** a rule covers it, but two fixes didn't get it right. Each group gives the rule's link and exact words. After the run, a batch rerun fixes only the items listed. A group goes to a person only if one rule keeps failing in many places.
- **Needs human decision:** the docs don't cover it. Each group asks its question once. After the person decides, a batch rerun fixes only the items listed.
- **A decision is asked only once.** When the person decides, the answer is written into the step's doc as a rule, so it's covered from then on and never comes back to the person.

## Flags

After the final check, the run sets two flags on each item in a step's output: a card, a line, a cookie, a word, a passage entry, or the whole Big Idea. The steps that make the output never set them.

- `needs_agent_fix`: the item is on the tracker's "Needs agent fix" list.
- `needs_human_decision`: the item is on the tracker's "Needs human decision" list.
- A clean item has both set to false. Each flag comes off when its problem is resolved.

## When the run stops

The run only stops if a step gives no output, or output that can't be loaded into the database. When that happens, the run starts that step over once from the beginning. If it happens again, the run stops and notifies the person right away, in plain words: what happened, why it stopped, which passage and step, what is already saved, and how to pick up again.

## Which file to load

Every lesson step also gets the passage text in the BSB.

| Step | File | Also load |
|---|---|---|
| Passages | `passages.md` | The BSB text of the whole Bible |
| Prep walkthrough | `prep-walkthrough.md` | `papa-dorin.md`, the passage's type, story group and position, the passage's included parables and sermons, the passage right before it (for context only) |
| Burnt Cookies | `burnt-cookies.md` | `papa-dorin.md`, the passage's type, story group and position, the Prep cards for the passage |
| The Big Idea | `big-idea.md` | `papa-dorin.md`, the passage's type, story group and position, the Prep cards for the passage |
| Sample Table | `sample-table.md` | The Prep cards for the passage, the app's character set, the approved prophecy link list (`../data/prophecy-links.json`) |
| Definitions | `definitions.md` | The Prep cards for the passage, the BSB footnotes |
| Answer explanations | `answer-explanations.md` | `papa-dorin.md`, the Prep cards for the passage |
| Idioms | `idioms.md` | The idiom list (`../data/idioms.json`), the passage list, the Prep cards |
| Check (after each step) | `checker.md` | The md files that step used, the step's output, the passage text in the BSB |