# Public-domain dictionaries

Downloaded 2026-11-15 for the Definitions step (definitions.md: "use public-domain sources"). Each file is one JSON object with `source`, `author`, `year`, `public_domain`, `credit` and `entries`.

| File | Dictionary | Year | Entries | Entry shape |
|---|---|---|---|---|
| `smith.json` | Smith's Bible Dictionary (William Smith) | 1863 | 4,561 | `{ term, definition, scripture_refs }` |
| `schaff.json` | A Dictionary of the Bible (Philip Schaff) | 1880 | 4,725 | `{ term, definition, scripture_refs }` |
| `hitchcock.json` | Hitchcock's Bible Names Dictionary (Roswell D. Hitchcock) | 1869 | 2,619 | `{ term, definition, scripture_refs }` (name meanings only) |
| `webster-1913.json` | Webster's Revised Unabridged Dictionary | 1913 | 97,584 | `{ word, senses: [ { pos, text } ] }` |

Easton's (1897) isn't here: it's already in the database.

## Where they came from

- **Smith, Schaff, Hitchcock:** github.com/neuu-org/bible-dictionary-dataset (`data/02_sources/`), parsed from CCEL texts. The texts are public domain; the parsing is CC BY 4.0, so credit "NEUU bible-dictionary-dataset" if the raw entries are shown anywhere.
- Its "Hastings" file was left out: 1,592 of its entries are word for word the same as Schaff, and it has no entry for common words like Faith, so it isn't reliably Hastings.
- **Webster 1913:** Project Gutenberg ebook #29765 (the UTF-8 text from github.com/adambom/dictionary), parsed here so a word with more than one meaning keeps all of them ("defile" has 4). The word-history notes (Etym) are taken out.

## Notes for use

- Terms in the Bible dictionaries are in mixed case (`Manna`, `MANNA`): match without case.
- Webster's words are lower case. `pos` is the part of speech as Webster wrote it (`n.`, `v. t.`, `a.`), or null.
- Definitions are summarized in our own words (definitions.md), never copied.
