# Idioms

This file covers connecting the idiom list (`../data/idioms.json`) to passages and Prep cards. The list is already made. Idioms are a pop-up, like definitions. They are not collectibles.

## Passages

- Run this after passages.md has run for the whole Bible.
- Each verse in an idiom's occurrences belongs to one passage. Set its passage_id to the id (from passages.md) of the passage whose range contains that verse.

## Cards

- Run this after the Prep cards are made.
- Any card whose text contains an idiom's wording gets that idiom's pop-up. Add the card to the idiom's cards list as its passage id, stop and card number: `{ "passage_id": 12, "stop": 1, "card": 3 }`.
- This holds even if the idiom's pop-up shows something a later choice card asks about. Pop-ups are the exception to Prep's "never give away an answer" rule.
