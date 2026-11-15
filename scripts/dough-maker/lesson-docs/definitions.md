# Definitions

This file covers the hard-word definitions for the dictionary pop-up.

## When

- Definitions are made after the Prep story cards and choice cards.
- Only words in those cards get a pop-up. The reveal screen gets none.
- A definition pop-up sits on every card the word is on, even if it shows something a later choice card asks about. Pop-ups are the exception to Prep's "never give away an answer" rule.

## Which words

- Only Bible words: words that belong to the Bible's world, like Sabbath, ephod, tabernacle, Pharisee, leaven or tithe. Never everyday English words, even hard ones, and never names of people or places.
- The words come from one Bible word list, which the owner approves.
- Meanings are written for about a 5th-grade reader. It isn't strict: use judgment.

## Sources

- Use the BSB footnotes first, when they explain the word.
- Otherwise, use public-domain sources. Many passages have no BSB footnotes, or none that explain the word. That's normal.
- Summarize the meaning in your own words. Never copy the source's wording.
- A meaning never shares 8 or more words in a row with a dictionary's entry for that word, old or modern. A script checks this.
- The meaning says only what its source says.
- If no source explains the word, leave it out.
- Each meaning is written for its own word. No set template.

## Output

One JSON file for the whole Bible. A word has one meaning, written once, unless the Bible uses it in more than one way, like *law* (the Law of Moses, or a rule). Then each way gets its own meaning. A card shows only the meaning that fits how the word is used on that card, never two. Forms of a word, like debtor and debtors or sacrifice and sacrificed, share one entry and one meaning. Each word lists every passage and card it appears on, and which meaning each card uses.

```json
{
  "words": [
    { "word": "...", "forms": [ "...", "..." ],
      "meanings": [ { "id": 1, "meaning": "...", "sources": [ "BSB footnote" ] } ],
      "cards": [ { "passage_id": 12, "stop": 1, "card": 3, "meaning": 1 } ] }
  ]
}
```

- **forms:** every form of the word the cards use
- **cards:** every card the word appears on, with the meaning that card shows
