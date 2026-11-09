# Sample Table

This file covers the content for the Sample Table.

## What it is

Sample cookies are bonuses the baker collects from the passage. There is no test. Sample cookies go into their own collections, not the cookie box.

## The passage text

- The passage text is provided in the **BSB** (Berean Standard Bible).
- Every quote is the exact BSB wording, with its reference.

## The main rule: the text's own word decides

A sample cookie is only given when the text itself names the thing. The agent never decides that something "counts" on its own.

The one exception is prophecy cookies. They come from the approved prophecy link list, not from the passage's wording.

## How many

- A passage gets every sample cookie its text qualifies for. There is no limit for any type. If it applies, it applies.

## The cookie types

### Instruction cookies

Only two kinds of instructions can become instruction cookies. Nothing else.

**1. The Ten Commandments**
- Given as **one pack**: all ten together, each as its own cookie.
- Only from the passages where the text gives them: Exodus 20 and Deuteronomy 5.

**2. New Testament commands.** All of these must be true:
- It's a command stated in the passage.
- It's given or approved by Jesus, or written by the writer of a New Testament letter. For example, "Love your neighbor as yourself" counts in Luke 10:27–28, where the expert says it and Jesus approves it.
- It's for believers. A one-time instruction to one person isn't a rule. For example, "Go and do likewise" (Luke 10:37) isn't an instruction cookie.
- It was told on a Prep story card. An instruction told only on a choice card isn't collectible.

**No other instructions.** No Old Testament laws other than the Ten Commandments.

**Card**
- Front: the instruction, in exact BSB wording
- Back: who said it, and the reason, only if the verse states one

### Character card cookies

- **Skipped for now.** Don't make character card cookies until the character set is ready. The rules below are for later.
- Given for each person named in the passage, including people named only inside someone's words, matched to the character cards in the staging database.
- A name used only in a title, like "the God of Jacob," "the sons of Korah" or "the order of Melchizedek," doesn't count.
- God and the Holy Spirit don't get character cards. Jesus does.
- The card reveals the character's name. Everything else about the character comes from the database.
- A character can show up in more than one passage. That's fine.

### Song cookies

- Only when the text says it was sung. For example, Exodus 15:1.
- Not when the whole passage is the song, like most psalms. The song cookie is for a song inside a passage.

### Prayer cookies

- Only when the text says someone prayed. For example, Jonah 2:1.

### Blessing cookies

- Only when someone speaks a blessing over others and the text calls it a blessing. For example, Numbers 6:23–26.
- The words "blessed" or "bless" alone don't make a blessing. "Blessed is the man…" (James 1:12) and "I will surely bless you" (Genesis 22:17) don't count.

**Card for songs, prayers and blessings**
- Who: who sang, prayed or blessed
- What just happened: the moment right before it in the passage
- Reference: where the song, prayer or blessing runs
- Key line: one line from it, in exact BSB wording

### Prophecy cookies

- Only for links on the approved prophecy link list. The list is provided.
- **They come in halves.** A passage with the promise gives the promise half. A passage with the fulfillment gives the fulfillment half. When the baker has both halves, they join into one whole cookie.

**Card (each half)**
- The promise or the fulfillment, in exact BSB wording, with its reference
- Quote only the verses that make the link. For Acts 8:32–35, that's the verses the eunuch reads (8:32–33), not the whole conversation.

## On the path

- Each sample cookie sits on the story card where its verse is told. There are no collectibles on a choice card: anything told only on a choice card isn't collectible. The baker collects it from a pop-up, can look at it, and goes back to the path.
- This holds even if the cookie shows something a later choice card asks about. Pop-ups are the exception to Prep's "never give away an answer" rule.

## What is never a sample cookie

- Poems the text doesn't name as a song, prayer or blessing. These stay in Prep.
- Laments, for now. This holds even when the text calls the lament a song or a prayer: a lament never gets a sample cookie.

## Output

A JSON file for the passage. Each cookie gives the Prep story card it sits on (stop and card number). References use the book names in the BSB text, with a hyphen for a range, like `Mark 2:1-3`. Leave out character cards for now.

```json
{
  "cookies": [
    { "type": "instruction", "stop": 1, "card": 7,
      "instruction": "...", "who": "...", "reason": null, "reference": "Book 3:7" },
    { "type": "ten_commandments", "stop": 2, "card": 3,
      "commandments": [ { "text": "...", "reference": "Book 3:3" } ] },
    { "type": "song", "stop": 1, "card": 12,
      "who": "...", "what_just_happened": "...",
      "reference": "Book 3:12-15", "key_line": "..." },
    { "type": "prophecy", "stop": 1, "card": 9,
      "link_id": 1, "half": "promise", "quote": "...", "reference": "Book 3:9" }
  ]
}
```

- **type:** "instruction", "ten_commandments", "song", "prayer", "blessing" or "prophecy". Prayers and blessings use the same fields as songs.
- **reason:** only if the verse states one, otherwise null
- **link_id:** the id from the approved prophecy link list. **half:** "promise" or "fulfillment".
- No cookies: an empty list.
