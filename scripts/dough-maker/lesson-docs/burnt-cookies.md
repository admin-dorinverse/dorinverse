# Papa Dorin's Prep: Burnt Cookies

This file covers the content for Burnt Cookies, the last part of Papa Dorin's Prep. It does not cover Papa Dorin's voice or the walkthrough. Those have their own files (see the end).

## What it is

After the walkthrough, Papa Dorin retells the passage one last time in 5 short lines. 2 of them are burnt: each has at least one detail wrong. It's a quick check that the passage stuck.

It runs once for the whole passage, including any included parable or sermon.

## The passage text

- The passage text is provided in the **BSB** (Berean Standard Bible).
- Every fact and every verse number comes from that text.

## The lines

- There are **5 lines**, and **2 of them are burnt**.
- They go in passage order, from start to end, so together they retell the passage.
- Each line is bite-sized: short, and in Papa Dorin's voice. Use judgment on how much it covers: one moment, or a few that belong together.
- Every line cites its verses.
- The 3 good lines are true to the BSB text.
- Which 2 lines are burnt, and which details are wrong, are chosen naturally for each passage. Never a pattern.

## What makes a cookie burnt

- A burnt line has at least one wrong detail. It can have more.
- Each wrong detail is a real detail from somewhere in the Bible and the same kind of thing as the true one: a place for a place, a person for a person. For example, "Jonah finds a ship headed for Joppa."
- It's a detail the walkthrough taught, so the baker had a fair chance to know it.
- It can reuse a wrong answer from a Prep choice card, but a new wrong detail is better.
- It's a detail that matters, never a wording trick or a near-synonym, so swapping "ship" for "boat" doesn't count.
- It's never taken from a summary story card for a long stretch.
- No other line, joke or callback gives away a burnt detail.

## Output

A JSON file for the passage, with the 5 lines in passage order. References use the book names in the BSB text, with a hyphen for a range, like `Mark 2:1-3`.

```json
{
  "lines": [
    { "line": 1, "verses": "Book 3:1-4", "text": "...", "burnt": true,
      "wrong_details": [
        { "wrong": "...", "true": "...", "verse": "Book 3:3" }
      ] },
    { "line": 2, "verses": "Book 3:5-8", "text": "...", "burnt": false }
  ]
}
```

- **text:** the line as the baker sees it
- **wrong_details** (burnt lines only): every wrong detail, with the true detail and the verse that proves it

## Other files

- **Papa Dorin's personality:** his voice.
- **Prep walkthrough:** the story cards and choice cards that come before Burnt Cookies.
- **The Big Idea:** comes after Burnt Cookies.
