# Checker

This file covers checking a step's output against its docs and the BSB.

## What to check

- Check the output against every rule in the md files that step used, and against the passage text in the BSB.

## Covered or not covered

Every finding is one of two kinds:

- **Covered:** a rule in the docs already says what is right. The output just broke it. Give the rule.
- **Not covered:** the docs don't say what to do. These go to a person.

## Giving the rule

For a covered finding, give the rule itself, never a number:

- The file and the section, as a link: `prep-walkthrough.md#answer-rules`. The link is the section heading in lowercase, with spaces as hyphens and punctuation left out.
- The rule's exact words, quoted from the doc.

## What happens next

- Covered findings go back to the step that made the output, with its same files, to fix. readme.md ("Checking each step") says how many times.
- Not-covered findings are not sent back to the step. They go in the tracker for a person.

## Output

A JSON file for the passage. References use the book names in the BSB text, with a hyphen for a range, like `Mark 2:1-3`.

```json
{
  "step": "prep",
  "findings": [
    { "covered": true,
      "where": { "stop": 1, "card": 4 },
      "problem": "...",
      "rule": { "link": "prep-walkthrough.md#answer-rules", "text": "..." } },
    { "covered": false,
      "where": { "stop": 2, "card": 7 },
      "problem": "...",
      "question": "..." }
  ]
}
```

- **step:** "passages", "prep", "burnt_cookies", "big_idea", "sample_table", "answer_explanations", "definitions" or "idioms"
- **where:** the stop and card, the line for Burnt Cookies and the Big Idea (`{ "line": 3 }`), the passage's id for Passages (`{ "passage": 12 }`), or null when it's about the whole output
- **question** (not covered only): what a person needs to decide
- Nothing found: an empty list.
