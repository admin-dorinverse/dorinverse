// Pulls the covered findings out of a check file, for the fix step.
// Usage: node covered.js <check.json> <out.json>  -> prints count
const fs = require("fs");
const [, , inp, out] = process.argv;
const d = JSON.parse(fs.readFileSync(inp, "utf8"));
const cov = d.findings.filter(f => f.covered);
fs.writeFileSync(out, JSON.stringify({ step: d.step, findings: cov }, null, 2));
console.log(`${cov.length} covered, ${d.findings.length - cov.length} not covered`);
