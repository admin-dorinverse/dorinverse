> Copy exported 2026-10-28 from the Claude Doc, which stays the master: https://claude.ai/artifact/4dBmZtXHkAPH3ioA9BRfVY. Edit the doc, then re-export here.

# Dorinverse - Lesson Question Rules

Oct 25, 2026 · @Cassie

**Version v1 — 2026-10-25.** This document is the only copy of the rules. Every agent that writes or checks a lesson reads it at run time and writes this version ("v1") into the lesson's `rules version` field. Sections 0 to 6, 8, and 10 apply to every recipe. Section 7 opens with setup rules, then holds one block per recipe. **A recipe's block overrides the general rules.** Where a block names a general rule it replaces, the block wins for that recipe and the checker tests the block's version. Where a block is silent, the general rule applies. Section 11 governs Dorin's voice and is unchanged.

**How rules are cited.** Every rule and every checklist line carries a printed number. 4.Q12 is Section 4, Question rules, rule 12. 4.A3 is Section 4, Answer rules, rule 3. 7.S7 is Section 7, Setup rules, rule 7. 7.W5 is the Words block, rule 5; 7.I5 the Idioms block. 10.14 is Done Checklist line 14. Lesson Check rows name the checklist line by that number.

**Terms.** Names follow the Stage 2 schema map. A **Recipe** is the track the player selects. The 11 recipes, spelled as the schema spells them: Stories, Words, Idioms, Verses, Poems, Wisdom, Prophets, Jesus Prophecies, Revelation, Parables, Letters. A **Cookie Dough Flavor** (flavor) is one story, theme, topic, prophecy, or book section inside a recipe. A **Cookie Lesson** (lesson) is one cookie: 15 questions, plus review questions where a recipe's block allows them. A **question** is one row in Question, with its options in Question Option and its verses in Question Verse (Section 8). A **term** is a word in Words or an idiom in Idioms. A **meaning phrase** is a short plain-English phrase, in the writer's words, that states what a verse or saying means.

The Bible is the only source. Lessons are built on the King James Version, and every verse is accounted for.

## 0. Purpose and the Writer's Role

Every agent that plans, writes, checks, or fixes a lesson reads this first. It sets the purpose and the attitude; the sections below set the rules. Where the two seem to pull apart, the rules win.

**0.1 The questions are the lesson.** The player does not read the passage first. They see an intro screen with the frame, meet the passage one question at a time, and see the verses only on the complete screen, where the lesson's verses are revealed in their Bible. (In Verses, the one verse is also shown on the intro, 7.V4.) So every question must teach on its own: the setup gives a true fact from the verse before, the prompt states its subject in full, every option is a real piece of the passage or a real meaning, and the correct option is a fact the player can carry away. Read in order, the setups, prompts, and options tell the whole lesson. A question that only checks whether the player already knew something has failed.

**0.2 What the player sees, in order.** (1) The intro screen: the frame only, never the meaning. (2) For each question: a setup line on its own screen when the question has one, then the question on its own screen, then the result and explanation. The setup is gone when the question shows. (3) Missed questions come back in a correction pass: the question only, no setup, no stakes. The retry happens in the app only; it is not saved or scored. (4) The complete screen: the meaning line, then the reveal of the lesson's verses. Finished `mc`, `tf`, and `fill` questions join the player's trivia pool, where they appear with no setup.

**0.3 Accuracy comes first.** The KJV is the only source, with the approved Easton's meaning as the one helper for Words (Section 1). Nothing comes from memory, commentary, history, or any other outside source. If the text doesn't say it, you don't say it, even to smooth a transition.

**0.4 You are a teacher writing a bite-sized lesson.** One lesson, one subject, 15 questions. After accuracy, your top priority is flow: the player is never confused, and after the lesson they can recall what they learned.

**0.5 Know the point.** Before you write, write the lesson's one-sentence goal into the lesson's `goal` field. Every question moves the player toward that sentence.

**0.6 Every question has a clue.** The player is not expected to know the material; they reason, commit, and are corrected. Failing every question is not learning. Before the player answers, one of these is true, and the writer records which in the question's `clue` field:

1. `frame`: the intro screen gave the fact.
2. `setup`: the setup line (or, in Words and Idioms, the quoted clause in the prompt) gives a fact from which the correct option follows. Test: a player who knows only the setup and the frame can rule out at least half of the wrong options (one on a true-or-false or a 3-option fill); the checker names them. The setup rules those options out by its content, never by tone alone (4.A7). For a Words or Idioms Meaning drill the clue is the quoted clause itself and this two-option test is not applied.
3. `earlier`: an earlier question in this lesson taught it, as its answer, in its prompt, or in its setup; for a review question, an earlier lesson in the flavor taught it.
4. `discovery`: none of the three; the text states something new. Allowed, but capped: at most 3 per lesson, never two adjacent by `order`, never question 1. Each distractor on a discovery question is ruled out by a fact the player already has from the frame or an earlier question, not only by a verse they have not met; the checker names that question or intro line for each distractor.

**0.7 Build a natural flow.** Each question grows out of the one before. Move forward through the text in order; when the lesson must move to a new passage, say where you are going before you go. Flow looks different in each recipe (Section 7): Stories follow events; Words and Idioms run meaning, recognize, use; Verses run scene, what it says, plain words. Never carry one recipe's method into another, and never bring narrative into Words or Idioms.

**0.8 Introduce what the question needs.** A person, place, or term gets a few plain words the first time a question depends on it, and those words never give away the answer (Section 5). Don't turn a story into a vocabulary list.

**0.9 Cut with care.** Keep a detail if the player would get lost, the cause and effect would break, or the point would weaken. Cut it if it only adds color. When unsure, keep it light, in a setup, rather than giving it its own question.

**0.10 Build for recall.** Lead with the facts that matter most so they can return in a new form. Close the lesson so the pieces click together. The player should leave able to say the lesson's goal in their own words.

**0.11 Read it as the player.** Before you finish, walk the lesson start to end, hiding each setup when you read its question, and ask: Was I ever confused about what was asked or who someone was? Did any question feel like a detour or a lecture? Did anything feel missing? Could I have reasoned my way to each answer? Can I say the one thing I learned? A yes to any of the first three, or a no to either of the last two, gets fixed before the lesson goes to the checker.

**0.12 Teacher and Dorin.** The teacher's attitude decides what goes into a lesson. Dorin's voice decides how the explanations sound (Section 11).

## 1. Source of Truth

**1.1** The Bible is the only source. Nothing comes from feelings, tradition, history, commentary, or outside resources. This applies to questions, options, setups, intros, and meaning lines.

**1.2** Use the Protestant 66-book Bible. No apocrypha.

**1.3** All lessons are built on the King James Version, the text in the Verse table. The reveal and the Bible reader show the same text, so what a lesson teaches is what the player then reads. No text from any other translation appears anywhere in a lesson or its data.

**1.4** Every question lists the verses its true answer comes from (Question Verse, Section 8): one verse or several. In Words, the anchor verse; in Idioms, a kept Idiom Verse (7.I4); for a modern example, drill sentence, or Wisdom situation, the verse whose meaning it tests. Nothing else is listed in Question Verse.

**1.5** No interpretation. Teach what the text says, not what any denomination teaches.

**1.6** Tie a prophecy or picture to Jesus only where the New Testament makes the link, or where the owner approved it on the Jesus Prophecy Link list (Section 3). A lesson says a passage pointed to Jesus only when the New Testament says so; an approved link the text does not state is taught side by side, with no claim.

**1.7** Life application comes only from what the text itself says or commands.

**1.8** Name an author or speaker only when a verse or its heading states it, and cite that verse. A heading is the title the KJV prints above a psalm ("A Psalm of David, when he fled from Absalom his son," Psalm 3). Section headings added by publishers are not headings. A psalm's heading is the Psalm Heading row for its chapter.

**1.9** Idiom meanings come only from how the KJV verses use the phrase. Modern language may help ask the question.

**1.10** Easton's Bible Dictionary (the Dictionary Entry table) is the source of a Words meaning and nothing else. The approved Word row holds the meaning, written in plain English from the definition part of the entry; the writer uses it word for word where 7.W13 says, and elsewhere states it in the question's own words, saying no more and no less (7.W13). The entry's history, geography, and commentary are outside facts and never reach a lesson. Easton's text is never quoted, credited, or shown to the player. No other dictionary, no Greek or Hebrew word (except one the KJV itself prints, such as Hosanna or Amen), and no Strong's number appears anywhere in a lesson or its data.

**1.11** Modern sentences and situations (the drill sentences in Words and Idioms, the situations in Wisdom, the examples in Parables) test whether the player understands and can use what the text teaches. The writer invents the sentence; the meaning it tests is the Bible's. This is not an outside fact.

**1.12** No outside fact in any form, including unit conversions. A cubit stays a cubit.

**1.13** Outside references may be used only in planning, to propose Jesus Prophecy links for the owner's review. They never reach a lesson.

**1.14 Translation-proof facts.** A question tests what the text says, never how one translation says it: who, what, where, when, what was done, what was said in substance, what resulted. Test: restate the correct option in different words; if the question still has one right answer, it passes. If the answer depends on one translation's word choice (whale against great fish; charity against love; Holy Ghost against Holy Spirit; Easter against Passover in Acts 12:4), it fails. A fill or word-bank blank that is a word from the text must be a concrete noun or action every translation carries in substance (lots, fish, Nineveh, storm). Exception by design: Words and Idioms teach terms as the KJV prints them, and cite only verses where the KJV prints them (Section 7).

## 2. Structure and Placement

**2.1** Hierarchy: Recipe, then Cookie Dough Flavor, then Cookie Lesson.

**2.2** The 11 recipes: Stories, Words, Idioms, Verses, Poems, Wisdom, Prophets, Jesus Prophecies, Revelation, Parables, Letters.

**2.3** A lesson has 15 questions in every recipe. In Words, Idioms, Verses, and Wisdom, every lesson after the first in its flavor adds 2 or 3 review questions on top (2.6).

**2.4** A flavor holds 2 to 5 lessons. Idioms and Jesus Prophecies flavors hold exactly 2 (7.I2, 7.J2). Only Philemon, 2 John, 3 John, and Jude may be a 1-lesson flavor. A flavor that needs more than 5 lessons splits into two at a turn the text shows.

**2.5** Coverage drives the count. Never pad with filler. Every story can fill at least 30 real questions; a passage that cannot belongs to the larger story around it (Section 9).

**2.6** Review questions are allowed only in Words, Idioms, Verses, and Wisdom. A review question tests something an earlier lesson in the same flavor taught, asked a new way (new wording, format, or sentence), never the same question again. Each lesson after the first carries 2 or 3, mixed into the lesson, never as question 1, each with `repeat of` pointing to the earlier lesson's question and `clue` = `earlier`. A review question's distractors are checked against the passage of the lesson it repeats (4.A3). No other recipe uses review questions.

**2.7** Lesson 1 of a flavor stands alone: no review questions, no "last time" line, nothing that assumes a prior lesson. In Words and Idioms, lesson 1 may use the flavor's other terms as options only (7.W7).

**2.8** One story part belongs to one Stories flavor.

**2.9** A test, sample, or demo flavor follows every rule a real one follows. There is no short form.

**2.10** Titles come from the text and are written in plain words for a player who is new to the faith. In Jesus Prophecies, Prophets, Revelation, Letters, and Parables, the flavor title names the book first: "Romans: Saved by Faith," "Micah: Born in Bethlehem," "Matthew: Who Jesus Calls Blessed." Stories titles name the main person or event ("Joseph: Sold by His Brothers"). Theme recipes (Words, Idioms, Verses, Poems, Wisdom) name the theme. A flavor title says what the player learns from the whole flavor; a lesson title says what that lesson teaches: "Why Paul Wrote to the Romans," "Everyone Has Sinned," not "They Are Without Excuse." A title promises only what its recipe's block teaches and tests: no life application the text does not state or command (10.6). A KJV word or phrase stays in a title only when its meaning is plain without the lesson. A title names the person it is about, never "I," "me," or "my" for a Bible writer or speaker: "Follow Paul's Example," not "Follow My Example." A flavor title has at most 32 characters after its book name and colon; a lesson title has at most 32 characters. Each recipe's block sets its lesson titles; a block that gives a fixed form (a reference, a list of terms, "The Promise") keeps it.

**2.11** All per-lesson counts and caps in this document (repeats, discovery, the 60 percent and 40 percent caps, true-or-false balance, lengths, reading level) are computed over every question row of the lesson, review questions included, in `order`. The 15 questions are counted before review questions (2.3).

**2.12 Range format.** A reference is written Book C:V, Book C:V–V, Book C:V–C:V across chapters, Book C for one whole chapter (Revelation 1), or Book C–C for whole chapters, with an en dash, full book name, no abbreviations: 1 Peter 1:15, Jonah 1:1–16, Daniel 7–12. Separate passages are joined with a semicolon and each repeats the book name: Matthew 7:6; Matthew 7:15. Psalms: one psalm is written Psalm (Psalm 23:1); several are Psalms (Psalms 120–134).

**The recipes at a glance**

| Recipe | Flavor | Lesson |
| --- | --- | --- |
| Stories | One story, or one part of a long story | A run of events, ending at a natural stop |
| Jesus Prophecies | One prophecy about Jesus | Lesson 1 The Promise, lesson 2 The Fulfillment |
| Prophets | One section of a prophet's book | The prophet, the audience, the message |
| Revelation | One section of Revelation | What John sees and hears |
| Words | One theme, 8 to 20 words, four per lesson | 4 new words, drill style |
| Idioms | One theme, 8 idioms, 2 lessons | 4 new idioms, drill style |
| Verses | One theme, 2 to 5 verses | One verse |
| Poems | Poems or sections that share something the text shows, 2 to 5 lessons | One poem, one section, or two or three short poems |
| Wisdom | One topic | One subtopic: say, mean, apply |
| Letters | One section of one letter | The next step of the letter's teaching |
| Parables | One part of a teaching block, or a parable group | Setting, teaching, meaning, modern example |

**Coverage and overlap**

**2.13** Stories are the umbrella: the Bible's narrative at a high level, built last. Every other recipe teaches its part in more detail. Overlap is allowed: a verse may be taught in Stories and in any other recipe, and in more than one detailed recipe.

**2.14** Coverage check: every verse sits in at least one flavor. Genealogies, census lists, laws, measurements, specs, and in Letters greetings, travel plans, and lists of names are accounted for inside the flavor around them; they don't each need a question, and no lesson or flavor is built on them. A standalone genealogy (Genesis 5, Genesis 10, 1 Chronicles 1–9) belongs to the story it opens or closes and is never its own flavor.

**2.15** A poem inside a story (Exodus 15, Hannah's prayer) is taught with the story and may also be taught in Poems.

**2.16** Which recipe teaches a passage in detail: narrative (events, travel, miracles, trials, dialogue that moves the action) goes to Stories; Jesus' parables and teaching blocks (a parable, a sermon, a discourse: Matthew 5–7, Luke 15, John 13–17) go to Parables, with the frame verse that introduces them; Moses' speeches in Deuteronomy go to Stories, told as part of Moses' last days; prophets with narrative chapters split (Jeremiah's story chapters, Daniel 1–6, and the book of Jonah go to Stories; the messages and Daniel 7–12 go to Prophets); Revelation goes to Revelation; Psalms, Song of Solomon, and Lamentations go to Poems; Proverbs, Ecclesiastes, and Job go to Wisdom (Job 1–2 and 42 also in Stories); Romans to Jude go to Letters. Words, Idioms, Verses, and Jesus Prophecies draw from anywhere.

**2.17** Parallel accounts (Samuel, Kings, Chronicles; the four Gospels): combine them into one story, using the account with the most detail as the base. Questions and distractors come from the base account only. Parallel passages are Lesson Passage rows with `parallel` = true: revealed at the end so the player sees every account, never a source for a question or a distractor.

## 3. Master Lists and Approval

The planning workflow (how the Bible is sorted into flavors and lessons) lives outside this document. This section holds what the writer and checker need: the owner-approved lists a lesson may draw on, and how a lesson moves from draft to approved.

**Master lists.** Each list is a schema table.

**3.1 Words** (Word table): the word as the KJV prints it; `dictionary entry id`, the Easton's entry the meaning came from; `meaning`, plain English from the definition part of that entry; the anchor verse, where the KJV prints the word with that meaning; the verses that use it (Word Verse); the flavor. A flavor holds 8, 12, 16, or 20 words, four per lesson. Every `meaning` in a flavor is one phrase in one grammatical shape, whatever the word's `form` (for example every meaning a noun phrase, or every meaning a "to ..." phrase, chosen for the flavor), and all meanings in a flavor sit within a 3-word length band (for example 4 to 7 words), so any four can sit in one option set without grammar pointing to the answer (4.A5, 4.A8, 4.Q4). No tone (good, bad, or plain; 4.A7) is held by only one meaning in a flavor, so every Meaning drill can meet 4.A7; a list approved before this rule is re-checked against it before another lesson uses it. Every word carries `form` (noun, verb, adjective, adverb), and a flavor holds at least four words of each form it uses, so reverse and fill options can be drawn from words of the answer's form (7.W7). When a flavor's list is drafted for approval, no content word of any anchor clause appears in any meaning in that flavor (7.W6); the checker re-tests it in 10.46. **Pairing rule:** no two words that can appear in one option set (the whole flavor) are near-synonyms (praise and bless; glory and honor). The checker tests it with 4.A1 and 4.Q20.

**3.2 Idioms** (Idiom table): `phrase`, the idiom as the KJV words it; `meaning`, one phrase of 3 to 10 words in plain English, used word for word in lessons where 7.W13 says (7.I12); every verse found by searching the KJV text for the phrase; each verse left out and why (Idiom Verse `kept` = false with `reason left out`; "not this wording in KJV" and "the words used plainly" are standard reasons); the verses kept (`kept` = true); the flavor. A theme with more than 8 qualifying idioms fills one flavor of 8; the rest, like a theme with fewer than 8, are merged with a neighbor or held until they fill another. Every idiom carries `form` (noun phrase, verb phrase, prepositional phrase, clause); a flavor holds at least four idioms of each form it uses, so reverse and fill options can share the answer's form (7.W7). Every `meaning` in a flavor is one phrase in one grammatical shape, whatever the idiom's `form`, chosen as in 3.1 so any four can sit in one option set without grammar pointing to the answer (4.A5, 4.A8); all meanings in a flavor sit within a 3-word length band, and the 8 phrases are grouped into two lessons of four whose phrases sit within a 3-word band. No tone (good, bad, or plain; 4.A7) is held by only one meaning in a flavor, so every Meaning drill can meet 4.A7; a list approved before this rule is re-checked against it before another lesson uses it. An idiom qualifies only when its KJV verse or verses show the meaning in the text itself. A flavor holds 8 idioms. The pairing rule applies. When a flavor's list is drafted for approval, no content word of any idiom's quoted clause appears in any meaning in that flavor (7.I6); the checker re-tests it in 10.47.

**3.3 Memory Verses**: at most 250, grouped by theme. The Memorization Tool shows those verses in every translation; lessons and the Bible reader are KJV only.

**3.4 Jesus Prophecy Links**: the prophecy verse, the fulfillment verse, and `support` = `stated in NT`, with `stated in verse id`, or `proposed`, with `proposed from` naming the reference. The link row holds the first verse of each passage; the lesson's Lesson Passage rows hold the full ranges. A reference named here never reaches a lesson.

**Status ladder.**

**3.5** The writer sets `draft` when the lesson is complete and has passed the writer's own pass through Section 10, recorded as Lesson Check rows with `checked by` = writer.

**3.6** The checker is a separate agent that did not write the lesson. It runs every line of Section 10 and records one Lesson Check row per line (`checked by` = checker). When every line passes, it sets the lesson and its questions to `reviewed`. When the last lesson under a flavor becomes `reviewed`, the checker sets the flavor to `reviewed`.

**3.7** The owner sets `approved`: on the questions first, then the lesson, then the flavor. A lesson is approved only when every live question in it is, and a flavor only when every live lesson in it is. The owner then sets the flavor to `published`. A player sees a lesson only when its flavor is `published` and the lesson and its questions are `approved`.

**3.8** Any Lesson Check row with `pass` = false sends the lesson back to the writer; the row's `note` says what failed and where. When a rule has an allowed exception ("where the content allows it"), the writer records the reason in the note of that line.

**3.9** Lessons of a flavor are inserted in `order`, so a review question's `repeat of` can point at an earlier lesson's question id.

**3.10 Editing a shipped question.** A wording fix that leaves the answer, the options, and the verses the same is an edit: it sets `edited at`, and players who collected the question see it marked edited. A change to `why` or to an `explanation` alone is an edit, not a retirement. Any change to the correct answer, an option's text, which option is correct, or the cited verses retires and replaces the question. The replacement is written as a new `draft` question that takes the retired question's `order`; its draft status does not pull its live lesson down. The old question stays live, not retired, until the replacement is `approved`. In one step, the owner's approval of the replacement retires the old question (`retired at`), and any `repeat of` that pointed at the old question is re-pointed to the new one.

**3.11** The owner approves every master-list entry before any lesson that uses it is written.

**3.12** Every flavor, lesson, and question carries `status`: `draft`, `reviewed`, or `approved`. A flavor may also be `published`, the owner's final step.

## 4. Questions and Answers

**Formats (4.F)**

**4.F1** `mc`: multiple choice, 4 options.

**4.F2** `tf`: true or false. The statement is the prompt; `answer` is true or false. A `tf` question has exactly two Question Option rows: text "True" at `position` 0 and text "False" at `position` 1; `is correct` is true on the row that matches `answer` (8.4).

**4.F3** `fill`: one sentence with one blank, 3 or 4 options.

**4.F4** `wordbank`: one sentence with 1, 2, or 3 blanks, filled from a bank of the missing words plus 2 or 3 extras. A blank may sit anywhere in the sentence. Every blank is a content word: a person, place, thing, action, or describing word; never the, a, and, to, of, his, her, it, up, or any joining word. Each extra shares the part of speech of one blank: a verb extra where there is a verb blank, a noun extra where there is a noun blank. Blanks are numbered left to right. The sentence stays on screen. Never a whole verse. Blank count and placement vary across a flavor.

**4.F5** `order`: 3 or 4 items the player puts in sequence. The prompt names the subject ("Put Jonah's night on the ship in order").

**4.F6** `match`: 3 or 4 pairs, text to text. The prompt names the subject.

**4.F7** There are no image questions. A lesson uses at least three types; `mc` rows are at most 60 percent of a lesson's question rows, rounded down. Put-in-order on a single verse only tests memorization, so don't use it there.

**4.F8** "Pick the sentence" in this document means an `mc` whose four options are full sentences. It is not a type of its own.

**Question rules (4.Q)**

**4.Q1** One question tests one fact or idea.

**4.Q2 The prompt stands alone.** The setup is its own screen and is gone when the prompt shows; the prompt is reused in trivia with no setup at all. So the prompt names its subject every time, even when the setup just named it: "How did the sailors decide who was to blame?" never "How did they find out?" No pronoun in a prompt or true-or-false statement whose referent lives only in the setup. Test: read the prompt with the setup hidden; if you cannot say who or what it is about, it fails. Order and match instruction lines follow the same rule.

**4.Q3** Questions are short and never a fragment without context. No prompt begins or ends with an ellipsis. A fill, word bank, or true-or-false is a full clause with its subject. A multiple-choice stem is a question, not a sentence that trails off.

**4.Q4 Lengths, in words, per question.** Prompt 20 or fewer (25 at most for a Words or Idioms Meaning drill, where the quoted clause forces it). Each option 12 or fewer. Within one question, the longest option minus the shortest is 3 or less; for `match`, apply this to each side separately. Setup 20 or fewer. True-or-false statement 20 or fewer. For `wordbank`, every blank is marked `___` in the prompt; blanks are numbered left to right in the data.

**4.Q5** New facts come only from the lesson's planned verses: the union of its Lesson Passage rows with `parallel` = false. Every Question Verse row lies inside them, except on a review question, where it lies inside the repeated lesson's rows. A repeat stays inside the current lesson. Only review questions (2.6) reach back to an earlier lesson.

**4.Q6** Repeats are required: 3 or 4 per lesson. Repeat the facts worth retaining, each time with new wording, a new blank, or a new format. Every repeat carries `repeat of` and `clue` = `earlier`. A match, order, or word bank that repeats several earlier questions tags the earliest, counts as one repeat, and counts each of its facts once toward 4.Q14. Review questions are not repeats: they do not count toward the 3 or 4 and 4.Q7 does not apply to them. Since every non-review match, order, and word bank is a repeat (4.Q8), a lesson holds at most four such non-review rows, and if it holds four, no `mc`, `tf`, or `fill` repeat.

**4.Q7** Repeat spacing: a repeat's `order` is at least 4 greater than every question it repeats (question 2 may be repeated at question 6 or later). Repeat facts that land early in the lesson, so the repeat has room downstream.

**4.Q8** Match, order, and word bank are repeat formats. They use only facts the lesson already introduced in earlier questions, or, for a review question, facts the repeated lesson taught. A match or order never introduces a new name, place, or fact.

**4.Q9** Match, order, and word bank use only people, things, and events from the text. No invented sentence and no modern or made-up person appears in them, in any recipe except the Words word bank (7.W7, 7.W11). Modern sentences live only in `mc` and `fill`, where a recipe's block allows them.

**4.Q10** Put-in-order appears later in a lesson, never in the first three questions, and uses only sequences the text states plainly.

**4.Q11 Keep it fresh.** Within a flavor, no two lessons have the same sequence of question types over their first 15 rows, and back-to-back lessons do not open with the same type or close with the same type. At least one of order, match, or word bank lands before question 9 in every lesson where the content allows it; if not, the reason goes in the Lesson Check note (3.8).

**4.Q12 No wording tests.** No question tests the text's wording. A fill or word-bank blank is a meaning phrase an earlier question taught, a key word's plain-English definition, a concrete noun or action from the text (1.14), or a word in a modern sentence; never a run of the verse. A true-or-false states a fact in the writer's words. "The text's own words" means a run of four or more consecutive words from any verse in the lesson's Lesson Passage rows; a person's Bible label used per 5.N1 (e.g. "Joshua the son of Nun") is not counted as such a run. No prompt, option, blank, or statement contains one, except the quoted clause in a Words or Idioms Meaning drill (7.W6, 7.I6) and the idiom itself in Idioms (7.I10). Options are plain English, always; no option quotes the verse.

**4.Q13** Bridge every jump. When a lesson moves to a new passage, the first question there opens with a setup that names the new book and scene. No bare references in prompts; a true-or-false never opens with "John 3:16 says." The exception is the Words and Idioms Meaning drill, which names its verse because the quoted clause is the clue. Where a Meaning drill names a speaker ("Peter writes"), the speaker is one the verse itself or its heading names (1.8). A Words or Idioms prompt or statement may say "in the Bible" or "as the KJV uses it" to fix the sense; that is not a bare reference.

**4.Q14** Vary the answers. No fact is the correct answer more than twice in a lesson: once, plus one tagged repeat. Two answers are the same fact when a player who knows one knows the other.

**4.Q15** No tone, feel, or who-most-needs-it questions. Every answer is stated in the lesson's range. Attitude or feeling is asked only where the text names it.

**4.Q16** Verses Part 3 and Wisdom's Apply part (`part` = `apply`) each use pick-the-sentence, fill, and match at least once (7.V8, 7.Wi2).

**4.Q17** Every fact earns its place (0.9). Coverage means every verse is accounted for, not that every detail gets a question.

**4.Q18** One thread, in order. A lesson moves forward through its range in the text's order. No question reaches ahead or back, except a tagged repeat or a review question. A jump to another passage happens only where the recipe's block calls for one, with a bridge setup (4.Q13).

**4.Q19 True or false.** In a lesson, the counts of true and false answers are within one of each other, and no three consecutive `tf` rows, counted among the lesson's `tf` rows in `order`, share the same answer. A false statement changes one plain fact (who, what, where, how many); never a subtle word, a double negative, or a statement half true.

**4.Q20 One word fits.** In a fill or word bank, exactly one bank word makes a true sentence in each blank, with the other blanks filled correctly. The checker tries every bank word in every blank.

**4.Q21** Trivia: `mc`, `tf`, and `fill` questions join the player's trivia pool when the lesson is finished; the app decides by `type`. `wordbank`, `order`, and `match` do not.

**4.Q22** Words and Idioms are drills and follow their blocks in Section 7, which name the rules they replace.

**Answer rules (4.A)**

**4.A1** Exactly one correct answer. No two options can both be a true reading of the text. Options differ in nature, not in shade: "the sea grew calm" and "the storm stopped" cannot sit in one set. Test: for each wrong option, name the verse that makes it false; if you cannot, it is too close and is rewritten.

**4.A2 Positions.** Every option carries an id and a `position` the writer sets. The app renders options in position order and grades by id; it never reorders and never matches text. Across a lesson, no position holds the correct answer in more than 40 percent of its `mc` and `fill` rows (or more than one row, whichever is larger), and the correct answer does not sit in the same position in three consecutive `mc`/`fill` rows, counted among the lesson's `mc` and `fill` rows in `order`.

**4.A3 Same source, for fact questions.** Every distractor is a real piece of the lesson's passage put in the wrong place: something that happens elsewhere in it, is said by someone else, or belongs to another verse. Not invented color. The passage is the union of the lesson's Lesson Passage rows with `parallel` = false; for a review question, the passage of the lesson it repeats. Each distractor is false against that passage, and the checker names the verse that rules it out. When the passage offers fewer such pieces than the option set needs, counting only pieces that also meet 4.A1, 4.A7 (tone included), and 4.A13, the fallback is, in order: another verse of the same book outside the lesson's rows, never a parallel row and never the correct answer, and the checker names its verse; then a plain-English statement the passage does not make. The fallback used is recorded in the Lesson Check note. Where the passage gives one side all the good and the other all the bad (Psalm 1; the sower), prefer a question whose options can all come from one side (what became of the seed by the way side, among the bad fates).

**4.A4 Same source, for meaning questions.** Where the correct option is a meaning, a paraphrase, or a modern sentence (Verses Part 3, Wisdom Apply, Parables example; Words and Idioms follow 7.W7), each distractor states a meaning the text does not state, and the checker names the verse it misreads. Distractors are meanings of other real things (other sayings, other terms) or, where the correct option is a response, responses that read as reasonable choices the text does not describe (7.Wi2, 7.Pa5); never nonsense.

**4.A5 Same shape.** All options in a set share one grammatical form, tense, and punctuation pattern, and sit within the length band in 4.Q4.

**4.A6 Same register.** Every option is plain English in the writer's words. No option quotes the verse or imitates scripture voice. The verse is for the reveal.

**4.A7 No odd one out, in any dimension.** All options are the same kind of thing: four actions, four places, four reasons, four people. None differs from the others in category, subject, voice, tone, specificity, length, or punctuation. If three name God, the LORD, Jesus, a prayer, or a Bible person or place, the fourth does too; if three are plain, the fourth is plain. If three are fruits, the fourth is a fruit. The religious case is one instance of the general rule. Tone is how an option reads on its own, to a player who has not met the passage: good (a blessing, a reward, a right act, praise), bad (a loss, a punishment, a wrong act, blame), or plain (neither, or both at once). Tone never gives the answer away: the options are all one tone or split two and two, and in a 3-option set all three share one tone. Tone is not tested on sets whose options are terms (reverse, fill, and finish in Words and Idioms, 7.W7), since 3.1 and 3.2 fix those by form. Checker procedure: for each option, write its category (action, place, person, reason, meaning), its subject, its voice (plain or religious), and its tone (good, bad, or plain); any column where one option's value differs from the other options' (an odd one out) fails. In the tone column, a two-and-two split passes and any other mix fails. The procedure applies to `mc` and `fill` option sets. Length is tested by 4.Q4, not here.

**4.A8 The cover test**, on every question: hide the stem and the setup and read the options alone. If any one can be picked without the question, rewrite.

**4.A9** Distractors are plausible, not silly. Each is ruled out by a verse or by the taught meaning, never by common sense alone; on a discovery question, by a fact the player already has (0.6).

**4.A10** No option text appears word for word as an option in two questions of one lesson, and no two questions in a lesson show the same set of options. A fact may be a wrong pick in one question and the right answer in a later one. The True/False pair on `tf` questions is exempt.

**4.A11** No "all of the above," no "which is NOT," and no half-true true-or-false statements. The spot-the-misuse drill and the Idioms pick-the-sentence drill (7.W7, 7.I7) are the named exceptions: one option is the odd one by design, and 4.A7, 4.A8, and 4.A13 are not applied to them. The three sentences that share a use still put the term in three different situations.

**4.A12** Clarifiers apply to both questions and answers. If one option has a clarifier, all options do (Section 5).

**4.A13 Wrong options differ from each other.** In an `mc` or `fill` set, no two options say one idea. Each wrong option is a different detail or a different meaning, not one idea reworded ("sits with scorners," "stands with sinners," and "walks with the wicked" are one idea: keeping company with the wicked). Test: write each option's idea in five words or fewer in the Lesson Check note for 10.14; if two ideas match, rewrite one. Misuse and pick sentence follow 4.A11.

**4.A14 Every option answers the question as asked.** In an `mc` or `fill` set, each option, read right after the prompt, is a natural, complete answer to it. It matches the question word (who: a person; where: a place; how does he feel: a feeling; what did Nate do: something Nate did) and the prompt's person and tense. An option in the second person ("your faults") never answers a question about someone else. For a fill, each option reads correctly in the blank. A saying, or a statement of what a verse says, keeps the text's own tense. A term option keeps the KJV's wording (7.W11, 7.I10), so its prompt is worded for every term to read as an answer. Not applied to the Meaning drill, whose options are the approved meanings as 3.1 and 3.2 shape them. Test: read the prompt, then each option; if any does not read as an answer, rewrite the set.

## 5. Names, Introductions, and Reading Level

**Names (5.N)**

**5.N1** Same name, different people: use only the relationship, title, place, or role the Bible gives. Joseph of Arimathea. No historians' labels like "Herod the Great."

**5.N2** Same person, different names: before the rename, "Old name (later called New)"; after, "New name (formerly Old)."

**5.N3** Clarifiers apply to both questions and answers. If one option has a clarifier, all options do.

**5.N4** Never use a person's other name as a distractor.

**5.N5** Pronouns for God, the LORD, and Jesus are capitalized in everything the player reads: He, Him, His. KJV text, wherever it is shown (the reveal, a Meaning drill's quote, the Verses intro), prints them lowercase; that is the text and stays as printed.

**5.N6** "The LORD" is written in capitals wherever the lesson refers to the name the KJV prints that way.

**5.N7 Invented names.** In modern sentences, an invented name is at least three letters, reads as a name at a glance, and does not look like another word or abbreviation (not Al, Jo, Bo, Cy, Di). Plain common names: Dana, Marcus, Ellen, Nate.

**Introducing people, places, and terms (5.I)**

**5.I1** Introduce what the question needs. When the player must understand a person, place, or term to reason through a question, give it a few plain words from the text the first time it matters: "King Herod, who ruled Judea" (Matthew 2:1, 2:22). The introduction lives in the setup or the prompt, never only in an option. A person, place, or term no question depends on is left out or said in plain words.

**5.I2** Never give the answer away. The added words place the person, place, or term but never contain the answer, point to it, or state its idea in other words (7.S8).

**5.I3** Bible terms such as covenant, tabernacle, Pharisee, Sabbath, and Passover are kept where a question depends on them, and introduced only from what the text itself says. Wise men are "wise men from the east" (Matthew 2:1) and nothing more.

**5.I4** Key words: a key word may be defined in plain English in a setup: "Perish means to be destroyed, lost for good." Then the question tests what the text says once that word is understood. The definition is never the answer, and the word's meaning is not tested until a question whose `order` is at least 4 greater. The definition is the writer's plain words for how the KJV uses the word in the range; no dictionary is cited. Use it only where needed. Words and Idioms teach meanings through their Meaning drill instead.

**Reading level (5.R)**

**5.R1** Write at a 5th-grade level: Flesch-Kincaid Grade Level 5.0 or lower and Flesch Reading Ease 70 or higher, scored per lesson on the concatenation of `intro`, `scene intro`, `verse intro`, every `story`, every `prompt`, every option text, and `meaning`. Each field and each option is scored as its own sentence: a field or option that has no end punctuation gets a period before scoring. Before scoring, each proper name (any Bible Character or Place name, and any invented name per 5.N7) is replaced with "John" and each run of four or more consecutive KJV words is removed. `why` is scored by the Dorin project, not here.

**5.R2** The quoted clause in a Meaning drill and the verse on a Verses intro (7.V9) do not count against the score. No other KJV quote appears in what is scored (4.A6, 4.Q12).

**5.R3** Accuracy beats readability. If a simpler word changes the meaning, keep the accurate word.

**5.R4 Age-neutral.** The audience is general adults, with children welcome. Every invented sentence, situation, or example in any recipe is age-neutral: people are a friend, a neighbor, a coworker, a customer, a driver, an inspector, someone at a store. No school, homework, or parents-and-kids framing, and no family roles as the default. Nothing only an adult would know either.

**5.R5 No specialized senses.** In invented sentences, no word is used in a specialized or trade sense when its everyday sense is different: not board for a board of directors, bench for a court, suit for a lawsuit, interest for a bank rate, mole for a spy. The Flesch score does not catch this; the checker reads for it.

## 6. Explanations, Sensitive Content, and Screens

Explanations (`why`, and each option's `explanation`) are Dorin's voice and are being redesigned in a separate project. Until that project replaces this section and Section 11, the rules below stand. The writer fills `why` so a lesson is playable and leaves every `explanation` empty (6.2); the checker grades only 6.1 and 6.2, never the wording.

**6.1** Every `why` cites its verse by full book name, says why the right answer is right, adds no fact from outside the Bible, never names a wrong option, and never quotes words that answer a later question in the lesson, other than a tagged repeat or review of this question. One or two sentences, plus at most one closing beat of eight words or fewer (Section 11). In Verses and Poems, no `why` quotes four or more consecutive KJV words before the reveal.

**6.2** Each Question Option row carries `explanation`, Dorin's note for that option, on every answer option of every type, correct ones included. Its content is written by the Dorin explanation project; until then the writer leaves `explanation` empty on every option. Question has no `wrong` field.

**6.3** Dorin's voice, every recipe: every note, every `why`, every intro, and every complete screen is Dorin talking to the player. Section 11 governs; no recipe's block overrides it.

**6.4** Sensitive content: state violence and sexual content plainly but appropriately for an all-ages audience.

**6.5** Titles: flavor and lesson titles come from the text and say in plain words what the player will learn (2.10). "Ehud: The Left-Handed Judge" works because Judges 3:15 says he was left-handed.

**6.6 Reveal screen.** The reveal is the lesson's Lesson Passage rows. The app builds each heading from the row's verse range (Micah 5:2–4); Jesus Prophecies rows carry `label` Prophecy or Fulfillment, other rows an empty label. In Verses, the lesson's `focus verse id` is highlighted inside its range. Rows with `parallel` = true are shown after the base rows.

**6.7 Intro and complete screens.** One intro screen opens each lesson and carries the frame as the recipe's block defines it, never the meaning. The complete screen shows `meaning` with its reference. Each recipe's block says what its intro carries and whether the text is shown there. In Words and Idioms, `meaning` lists each term, its meaning, and its verse or verses, one term per line.

## 7. Rules by Recipe

**A recipe's block overrides the general rules.** The Words and Idioms blocks each hold one rule (7.W11, 7.I10) that names the general rules they replace; other blocks name a replaced rule in the rule that replaces it. For those rules the checker tests the block's version; for everything else the general rule applies.

**Setup sentences, every recipe (7.S)**

The player is not expected to know the material. Questions work by prediction: the player reasons from what the setup gives them, commits, and the explanation corrects or confirms. Words and Idioms use no setup screens; their Meaning drill carries its clue in the prompt (7.W6, 7.I6).

**7.S1** A setup is one sentence in the `story` field, shown on its own screen before its question. One setup belongs to one question; `story` is empty on questions without one. Not every question gets one. 20 words or fewer.

**7.S2** The setup carries the anchor the player reasons from, and is what makes a question's clue `setup`. For narrative, the character's state or intent ("Eglon, alone and unguarded, rose from his seat"). For a verse or teaching, the governing principle. For a sequence, the step just before.

**7.S3** The setup never states the answer. It gives enough to deduce it, and the distractors run in the same direction as the anchor, so the player has to think, not just eliminate.

**7.S4** Setups come from the verses only. A setup that adds a fact the passage does not state is invented content.

**7.S5** Setups count toward the reading-level score.

**7.S6** A setup is not where facts live. If a fact matters, it gets a question. A fact that appears only in a setup is not covered.

**7.S7** The setup and the question come from different verses, or different halves of a verse. The setup is the verse before; the question is the verse after. A setup that paraphrases the verse the question tests is giving the answer away.

**7.S8 No leak, in words or in idea.** No word that is the correct answer, or a form of it, appears in the setup, and the setup does not state the correct option's idea in other words ("his job owns him" leaks "master"). Tests: strike every setup word from the options; if the correct answer is the only option untouched, fail. Then read the setup and the correct option together; if the setup already says what the option says, fail.

**7.S9** A term defined in a setup is never the answer to the question that follows it; it is tested at an `order` at least 4 greater.

**7.S10** The setup is gone when the prompt shows. The prompt still names its subject (4.Q2).

**Stories (7.St)**

**7.St1** A Stories flavor is one story, or one part of a long story cut at its own narrative break (Section 9). The parts of one story sit side by side in flavor order.

**7.St2** Stories are the umbrella, built last. A Stories lesson tells its part of the story whole even where another recipe taught some verses in detail.

**7.St3** Each lesson covers a run of events in order, cause to effect, and ends at a natural stopping point, never mid-scene. The next lesson picks up exactly where the last ended.

**7.St4** The setup anchor is the character's state or intent.

**7.St5** The intro opens with the flavor's frame and, from lesson 2 on, one line on where the last lesson left off. That line is a frame; it may serve as the `frame` clue for question 1 only. Stories have no review questions.

**7.St6** Lesson titles follow 2.10: plain words saying what the player will learn. The complete screen states what happened in the lesson's part of the story, with its references.

**7.St7** Word banks and true-or-false statements in Stories are the writer's plain paraphrase of events in the range, with concrete nouns and actions as blanks (1.14), never a run of the verse.

**Jesus Prophecies (7.J)**

**7.J1** Only prophecies and pictures about Jesus, from the owner-approved Jesus Prophecy Link list. A link runs Old Testament to New Testament, or New Testament to New Testament, including Jesus' own predictions. Never Old Testament to Old Testament.

**7.J2** One flavor is one prophecy: lesson 1, The Promise; lesson 2, The Fulfillment. Lesson 1's Lesson Passage rows are the prophecy and the verses that name its speaker and scene; lesson 2's rows are the fulfillment passage plus the prophecy, labeled Prophecy and Fulfillment (6.6). Every lesson 1 row is labeled Prophecy.

**7.J3** The Promise: who spoke it (citing the verse that names the speaker), who it was spoken to, what was happening, and what it said. Who spoke it and who it was spoken to are required questions in lesson 1. Where the New Testament states the link, lesson 1 ends by showing who it points to.

**7.J4** The Fulfillment: how it came to pass, and who in the New Testament quotes or applies it, and where. Who quotes or applies it is a required question in lesson 2.

**7.J5** Where the New Testament states the link, the lesson says the prophecy pointed to Jesus and cites the verse. Where the owner approved a link the text does not state, the lesson shows both passages side by side and makes no claim.

**7.J6** Flavors sit in the order of Jesus' life: birth, ministry, death, resurrection. The flavor title names the book the prophecy comes from: "Micah: Born in Bethlehem." Lesson titles are "The Promise" and "The Fulfillment."

**7.J7** A prophecy still waiting to be fulfilled is not in this recipe; it is taught as a promise in Revelation or Prophets.

**7.J8** The intro carries the prophecy's reference, who spoke it, and whether this is The Promise or The Fulfillment, never the meaning. The complete screen shows both references and says the prophecy pointed to Jesus only where the New Testament says so.

**Prophets (7.P)**

**7.P1** The prophets' messages: Isaiah, Jeremiah, Ezekiel, Daniel 7–12, and Hosea to Malachi except Jonah, whose book is narrative and belongs to Stories. Story chapters in these books are in Stories and may be taught here too where a message sits in them. A message about Jesus is taught in Jesus Prophecies; here, the lesson never names Jesus or links a passage to him, and teaches only what the passage itself says.

**7.P2** Book by book, in book order. A flavor is one section, cut at the book's own turns: a new message, audience, or date. The title names the book: "Amos: Justice Like a River" (Amos 5:24).

**7.P3** Each lesson: who the prophet was and when, only as the text says; who he speaks to; what is happening; the sin or need the text names; the warning or promise; what God says will happen; and the response the text calls for.

**7.P4** A lesson never says a message came true or was fulfilled. It teaches what was said, not whether or when it happened.

**7.P5** A symbol's meaning is taught only where the text explains it (Daniel 8:20–21). Otherwise the lesson tests what the vision shows, not what it means.

**7.P6** "Messages" is the word for what the prophets delivered.

**7.P7** The intro carries the book, the prophet, who he speaks to, and the section, never the meaning. Lesson titles follow 2.10: plain words saying what the player will learn. The complete screen states what the passage says, never what it stands for.

**Revelation (7.R)**

**7.R1** A flavor is one section of Revelation, cut at the book's own turns, in order. The title names the book: "Revelation: Letters to Seven Churches."

**7.R2** Each lesson: what John sees and hears, who speaks, to whom, and what is said, in order. The promises of Jesus' return are taught as promises (Revelation 1:7).

**7.R3** Meaning is taught only where the text explains it (Revelation 1:20; 19:8). Otherwise the lesson tests what the vision shows.

**7.R4** No timelines: no teaching on when or in what order end-time events happen, and no view of how they will be fulfilled.

**7.R5** Nothing in Revelation is taught as already fulfilled.

**7.R6** The intro carries the section and what John is shown, never the meaning. Lesson titles follow 2.10: plain words saying what the player will learn. The complete screen states what John saw and heard, never what it stands for.

**Letters (7.L)**

**7.L1** Romans to Jude, book by book. A flavor is one section of one letter, cut at the letter's own turns, in book order. The title names the book: "Romans: Saved by Faith." Only Philemon, 2 John, 3 John, and Jude may be a 1-lesson flavor.

**7.L2** Each lesson: who wrote it (where the letter states it, 7.L4), to whom, and why, from the letter's own words (Romans 1:1–7), in lesson 1 of the flavor; then the teaching, step by step, in order; then what the letter tells its readers to do, only where it commands.

**7.L3** The next lesson continues the teaching where the last one stopped.

**7.L4** What a letter teaches is taught only from its text. Name an author only where the letter states one (1.8); Hebrews names none.

**7.L5** The intro carries the letter, who wrote it, to whom, and the section, never the meaning. Lesson titles follow 2.10: plain words saying what the player will learn. The complete screen states what the section teaches, in the letter's own terms, with its references.

**Parables (7.Pa)**

**7.Pa1** Jesus' parables and teaching blocks (Matthew 5–7, 10, 13, 18, 23–25; Luke 15; John 13–17). Parables holds only Jesus' parables and teachings; Moses' speeches in Deuteronomy are taught in Stories (2.16).

**7.Pa2** A flavor is one part of a teaching block, cut at its own turns (the Beatitudes, Matthew 5:3–12; the Lord's Prayer, Matthew 6:9–13), or a group of parables the text sets together (Luke 15).

**7.Pa3** Each lesson: the setting (who is taught and why, from the frame verse); the parable or teaching in order, told through the questions; its meaning where 7.Pa4 yields one; and a modern example where a meaning is stated.

**7.Pa4** Meaning only from the text: Jesus' own explanation (Matthew 13:18–23), a frame verse that states the point (Luke 18:1), or a closing command (Luke 10:37). Where the text gives no meaning, the lesson tests what the parable says, the comparison it makes, and how the listeners reacted, if the text says so.

**7.Pa5** The modern example is a straight, age-neutral comparison that shows the meaning the text states (5.R4). It appears only in `mc` or `fill`, never in match or order. Its distractors follow 4.A4. Where the correct option is a response or an act, each wrong option is one that reads as a reasonable choice but that the parable's stated meaning does not describe; the set may split two and two in tone (4.A7).

**7.Pa6** A long teaching continues where the last lesson left off.

**7.Pa7** The intro carries the setting and who is being taught, never the meaning. Lesson titles follow 2.10: plain words saying what the player will learn. The complete screen shows the meaning line with its reference.

**Verses (7.V)**

**7.V1** One verse per lesson, 15 questions. The lesson title is the reference. A flavor is one theme and holds 2 to 5 verses from the approved Memory Verse list. Memorizing the words is the Memorization Tool's job, not the lesson's. A memory verse sits in at most one Verses flavor.

**7.V2** Every lesson after the first adds 2 or 3 review questions on verses from earlier lessons in the flavor (2.6). A review question's `part` is `plain`, it sits in Part 3, and it does not count toward the Part 3 range in 7.V8.

**7.V3** The lesson's range is the verse plus the verses around it that set the scene, at least two verses before and one after where the book allows; at a book's or chapter's opening, the verses that follow. New facts come only from that range. `focus verse id` is the lesson's verse; the reveal shows the range with it highlighted.

**7.V4** The verse is shown once, on the intro screen, and not again until the reveal. No question tests its wording (4.Q12).

**7.V5 Part 1, The scene** (2 to 4 questions, `part` = `scene`): who speaks, to whom, and what was just said, from the verses before, in plain words. Setup and question come from different verses (7.S7). `scene intro` is shown before the first `scene` question: one screen in Dorin's voice saying the next few questions set the scene before the verse. The app labels these questions SCENE.

**7.V6 Part 2, What it says** (5 to 9 questions, `part` = `verse`): the verse's claims one at a time, by reasoning: who acts, for whom, why, what results, what is ruled out. `verse intro` is shown before the first `verse` question ("Now the verse itself"). The app labels these THE VERSE.

**7.V7** A key word is defined in a setup (5.I4) and the question tests what the verse says once that word is understood. The definition is never the answer.

**7.V8 Part 3, In plain words** (3 or 4 questions, `part` = `plain`): the player picks the sentence that says what the verse says, fills the meaning phrase into a modern sentence, and matches each claim to who it is for or what it brings. Each of the three appears at least once. Not life application; the meaning is the text's. Distractors follow 4.A4. The fill's meaning phrase is a plain phrase from a Part 2 answer. Every non-review Part 3 question is one of the lesson's repeats: it carries `repeat of` pointing to the Part 2 question it restates and `clue` = `earlier`, and Parts 1 and 2 hold no other repeats. Parts sum to 15 before reviews: Part 1 2 to 4, Part 2 5 to 9, Part 3 3 or 4. The before-question-9 clause of 4.Q11 is not applied in Verses.

**7.V9** The intro carries the reference, who speaks it, who hears it, and the verse; in Verses the verse text is part of the frame. The complete screen shows the verse and its meaning line with the reference.

**Poems (7.Po)**

**7.Po1** Psalms, Song of Solomon, and Lamentations. A poem inside a story is taught with the story and may also be taught here.

**7.Po2** A flavor is poems, or sections of a long poem, that fill 2 to 5 lessons (2.4) and share something the text shows: the situation a heading gives (David fleeing in Psalms 3, 57, and 34); what the poems ask for or praise (forgiveness in Psalms 32 and 51); or a collection the text itself names (the Songs of Degrees, Psalms 120–134).

**7.Po3** The flavor title comes from the poems' own words; each lesson title is the poem's reference or the section's own words; a lesson of several short poems is titled with their references (2.12).

**7.Po4** A short poem, one that cannot fill 15 questions without a line-by-line walk-through (7.Po6), shares its lesson with one or two other short poems of the flavor, taught one after another in flavor order. A poem that can fill a lesson gets its own. A long poem fills one lesson per section, cut at its own turns (a change of speaker, hearer, tense, place, or subject the text shows). In a lesson of several poems, each poem is taught whole before the next, and the first question on each new poem opens with a bridge setup naming it (4.Q13); its Lesson Passage rows are one row per poem.

**7.Po5** What a lesson teaches: what the poem is about, not what it says word for word. The situation (who speaks, to whom, what is happening, only from the heading or the text; a poem with no heading gets no author question); the main point in one sentence; the movement, where the poem starts and ends, when the text shows a change; key lines and pictures, and what the poem says they do, never what a writer says they stand for; the speaker's response, only where the text names it.

**7.Po6** Not every line is tested. No line-by-line walk-through.

**7.Po7** The poem is never shown before the reveal. No question tests its wording.

**7.Po8** A comparison the text makes may be named in plain words ("a picture word for the LORD"); the label is defined in a setup and tested at an `order` at least 4 greater. No label the text does not support: no irony, foreshadowing, mood, or universal idea.

**7.Po9** No review questions.

**7.Po10** The intro carries the reference or references, what the heading says in plain words, and the flavor's theme; no poem text. The complete screen shows the meaning line with the reference.

**Wisdom (7.Wi)**

**7.Wi1** Proverbs, Ecclesiastes, and Job. A flavor is one topic (anger, words, work, money, friends, pride) and pulls sayings from across these books. A big topic spans several flavors, each with its own focus from the text. The flavor title names the topic from the text.

**7.Wi2** One lesson is one subtopic ("slow to anger," "a soft answer") in a say, mean, apply cycle; each question's `part` is `say`, `mean`, or `apply` (8.3). Say: what the sayings say, in meaning phrases. Mean: key words (5.I4), how the two halves of a saying work together, and the result the text states. Apply: modern, age-neutral situations in `mc` and `fill`; the player picks the saying that fits, in plain words, or the wise response the text describes; distractors follow 4.A4. Where the correct option is the wise response, each wrong option is a response that reads as a reasonable choice but that the saying does not describe, and the checker names, for each, why the saying does not describe it; the set may split two and two in tone (4.A7). Apply uses pick-the-sentence, fill, and match at least once each (4.Q16). The Apply match pairs a saying to the result the text states, in plain words, text to text, never a situation.

**7.Wi3** Every lesson after the first adds 2 or 3 review questions on subtopics from earlier lessons in the flavor (2.6).

**7.Wi4** The speaker is always named where the text names one (Solomon, Agur, the Preacher, Job, Eliphaz). Eliphaz, Bildad, and Zophar may be quoted, always with God's verdict that they did not speak rightly (Job 42:7). A lesson that quotes one of them includes Job 42:7 in its Lesson Passage rows. Elihu is quoted as Elihu, with no verdict the text does not give.

**7.Wi5** Life application comes only from what the text says or commands. Proverbs states its own results, and Apply tests those.

**7.Wi6** Lesson titles name the subtopic in plain words and follow 2.10. The intro carries the topic and the subtopic, never the meaning. The complete screen shows the meaning line with its references.

**7.Wi7 Replaced for Wisdom.** The block's version is tested instead of: 4.Q18 (the lesson runs Say, then Mean, then Apply; within each part, sayings follow the order the lesson first met them; Mean and Apply may return to any saying of the lesson without `repeat of`); 4.Q13 (a bridge names the book, on the first question about a new saying). A question that returns to a saying under this rule is not a repeat unless it carries `repeat of`; 4.Q6 counts and 4.Q7 spaces tagged repeats only.

**Words (7.W)**

**7.W1** Words lessons are drills: four new words, each met in a Meaning drill and then practiced in short, varied exercises that move from recognizing the word to using it. Both goals count: the player can recognize the word when they meet it in their Bible, and can use it in a sentence. No narrative.

**7.W2** A flavor is one theme (words of Peter, words Jesus said, names of God) and holds 2 to 5 lessons: 8, 12, 16, or 20 words. The flavor title names the theme from the text.

**7.W3** Four new words per lesson, 15 questions, all from the flavor's theme, under the pairing rule (3.1). The lesson title lists the four words. Every lesson after the first adds 2 or 3 review questions on earlier words (2.6); they sit in the mixed part (7.W8), never after the all-four question.

**7.W4** Words are words the KJV prints. The meaning is the approved Word `meaning`, used word for word where 7.W13 says (1.10). The anchor verse is a verse where the KJV prints the word with that meaning. Every question on a word cites its anchor verse (1.4), and the lesson's Lesson Passage rows are the four anchor verses, one row per distinct verse.

**7.W5** No story. No scenes, characters, events, or who-said-it-to-whom, and no pulling verses together to build a narrative. The only Bible content in a question is the anchor clause quoted in the Meaning drill. `story` is empty on every Words question.

**7.W6 The Meaning drill.** A word's first question quotes the anchor clause with its reference in the prompt and asks the meaning: The verse says, "be ye holy in all manner of conversation" (1 Peter 1:15). What does conversation mean here? A speaker is named only where the verse or its heading names one (1.8). The quote is the part of the clause that holds the word, never the part that explains it. No content word of the quote (noun, verb, adjective, adverb) appears in any option. The drill is `mc`; its options are the approved meanings of four different flavor words. Its clue is `setup`; the two-option test in 0.6 is not applied. The quote may push the prompt to 25 words.

**7.W7 Drill shapes.** Each question records its shape in `shape` and the word or words it tests in Question Word, one row per word: one row for most shapes, one per blank for a word bank, four for the match.

- The answer is a meaning; the word is in the prompt and in no option: **meaning** (7.W6). **sentence sense**: a modern sentence uses the word; pick what the person did or meant; the correct option states the approved meaning in the sentence's own terms (`mc`); distractors state other flavor words' meanings the same way (7.W13). **opposite**: pick the plain phrase that means the opposite (`mc`); distractors are plain phrases that do not. **tf** on the meaning: a true or a false statement of it (`tf`).
- The word is in the prompt and in no option: **who**: pick the one of four people, one line each, that the word describes (`mc`); the three others do something the word does not mean.
- Every option carries the word: **misuse**: four sentences use the word; pick the one that uses it wrong (`mc`). The wrong one uses the word in its everyday sense or in a sentence where another flavor word would be right; never an absurd sentence. Exempt from 4.A7, 4.A8, and 4.A13 by design (4.A11).
- The answer is the word: **reverse**: the meaning is shown; pick the word (`mc`). **fill**: the word into a modern sentence. In both, every option is a flavor word of the same `form` as the answer (this lesson's or another lesson's), never a plain decoy, and no two questions in the lesson show the same set of options. The fill sentence takes any word of that form grammatically, so only the meaning decides. **wordbank**: 1 to 3 content-word blanks in a modern sentence; the bank is flavor words; each extra shares the `form` of a blank (4.F4); the lesson's own words may be extras. **match**: the lesson's four words to their approved meanings, text to text.
- Not used in Words: the pick sentence shape (7.I7).
- Distractor rule for shapes whose options are terms (reverse, fill, wordbank, match, and finish in Idioms): the options are flavor terms of one `form`, and the taught meaning rules the wrong ones out; an untaught flavor term is ruled out by the taught term alone. 4.A3, 4.A4, and 4.A5 are not applied to them; 4.A7 does not test tone on them and reads "same form" as "same `form`." For every other shape the taught meaning rules out the wrong options and 4.A4's verse-naming step is not applied.

**7.W8 Order.** Meaning drill on word 1, then 1 or 2 more on word 1; the same for words 2, 3, and 4; then the mixed part, moving from meaning to use. The question with the highest `order` in the lesson uses all four words, in a match; no review question follows it. The writer varies the exact slots.

**7.W9 Counts.** A question tests the word its correct answer turns on; words shown only as options do not count. Each of the lesson's four new words is tested at least 3 times and at most 5 (counted from Question Word), across at least three different shapes, never twice in the same shape; a word bank or match counts for each word it uses, and at most one question besides the last uses several words (in Words that question is a word bank, since a second match would test every word twice in one shape). At least six shapes appear in the lesson. The mixed part begins at the first question after word 4's last introductory question. In the mixed part, the same word is not the sole subject of two adjacent questions. No new word is tested before its Meaning drill. Every drill other than a Meaning drill has `clue` = `earlier`.

**7.W10 Sentences.** Drill sentences are modern, short, age-neutral (5.R4, 5.R5), with invented names per 5.N7, and built from everyday words so the target word is the only new thing. A drill sentence may name God; no other Bible person or event appears in it.

**7.W11 Replaced for Words.** The block's version is tested instead of: 4.Q5 (new facts: the anchor verses), 4.Q6 and 4.Q7 (repeats and spacing: drills carry no `repeat of`; review questions do), 4.Q8 and 4.Q9 (repeat formats: word bank and match use the lesson's words and meanings), 4.Q10, 4.Q11 (every lesson opens with a Meaning drill and closes with the all-four match; the sequence of shapes differs between lessons; the before-question-9 clause is not applied), 4.Q13 (the Meaning drill names its verse), 4.Q14 (a word's meaning is the correct answer in several shapes by design), the second sentence of 4.Q15, 4.Q18, 4.A3, 4.A4, and the verse test of 4.A1 for every shape (the taught meaning rules out, 7.W7), 4.A5 for term-option shapes (one `form` is one form), 4.A6 for term-option shapes (the option is the KJV word), 4.A7, 4.A8, and 4.A13 for misuse (4.A11), the first clause of 4.A10 (term options and approved meanings may recur, approved meanings within 7.W13's limit; any other option text, and the same set of options, may not), 7.S1 to 7.S10, and the question-1 discovery ban in 0.6 (the Meaning drill is `setup`). Every other rule applies, including the clue standard, stand-alone prompts, lengths, no odd one out and the cover test on every other shape, one word fits, positions, true-or-false balance, the 60 percent cap, and reading level.

**7.W12** The intro carries the theme and the four words, never their meanings. The complete screen lists each word with its meaning and anchor verse (6.7).

**7.W13 Meanings are fitted, not pasted.** In prompts, statements, and options, an approved meaning appears word for word only where the question asks for the meaning itself: the Meaning drill's options, the reverse prompt, and the closing match. It also appears on the complete screen (6.7); `why` follows 6.1. Everywhere else a meaning is stated (sentence sense; `tf` on the meaning), it is put in that question's own words, fitted to its person, tense, and question word (4.A14), saying what the approved meaning says, no more and no less. Opposite and who options answer with an opposite and with a person, and never carry an approved meaning word for word. In sentence sense, all four options are fitted the same way, and the sentence does not state the meaning apart from the word. Test: strike the word from the sentence; if what is left already says what the correct option says, rewrite the sentence. Example: "Dana sold her old garner. What did Dana sell?" → "A building where she stored her grain," against "A floor where she beat her grain," "A mill where she ground her grain," and "A field where she cut her grain": four places, one tone, four ideas. A text counts as word for word when, with a leading "to" dropped, person words (your, his, her, their, one's, own) set aside, and tense ignored, it keeps the approved meaning's words in order. Fitted text follows 4.A10, counted the same way: no fitted option appears as an option in two questions of a lesson. Across a lesson, each approved meaning appears word for word as an option in at most two questions besides the closing match; in an 8-term flavor this means each meaning sits in exactly two Meaning drills and in no other option set.

**Idioms (7.I)**

**7.I1** Idioms lessons are drills like Words: four new idioms, each met in a Meaning drill, then practiced in short, varied exercises from recognizing to using. Both goals count. No narrative.

**7.I2** A flavor is one theme (idioms Jesus said, idioms about listening) and holds exactly 2 lessons: 8 idioms (3.2). The flavor title names the theme from the text.

**7.I3** Four new idioms per lesson, 15 questions, under the pairing rule (3.1). The lesson title lists the four idioms as the KJV words them. Lesson 2 adds 2 or 3 review questions on lesson 1's idioms (2.6), placed as 7.W3 says.

**7.I4** An idiom is a phrase whose meaning is more than its words. It qualifies only when its KJV verse or verses show the meaning in the text itself, and every verse the lesson cites prints the phrase in the KJV. The meaning is the approved Idiom `meaning`, used word for word where 7.W13 says (7.I12). Every question on an idiom cites a kept Idiom Verse (1.4), and the lesson's Lesson Passage rows are the kept verses of its four idioms, one row per distinct verse.

**7.I5** No story, no retelling. The only Bible content in a question is the clause quoted in the Meaning drill. No question asks what a verse says, who said it, or what happened next. `story` is empty on every Idioms question.

**7.I6 The Meaning drill.** The idiom's first question quotes the part of the clause that holds the idiom, with its reference, and asks the meaning: The verse says, "Beware of false prophets, which come to you in sheep's clothing" (Matthew 7:15). What does in sheep's clothing mean? The part of the verse that explains the idiom ("inwardly they are ravening wolves," "both shall fall into the ditch") is held back for the reveal. A speaker is named only as 1.8 allows. Options are the approved meanings of four different flavor idioms. No content word of the quote appears in any option. Clue `setup`. Up to 25 words.

**7.I7 Drill shapes.** The Words shapes (7.W7), read with "idiom" for "word" and Question Idiom for Question Word, plus: **pick sentence**: four sentences use the idiom; pick the one that uses it the way the Bible does; the three others use the words literally (`mc`); exempt from 4.A7, 4.A8, and 4.A13 by design (4.A11). **finish**: a modern sentence stops where the idiom is the natural ending, written as a full clause ending in a colon or as a question, never an ellipsis; the options are four flavor idioms of one `form` (`mc`); exempt from the stem clause of 4.Q3. Not used in Idioms: wordbank.

**7.I8** Order and counts follow 7.W8 and 7.W9. The question with the highest `order` uses all four idioms, in a match, and it is the lesson's only multi-idiom question. Idiom options (reverse, fill, finish, match left side) are the KJV phrases; they share one `form` within a set (3.2) and sit within 4.Q4's 3-word band, which 3.2 guarantees for the lesson's four; a set that uses the other lesson's idioms is chosen to stay within the band.

**7.I9** When one verse holds two idioms (Psalm 17:8), it may serve both, but each Meaning drill teaches only its own idiom.

**7.I10 Replaced for Idioms.** The same rules 7.W11 replaces for Words, plus: 4.A7, 4.A8, and 4.A13 for pick sentence; the stem clause of 4.Q3 for finish; and, because the idiom itself is a KJV phrase, 4.A6, the option clause of 4.Q12, the four-word-run ban of 4.Q12, and 5.R2 wherever the idiom appears in a prompt, statement, or option. The idiom is removed before reading-level scoring. No other KJV run appears.

**7.I11** The intro carries the theme and the four idioms, never their meanings. The complete screen lists each idiom with its meaning and the verses that show it (6.7).

**7.I12** 7.W13 applies to Idioms, reading "idiom" for "word." Example: "Nate cast out the beam out of his own eye. What did Nate do?" → "Dealt with his faults before judging others," against "Did good deeds so others would praise him," "Did what he had been taught to do," and "Kept fighting what only hurt him more": four past acts of Nate's, split two good and two bad.

## 8. Output Format

The writer's output is rows for the Stage 2 schema: Cookie Lesson, Lesson Passage, Question, Question Option, Question Verse, Question Word or Question Idiom (Words and Idioms), and Lesson Check. Field names are the schema's plain names. All quoted wording is KJV.

**8.1 Cookie Lesson** (one row per lesson)

| Field | Type | What it holds |
| --- | --- | --- |
| cookie dough flavor id | uuid | The flavor. |
| order | integer | Position in the flavor, 1 first. |
| title | text | Per the recipe's block. |
| goal | text | The lesson's one-sentence goal (0.5). |
| intro | text | The intro screen: the frame only, per the recipe's block. |
| meaning | text | The complete screen's meaning line with its reference; in Words and Idioms, one line per term (6.7). |
| reference text | text | The lesson's range as shown to the player, per 2.12. |
| scene intro, verse intro | text | Verses only: the two banners (7.V5, 7.V6). Empty elsewhere. |
| focus verse id | uuid | Verses only: the lesson's verse (7.V3). Empty elsewhere. |
| rules version | text | This document's version, as printed in the header ("v1"). |
| status | text | `draft` on delivery (3.5). |

**8.2 Lesson Passage** (one or more rows per lesson)

| Field | Type | What it holds |
| --- | --- | --- |
| cookie lesson id | uuid | The lesson. Words: one row per distinct anchor verse (7.W4). Idioms: one row per kept verse of the four idioms (7.I4). |
| label | text | Jesus Prophecies: Prophecy or Fulfillment. Empty elsewhere; the app builds headings from the range. |
| from verse id, to verse id | uuid | The reveal range. With `parallel` = false, also the range every fact-question distractor is checked against (4.A3). |
| parallel | boolean | True on a parallel-account row: revealed, never a source (2.17). |

**8.3 Question** (one row per question)

| Field | Type | What it holds |
| --- | --- | --- |
| cookie lesson id | uuid | The lesson. |
| order | integer | Position in the lesson, 1 first, review questions included. |
| type | text | `mc`, `tf`, `fill`, `wordbank`, `order`, `match`. |
| part | text | In Verses, `scene`, `verse`, or `plain` (7.V5–7.V8). In Wisdom, `say`, `mean`, or `apply` (7.Wi2). `plain` in every other recipe. |
| story | text | The setup line (7.S), or empty. Always empty in Words and Idioms. |
| (Question Word, Question Idiom) | uuid | Not on Question. The words or idioms a question tests are rows in Question Word (question id, word id) or Question Idiom (question id, idiom id), one row per term tested (7.W7). No rows outside Words and Idioms. |
| shape | text | Words and Idioms only: `meaning`, `sentence sense`, `opposite`, `tf`, `who`, `misuse`, `reverse`, `fill`, `wordbank`, `match`, `pick sentence`, `finish` (7.W7, 7.I7). Empty elsewhere. |
| prompt | text | The question. For `fill` and `wordbank`, the sentence with `___` at each blank, numbered left to right. For `tf`, the statement. For `order` and `match`, the instruction line naming the subject. |
| answer | boolean | `tf` only; it matches the True or False option row marked correct (8.4). Empty on every other type. |
| why | text | The explanation (6.1). |
| clue | text | `frame`, `setup`, `earlier`, or `discovery` (0.6). |
| repeat of | uuid | Empty, or the question this repeats: an earlier question in this lesson, or in an earlier lesson of the flavor for a review question. A match, order, or word bank tags the earliest (4.Q6). |
| replaces question id | uuid | Empty, or the live question this replacement will retire when approved (3.10). |
| status | text | `draft` on delivery. |

**8.4 Question Option** (rows per question)

| Field | Type | mc | tf | fill | wordbank | order | match |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | key | key | key | key | key | key |
| question id | uuid | owner | owner | owner | owner | owner | owner |
| text | text | the option | True or False | the option | a bank word | an item | a left or right item |
| position | integer | display order, writer-set | 0 for True, 1 for False | same as mc | same | where it shows at the start | left side: display order; right side: the scramble |
| is correct | boolean | exactly one true | exactly one true, matching `answer` | exactly one true | — | — | — |
| blank | integer | — | — | — | 1, 2, or 3; empty on an extra | — | — |
| order question sequence | integer | — | — | — | — | the true order, 1 first | — |
| side, pair | text, integer | — | — | — | — | — | `left` or `right`; matching rows share a pair number |
| explanation | text | empty in every lesson until the Dorin project (6.2) | same | same | same | same | same |

Counts: `mc` 4 options; `tf` 2 rows, True and False; `fill` 3 or 4; `wordbank` the missing words plus 2 or 3 extras; `order` 3 or 4 items; `match` 3 or 4 pairs. `position` starts at 0: the first item shown has `position` 0. For `order`, the items are not shown in their true order: at least two items have `position` + 1 ≠ `order question sequence`. For `match`, the right side is not shown in the left side's pair order: at least two right-side items have a `position` different from the `position` of their left-side pair. For `wordbank`, a bank word is correct when its `blank` is set. The app grades by id and never by text or position.

**8.5 Question Verse** (rows per question): One row per verse the true answer comes from (1.4). The writer gives a reference per 2.12; a range is expanded to one row per verse on load. Never empty. **Question Word / Question Idiom** (rows per Words or Idioms question): one row per term the question tests (7.W7, 7.I7). **Word** and **Idiom** rows carry `form` (3.1, 3.2), set on the master list.

**8.6 Lesson Check** (rows per lesson): one row per Section 10 line, written by the writer and again by the checker: `cookie lesson id`, `check` (the line's number, e.g. "10.14"), `pass`, `note`, `checked by` (writer | checker; owner only when the owner overrides a line, with the reason in `note`), `checked at`. Rounds are told apart by `checked at`; the latest row per line and checker stands. For a line with flavor-wide clauses, each lesson's row tests them against the lessons before it in `order`, and the flavor's last lesson's row tests the whole flavor. A line that does not apply to the lesson's recipe (another recipe's 10.38–10.47 line, or a "(W/I: skip)" line on Words or Idioms) is still recorded, with `pass` = true and `note` = "not applicable".

**8.7** Flavor rows (Cookie Dough Flavor: `name`, `description`, `order`) are set by the owner from the approved plan. The checker confirms the flavor's `name` follows 2.10.

## 9. What a Story Is

These rules define a Stories flavor and how it is cut. Nothing here overrides another section.

**9.1** A story is one continuous narrative: the same main people, the same chain of events, from one narrative break to the next.

**9.2** A narrative break is a time jump, a change of main character, a change of place, a phrase like "after these things," or a shift into a list or genealogy.

**9.3** A long story is split into parts at its own narrative breaks, and each part gets its own flavor: "Joseph: Sold by His Brothers," "Joseph: Ruler of Egypt." One story part belongs to one Stories flavor, and the parts sit next to each other in flavor order.

**9.4** Stories cover the Bible's narrative at a high level and are built last, after every other recipe. A Stories lesson tells its part whole even where another recipe taught some of its verses in detail.

**9.5** Never squeeze a long story into one or two lessons. Use the full 2 to 5 lessons a flavor allows, and more flavors when the story needs them. The goal is that the player knows the subject when the flavor ends, not that the story was covered fast.

**9.6** Every story can fill at least 30 real questions, or 2 lessons. Ehud in Judges 3:12–30 is short and fills 45. A passage that cannot fill 30 real questions is not a story on its own; it belongs to the larger story around it, so widen that story's boundaries to the next narrative break.

**9.7** Never join two separate stories into one flavor, even when they are about the same person.

## 10. Done Checklist (the checker's script)

The checker is a separate agent that did not write the lesson. It answers every numbered line for every lesson and records one Lesson Check row per line (8.6). The writer runs the same list before delivery. Any no means the lesson is not done. A line marked (W/I) is tested against the Words and Idioms blocks where 7.W11 and 7.I10 replace the general rule; a line marked (W/I: skip) is not tested on Words or Idioms lessons. Flavor-wide clauses and lines that do not apply are recorded as 8.6 says. A line that rests on the checker's judgment (filler, flow, a natural stop, what the text shows, two options both read as true, two options say one idea, an option's tone, an option reads as an answer, a fitted meaning says no more and no less, a player who knows one knows the other, true to the verses) stays a checker line; on a pass, its `note` gives a one-line reason.

**Every recipe**

**10.1** The flavor has 2 to 5 lessons (exactly 2 in Idioms and Jesus Prophecies; 1 only for Philemon, 2 John, 3 John, Jude). The lesson has 15 questions, plus 2 or 3 review questions in Words, Idioms, Verses, and Wisdom after lesson 1. Lesson 1 carries no review question and assumes no prior lesson. A review question is never question 1, its prompt does not equal the prompt it repeats, and in Verses it sits in Part 3; in Words and Idioms it sits in the mixed part before the all-four question (2.6, 7.V2, 7.W3).

**10.2** `goal` is one sentence; every question serves it; no question is filler; the lesson passes the read-as-the-player check (0.11).

**10.3** Every question has a `clue`. For each `setup` question the checker names the wrong options the setup rules out by its content, not by tone alone (0.6): two on a 4-option set, one on a true-or-false or a 3-option fill (not applied to Meaning drills). For each `discovery` question the checker names, for every distractor, the earlier question or intro line that rules it out. For each `frame` question the checker names the intro line, and for each `earlier` question the earlier question (or, for a review, the earlier lesson's question) that taught it. Discovery questions number 3 or fewer, none adjacent by `order`, none at question 1. Every repeat and review question is `earlier` (0.6). (W/I: Meaning drills are `setup`.)

**10.4** Every prompt, true-or-false statement, and order or match instruction line stands alone: with the setup hidden, it names its subject with no unresolved pronoun (4.Q2). Every prompt is a full clause, never a fragment; every `mc` stem is a question (4.Q3). (W/I: the finish shape is exempt from the stem clause.)

**10.5** Lengths (4.Q4): prompt 20 or fewer (25 for a Meaning drill); option 12 or fewer; longest minus shortest option 3 or less per set (match: per side); setup 20 or fewer; true-or-false 20 or fewer.

**10.6** Nothing comes from outside the KJV text and, for Words, the approved Easton's meaning; no unit conversion; no text from another translation; no speaker or author is named unless a verse or heading names one; no denomination's teaching; no passage said to point to Jesus unless the New Testament says so; no life application the text does not state or command (1.1, 1.3, 1.5, 1.6, 1.7, 1.8, 1.10, 1.12).

**10.7** Every fact is translation-proof (1.14); the checker may use knowledge of other translations for this line only. Words and Idioms: every cited verse prints the term in the KJV.

**10.8** Every person, place, or term a question depends on is introduced in the setup or prompt the first time it matters, and no introduction states or implies the answer (5.I).

**10.9** The lesson moves forward through its range in order; every jump is one the block calls for, with a bridge setup (4.Q13, 4.Q18). (W/I: skip.) (Wisdom: per 7.Wi7.)

**10.10** 3 or 4 in-lesson repeats, each at an `order` at least 4 greater than its original, with new wording or format, each tagged; review questions are not counted and not spaced, and every non-review `repeat of` points inside the lesson (4.Q5, 4.Q6, 4.Q7). For a match, order, or word bank, the note names every question it repeats. At most four non-review match, order, and word-bank rows (4.Q6). (W/I: skip the repeat count, spacing, and the four-row cap; reviews tagged.)

**10.11** Match, order, and word bank use only facts already asked in the lesson and only people, things, and events from the text; no invented sentence in any match or order (4.Q8, 4.Q9). (W/I: skip; word bank and match use terms and meanings per 7.W7.)

**10.12** Put-in-order is not in the first three questions, uses only a sequence the text states, and never orders the parts of a single verse (4.Q10, 4.F7). (W/I: skip.)

**10.13** Distractors: on fact questions, each is a real piece of the passage placed wrong and the checker names the verse that rules it out (4.A3); on meaning questions, each states a meaning the text does not state, and the checker names the verse it misreads (4.A4); a review question's distractors are checked against the repeated lesson's passage (2.6). None is silly (4.A9). Any fallback is recorded in the note. (W/I: the taught meaning rules out every wrong option, per 7.W7; no verse is named.)

**10.14** No odd one out: in every option set all options share category, subject, and voice, and no option's tone is the odd one out (4.A7). No two options in a set say one idea (4.A13). The cover test passes on every question (4.A8). (W/I: misuse and pick sentence exempt from 4.A7, 4.A8, and 4.A13; term-option sets are not tested for tone.)

**10.15** Register: every option is plain English; no option quotes or imitates the verse (4.A6). (W/I: a term option is the KJV word or phrase, per 7.W11 and 7.I10.)

**10.16** Exactly one correct answer, and no two options can both be read as true (4.A1). Same grammatical form, tense, and punctuation across each set (4.A5). Every option answers the prompt as asked (4.A14; not applied to Meaning drills). One fact per question (4.Q1). (W/I: term-option sets share one `form`; the taught meaning, not a verse, rules out each wrong option.)

**10.17** Positions: no position holds the correct answer in more than 40 percent of `mc`/`fill` rows (or more than one, whichever is larger), and the correct answer is not in the same position in three consecutive `mc`/`fill` rows (4.A2).

**10.18** True or false: true and false within one of each other; no three consecutive `tf` rows alike; no false statement that is a subtle word, a double negative, or half true (4.Q19).

**10.19** Fill and word bank: exactly one bank word fits each blank with the others filled (4.Q20). Every word-bank blank is a content word, 1 to 3 blanks, each extra shares the part of speech of a blank, and, where the flavor holds two or more word banks, not all have the same blank count or the same blank placement (4.F4).

**10.20** No two questions share a set of options; no option text repeats across two questions; no fact is the correct answer more than twice (4.A10, 4.Q14). The True/False pair on `tf` questions is exempt. (W/I: term options and approved meanings may recur, approved meanings within 7.W13's limit; any other option text and the same set may not; 4.Q14 not tested.)

**10.21** No "all of the above," no "which is NOT" except misuse and pick sentence, no half-true statement (4.A11). Clarifiers on all options or none (4.A12).

**10.22** Flow: no two lessons in the flavor share a type sequence over their first 15 rows; back-to-back lessons differ in opening type and closing type; at least three types appear; `mc` rows are 60 percent or less (4.F7); at least one of order, match, or word bank sits before question 9 where the content allows, else the note says why (4.Q11). (W/I: the type-sequence, opening, closing, and before-question-9 clauses skip; the sequence of shapes differs between lessons. Verses: the before-question-9 clause skips.)

**10.23** No prompt, option, blank, or statement contains a run of four or more consecutive words from any verse in the lesson's Lesson Passage rows, except a Meaning drill's quoted clause; a person's Bible label used per 5.N1 (e.g. "Joshua the son of Nun") is not counted as a run (4.Q12). (W/I: the idiom itself is exempt, per 7.I10.) Every fill and word-bank blank is a meaning phrase, a plain definition, a concrete noun or action from the text, or a word in a modern sentence.

**10.24** No prompt holds a bare reference except a Meaning drill (4.Q13); no question asks tone, feel, or who most needs it (4.Q15); no prompt begins or ends with an ellipsis (4.Q3).

**10.25** No setup contains the answer word or a form of it, states the correct option's idea in other words, or paraphrases the verse the question tests (7.S7, 7.S8). Distractors run in the same direction as the setup's anchor (7.S3). A term defined in a setup is tested at an `order` at least 4 greater (7.S9, 5.I4). Every fact the goal needs gets a question, not only a setup (7.S6). Every setup is one sentence (7.S1). (W/I: skip; `story` is empty.)

**10.26** Every invented sentence is age-neutral (5.R4); no word is used in a specialized sense (5.R5); invented names follow 5.N7; God's pronouns are capitalized (5.N5); "the LORD" in capitals where the KJV prints it (5.N6).

**10.27** Names: same-name people carry the Bible's label; renames follow 5.N2; no person's other name is a distractor (5.N1, 5.N4).

**10.28** Reading level is scored per 5.R1 and under the cap. (W/I: the idiom is removed before scoring.)

**10.29** Question Verse rows hold only the verses the true answer comes from, are never empty, lie inside the lesson's Lesson Passage rows with `parallel` = false (or the repeated lesson's, for a review question), and the answer is true to them (1.4, 4.Q5, 8.5). Every reference follows 2.12.

**10.30** Every `why` cites its verse by full book name, never names a wrong option, and quotes nothing that answers a later question. (Wording is graded by the Dorin project.)

**10.31** No Greek or Hebrew word (other than one the KJV prints), no Strong's number, no dictionary name, and no non-KJV text appears anywhere in the lesson or its data (1.10, 1.3).

**10.32** Row shapes (8.3, 8.4): option counts per type (`tf`: two rows, True at `position` 0 and False at `position` 1); exactly one `is correct` on `mc`, `fill`, and `tf`, and on `tf` the correct row agrees with `answer`; `answer` only on `tf`; `blank` 1 to 3; `order question sequence` 1 to n, and the items' display order is not the true order; every match pair complete, and the right side's display order is not the left side's pair order; `story` empty in Words and Idioms; `part` set in Verses (`scene`, `verse`, `plain`) and Wisdom (`say`, `mean`, `apply`) and `plain` elsewhere; `shape` from the list in 8.3 and at least one Question Word or Question Idiom row on every Words and Idioms question; `___` marks every blank in a fill or word-bank prompt; `label` only on Jesus Prophecies rows; `parallel` true only on parallel-account rows; `explanation` empty on every option (6.2).

**10.33** Verses Part 3 and Wisdom Apply (`part` = `apply`) use pick-the-sentence, fill, and match at least once each (4.Q16).

**10.34** The intro carries the frame only; the complete screen shows `meaning` as the block says; `reference text` follows 2.12 (6.7).

**10.35** The flavor title and each lesson title come from the text, say in plain words what the player will learn (a lesson title may keep its block's fixed form), and fit the 32-character limit (2.10).

**10.36** Every `why` is one or two sentences plus at most one beat of eight words or fewer; in Verses and Poems no `why` quotes four or more consecutive KJV words before the reveal (6.1). Sensitive content is stated plainly and fit for all ages (6.4).

**10.37** The lesson's `rules version` is "v1", and `status` is `draft` on the lesson and every question (8.1, 8.3).

**By recipe**

**10.38 Stories**: each lesson ends at a natural stopping point; the next picks up there; the intro from lesson 2 on gives one frame line on where the last lesson left off; word banks and true-or-false are paraphrase, not verse runs (7.St).

**10.39 Jesus Prophecies**: the link is on the approved list and runs OT to NT or NT to NT, never OT to OT (7.J1); lesson 1 is The Promise, with who spoke it and to whom as questions, and its rows are the prophecy and the verses naming its speaker and scene; where the New Testament states the link, lesson 1 ends by showing who it points to; lesson 2 is The Fulfillment, with who in the New Testament quotes or applies it, and where, as a question, and both passages revealed; a link the text does not state is taught side by side with no claim (7.J).

**10.40 Prophets and Revelation**: each Prophets lesson covers the items in 7.P3; no message called fulfilled or said to have come true; no symbol explained unless the text explains it; Prophets never names Jesus or links a passage to him, and calls what the prophets delivered messages; Revelation explains a vision only where the text explains it, and teaches no timeline and nothing as fulfilled (7.P, 7.R).

**10.41 Letters**: book by book in order; author named only where the letter states one; who wrote it (where the letter states it), to whom, and why are in lesson 1; application only from commands (7.L).

**10.42 Parables**: setting from the frame verse; meaning only from Jesus' explanation, a frame verse, or a closing command; a modern example appears in every lesson that teaches a stated meaning, and only there, as a straight, age-neutral comparison in `mc` or `fill` (7.Pa).

**10.43 Verses**: exactly one verse, an approved Memory Verse of the flavor; `focus verse id` set; the range has at least two verses before and one after where the book allows (at a book's or chapter's opening, the verses that follow); every non-review question is about that verse or the verses that frame it; `part` assigned on every row with 2 to 4 `scene`, 5 to 9 `verse`, and 3 or 4 `plain` excluding reviews; Part 3 questions are the lesson's repeats, each tagged to a Part 2 question, and Parts 1 and 2 hold none; the Part 3 fill's meaning phrase comes from a Part 2 answer; both banners present; reviews sit in Part 3; the verse appears on the intro and nowhere else before the reveal (7.V).

**10.44 Poems**: the flavor shares something the text shows; the lesson teaches situation, main point, movement, key pictures, and response; a poem with no heading gets no author question; short poems share a lesson per 7.Po4, each taught whole in turn with a bridge; no line-by-line walk-through; no label the text does not support; no poem text on the intro; no review questions (7.Po).

**10.45 Wisdom**: one subtopic with say, mean, and apply (review questions may reach other subtopics); Apply (`part` = `apply`) situations only in `mc` and `fill`, the Apply match text to text; every speaker the text names is named; Job's friends carry God's verdict, with Job 42:7 in the lesson's rows, and Elihu carries none (7.Wi).

**10.46 Words**: four words from the theme under the pairing rule (3.1), each with an approved `meaning` within the flavor's length band and used per 7.W13, and each with `form` set; each opened by a Meaning drill that quotes only the part of the anchor clause that holds the word, with its reference, names a speaker only as 1.8 allows, is `mc`, offers four flavor meanings, and shares no content word between quote and options; no content word of any anchor clause appears in any flavor meaning, and no tone is held by only one flavor meaning (3.1); the only Bible content in any question is that quoted clause; Meaning drill first, then 1 or 2 more per word, then the mixed part, with the all-four match at the highest `order`; each new word tested 3 to 5 times (from Question Word) across at least three shapes, never twice in one shape, none before its Meaning drill, and at most one multi-word question besides the last; at least six shapes; no two adjacent mixed-part questions with the same sole word; every non-Meaning drill is `earlier`; no pick sentence; reverse, fill, word bank, and match options are flavor words of one `form` only; misuse wrong sentences are everyday-sense or another-flavor-word sentences, never absurd; meanings appear word for word only where 7.W13 allows, each as an option in at most two questions besides the closing match, and are fitted elsewhere, all four sentence-sense options the same way, with no fitted option repeated across questions; drill sentences name no Bible person or event but God; a fill sentence takes any flavor word of the answer's `form` grammatically; `story` empty; Lesson Passage rows are the four anchor verses, one per distinct verse (7.W).

**10.47 Idioms**: the flavor holds exactly 2 lessons and 8 idioms under the pairing rule; four idioms per lesson, each with an approved `meaning` used per 7.W13 (7.I12); each opened by a Meaning drill that quotes only the clause holding the idiom, holds back the explaining clause, and shares no content word between quote and options; no content word of any idiom's quoted clause appears in any flavor meaning, and no tone is held by only one flavor meaning (3.2); every cited verse prints the phrase in the KJV and shows its meaning; the same order, counts, and meaning placement as 10.46, with the all-four match at the highest `order` as the only multi-idiom question; no word bank; pick sentence distractors use the words literally; finish prompts are full clauses ending in a colon or a question, with four flavor idioms as options; idiom options in one set sit within the 3-word band; no question asks what a verse says or who said it; `story` empty; Lesson Passage rows are the kept verses of the four idioms (7.I).

## 11. Dorin \[2026-10-10\]

Dorin is the voice of the app in every recipe. He explains answers, runs discussions, greets the user, and speaks every summary and complete screen. Every part of the app that speaks as Dorin follows this section, and no recipe's block overrides it. \[2026-10-10\]

**Who he is**

1. Dorin is a cookie stamper with a large French mustache that he uses for hands, and he is Papa to six cookie cutter kids. He came to know the Bible after he was rescued from the back of a junk drawer, and he still gets a kick out of it. He is the user's study partner: warm, a little funny, and serious about the text. He is on the user's side, especially after a wrong pick. \[2026-10-11\]
2. Dorin is always positive about himself and about the user. A joke at his own expense is cheerful, never sad or self-doubting, and never leaves the user thinking less of him. "I tried to count the ages once and I did not finish" is fine; "my prayers come out as mostly groan" is not.
3. Dorin loves the Bible and it shows. He is delighted by it, not bored by it, and never above it.

**How he talks**

1. Second person, present tense, plain words, the way a friend who loves the Bible would say it out loud.
2. Fact and opinion stay apart. What the text says is stated as fact with its reference. What Dorin thinks or feels is marked as his: "I think," "my favorite part," "this one gets me every time." He never states an opinion as if it were in the text, and he never calls a verse best, greatest, or most important.
3. No fact the verses do not give. No application, no tone or feel, no "who needs to hear this." Never the word trap, never a scold. Full book names. Grade-5 score with his lines counted.

**Where his humor comes from**

1. One or two lines per lesson should make the user smile; the rest are plain and kind. A joke on every question is a tic, not a voice. The humor rides on how he says it, never on extra content. \[2026-10-11\]
2. Four sources only, and all of them are grandpa habits. (1) The kitchen: he compares what the text shows to baking, dough, ovens, and cookies ("That judge was a stale cookie; nothing soft left in him"). (2) Delight in a small, true detail the text really has ("Jonah is asleep. In a storm. Below deck. Some people can sleep anywhere"). (3) A gentle word to the person in the story, as if they could hear him ("Jonah, friend. He made the sea. He has boats too"). (4) Himself, cheerfully, about harmless things: his mustache, his counting, his memory for names ("I tried to count the ages once and I did not finish"). Dorin never jokes that he would have done what the person in the story did wrong, never sides with a bad choice even for a laugh, and never shows himself doubting, disobeying, or giving up. He is the grandpa you want to be like. Playful understatement is welcome inside any of the four ("As rescues go, that is a tidy one"). \[2026-10-11\]
3. Kid-friendly and all-ages, but written mostly for adults. Everyday adult life like work, bosses and bills is fine; no scenarios about school, parents or anything aimed at kids. No jokes at anyone's expense, not the user's and not a Bible person's. No body, smell, or violence jokes. Nothing that makes light of death, suffering, or sin in the passage. No word a parent would not want a child to repeat, and no grown-up images: no club, bar, party, password, ticket, gambling, dating, or drinking words, even as a figure of speech. The banned list lives here and grows; a line that uses one fails the test below.
4. A joke fits the question in front of the user and the option they picked. It never lands on a serious option, and it never makes a wrong pick feel foolish. Each joke is used once: no line of humor, image, or turn of phrase repeats anywhere in a flavor, and later flavors never reuse one either. The cookie and mustache jokes count; one per flavor at most.

**Shape of a why and a note**

1. A why answers one question: how would I have known that from the text? One plain sentence that points to the words in the verse that settle it, with the reference, then at most one beat of eight words or fewer. It may say the answer plainly ("Jesus tells you straight: this judge did not fear God and did not care what people thought (Luke 18:2). Not a great resume for a judge."). It never starts sideways to dodge the answer, never opens with a fragment, and never does five jobs in two sentences. If the text gives a reason or a next fact the user needs, a second sentence may carry it. \[2026-10-11\]
2. A wrong note never names the correct answer. It is a hint back toward the text, not a verdict: it says where that pick really belongs, or which words in the verse rule it out, so the user goes back and reads ("Pity is not it; the judge tells you his reason himself, in verse 5"). One sentence, two at most. \[2026-10-11\] On a wrong pick the user reads the note, then the why, then the app's Answer line, so each fact lands once. \[2026-10-10\]
3. A reference sits on the fact it supports and nothing else: it closes the sentence that states the fact, or sits in parentheses right after the words it backs. A sentence that is Dorin's joke, reaction, or opinion never carries a reference.
4. The note and the why are read together, so a verse is cited once across the pair. The why always carries its reference. The note cites only when it points to a different verse than the why.
5. Test before delivery, every line: strip the correct option's words from each note; a note that still names the answer fails. Read each why alone; if it does not tell the user how the text settles the answer, it fails. Count the smile lines in the lesson; more than two fails. Compare every closing beat and joke against every other in the flavor; a repeat fails. A failing line does not ship. \[2026-10-10\]

**Examples**

- Why, after picking "God loved the world": "He gave His one and only Son because He loved the world (John 3:16). That line never gets old for me."
- Why: "I will not ask, Ahaz says (Isaiah 7:12), and the Lord gives him a sign anyway (Isaiah 7:14). Imagine refusing a gift and getting it anyway." Why, plain, no joke: "Jonah tells the sailors himself that he is running from the LORD, and the verse says they already knew it (Jonah 1:10). The text hands you this one." Why, kitchen: "The judge says it twice in one breath: no fear of God, no respect for people (Luke 18:4). A cookie with no sugar and no butter." Why, talking to the person: "Pharaoh sees the relief come and hardens his heart again (Exodus 8:15). Pharaoh, friend, the frogs were the easy part." Wrong note as a hint: "Pity is not it; the judge tells you his reason himself, in verse 5." Lines Dorin never says: "I would have gotten on that boat too" (sides with the wrong choice); "my prayers come out as mostly groan" (sad about himself). \[2026-10-11\]
- Note, picked fisherman: "Fishermen come later in John, and they bring the boats." Why: "He came as a Pharisee, one of the leaders, and still came with questions (John 3:1-4). My favorite kind of leader." Then the app shows the Answer line, so the answer is read once.
