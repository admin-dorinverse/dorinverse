// Load check: can a step's output be loaded? (readme.md "When the run stops")
// Usage: node validate.js <step> <file>
const fs = require("fs");
const [, , step, file] = process.argv;
const errs = [];
let d;
try { d = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log(`LOAD FAIL ${file}: ${e.message}`); process.exit(2); }
const need = (o, k, where) => { if (o == null || !(k in o)) errs.push(`${where}: missing "${k}"`); };
const arr = (o, k, where) => { need(o, k, where); if (o && k in o && !Array.isArray(o[k])) errs.push(`${where}: "${k}" is not a list`); };
switch (step) {
  case "prep":
    need(d, "passage", "root"); arr(d, "stops", "root");
    (d.stops || []).forEach((s, i) => {
      const w = `stop ${i + 1}`; need(s, "stop", w); need(s, "verses", w); arr(s, "cards", w);
      (s.cards || []).forEach((c, j) => {
        const cw = `${w} card ${j + 1}`; need(c, "card", cw); need(c, "kind", cw); need(c, "verses", cw);
        if (c.kind === "story") need(c, "text", cw);
        else if (c.kind === "choice") {
          need(c, "type", cw); need(c, "question", cw); arr(c, "answers", cw);
          if (!["multiple_choice", "true_false", "fill_blank"].includes(c.type)) errs.push(`${cw}: bad type ${c.type}`);
          const n = (c.answers || []).length, right = (c.answers || []).filter(a => a.correct).length;
          const blanks = (c.question || "").split("___").length - 1;
          if (c.type === "multiple_choice" && (n !== 3 || right !== 1)) errs.push(`${cw}: multiple choice needs 3 answers, 1 right (has ${n}, ${right})`);
          if (c.type === "true_false" && (n !== 2 || right !== 1)) errs.push(`${cw}: true or false needs 2 answers, 1 right`);
          if (c.type === "fill_blank") {
            if (blanks === 1 && (n !== 3 || right !== 1)) errs.push(`${cw}: one blank needs 3 answers, 1 right`);
            else if (blanks === 2 && (n !== 5 || right !== 2 || c.answers.filter(a => a.correct && a.blank).length !== 2)) errs.push(`${cw}: two blanks need 5 words, 2 right with "blank"`);
            else if (blanks < 1 || blanks > 2) errs.push(`${cw}: fill in the blank has ${blanks} blanks`);
          }
        } else errs.push(`${cw}: bad kind ${c.kind}`);
      });
    });
    break;
  case "burnt_cookies":
    arr(d, "lines", "root");
    if ((d.lines || []).length !== 5) errs.push(`root: ${(d.lines || []).length} lines, not 5`);
    if ((d.lines || []).filter(l => l.burnt).length !== 2) errs.push(`root: not 2 burnt lines`);
    (d.lines || []).forEach((l, i) => { const w = `line ${i + 1}`; need(l, "line", w); need(l, "verses", w); need(l, "text", w); need(l, "burnt", w); if (l.burnt) arr(l, "wrong_details", w); });
    break;
  case "big_idea":
    arr(d, "lines", "root"); if ((d.lines || []).some(l => typeof l !== "string")) errs.push("root: a line is not text");
    break;
  case "sample_table":
    arr(d, "cookies", "root");
    (d.cookies || []).forEach((c, i) => { const w = `cookie ${i + 1}`; need(c, "type", w); need(c, "stop", w); need(c, "card", w); });
    break;
  case "definitions":
    arr(d, "words", "root");
    (d.words || []).forEach((x, i) => { const w = `word ${i + 1}`; need(x, "word", w); need(x, "meaning", w); arr(x, "sources", w); arr(x, "cards", w); });
    break;
  case "answer_explanations":
    arr(d, "cards", "root");
    (d.cards || []).forEach((c, i) => { const w = `card ${i + 1}`; need(c, "stop", w); need(c, "card", w); arr(c, "explanations", w); });
    break;
  case "check":
    need(d, "step", "root"); arr(d, "findings", "root");
    (d.findings || []).forEach((f, i) => { const w = `finding ${i + 1}`; need(f, "covered", w); need(f, "problem", w); if (f.covered) need(f, "rule", w); else need(f, "question", w); });
    break;
  case "idioms":
    if (!Array.isArray(d)) errs.push("root: not a list");
    break;
  default: console.log("unknown step"); process.exit(3);
}
console.log(errs.length ? `LOAD PROBLEMS ${file}\n` + errs.join("\n") : `OK ${file}`);
process.exitCode = errs.length ? 1 : 0;
