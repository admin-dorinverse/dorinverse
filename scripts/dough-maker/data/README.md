# Lesson-maker data

| Path | What it is |
|---|---|
| `bsb-footnotes.json` | **The BSB footnotes** (4,818), one entry per footnote: `{ ref, book, chapter, verse, after, text }`. `after` is the last few words of the verse before the footnote mark, so it shows which word the note explains ("…Call me Mara," → "Mara means bitter."). Use this for the Definitions step ("BSB footnotes first") and to load footnotes into the database. |
| `bsb-usj/` | **The full BSB with footnotes**, as the publisher ships it: one USJ file (Unified Scripture JSON) per book, `GEN.usj` … `REV.usj`. `bsb-footnotes.json` was made from these. Footnotes are `{ "type": "note", "marker": "f" }` nodes inside the verse text. |
| `dictionaries/` | Public-domain dictionaries for Definitions, and WordNet for the copy check. See its README. |
| `idioms.json` | The 436 idioms the app shows, each with its verses (`occurrences`, with `passage_id`) and the Prep cards it pops up on (`cards`). Made by `run/idioms-link.mjs`. |
| `commentaries/idiom-verse-notes.json` | For each verse an idiom is in (495), each public-domain commentary's note on it: Adam Clarke, Jamieson-Fausset-Brown, John Calvin, John Gill, Keil and Delitzsch, Matthew Henry (2,557 notes). From bible.helloao.org/api/c, which marks them public domain. A commentary stores a section once, under its first verse, so a verse's note is the section that starts at or before it (`from_verse`). The full chapter files (85 MB) are in the git-ignored `run/.cache/commentaries/`. |
| `prophecy-links.json` | The approved prophecy links (Sample Table). |
| `verses.md` | Notes on verses. |

The verse text the lesson maker reads (`bsb.json`, no footnotes) is outside the repo, in the data folder `run/bsb.mjs` points to (`DORINVERSE_DATA`, default `~/OneDrive/Desktop/dorinverse-data`).

## Where the BSB came from

bereanbible.com/bsb_usj.zip (3rd printing), downloaded 2026-11-15. The BSB was placed in the public domain on April 30, 2023 (berean.bible/licensing.htm): no license or credit is needed.
