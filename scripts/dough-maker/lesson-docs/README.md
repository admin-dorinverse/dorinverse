# Dorinverse Lesson Docs

This file says which file to load for each step. Load only the files the current step needs. Never load every file at once.

These files are the current lesson rules. The older files in `../ingredients/`, `../question-rules.md` and `../../lesson-maker/PLAN.md` are outdated. When they disagree with these files, these files win.

## The build order

1. **Passages:** divide the Bible into passages and give each one a type
2. **Papa Dorin's Prep: walkthrough**
3. **Papa Dorin's Prep: Burnt Cookies**
4. **Station picker:** pick the passage's stations, usually 2
5. **Stations:** the ones picked
6. **Sample Table**

Passages are built for the whole Bible first. The station picker runs after Prep, so it can see what Prep taught.

## Which file to load

Every lesson step also gets the passage text in the BSB.

| Step | File | Also load |
|---|---|---|
| Passages | `passages.md` | The BSB text of the whole Bible |
| Prep walkthrough | `prep-walkthrough.md` | `papa-dorin.md` |
| Burnt Cookies | `burnt-cookies.md` | `papa-dorin.md`, the Prep cards for the passage |
| Station picker | `station-picker.md` | The Prep cards for the passage, its `BSB Eligible` words (from `public.dictionary_term_verse`), the running station totals |
| Words | `station-words.md` | The passage's `BSB Eligible` words, from `public.dictionary_term_verse` (Easton's Bible Dictionary) |
| Idioms | `station-idioms.md` | `papa-dorin.md`, the passage's idioms from the database (found by the station picker) |
| Wisdom | `station-wisdom.md` | `papa-dorin.md`, the Prep cards for the passage |
| Parables | `station-parables.md` | — |
| Sermon | `station-sermon.md` | — |
| Sample Table | `sample-table.md` | The Prep cards for the passage, the app's character set, the approved prophecy link list (`../data/prophecy-links.json`) |
