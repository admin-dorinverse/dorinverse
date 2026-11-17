# Round 5 tracker

Run of 2026-11-08. Six passages from passages.md: Psalm 139:1-24, Isaiah 55:1-13, Luke 6:17-49 (Sermons, included parable 6:39-40), Luke 16:1-13 (Parables), Acts 13:13-52 (Narrative, included sermon 13:16-41), Ephesians 2:1-10. Every step ran: Passages, Prep, Burnt Cookies, Big Idea, Sample Table, Definitions, Answer explanations, Idioms. Every output loaded. The run never stopped.

## Needs human decision

24 groups. Each asks its question once.

### H1. Do the poetry, letters and prophecy rules apply to Sermons, and to teaching inside Parables?

prep-walkthrough.md says not to make the baker guess the next words of a line, to use fewer choice cards, and allows 4 story cards in a row, but only for poetry, letters and prophecy. Luke 6 (Sermons) and Luke 16:9-13 (Jesus' teaching in a Parables passage) got fill-in-the-blanks on Jesus' exact words.

Places (6):
- Luke 6, prep, whole output (p3-luke6-prep-check1.json): Should Sermon passages (teaching with little narrative) follow the poetry/letters/prophecy rules on guessing wording and using fewer choice cards, or the normal story rules?
- Luke 6, prep, whole output (p3-luke6-prep-check2.json): Should Sermons passages follow the poetry, letters and prophecy rules, so that fill in the blank and other choice cards don't ask the baker to supply Jesus' exact wording? If they should, these cards need to be reworked.
- Luke 6, prep, whole output (p3-luke6-prep-check3.json): Should Sermons passages follow the Poetry, letters and prophecy rules (no guessing the next words of a line, fewer choice cards, 4 story cards in a row allowed), or the narrative rules as this Prep does?
- Luke 16, prep, stop 2 card 8 (p4-luke16-prep-check1.json): Should teaching sections in Parables passages (like Jesus' sayings in Luke 16:9-13) follow the poetry/letters/prophecy rules (no guessing the wording, fewer choice cards, up to 4 story cards in a row)?
- Luke 16, prep, stop 2 (p4-luke16-prep-check2.json): Do the poetry, letters and prophecy rules (no guessing the next words of a line, fill in the blank included; fewer choice cards; up to 4 story cards in a row) also apply to teaching or sayings sections in Parables passages like Luke 16:9-13?
- Luke 16, prep, stop 2 card 8 (p4-luke16-prep-check3.json): Should the poetry, letters and prophecy rules (never guess the next words of a line, blanks test reasoned meaning and not unseen wording, fewer choice cards) also cover teaching or sermon stretches like Luke 16:9-13? If they should, card 8 (and possibly cards 2, 6 and 10) need rewriting.

### H2. In poetry, letters and prophecy, which wins: "choice cards equal to or more than story cards" or "fewer choice cards"?

Both lines are in prep-walkthrough.md. Psalm 139 and Ephesians 2 sat exactly even to satisfy both.

Places (4):
- Psalm 139, prep, whole output (p1-psalm139-prep-check2.json): For poetry, letters and prophecy, does "Choice cards are equal to or more than story cards" still apply, or does "Fewer choice cards" mean story cards may outnumber choice cards in these passages?
- Psalm 139, prep, whole output (p1-psalm139-prep-check3.json): In poetry, letters and prophecy, does "Choice cards are equal to or more than story cards in every stop" still apply as a hard rule, or does "Fewer choice cards. Tell more of the passage on story cards" let story cards outnumber choice cards?
- Ephesians 2, prep, whole output (p6-ephesians2-prep-check1.json): In poetry, letters and prophecy, which rule wins: choice cards equal to or more than story cards, or fewer choice cards than story cards? Does "fewer" mean fewer than story cards, or only fewer than a narrative passage would have?
- Ephesians 2, prep, whole output (p6-ephesians2-prep-check2.json): For poetry, letters and prophecy, does 'Fewer choice cards' override the rule that choice cards must equal or outnumber story cards, or is an even split the intended floor?

### H3. Fixes vs. counts: "a fix changes only the items in the findings" collides with stop counts and coverage.

From the run, not a checker. Adding a setup story card broke the story/choice count (Psalm 139 stops ended 8:7 and 9:8). Fixers merged or cut untouched cards to stay even (Isaiah 55 lost part of 55:5; Ephesians 2 merged cards). A Big Idea fix to cover missed verses turned it back into a retelling (Ephesians 2). A Burnt Cookies fix undid the previous fix (Acts 13 line 5). A rewrite for "no formula" added 16 new slips (Acts 13 explanations). Should a fix be allowed to touch nearby items when a rule forces it?

### H4. May cards use facts from outside the passage, and how are they cited?

Opening cards named Paul and the Ephesians (from Eph 1:1) and the choosing of the Twelve (Luke 6:12-16). Pilate is never described in Acts 13. A Big Idea named Luke as the writer of Acts. An explanation named God as speaker from Hab 1:5, called untying sandals "the lowest job", and credited "brood of vipers" only to John the Baptist.

Places (9):
- Luke 6, prep, stop 1 card 1 (p3-luke6-prep-check2.json): Can the opening card state facts from the passage before as context? If it can, should it cite those verses (here Luke 6:12-17), or keep the reference inside the lesson's passage?
- Luke 6, prep, stop 1 card 1 (p3-luke6-prep-check3.json): When the opening card uses context from the preceding passage, should it cite those verses (for example Luke 6:12-17), cite only the lesson passage, or avoid stating prior-passage facts?
- Ephesians 2, prep, stop 1 card 1 (p6-ephesians2-prep-check3.json): In a letter passage that does not name its writer or readers, may the opening card name them from outside the passage (here Ephesians 1:1)? If so, does the card have to cite that verse, and how, since a card has only one verses range?
- Acts 13, prep, stop 2 card 12 (p5-acts13-prep-check1.json): When a new person shows up and the passage doesn't say who they are (like Pilate here), should Papa Dorin introduce them from the wider Bible ("Pilate, the Roman governor")? Or does the rule that every fact comes from the passage text mean he names them without an introduction?
- Acts 13, prep, stop 2 card 11 (p5-acts13-prep-check3.json): When the passage itself never says who a new person is (here Pilate), may Papa Dorin describe him from elsewhere in the Bible (for example "Pilate, the governor"), or should he leave the name with no description?
- Acts 13, big idea, line 6 (p5-acts13-big_idea-check2.json): Can Papa Dorin name a book's traditional author (here Luke for Acts) when the BSB text doesn't name them? If he can, how should he introduce them, and what reference does the claim need? If he can't, should he say "the passage" or "the chapter" instead?
- Acts 13, answer explanations, stop 2 card 20 (p5-acts13-answer_explanations-check1.json): When a passage quotes the prophets without naming who speaks, may Papa Dorin name God as the speaker using the source verse (here Hab 1:5)? If so, must he give that reference, or must he leave the speaker open the way Acts does?
- Acts 13, answer explanations, stop 2 card 8 (p5-acts13-answer_explanations-check1.json): In answer explanations, may Papa Dorin add cultural background that isn't in the passage (like untying sandals being a servant's lowest task) without a reference? Or does that count as stretching the text?
- Luke 6, answer explanations, stop 3 card 8 (p3-luke6-answer_explanations-check1.json): When a wrong answer points to another passage, should Papa Dorin stick to the same book (here Luke), or must the claim hold for the whole Bible?

### H5. On a choice card, does "verses" cover context the question retells, or only the right answer's verses?

Scripture rules say the reference runs from the first verse a card uses to the last. The Output section says it is also the right answer's verses. Questions must give context, so they retell earlier verses.

Places (3):
- Luke 6, prep, whole output (p3-luke6-prep-check2.json): When a choice card's question retells earlier verses for context, should 'verses' cover everything the card uses or only the right answer's verses? Should the schema get a separate field for the answer?
- Acts 13, prep, whole output (p5-acts13-prep-check2.json): On a choice card, does context the question repeats from earlier verses (needed so it doesn't point back to a card the baker can't see) count toward the card's reference? Or should the reference cover only the verses the question asks about and its right answer?
- Acts 13, prep, whole output (p5-acts13-prep-check3.json): For a choice card, does the one verses field cover every verse the question uses (so stop 2 card 12 would be Acts 13:29-30), or only the right answer's verse (Acts 13:30)? Is context the question repeats from an earlier card exempt?

### H6. Does every choice card need a story card right before it?

"The setup for a choice is always on a story card." One checker read it as a story card before every choice card; another let the setup sit in the question. Checkers disagreed across rounds.

Places (1):
- Psalm 139, prep, whole output (p1-psalm139-prep-check1.json): Does every choice card need its own story card right before it to carry the setup? Or can a choice card follow another choice card, with its context in the question, and if so how much of the passage (for example, a whole quoted verse) can the question itself tell?

### H7. Big Idea: does "about 5 to 7 lines" also limit how long a line is?

Entries ran 40 to 75 words; whole Big Ideas ran 230 to 400 words.

Places (5):
- Luke 16, big idea, whole output (p4-luke16-big_idea-check1.json): Does "about 5 to 7 lines" mean 5 to 7 short lines, each a sentence or two, or 5 to 7 JSON entries of any length? Should big-idea.md set a limit per line or a word count?
- Luke 16, big idea, whole output (p4-luke16-big_idea-check2.json): Does 'about 5 to 7 lines' mean 5 to 7 entries of any length, or should each entry be a short line (one or two sentences, or a word limit)? If short lines are meant, what limit should big-idea.md state?
- Acts 13, big idea, whole output (p5-acts13-big_idea-check2.json): Does "about 5 to 7 lines" also limit how long each line is, such as one or two sentences, or a word count? Or can a single entry hold several sentences?
- Acts 13, big idea, whole output (p5-acts13-big_idea-check3.json): Does a Big Idea "line" mean a single short sentence or line of text, or can one entry be a multi-sentence paragraph? Should there be a word or sentence limit for each entry or for the whole Big Idea?
- Ephesians 2, big idea, whole output (p6-ephesians2-big_idea-check3.json): Does 'about 5 to 7 lines' limit only the number of entries, or should each entry also be short (for example one or two sentences)? If so, what's the limit?

### H8. Big Idea: what must "covers the whole passage" include?

Luke 6 left out the setting before the sermon (6:17-19). Acts 13 left out the opening at Perga and the sermon's closing warning.

Places (4):
- Luke 6, big idea, whole output (p3-luke6-big_idea-check1.json): In a Sermons passage, does 'covers the whole passage' mean the Big Idea must also mention the setting verses before the sermon starts (here the healings in Luke 6:17-19), or is covering the sermon itself enough?
- Luke 6, big idea, whole output (p3-luke6-big_idea-check2.json): In a Sermons passage, does "It covers the whole passage" mean the Big Idea must also mention the story around the sermon (here the crowd and the healings in Luke 6:17-19), or is it enough to cover the sermon?
- Luke 6, big idea, whole output (p3-luke6-big_idea-check3.json): In a Sermons passage, does "It covers the whole passage" mean the Big Idea must also mention the setting before the sermon starts (here the crowd and the healings in Luke 6:17-19), or is covering the sermon enough?
- Acts 13, big idea, whole output (p5-acts13-big_idea-check1.json): Does "It covers the whole passage, including any included parable or sermon" mean the Big Idea must touch every major section, such as the sermon's closing warning, or only that its summary spans the passage as a whole?

### H9. Big Idea: can it state a meaning or link the text doesn't say outright?

Psalm 139: "that's not a trap, it's a comfort." Isaiah 55: "freely pardon" (55:7) tied to the "without cost" water (55:1).

Places (2):
- Psalm 139, big idea, line 2 (p1-psalm139-big_idea-check3.json): In the Big Idea, can Papa Dorin state an interpretive conclusion the text doesn't say outright (here, that God's presence everywhere is "a comfort, not a trap")? Or does it need to be marked as his own view ("I think") or tied to specific wording, like v10's "Your hand will guide me"?
- Isaiah 55, big idea, line 5 (p2-isaiah55-big_idea-check3.json): Can Papa Dorin play on the BSB's 'freely pardon' (Isa 55:7) as 'free of cost' and link it to the 'without cost' water of Isaiah 55:1 ('Same price tag as the water!'), or should the line keep 'freely' without tying it to the price in 55:1?

### H10. Should a passage with no story group still say "the teaching continues"?

Ephesians 2:1-10 has no group, but the letter carries on at 2:11. The Big Idea ended "Paul's not done with this letter yet."

Places (1):
- Ephesians 2, big idea, whole output (p6-ephesians2-big_idea-check2.json): When a passage has no story group, should the Big Idea still say the teaching continues if the next Bible verses carry it on (like Ephesians 2:11)? Or should the continuation line only be used for passages in a story group?

### H11. Do praise openers count as a reaction?

answer-explanations.md: "The explanation never includes a reaction" and lists the reaction phrases. Explanations open with "You got it, baker", "That's right!", "True!", so the baker sees two reactions in a row.

Places (6):
- Luke 6, answer explanations, whole output (p3-luke6-answer_explanations-check1.json): Does "The explanation never includes a reaction" mean only the listed reaction phrases, or any praise opener like "nice catch!" and "You got it"?
- Luke 16, answer explanations, whole output (p4-luke16-answer_explanations-check1.json): Does "The explanation never includes a reaction" only ban the listed reaction phrases, or also any reaction-style opener like "You got it!" or "Exactly."?
- Acts 13, answer explanations, whole output (p5-acts13-answer_explanations-check2.json): Does the rule "The explanation never includes a reaction" cover only the listed reaction phrases, or also any verdict opener like "That's right!" or "False is right."?
- Acts 13, answer explanations, whole output (p5-acts13-answer_explanations-check3.json): Does 'The explanation never includes a reaction' also ban verdict openers like 'That's right!', 'True!', 'False is right.' and 'You got it', or only the listed reaction phrases?
- Ephesians 2, answer explanations, whole output (p6-ephesians2-answer_explanations-check2.json): Does "The explanation never includes a reaction" mean only the listed reaction phrases, or any opening affirmation like "You got it, baker" that repeats the code's reaction?
- Ephesians 2, answer explanations, whole output (p6-ephesians2-answer_explanations-check3.json): answer-explanations.md says "The explanation never includes a reaction" and lists the exact reaction phrases. Does that rule also cover short affirmations like "You got it, baker" or "YES, baker" at the start of a right-answer explanation? Or are those fine as long as they aren't the listed phrases?

### H12. Can jokes invent small bakery events or habits?

papa-dorin.md: he "never adds anything new" to his world, and "never holds a grudge". Jokes had him hunting a spatula for twenty minutes, a cash register, sneaking cookies, sulking for a week.

Places (7):
- Psalm 139, answer explanations, whole output (p1-psalm139-answer_explanations-check1.json): Are made-up, one-off bakery anecdotes like these fine as self-deprecating humor, or do they count as adding something new to his bakery and Dorinverse story?
- Psalm 139, answer explanations, whole output (p1-psalm139-answer_explanations-check3.json): Do small self-deprecating bakery anecdotes count as "adding anything new" to Papa Dorin's world, or are they allowed as personality?
- Isaiah 55, answer explanations, stop 2 card 5 (p2-isaiah55-answer_explanations-check2.json): Do throwaway self-deprecating jokes about his bakery or his habits count as "adding anything new" to the Dorinverse? Or are they allowed as personality, the way comparisons are?
- Isaiah 55, answer explanations, whole output (p2-isaiah55-answer_explanations-check3.json): Are throwaway self-deprecating bakery jokes like these allowed as personality, or do they count as adding something new to the Dorinverse? Does it matter whether a detail implies a sale (a cash register) when his bakery fills boxes for the Supper?
- Luke 16, answer explanations, whole output (p4-luke16-answer_explanations-check3.json): Are made-up, one-off bakery anecdotes like these fine as self-deprecating humor, or do they count as adding something new to his bakery and Dorinverse story?
- Luke 6, answer explanations, whole output (p3-luke6-answer_explanations-check1.json): Is self-deprecating humor about sulking or staying upset fine for Papa Dorin, or does it clash with "He never holds a grudge"?
- Luke 6, answer explanations, whole output (p3-luke6-answer_explanations-check3.json): Can Papa Dorin's jokes state present-tense habits or feelings about himself (sulking for a week over criticism, being nervous to lend his apron), or give new reasons for his traits ("this line is a big reason why" he doesn't hold grudges)? Or must such lines stay hypothetical ("if...") so they add nothing new to the Dorinverse and don't sit against his positive, no-grudge character?

### H13. May an explanation reuse a Prep joke word for word?

Psalm 139 stop 1 card 10 repeats "I STILL got found" from the story card the baker just read.

Places (2):
- Psalm 139, answer explanations, stop 1 card 10 (p1-psalm139-answer_explanations-check2.json): May an answer explanation repeat a joke or line from a nearby Prep card word for word, or should explanations always use fresh lines?
- Psalm 139, answer explanations, stop 1 card 10 (p1-psalm139-answer_explanations-check3.json): Can an answer explanation reuse a joke from a Prep story card word for word, or must a callback be reworded or point back to the earlier joke?

### H14. Do short fragments count as sentences in "about 3 to 5 sentences"?

Some explanations hit 6 when fragments like "Never." count.

Places (2):
- Isaiah 55, answer explanations, whole output (p2-isaiah55-answer_explanations-check2.json): "About 3 to 5 sentences": do short fragments ("Never.", "Not halfway.", "No processing fee.") count as sentences, and is 6 allowed under "about"?
- Isaiah 55, answer explanations, whole output (p2-isaiah55-answer_explanations-check3.json): "About 3 to 5 sentences": do short fragments count as sentences, and is 6 allowed under "about"?

### H15. Definitions: which words get a pop-up?

No reading level is set. Names were uneven: Canaan and Pilate got pop-ups; Paphos, Perga, Samuel, Barnabas and others didn't.

Places (3):
- Psalm 139, definitions, whole output (p1-psalm139-definitions-check1.json): What reader or reading level should the hard-word test assume? Should words like "marvelous", "precious", "presence" and "dawn" get pop-ups for Psalm 139:1-24?
- Acts 13, definitions, whole output (p5-acts13-definitions-check1.json): Should place names and people's names get definition pop-ups? If so, which ones: all of them, or only the ones a reader needs to follow the story?
- Acts 13, definitions, whole output (p5-acts13-definitions-check2.json): Should place and person names get pop-ups? If they should, which ones: all of them, or only the ones a reader needs to follow the story (for example Moses in "the law of Moses")? The docs only say to define a word when not knowing it would make the text harder to understand.

### H16. Definitions: do word forms count as one word?

debtor/debtors, commend/commended, shrewd/shrewdly; and "bless" (a different sense from "blessed").

Places (2):
- Luke 16, definitions, whole output (p4-luke16-definitions-check3.json): Should other forms of a word (debtor/debtors, commend/commends/commended, shrewd/shrewdly) count as the same word, so it gets one entry and a pop-up on every card that uses any form? If so, which form goes in "word": the base form, or the form as it's written on the cards?
- Luke 6, definitions, stop 1 card 18 (p3-luke6-definitions-check1.json): Should "bless" on stop 1, card 18 get its own entry with the sense used in Luke 6:28, separate from "blessed"? Or should related forms with a different sense be left out?

### H17. Definitions: may a meaning go beyond its cited source?

"mercy" credited to Easton's but defined differently; "like a work of art" added to "workmanship"; applying "witness" to David; "fear God" adds facts Webster's lacks.

Places (4):
- Isaiah 55, definitions, stop 1 card 8 (p2-isaiah55-definitions-check1.json): May a definition add a sentence that applies the word to the passage (here, saying what David's being a witness means) when no listed source gives that reading, or should meanings stay with the word's sense from the source?
- Acts 13, definitions, stop 2 card 1 (p5-acts13-definitions-check2.json): When a meaning includes facts that the listed source does not give, should the step add or change the source, cut those facts, or leave it as it is? The docs say to use public-domain sources and to leave a word out if no source explains it, but they don't say every part of a meaning must come from the listed source.
- Ephesians 2, definitions, stop 1 card 6 (p6-ephesians2-definitions-check2.json): Does a meaning have to summarize what its cited source says? If so, should "mercy" be rewritten from Easton's (compassion toward people in misery), or should the source be changed to one that defines it as withholding deserved punishment?
- Ephesians 2, definitions, stop 1 card 17 (p6-ephesians2-definitions-check2.json): Can a meaning add an explanation or picture that its cited source doesn't give? If not, should "like a work of art" be removed from "workmanship"?

### H18. Sample Table rule cookies: how to pick 3, and which commands count?

Luke 6 has about 9 commands; Prep asked about most, so "choice cards first" doesn't narrow it. The Golden Rule (6:31) was left out. Also: a command inside a parable (6:42), and Paul's spoken commands in Acts 13.

Places (3):
- Luke 6, sample table, whole output (p3-luke6-sample_table-check1.json): When more than 3 commands were all asked on Prep choice cards, how should the 3 be picked (for example, passage order, or the most central command such as Luke 6:31)? Should this passage keep Luke 6:27, 6:29 and 6:42, or swap one for Luke 6:31?
- Luke 6, sample table, stop 3 card 7 (p3-luke6-sample_table-check1.json): Can a command spoken inside a parable or illustration (Luke 6:39-42) be a New Testament rule cookie, or only direct commands to the listeners?
- Acts 13, sample table, stop 3 card 3 (p5-acts13-sample_table-check1.json): Do commands that a New Testament letter writer (here Paul) speaks in Acts count as New Testament rule cookies? If they do, does reported speech like Acts 13:43 ("urged them to continue in the grace of God") count as a command stated in the passage, and should a warning to a mixed synagogue crowd like Acts 13:40 count as being for believers?

### H19. Burnt Cookies: can good lines and callbacks hint at the burnt detail?

Acts 13 line 5 says "Paul and Barnabas" right after burnt line 4 swaps in Silas. Ephesians 2 line 5 keeps "God doesn't stamp crooked", a callback tied to the true word "workmanship".

Places (2):
- Acts 13, burnt cookies, line 4 (p5-acts13-burnt_cookies-check3.json): Can a good line state the true detail that a burnt line got wrong? Or should the docs say good lines must not give away a burnt detail, for example by line 5 saying just "they" or "Paul's crew"?
- Ephesians 2, burnt cookies, line 5 (p6-ephesians2-burnt_cookies-check1.json): Can a burnt line keep a walkthrough joke or callback that was tied to the true detail, even when it may hint at what was swapped? Or should burnt lines avoid callbacks like this?

### H20. Passages: three boundary calls.

(1) Where an included parable ends when the text doesn't mark it (Luke 6:39, 6:39-40 or 6:39-42; and is 6:47-49 a parable?). (2) Can a Sermons passage keep the short narrative setting before it (Luke 6:17-19)? (3) Is Luke 16:13/16:14 a natural break, or one conversation?

Places (3):
- Passages, passages, whole output (passages-check1.json): Where does an included parable's range end when the text does not mark it: just the verse the BSB calls a parable (6:39), 6:39-40, or 6:39-42? And should Luke 6:47-49 (the two builders) be listed as an included parable even though the text does not call it a parable?
- Passages, passages, whole output (passages-check1.json): Can a standalone Sermons passage keep the short narrative setting just before the sermon starts (Luke 6:17-19), or should those verses go to a Narrative passage?
- Passages, passages, whole output (passages-check1.json): Is the break at Luke 16:13/16:14 a natural turn (a new audience), or is it the middle of one conversation, so that 16:14-18 should stay with the shrewd manager?

### H21. Prep isn't given the passage's included parables and sermons.

From the run. prep-walkthrough.md says an included parable or sermon gets its own stop, but readme.md's table gives Prep only the type, story group and position. Luke 6's included parable (6:39-40) got no stop of its own because Prep had no way to know. Should Prep also get the passage's "included" list? A checker also asked how stops work when the whole passage is a sermon.

Places (1):
- Luke 6, prep, whole output (p3-luke6-prep-check1.json): When the passage type is Sermons, may the sermon be split across several stops, and should the narrative setting before it get its own stop or share one?

### H22. checker.md and idioms.md formats don't fit every step.

From the run. checker.md's "where" has only stop and card; Burnt Cookies and the Big Idea have lines, so checkers made up {"line": n}. checker.md's step list has no "idioms", so idioms got no check. idioms.md never defines passage_id (passages.json has no id) or the card entry; the agent used list position and {passage_id, stop, card}. It also asks: do reworded idiom forms count, overlapping idioms, and wrong-answer text?

### H23. Checkers don't agree from one round to the next.

From the run. The same item was "not covered" in one check and "covered" in the next (setup on a story card; "brood of vipers"). Some checks missed slips a later check caught (Acts 13 Burnt Cookies line lengths). Should the checker see the earlier checks?

### H24. Small Prep wording calls.

A true/false that hinges on a poetic picture (Ps 139:18). An unclear question (Isa 55, stop 2 card 7). Keeping a speaker's "us" in a paraphrase (Acts 13). Comma splices to stay at 2 sentences (Eph 2). "Real prophets" for "the prophets" (Luke 6 explanations).

Places (5):
- Psalm 139, prep, stop 2 card 7 (p1-psalm139-prep-check2.json): Is a true/false statement OK when its answer depends on reading a poetic picture (outnumbering the sand means uncountable), or should it be reworded to something the verse settles directly (for example, that God's thoughts are few enough to count)?
- Isaiah 55, prep, stop 2 card 7 (p2-isaiah55-prep-check2.json): Should the docs require choice-card questions to be clear and grammatical, and should this card be reworded, for example to "In the same way, what does the LORD say will not return to Him empty?"
- Acts 13, prep, stop 2 card 10 (p5-acts13-prep-check2.json): When Papa Dorin retells a speech without quotation marks, should the pronouns shift to fit his telling ("it is to them this message has been sent")? Or is it fine to keep the speaker's "us" and "you" when the line stays close to the BSB wording?
- Ephesians 2, prep, stop 1 card 5 (p6-ephesians2-prep-check3.json): Should the ban on stretching sentences also cover comma splices and long run-on sentences like this one, so that card 5 counts as more than 2 sentences?
- Luke 6, answer explanations, stop 1 card 15 (p3-luke6-answer_explanations-check1.json): Is this wordplay clear enough, and is "real/true prophets" an acceptable way to name "the prophets" of Luke 6:23?

## Needs agent fix

55 items left after two fixes, grouped by rule. Each is a builder slip a rule already covers. A batch rerun fixes only these.

### A1. papa-dorin.md#facts-and-scripture (27)

Rule: "Leave open what the text leaves open. Who is being spoken to, why, or how two things connect."

- Psalm 139, answer explanations, stop 2 card 2 (p1-psalm139-answer_explanations-check3.json): The explanation for "He keeps quiet about it" uses the heading "For the choirmaster" (Psalm 139:1) as proof that David didn't keep quiet about how he was made: "And the whole psalm is for the choirmaster, no less (Psalm 139:1). That's the opposite of keeping quiet." The text never ties the choirmaster note to David's response in Psalm 139:14. The explanation adds that link, so it should drop the choirmaster lines and rely on Psalm 139:14.
- Psalm 139, answer explanations, stop 2 card 11 (p1-psalm139-answer_explanations-check3.json): The explanation for "As foreign soldiers" says "with all that talk of bloodthirsty men." The psalm mentions bloodthirsty men once, in Psalm 139:19, so "all that talk" stretches the text. That fact also has no reference.
- Psalm 139, big idea, line 5 (p1-psalm139-big_idea-check3.json): Line 5 says David "asks God to slay them." Psalm 139:19 is a wish, not a request: "O God, that You would slay the wicked." The Prep cards call it a wish too ("David wishes God would slay the wicked"). Calling the wish an ask is the same mistake as the doc's Naomi example.
- Isaiah 55, answer explanations, stop 2 card 14 (p2-isaiah55-answer_explanations-check3.json): The "everlasting" explanation says "Every cookie I've ever stamped is long gone." That clashes with his own world. The cookies he stamps go into sealed boxes kept for the Marriage Supper, so they aren't long gone. The line changes his mission story instead of just talking about it.
- Isaiah 55, prep, stop 2 card 4 (p2-isaiah55-prep-check3.json): Stop 2 card 1 says "the voice shifts" (Isaiah 55:6-7 speaks of the LORD in the third person). Card 4 then quotes a first-person line ("For My thoughts are not your thoughts...") and only names the speaker at the end, through the BSB's "declares the LORD". Right after a voice shift, the baker reads "My" without knowing who is speaking. The card should say the LORD is speaking before the quote starts.
- Luke 6, answer explanations, stop 3 card 4 (p3-luke6-answer_explanations-check3.json): Both explanations turn the text's "will be like his teacher" (Luke 6:40) into resemblance in appearance: True says "Fully trained means looking like the one who trained you" and follows with a joke about how his early stamps "looked like a smudge"; False says the student "ends up looking like the one who did the training." The verse says the trained disciple will be like his teacher, not that he will look like him. Keep the text's wording ("be like").
- Luke 6, answer explanations, stop 3 card 8 (p3-luke6-answer_explanations-check3.json): The "You brood of vipers" explanation says "Those words come from John the Baptist, friend" (Luke 3:7). John does say them in Luke 3:7, but Jesus also says "brood of vipers" in Matthew 12:34 and Matthew 23:33. Papa Dorin knows the whole Bible, so presenting the phrase as John's alone is not fully true. A wording like "In Luke, those words come from John the Baptist" would keep it accurate.
- Luke 6, big idea, whole output (p3-luke6-big_idea-check3.json): Line 6 drops the "like" from Jesus' comparison. The BSB says the one who hears and acts "is like a man building a house, who dug down deep and laid his foundation on the rock" (Luke 6:47-48). Line 6 says the one who hears and acts "builds on the rock, and when the torrent hits, that house doesn't shake." That turns the comparison into a plain statement about what the hearer does. It should keep the comparison, for example: that person is like a man who built his house on the rock.
- Luke 6, big idea, whole output (p3-luke6-big_idea-check3.json): Line 1 lists the poor, the hungry and the weeping (Luke 6:20-21) and the woes (Luke 6:24-26), then says "What you've got NOW isn't the whole story, because 'great is your reward in heaven' (Luke 6:23)." In the BSB, the reward in heaven in Luke 6:23 goes with those who are hated, excluded and insulted "because of the Son of Man" (Luke 6:22). That group isn't mentioned at all. The poor, hungry and weeping each get their own promise (the kingdom of God, being filled, laughing). Line 1 ties the 6:23 reward to groups the text doesn't tie it to.
- Luke 16, answer explanations, stop 1 card 14 (p4-luke16-answer_explanations-check3.json): Explanation for "He makes him pay back the difference" says "the same verse keeps calling him dishonest." Luke 16:8 calls him "the dishonest manager" once, so "keeps calling" points out a repetition that isn't there. The explanation for the right answer gets it right: "the verse still calls him the dishonest manager."
- Luke 16, answer explanations, stop 2 card 8 (p4-luke16-answer_explanations-check3.json): Explanation for "another" says the belongings of another are "the borrowed stuff, the thing you're only holding for a while." Luke 16:12 says only "the belongings of another". It never says they are borrowed or held for a while. This also clashes with the explanations for "strangers" and "family" on the same card, which correctly say the verse leaves the owner open ("If it's not yours, it counts" and "He leaves the owner wide open").
- Acts 13, answer explanations, stop 2 card 20 (p5-acts13-answer_explanations-check3.json): The 'Scoffers' explanation goes through Acts 13:41, then says 'And Paul's last word to his listeners? Watch out that this doesn't happen to you (Acts 13:40).' In the text the warning (13:40) comes before the quote, and the quote from the prophets (13:41) is the actual end of the sermon. So it calls 13:40 his last word when the text shows it isn't.
- Acts 13, answer explanations, stop 1 card 6 (p5-acts13-answer_explanations-check3.json): The 'encouragement' explanation says 'They read from the Law and the Prophets, then they open the floor to the visitors,' so the synagogue leaders are the ones reading. Acts 13:15 only says 'After the reading from the Law and the Prophets' and never says who read.
- Acts 13, answer explanations, stop 2 card 2 (p5-acts13-answer_explanations-check3.json): The 'False' explanation says 'And after all that, God still gives His people the land as an inheritance (Acts 13:19).' The word 'still' ties the land gift to the forty years of conduct as if it came in spite of it. Acts 13:18-19 just puts the two side by side and doesn't connect them.
- Acts 13, answer explanations, stop 3 card 17 (p5-acts13-answer_explanations-check3.json): The 'Ephesus' explanation sums up Acts 13:51 as 'Shake, stomp, walk.' The text says they shook the dust off their feet and went. It has no stomping.
- Acts 13, answer explanations, stop 1 card 2 (p5-acts13-answer_explanations-check3.json): The 'Down to Joppa' explanation says 'Paul is going to mention a different John later' (Acts 13:24-25) with no reference. It also puts '(Acts 13:13)' after 'the others keep traveling without him,' but their travel inland is in Acts 13:14.
- Acts 13, answer explanations, stop 1 card 6 (p5-acts13-answer_explanations-check3.json): The 'encouragement' explanation ends 'Paul is about to take it' with no reference. Paul stands up in Acts 13:16. The 'prophecy' explanation on the same card does cite (Acts 13:16) for the same fact.
- Acts 13, answer explanations, stop 2 card 4 (p5-acts13-answer_explanations-check3.json): The 'king' explanation says 'They've had judges, they've had Samuel the prophet' with no reference. That fact is Acts 13:20, and the only reference given is Acts 13:21.
- Acts 13, answer explanations, stop 2 card 6 (p5-acts13-answer_explanations-check3.json): The 'David son of Jesse' explanation says Paul is 'about to connect David to the Savior' with no reference. That happens in Acts 13:23.
- Acts 13, answer explanations, stop 2 card 16 (p5-acts13-answer_explanations-check3.json): The 'Jesus the Savior of Israel' explanation mentions 'that Psalm about the Holy One' with no reference. The Psalm is quoted in Acts 13:35.
- Acts 13, answer explanations, stop 3 card 6 (p5-acts13-answer_explanations-check3.json): The 'jealousy' explanation says 'Nearly the whole city shows up' with no reference. That fact is Acts 13:44, and the only reference given is Acts 13:45. (The 'shame' explanation does cite Acts 13:44.)
- Acts 13, answer explanations, stop 3 card 13 (p5-acts13-answer_explanations-check3.json): The 'False' explanation says 'One synagogue sermon, then nearly the whole city' with no reference. The whole city gathering is Acts 13:44, and the only reference given is Acts 13:49.
- Acts 13, answer explanations, stop 3 card 15 (p5-acts13-answer_explanations-check3.json): The 'They are driven out of the district' explanation says 'One Sabbath nearly the whole city shows up' with no reference. That fact is Acts 13:44, and the only reference given is Acts 13:50.
- Acts 13, answer explanations, stop 3 card 17 (p5-acts13-answer_explanations-check3.json): The 'Iconium' explanation says 'Driven out of one district' with no reference. That fact is Acts 13:50, and the only reference given is Acts 13:51.
- Acts 13, answer explanations, stop 2 card 16 (p5-acts13-answer_explanations-check3.json): The 'Saul son of Kish from Benjamin' explanation ends 'I know a thing or two about getting slid to the back of the drawer and staying there.' In his backstory he didn't stay there. The angels opened the drawer and called him. 'Staying there' changes his story.
- Acts 13, big idea, whole output (p5-acts13-big_idea-check3.json): Line 1 states "Paul stands up in that synagogue", which is Acts 13:16 (and 13:14 for the synagogue). The only reference on that line is (Acts 13:17-23), so this fact has no reference. Changing it to (Acts 13:16-23) would fix it.
- Acts 13, burnt cookies, line 5 (p5-acts13-burnt_cookies-check3.json): Line 5 is a good line, but it says "The Jews stir up persecution, and Paul and Barnabas get driven out." In Acts 13:50 the Jews incite the religious women of prominence and the leading men of the city, and then "They stirred up persecution against Paul and Barnabas." The text leaves open whether "They" means the Jews or the people they incited. The line settles that and drops the incitement completely. Check 1 already flagged this, and the current line still has it. Fix: keep the incitement, for example "The Jews stir up the city's leading women and men, persecution breaks out, and Paul and Barnabas get driven out."

### A2. prep-walkthrough.md#what-bite-sized-means (9)

Rule: "Every other story card is 1 to 2 sentences."

- Psalm 139, prep, stop 1 card 9 (p1-psalm139-prep-check3.json): The story card has 3 sentences: the quote of Psalm 139:7 is two questions ("Where can I go to escape Your Spirit?" and "Where can I flee from Your presence?"), then the junk drawer joke. Story cards other than the opening card can have only 1 to 2 sentences.
- Psalm 139, prep, stop 2 card 5 (p1-psalm139-prep-check3.json): The story card has 3 sentences: "Before David was even formed, the LORD's eyes saw his unformed body." / "Me?" / "I can't tell what a batch is gonna look like till it comes out of the oven, friend." Story cards other than the opening card can have only 1 to 2 sentences.
- Luke 6, prep, stop 1 card 14 (p3-luke6-prep-check3.json): "One more woe. Woe to you when all men speak well of you." only restates the verse. It has none of Papa Dorin's voice: no reaction, no comparison, no storyteller line.
- Luke 6, prep, stop 2 card 11 (p3-luke6-prep-check3.json): "Then Jesus says: 'Be merciful, just as your Father is merciful.'" is only the verse with a lead-in. Papa Dorin's voice is missing.
- Luke 6, prep, stop 3 card 3 (p3-luke6-prep-check3.json): "Then Jesus says a disciple is not above his teacher." is a bare paraphrase of half of Luke 6:40, with none of Papa Dorin's voice.
- Acts 13, prep, stop 2 card 5 (p5-acts13-prep-check3.json): This story card packs in more than two things: God gives Saul son of Kish, who rules forty years (Acts 13:21); God removes Saul and raises up a new king (Acts 13:22); and God's testimony about that king (Acts 13:22). That is three beats on one card, so it should be split.
- Ephesians 2, prep, stop 1 card 3 (p6-ephesians2-prep-check3.json): Story card 3 is not the opening card but has 3 sentences: "No, they were going along with ... sons of disobedience." / "Then Paul describes a whole way of life: ... desires and thoughts." / "That's a craving holding the car keys, baker."
- Ephesians 2, prep, stop 1 card 13 (p6-ephesians2-prep-check3.json): Story card 13 is not the opening card but has 3 sentences: "No, it's the surpassing riches of His grace, ..." / "Then that grace line comes back, and this time Paul adds that it's through faith." / "Then he says this is not from yourselves."
- Ephesians 2, prep, stop 1 card 13 (p6-ephesians2-prep-check3.json): Story card 13 carries three beats: the surpassing riches of His grace shown by His kindness (Ephesians 2:7), saved by grace through faith (Ephesians 2:8a), and this not from yourselves (Ephesians 2:8b). It should be split.

### A3. prep-walkthrough.md#scripture-rules (3)

Rule: "Call things what the text calls them."

- Psalm 139, prep, stop 1 card 5 (p1-psalm139-prep-check3.json): "every step AND every nap" retells Psalm 139:3 ("my path and my lying down") as a fact. The text says "lying down", not "nap". A nap is a narrower thing than what the text says.
- Luke 6, prep, stop 1 card 5 (p3-luke6-prep-check3.json): The card puts quotation marks around "Blessed." with a period inside, but in the BSB (Luke 6:20) the word runs straight on: "Blessed are you who are poor...". The quoted punctuation isn't the BSB's. Card 6's question has the same "Blessed." quote. Either drop the period or quote more of the line exactly.
- Ephesians 2, prep, stop 1 card 14 (p6-ephesians2-prep-check3.json): The question quotes Ephesians 2:8 as "and this not from yourselves; it is the ___ of God." with a period inside the quotation marks. The BSB has a comma there: "it is the gift of God,". The quoted punctuation does not match the BSB.

### A4. big-idea.md#the-big-idea (2)

Rule: "A real summary of what the passage means, not a retelling of the verses."

- Psalm 139, big idea, line 5 (p1-psalm139-big_idea-check3.json): Line 5 just retells Psalm 139:19-22 clause by clause: the wish to slay the wicked, bloodthirsty men, God's enemies taking His name in vain, the hatred question and the quoted answer. It never says what this part of the psalm means or how it fits the whole. Line 6 picks the turn up, but line 5 on its own is a retelling, not a summary.
- Ephesians 2, big idea, whole output (p6-ephesians2-big_idea-check3.json): Lines 1 and 3 mostly retell Ephesians 2:1-3 and 2:6-7 in verse order, keeping long stretches of the BSB phrasing: 'the ways of this world and of the ruler of the power of the air', 'raised us up with Christ and seated us with Him in the heavenly realms, so that in the coming ages He might display the surpassing riches of His grace, shown in His kindness to us in Christ Jesus'. This restates the verses instead of summing up what they mean (for example: we were dead and could not save ourselves; God raised us with Christ to show how rich His grace is).

### A5. prep-walkthrough.md#stops (2)

Rule: "Choice cards are equal to or more than story cards in every stop."

- Psalm 139, prep, stop 1 (p1-psalm139-prep-check3.json): Stop 1 has 8 story cards (1, 3, 5, 7, 9, 11, 13, 15) and only 7 choice cards (2, 4, 6, 8, 10, 12, 14). Choice cards must be equal to or more than story cards.
- Psalm 139, prep, stop 2 (p1-psalm139-prep-check3.json): Stop 2 has 9 story cards (1, 3, 5, 7, 9, 10, 12, 14, 16) and only 8 choice cards (2, 4, 6, 8, 11, 13, 15, 17). Choice cards must be equal to or more than story cards.

### A6. answer-explanations.md#explanations (2)

Rule: "There is no formula. Each explanation sounds natural and different from the others."

- Isaiah 55, answer explanations, stop 2 card 14 (p2-isaiah55-answer_explanations-check3.json): The "everlasting" and "temporary" explanations make the same joke in the same shape. Each says his cookies don't last ("Every cookie I've ever stamped is long gone" / "Temporary is a plate of my cookies sitting in front of me"), and each ends by saying the sign lasts forever ("This sign sticks around FOREVER." / "This sign lasts forever.").
- Acts 13, answer explanations, whole output (p5-acts13-answer_explanations-check3.json): Most right-answer explanations open the same way, by repeating the answer plus 'friend' and an exclamation: 'Encouragement, friend!', 'A king, friend.', 'David, friend!', 'Jesus, friend!', 'Moses, friend!', 'Grace, friend!', 'Jealousy, friend.', 'Driven out, friend.', 'Sandals!', 'Iconium!', 'The Gentiles!', 'The ends of the earth!', 'Scoffers it is.', 'Jerusalem it is.' Many missed-answer explanations also open with the same 'No X here' / 'X's not ...' pattern: 'No construction project here.', 'No idols in this warning.', 'No house keys being handed out here', 'No jail cell in this one.', 'No hesitating here', 'Joppa's not where this road goes', 'Jerusalem's not on the itinerary.', 'Corinth's not the stop.' Read in a row, they sound like a template.

### A7. prep-walkthrough.md#how-to-word-a-choice-card (2)

Rule: "The story card before it isn't on screen anymore, so the question says who and what. Never "him," "that" or "it" pointing back to a card the baker can't see."

- Isaiah 55, prep, stop 2 card 12 (p2-isaiah55-prep-check3.json): The question opens "In this joyful picture", which points back to story cards the baker can no longer see. Calling it "joyful" also gives the answer away, because thornbushes and briers spreading is plainly not joyful, so the setup rules out the wrong answer.
- Luke 16, prep, stop 1 card 16 (p4-luke16-prep-check3.json): The question opens with "The line says...", which points back to the line introduced on story card 15. That card is no longer on screen, so the baker doesn't know which line is meant. The question needs to say what it is, for example the statement right after the master commends the dishonest manager (Luke 16:8).

### A8. prep-walkthrough.md#answer-rules (2)

Rule: "Don't let the right answer stand out. All the answers should sound alike. None should sound more like the Bible, or more modern, than the others."

- Luke 6, prep, stop 2 card 14 (p3-luke6-prep-check3.json): The right answer, "A good measure pressed down and running over", uses the passage's own distinctive wording. It sounds more like the Bible than the plain wrong answers ("A small portion carefully counted out", "A little left over from the harvest"), so it stands out. The wrong answers are also clearly stingy, which goes against the generous giving Jesus has just described.
- Luke 16, prep, stop 1 card 2 (p4-luke16-prep-check3.json): The right answer, "Turn in your account since you can't stay manager" (9 words, 49 characters), is much longer and more detailed than the wrong answers, "Pay back every coin by tomorrow" and "Work for free until it's fixed" (6 words, about 30 characters each). It also follows the Luke 16:2 wording closely, so it stands out as the right answer.

### A9. burnt-cookies.md#the-lines (2)

Rule: "Each line is short and in Papa Dorin's voice. Use judgment on how much it covers: one moment, or a few that belong together."

- Acts 13, burnt cookies, line 2 (p5-acts13-burnt_cookies-check3.json): Line 2 is not short. It is 48 words, the same length as the line 1 that check 2 flagged as not short. It runs through Egypt, the wilderness, the judges, Saul, David and John in one long list. It should be trimmed to a short line that still holds the burnt detail (Saul's tribe).
- Acts 13, burnt cookies, line 3 (p5-acts13-burnt_cookies-check3.json): Line 3 is not short. It is 54 words in four sentences, longer than the line 1 (48 words) and about as long as the line 5 (55 words) that check 2 flagged. It packs in the condemnation, the request to Pilate, the resurrection, not seeing decay, justification and the warning to scoffers. It should be trimmed to a short line.

### A10. prep-walkthrough.md#question-types (1)

Rule: "In poetry, letters and prophecy, the rule against guessing the next words of a line (see below) applies to fill in the blank too. The blank tests meaning the baker can reason out, not wording they haven't seen."

- Isaiah 55, prep, stop 1 card 2 (p2-isaiah55-prep-check3.json): The blank is the next words of the same line in Isaiah 55:1 ("without money and without cost"). Card 1 quoted the first half of the verse, and this card asks the baker to fill in the rest of the wording. "Cost" adds no meaning beyond "without money", so the card tests the verse's wording, not something the baker can reason out. This is a prophetic passage.

### A11. papa-dorin.md#hard-rules (1)

Rule: "Never says "wrong," "fail" or "bad" about a baker's answer."

- Acts 13, answer explanations, stop 2 card 16 (p5-acts13-answer_explanations-check3.json): The 'Samuel the prophet of Israel' explanation compares the baker's pick to grabbing the sprinkle jar and ends 'Good jar. Wrong cookie.' Because the comparison stands for the baker's answer, this calls the baker's answer wrong.

### A12. papa-dorin.md#joke-logic-test (1)

Rule: "If a stranger would say "huh?", rewrite it."

- Acts 13, prep, stop 2 card 17 (p5-acts13-prep-check3.json): The joke "When my stamps came out crooked, I slid behind the takeout menus, friend, and nobody PROCLAIMED a thing" doesn't click. Acts 13:38 is about forgiveness of sins being proclaimed, but his crooked stamps weren't a sin, and it isn't clear what anyone should have proclaimed. It also reads like a complaint about the Millers, which doesn't fit his no-grudge character.

### A13. papa-dorin.md#voice (1)

Rule: "Plain words. Short, punchy sentences."

- Ephesians 2, big idea, whole output (p6-ephesians2-big_idea-check3.json): Line 3's second sentence runs about 45 words with several stacked clauses ('Then He raised us up ... so that in the coming ages He might display ... shown in His kindness to us in Christ Jesus'), and line 1's second sentence is also a long three-part list. Neither sounds like Papa Dorin's voice.


### A14. Added after review: answers too similar (1)

Rule: prep-walkthrough.md#answer-rules, "Each wrong answer must be false anywhere in the passage, not just at that moment."

- Luke 16, prep, stop 2 card 8: "if you have not been faithful with the belongings of ___, who will give you belongings of your ___?" Answers: another (right), own (right), strangers, rulers, family. "Strangers" means nearly the same as "another", so it isn't clearly false. The checkers missed it. The card also asks the baker to guess the next words of Luke 16:12, which now breaks the no-guessing rule in every passage.
