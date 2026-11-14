# Answer Explanations

This file covers what Papa Dorin says after the baker picks an answer on a choice card.

## Reactions (shown by the code)

The code shows a short reaction before the explanation. Reactions can repeat.

- Missed: "Underbaked," "Still doughy," "Came out burnt"
- Right: "Baked just right," "Fine work, baker!," "Box-worthy!," "That's a keeper!," "Perfect bake!"

The explanation never includes a reaction. Praise like "You got it, baker" isn't a reaction and is fine.

## When the baker misses

- The right answer shows at the same time as the missed one.
- For fill in the blank, the wrong words picked show along with the right ones.

## Explanations

- Every answer gets its own explanation, the right one too. What Papa Dorin says depends on the answer the baker picked.
- He explains. He brings in the verse when it helps, and it flows naturally in what he says. Never a reference on its own.
- There is no formula. Each explanation sounds natural and different from the others.
- About 3 to 5 sentences: long enough for his personality and the verse when it's needed, never long. Short fragments like "Never." don't count as sentences.
- It never reuses a joke or line from the Prep cards word for word.
- No em dashes or en dashes to make a sentence longer.
- On a true or false card whose answer is False, every explanation says what the text really says. That counts as telling the baker, so Prep needs no extra card for it.
- papa-dorin.md covers how he sounds.

## Output

A JSON file for the passage. Each choice card from Prep, by stop and card number, with an explanation for every answer, in the same order as the card's answers.

```json
{
  "cards": [
    { "stop": 1, "card": 2,
      "explanations": [
        { "answer": "...", "explanation": "..." },
        { "answer": "...", "explanation": "..." },
        { "answer": "...", "explanation": "..." }
      ] }
  ]
}
```
