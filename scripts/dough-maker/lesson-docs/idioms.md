# Idioms

This file covers connecting the idiom list (`../data/idioms.json`) to passages and Prep cards. The list is already made. Idioms are a pop-up, like definitions. They are not collectibles.

## Passages

- Run this after passages.md has run for the whole Bible.
- Each verse in an idiom's occurrences belongs to one passage. Set its passage_id to the id (from passages.md) of the passage whose range contains that verse.

## Cards

- Run this after the Prep cards are made.
- Any card whose text contains an idiom's wording gets that idiom's pop-up. Add the card to the idiom's cards list as its passage id, stop and card number: `{ "passage_id": 12, "stop": 1, "card": 3 }`.
- This holds even if the idiom's pop-up shows something a later choice card asks about. Pop-ups are the exception to Prep's "never give away an answer" rule.

## Meanings

- Each idiom's meaning is checked against every verse it's in, and against the public-domain commentaries' notes on those verses (`../data/commentaries/idiom-verse-notes.json`). It says only what the commentaries say.
- A meaning that's wrong for any of its verses is rewritten from those notes.
- Meanings are written for about a 5th-grade reader: 1 or 2 sentences, about 30 words at most. When a meaning refers to God, He, Him and His are capitalized.
- When the commentaries disagree, the meaning says so simply, like "Bible teachers aren't sure. It may mean…"
- An idiom keeps one meaning for all its verses, unless it means something different in some of them. Then each use gets its own meaning, and a card shows only the one that fits.
- A card gets the idiom's pop-up only where it really uses the phrase as the idiom.
- The sources listed with a meaning are the commentaries it was written from.
