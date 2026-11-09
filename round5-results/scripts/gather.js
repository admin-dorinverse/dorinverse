// Gathers findings for the tracker.
// Needs agent fix = covered findings left in each output's final check.
// Needs human decision = not-covered findings from any check of that output.
// Writes out/findings-all.json: one row per finding, with the output, place and text.
const fs = require("fs");
const files = fs.readdirSync("check").filter(f => /-check\d\.json$/.test(f));
const last = {};
for (const f of files) {
  const m = f.match(/^(.*)-check(\d)\.json$/);
  if (!last[m[1]] || +m[2] > last[m[1]].n) last[m[1]] = { n: +m[2], f };
}
const rows = [];
for (const f of files) {
  const m = f.match(/^(.*)-check(\d)\.json$/);
  const key = m[1];
  const d = JSON.parse(fs.readFileSync("check/" + f, "utf8"));
  const final = last[key].f === f;
  for (const x of d.findings) {
    if (x.covered && !final) continue;
    const pm = key.match(/^(p\d-[a-z0-9]+)-(.+)$/);
    rows.push({
      list: x.covered ? "agent" : "human",
      passage: pm ? pm[1] : "passages",
      step: pm ? pm[2] : "passages",
      check: f,
      where: x.where ?? null,
      problem: x.problem,
      rule: x.rule ?? null,
      question: x.question ?? null,
    });
  }
}
fs.writeFileSync("out/findings-all.json", JSON.stringify(rows, null, 2));
console.log(rows.filter(r => r.list === "agent").length, "agent rows;", rows.filter(r => r.list === "human").length, "human rows");
