# Station Picker

This file covers how to pick the stations for each passage. It runs after Prep is written, so it can see what Prep taught.

## What it gets

- The passage: its title, range, type and BSB text
- The passage's Prep story cards and choice cards
- The passage's `BSB Eligible` words, from `public.dictionary_term_verse` (every BSB verse each eligible Easton's term is printed in)
- The running total of how many times each station has been picked so far, across the whole Bible

## The stations

| Station | Qualifies when the passage has… |
|---|---|
| Words | a word flagged `BSB Eligible` that appears in the passage, spelled exactly as its Easton's term, and carries real weight |
| Idioms | at least one idiom that passes the idiom test below |
| Wisdom | at least 3 different life-application sayings Prep taught (see station-wisdom.md), enough for 5 to 7 scenarios |
| Parables | a parable the text explains |
| Sermon | a sermon, speech, letter or prophet's message with enough points to answer 5 to 7 objections |

## Finding idioms

The picker finds the passage's idioms itself. A phrase is an idiom only when all four are true:

1. **People really say it today.** Most adults would recognize it in everyday speech, like "the writing on the wall," "a wolf in sheep's clothing" or "go the extra mile."
2. **It comes from this passage.** The scene it comes from is in the passage's text. A phrase that only sounds similar doesn't count.
3. **It's said figuratively.** A plain statement of faith, like "God will provide," isn't an idiom.
4. **The modern meaning grows out of the scene.** For example, "the writing on the wall" means a sign that the end is coming, which is what it meant for Belshazzar (Daniel 5).

If the phrase comes from more than one passage, it belongs only to the passage that is its clearest source. If you're not sure, it isn't an idiom. Never stretch to find one. List every idiom that passes. Each one gets its own run in the Idioms station, and list it in the output. The pipeline saves every idiom found to the database with its passage.

**Passage type never decides which stations qualify.** No passage type has a usual station. Read the passage and check each station against it.

## How to pick

1. **Qualify.** List every station the passage's content actually supports.
2. **Set Words aside,** unless the passage has a truly key word: one the passage's meaning turns on, such as "covenant" or "grace." Then Words stays in the list like any other station.
3. **Least used wins.** From the list, pick the station with the lowest running total. On a tie, pick the one whose content is most central to the passage.
4. **Repeat** for the next slot.
5. **Words fills what's left.** If a slot is still empty and Words qualifies, Words fills it.

## How many

- **Aim for 2 stations.**
- Use judgment for the rare exception: 1 for a very short passage, 3 for a long passage rich enough to strongly support 3.

## When fewer than 2 stations fit

- **A very short passage with 1 strong station is fine.** That's the exception above, not a flag. This includes a short passage that stands alone because neither neighbor truly connects.
- **Any other passage with fewer than 2 gets flagged.** It still keeps the station that fit.
- **Never pad.** Don't pick a station the passage doesn't really support just to fill a slot.
- **Flag the passage instead.** A flag means "this passage may be too thin. Check whether it should merge with its neighbor." A flag is not a failure.
- **Every flag needs a reason.** Say which stations you checked and why each one didn't fit.

## After picking

Add each picked station to the running total before moving to the next passage.

## Output for each passage

- The passage title
- The stations picked, in order
- The idioms found, when Idioms is picked
- Or a flag, with the reason
