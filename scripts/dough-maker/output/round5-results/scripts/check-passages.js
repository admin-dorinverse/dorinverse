// Script check for passages.md's whole-Bible rules, mainly the skipped-verse rule.
// Usage: node check-passages.js <bsb.txt> <passages.json> [--whole]
// Without --whole it checks each passage on its own (test runs cover only a few passages).
const fs = require("fs");
const [, , bsbPath, passPath, flag] = process.argv;
const lines = fs.readFileSync(bsbPath, "utf8").trim().split("\n");
const order = [], index = new Map();
for (const l of lines) {
  const m = l.match(/^(.+? \d+:\d+) /);
  index.set(m[1], order.length); order.push(m[1]);
}
// Verse numbers the BSB leaves out: gaps in the numbering inside a chapter.
const omitted = [];
for (let i = 1; i < order.length; i++) {
  const [, b1, c1, v1] = order[i - 1].match(/^(.+) (\d+):(\d+)$/);
  const [, b2, c2, v2] = order[i].match(/^(.+) (\d+):(\d+)$/);
  if (b1 === b2 && c1 === c2) for (let v = +v1 + 1; v < +v2; v++) omitted.push(`${b1} ${c1}:${v}`);
}
const omittedSet = new Set(omitted);
const problems = [];
const passages = JSON.parse(fs.readFileSync(passPath, "utf8"));
const covered = new Map();
passages.forEach((p, n) => {
  const name = `#${n + 1} ${p.start}-${p.end}`;
  for (const k of ["start", "end"]) {
    if (omittedSet.has(p[k])) problems.push(`${name}: ${k} ${p[k]} is a verse the BSB leaves out`);
    else if (!index.has(p[k])) problems.push(`${name}: ${k} ${p[k]} is not in the BSB`);
  }
  const a = index.get(p.start), b = index.get(p.end);
  if (a === undefined || b === undefined) return;
  if (a > b) problems.push(`${name}: start comes after end`);
  for (let i = a; i <= b; i++) {
    if (covered.has(i)) problems.push(`${name}: ${order[i]} is also in ${covered.get(i)}`);
    covered.set(i, name);
  }
  for (const inc of p.included || []) {
    const s = index.get(inc.start), e = index.get(inc.end);
    if (s === undefined || e === undefined || s < a || e > b) problems.push(`${name}: included ${inc.kind} ${inc.start}-${inc.end} is outside the passage or not in the BSB`);
  }
  if (!["Narrative", "Poetry & Wisdom", "Letters", "Prophetic", "Parables", "Sermons"].includes(p.type)) problems.push(`${name}: type "${p.type}" is not one of the six`);
});
if (flag === "--whole") {
  for (let i = 0; i < order.length; i++) if (!covered.has(i)) problems.push(`${order[i]} is in no passage`);
}
console.log(`BSB verses: ${order.length}. Verse numbers the BSB leaves out: ${omitted.length}`);
console.log(omitted.join(", "));
console.log(problems.length ? problems.join("\n") : "No problems found.");
process.exitCode = problems.length ? 1 : 0;
