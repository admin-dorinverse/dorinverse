# Definitions

This file covers the hard-word definitions for the dictionary pop-up.

## When

- Definitions are made after the Prep story cards and choice cards.
- Only words in those cards get a pop-up. The reveal screen gets none.
- A definition pop-up sits on every card the word is on, even if it shows something a later choice card asks about. Pop-ups are the exception to Prep's "never give away an answer" rule.

## Which words

- If not knowing the word would make it harder to understand what is being said, define it.
- Aim at about a 5th-grade reader. It isn't strict: use judgment.

## Sources

- Use the BSB footnotes first, when they explain the word.
- Otherwise, use public-domain sources. Many passages have no BSB footnotes, or none that explain the word. That's normal.
- Summarize the meaning in your own words. Never copy the source's wording.
- The meaning says only what its source says.
- If no source explains the word, leave it out.
- Each meaning is written for its own word. No set template.

## Output

A JSON file for the passage. A word always has the same meaning, so each word appears once. Different forms of a word, like debtor and debtors, are separate words. Each card is given by its stop and card number in Prep.

```json
{
  "words": [
    { "word": "...", "meaning": "...", "sources": [ "BSB footnote" ],
      "cards": [ { "stop": 1, "card": 3 }, { "stop": 2, "card": 5 } ] }
  ]
}
```

- **cards:** every card the word appears on
