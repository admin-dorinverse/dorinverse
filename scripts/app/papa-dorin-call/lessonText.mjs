// What Papa Dorin reads from the lessons on a call: a lesson choice card's written explanation (read aloud word
// for word), and a lesson's trivia questions with their answers, verse labels and BSB verse words. Everything
// comes from the database through the public reader; nothing here is typed in by hand.

import { readRows } from './publicDatabase.mjs';

/** The translation the lessons quote. */
const TRANSLATION = 'BSB';

/** A whole number from an RPC payload, or NaN when it isn't one. */
const whole = (value) => (Number.isInteger(value) && value > 0 ? value : NaN);

/**
 * The written explanation of a choice card's right answer, exactly as the lesson has it. A two-blank card has a
 * right answer per blank; their explanations are joined in blank order, each said once.
 */
export async function loadExplanation(passageId, stop, card) {
  const [p, s, c] = [whole(passageId), whole(stop), whole(card)];
  if ([p, s, c].some(Number.isNaN)) return '';
  const rows = await readRows(`card_answer?passage_id=eq.${p}&stop=eq.${s}&card=eq.${c}&correct=is.true&select=blank,explanation&order=blank.nullsfirst`);
  return [...new Set(rows.map((r) => r.explanation.trim()))].join(' ');
}

/** Shuffles a list in place (Fisher-Yates) and returns it. */
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** The BSB words of a trivia question's verses, in Bible order, joined into one passage. */
function verseWords(links) {
  return links
    .map((l) => l.verse)
    .filter((v) => v && v.verse_text?.length)
    .sort((a, b) => a.sequence - b.sequence)
    .map((v) => v.verse_text[0].text)
    .join(' ');
}

/**
 * A lesson's trivia: its title and its questions in order. The lessons store a multiple choice question's right
 * answer first, so those answers are shuffled for each game; True and False keep their order. Each answer gets the
 * position it shows at (1 first).
 */
export async function loadTrivia(passageId) {
  const p = whole(passageId);
  if (Number.isNaN(p)) return null;
  const [passages, questions, links] = await Promise.all([
    readRows(`passage?id=eq.${p}&select=title`),
    readRows(`trivia_question?passage_id=eq.${p}&select=number,type,verses,question,trivia_answer(position,text,correct)&order=number`),
    readRows(`trivia_question_verse?passage_id=eq.${p}&select=number,verse(sequence,verse_text(translation_code,text))&verse.verse_text.translation_code=eq.${TRANSLATION}`),
  ]);
  if (!passages.length || !questions.length) return null;
  return {
    title: passages[0].title,
    questions: questions.map((q) => {
      const inOrder = [...q.trivia_answer].sort((a, b) => a.position - b.position);
      const shown = q.type === 'true_false' ? inOrder : shuffle(inOrder);
      return {
        question: q.question,
        verses: q.verses,
        verseText: verseWords(links.filter((l) => l.number === q.number)),
        answers: shown.map((a, i) => ({ position: i + 1, text: a.text, correct: a.correct })),
      };
    }),
  };
}
