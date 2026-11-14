// The free script check for the Prep walkthrough (models.md "Kimi + script"): the rules in prep-walkthrough.md and
// papa-dorin.md that have one right answer. It runs before every Kimi check. Findings come out the way the checker
// writes them (checker.md "Output"), each with the rule's link and exact words, so the fixer gets one list.
//
//   node scripts/dough-maker/run/check-prep.mjs <prep.json> --passage <id> [--out findings.json]
//   import { checkPrep } from './check-prep.mjs'      checkPrep(output, passage)   passage: an entry of passages.json
//
// What it checks:
//   - the shape: "passage", stops numbered from 1, cards numbered from 1 in each stop, every field there
//   - every "verses" is a real BSB reference; the stops run through the passage in order with no gap or overlap
//   - an included parable or sermon has a stop of its own
//   - no more than 20 cards in a stop, and at least as many choice cards as story cards
//   - the answers: how many, how many are right, True and False, the blanks, single words for two blanks, no commas
//     or periods, a blank is never a small word like "and"
//   - words in quotation marks match the BSB exactly, when they are clearly Bible words
//   - no em or en dashes outside quotations
//   - Papa Dorin never calls the baker "my baker", "kids" or "sweetie"
//   - no food from outside the cookie list, unless it is in the passage
// The judgment calls (voice, giving answers away, informed guesses, bite-sized cards) are Kimi's.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { doc } from './docs.mjs';
import { verses, verseIndex, parseRefs, span, passageText } from './bsb.mjs';

// Each rule's exact words. The section link is worked out from the doc, and a reworded rule fails here instead of
// being quoted wrong.
const RULES = {
  output: ['prep-walkthrough.md', 'A JSON file for the passage. Card numbers start at 1 in each stop. References use the book names in the BSB text, with a hyphen for a range, like Mark 2:1-3 or Mark 2:23-3:6.'],
  kind: ['prep-walkthrough.md', 'kind: "story" or "choice"'],
  type: ['prep-walkthrough.md', 'type (choice cards only): "multiple_choice", "true_false" or "fill_blank"'],
  cite: ['prep-walkthrough.md', 'verses: what the card cites. On a choice card, it is only the verses of the right answer.'],
  stops: ['prep-walkthrough.md', 'Each stop covers the next stretch of the passage, in order, and gives its verse range.'],
  included: ['prep-walkthrough.md', 'An included parable or sermon (see passages.md) gets a stop of its own.'],
  cards: ['prep-walkthrough.md', 'About 18 cards per stop, story cards and choice cards together. No more than 20.'],
  choiceMore: ['prep-walkthrough.md', 'Choice cards are equal to or more than story cards in every stop.'],
  answers: ['prep-walkthrough.md', 'Multiple choice has 3 answers, true or false has 2, and fill in the blank has 3 for one blank and 5 single words for two blanks.'],
  blanks: ['prep-walkthrough.md', 'Fill in the blank: the question has a blank for 1 or 2 words. One blank has 3 answers. Two blanks have 5 single words to choose from.'],
  blankMark: ['prep-walkthrough.md', 'Fill in the blank: each blank in the question is ___. With two blanks, each right answer gives the blank it fills.'],
  blankWord: ['prep-walkthrough.md', 'A blank is a word that matters to the meaning, never a word like "or," "and" or "he."'],
  punctuation: ['prep-walkthrough.md', 'No commas or periods in the answers.'],
  dashes: ['prep-walkthrough.md', 'No em dashes or en dashes to make a sentence longer.'],
  quotes: ['prep-walkthrough.md', 'Quotes: Quotation marks around Bible words mean the exact BSB wording, punctuation included.'],
  address: ['papa-dorin.md', 'He calls the baker "baker" or "friend," and talks to one baker at a time. Never "my baker," "kids" or "sweetie."'],
  food: ['papa-dorin.md', 'In jokes and comparisons, cookies are the only food he mentions.'],
};

const plain = (md) => md.replace(/\*\*|`/g, '');
// checker.md "Giving the rule": the section heading in lowercase, spaces as hyphens, punctuation left out
const slug = (h) => h.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ /g, '-');
function rule(key) {
  const [file, text] = RULES[key];
  const md = plain(doc(file));
  const at = md.indexOf(text);
  if (at < 0) throw new Error(`check-prep.mjs quotes a rule ${file} no longer has: "${text}"`);
  const heading = [...md.slice(0, at).matchAll(/^#{2,3} (.+)$/gm)].at(-1)?.[1] ?? '';
  return { link: `${file}#${slug(heading)}`, text };
}

const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'he', 'she', 'it', 'they', 'him', 'her',
  'them', 'his', 'its', 'their', 'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'from', 'is', 'was', 'are', 'were', 'be', 'that', 'this', 'as', 'if', 'not']);
// Foods that aren't cookies (papa-dorin.md "Food rule"). One in the passage itself, like fish in Jonah, is fine.
const FOODS = ['pizza', 'cake', 'cupcake', 'pie', 'burger', 'hamburger', 'cheeseburger', 'hot dog', 'sandwich', 'taco',
  'fries', 'candy', 'ice cream', 'donut', 'doughnut', 'pancake', 'waffle', 'muffin', 'brownie', 'popcorn', 'spaghetti',
  'pasta', 'noodle', 'soup', 'salad', 'cheese', 'bacon', 'egg', 'steak', 'chicken', 'sushi', 'cereal', 'toast', 'pretzel',
  'bagel', 'milkshake', 'soda', 'lemonade', 'banana', 'apple', 'orange', 'potato', 'chips', 'lollipop', 'jelly bean',
  'marshmallow', 'pudding', 'yogurt', 'burrito', 'nacho', 'peanut butter', 'jam', 'butter', 'cookie dough ice cream'];
const COOKIE_WORDS = ['chocolate chips', 'butterscotch bits', 'strawberries', 'raisins', 'crushed peppermint', 'sprinkles'];

const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).toLowerCase().match(/[a-z']+/g) ?? [];

// The quotations in a line: “…” pairs, or "…" pairs when the line uses straight quotes
function quotations(text) {
  const out = [];
  for (const m of text.matchAll(/“([^”]*)”/g)) out.push(m[1]);
  for (const m of text.replace(/“[^”]*”/g, '').matchAll(/"([^"]*)"/g)) out.push(m[1]);
  return out;
}
const withoutQuotes = (text) => text.replace(/“[^”]*”/g, '').replace(/"[^"]*"/g, '');

export function checkPrep(out, passage, { previous = null } = {}) {
  const findings = [];
  const add = (key, where, problem) => findings.push({ covered: true, where, problem, rule: rule(key) });
  const want = span(passage.start, passage.end);
  if (!out || typeof out !== 'object' || Array.isArray(out) || !Array.isArray(out.stops) || !out.stops.length) {
    add('output', null, 'The output is not a JSON object with a list of stops.');
    return { step: 'prep', findings };
  }
  if (out.passage !== want) add('output', null, `"passage" says ${JSON.stringify(out.passage)}, but this passage is ${want}.`);

  const all = verses();
  const first = verseIndex(passage.start), last = verseIndex(passage.end);
  // The next verse the BSB has, skipping the ones it leaves out
  const next = (i) => { do i++; while (i < all.length && all[i].leftOut); return i; };
  const bible = passageText(passage.start, passage.end) + (previous ? passageText(previous.start, previous.end) : '');
  const bibleWords = new Set(words(bible));
  const bibleNorm = norm(bible.replace(/^.*? \d+:\d+ /gm, ''));
  const quoteText = norm(all.filter((v, i) => i >= first && i <= last && !v.leftOut).map((v) => v.text).join(' '));

  // The text Papa Dorin writes on a card: story text, the question and the answers
  const lines = (c) => [c.text, c.question, ...(Array.isArray(c.answers) ? c.answers.map((a) => a?.text) : [])]
    .filter((s) => typeof s === 'string');

  let expect = first;   // where the next stop should start
  out.stops.forEach((s, si) => {
    const sw = { stop: s?.stop ?? si + 1 };
    if (s?.stop !== si + 1) add('output', sw, `Stop ${si + 1} in the list has the number ${JSON.stringify(s?.stop)}.`);
    const r = parseRefs(s?.verses);
    if (!r || r.length !== 1) add('stops', sw, `Stop ${si + 1} gives ${JSON.stringify(s?.verses)} as its verses, which is not one BSB range.`);
    else {
      const [a, b] = r[0];
      if (a !== expect) add('stops', sw, `Stop ${si + 1} starts at ${all[a].ref}, but the passage's next stretch starts at ${all[expect]?.ref ?? 'nothing (the passage is already covered)'}.`);
      expect = next(b);
    }
    const cards = Array.isArray(s?.cards) ? s.cards : [];
    if (!cards.length) add('output', sw, `Stop ${si + 1} has no cards.`);
    if (cards.length > 20) add('cards', sw, `Stop ${si + 1} has ${cards.length} cards.`);
    const story = cards.filter((c) => c?.kind === 'story').length, choice = cards.filter((c) => c?.kind === 'choice').length;
    if (choice < story) add('choiceMore', sw, `Stop ${si + 1} has ${story} story cards and only ${choice} choice cards.`);

    cards.forEach((c, ci) => {
      const where = { stop: sw.stop, card: c?.card ?? ci + 1 }, who = `Stop ${sw.stop}, card ${ci + 1}`;
      if (!c || typeof c !== 'object') return add('output', where, `${who} is not a card with fields.`);
      if (c.card !== ci + 1) add('output', where, `${who} has the number ${JSON.stringify(c.card)}.`);
      if (!['story', 'choice'].includes(c.kind)) add('kind', where, `${who} has the kind ${JSON.stringify(c.kind)}.`);
      if (!parseRefs(c.verses)) add('cite', where, `${who} cites ${JSON.stringify(c.verses)}, which is not a BSB reference.`);

      if (c.kind === 'story') {
        if (typeof c.text !== 'string' || !c.text.trim()) add('output', where, `${who} is a story card with no text.`);
      } else if (c.kind === 'choice') {
        checkChoice(c, where, who);
      }

      for (const line of lines(c)) {
        if (/[–—]/.test(withoutQuotes(line))) add('dashes', where, `${who} has a dash outside a quotation: "${line}"`);
        const bad = line.match(/\b(my baker|kids|sweetie)\b/i);
        if (bad) add('address', where, `${who} says "${bad[1]}".`);
        const outside = ` ${withoutQuotes(line).toLowerCase().replace(new RegExp(COOKIE_WORDS.join('|'), 'g'), ' ')} `;
        for (const f of FOODS) {
          const re = new RegExp(`[^a-z]${f}(e?s)?[^a-z]`);
          const inBible = f.split(' ').every((w) => bibleWords.has(w) || bibleWords.has(w + 's') || bibleWords.has(w + 'es'));
          if (re.test(outside) && !inBible) { add('food', where, `${who} mentions ${f}, a food that isn't a cookie and isn't in the passage.`); break; }
        }
        for (const q of quotations(line)) checkQuote(q, where, who);
      }
    });
  });
  if (expect <= last) add('stops', null, `The stops end before the passage does: ${all[expect].ref} to ${passage.end} are in no stop.`);

  for (const inc of passage.included ?? []) {
    const has = out.stops.some((s) => { const r = parseRefs(s?.verses); return r?.length === 1 && all[r[0][0]].ref === inc.start && all[r[0][1]].ref === inc.end; });
    if (!has) add('included', null, `The included ${inc.kind} ${span(inc.start, inc.end)} doesn't have a stop of its own covering exactly those verses.`);
  }
  return { step: 'prep', findings };

  function checkChoice(c, where, who) {
    if (!['multiple_choice', 'true_false', 'fill_blank'].includes(c.type)) return add('type', where, `${who} has the type ${JSON.stringify(c.type)}.`);
    if (typeof c.question !== 'string' || !c.question.trim()) add('output', where, `${who} has no question.`);
    const ans = Array.isArray(c.answers) ? c.answers : [];
    const right = ans.filter((a) => a?.correct === true);
    for (const a of ans) {
      if (typeof a?.text !== 'string' || !a.text.trim()) add('output', where, `${who} has an answer with no text.`);
      else if (/[,.]/.test(a.text)) add('punctuation', where, `${who} has the answer "${a.text}".`);
    }
    if (c.type === 'multiple_choice') {
      if (ans.length !== 3 || right.length !== 1) add('answers', where, `${who} is multiple choice with ${ans.length} answers and ${right.length} right.`);
    } else if (c.type === 'true_false') {
      const texts = ans.map((a) => a?.text).sort().join(',');
      if (ans.length !== 2 || texts !== 'False,True' || right.length !== 1) add('answers', where, `${who} is true or false, but its answers aren't exactly "True" and "False" with one right.`);
    } else {
      const blanks = (String(c.question ?? '').match(/_{3,}/g) ?? []).length;
      if (blanks === 1) {
        if (ans.length !== 3 || right.length !== 1) add('blanks', where, `${who} has one blank, ${ans.length} answers and ${right.length} right.`);
      } else if (blanks === 2) {
        if (ans.length !== 5 || right.length !== 2) add('blanks', where, `${who} has two blanks, ${ans.length} answers and ${right.length} right.`);
        else if (right.map((a) => a.blank).sort().join(',') !== '1,2') add('blankMark', where, `${who} has two blanks, but its right answers don't say which blank each one fills (blank 1 and blank 2).`);
        for (const a of ans) if (typeof a?.text === 'string' && /\s/.test(a.text.trim())) add('blanks', where, `${who} has two blanks, so every answer is a single word, but one is "${a.text}".`);
      } else add('blankMark', where, `${who} is fill in the blank with ${blanks} blanks marked ___ in the question.`);
      for (const a of right) if (SMALL_WORDS.has(String(a?.text ?? '').trim().toLowerCase())) add('blankWord', where, `${who} blanks out "${a.text}".`);
    }
  }

  // Words in quotation marks must be the exact BSB wording. Papa Dorin's own made-up lines can use quotation marks
  // too, so a quotation is checked only when most of its words are in the passage: then it is meant as Bible words.
  function checkQuote(q, where, who) {
    for (const piece of q.split(/…|\.\.\./).map((p) => norm(p).replace(/^[\s,;:.!?'"]+|[\s,;:]+$/g, '')).filter(Boolean)) {
      const w = words(piece);
      if (w.length < 3) continue;
      if (bibleNorm.includes(piece) || quoteText.includes(piece)) continue;
      const shared = w.filter((x) => bibleWords.has(x)).length / w.length;
      if (shared >= 0.75) add('quotes', where, `${who} quotes "${piece}", which isn't the exact BSB wording.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const file = process.argv[2];
  const list = JSON.parse(fs.readFileSync(new URL('../output/passages.json', import.meta.url), 'utf8'));
  const p = list.find((x) => x.id === Number(opt('--passage')));
  if (!file || !p) { console.error('Usage: check-prep.mjs <prep.json> --passage <id>'); process.exit(1); }
  const result = checkPrep(JSON.parse(fs.readFileSync(file, 'utf8')), p, { previous: list.find((x) => x.id === p.id - 1) });
  const text = JSON.stringify(result, null, 2);
  if (opt('--out')) fs.writeFileSync(opt('--out'), text + '\n'); else console.log(text);
  console.error(result.findings.length ? `${result.findings.length} findings` : 'No findings');
}
