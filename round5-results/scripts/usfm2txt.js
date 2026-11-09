// Converts BSB USFM to "Book c:v text" lines plus a footnotes file.
const fs = require("fs"), path = require("path");
const [, , src, out] = process.argv;
const order = ["GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL","MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"];
const BS = String.fromCharCode(92);
const verses = [], notes = [];
function clean(s) {
  s = s.replace(new RegExp("\\\\ref ([^|\\\\]*)\\|[^\\\\]*\\\\ref\\*", "g"), "$1");
  s = s.replace(new RegExp("\\\\\\+?[a-z0-9]+\\*", "g"), "");
  s = s.replace(new RegExp("\\\\\\+?[a-z0-9]+(\\s|$)", "g"), "");
  return s.replace(/\s+/g, " ").trim();
}
const footRe = new RegExp("\\\\f \\+ ([\\s\\S]*?)\\\\f\\*", "g");
const xRe = new RegExp("\\\\x \\+ [\\s\\S]*?\\\\x\\*", "g");
const frRe = new RegExp("\\\\fr ([^\\\\]+)");
const skipRe = new RegExp("^\\\\(s\\d?|r|ms\\d?|mr|sp|h|toc\\d|mt\\d?|id|ide|cl|rem)(\\s|$)");
for (const code of order) {
  const t = fs.readFileSync(path.join(src, code + ".usfm"), "utf8");
  const book = (t.match(/^\\toc2 (.+)$/m) || t.match(/^\\h (.+)$/m))[1].trim();
  let ch = 0, cur = null, pendingD = "";
  for (let line of t.split(/\r?\n/)) {
    let m;
    if ((m = line.match(/^\\c (\d+)/))) { ch = +m[1]; cur = null; continue; }
    if (skipRe.test(line)) continue;
    line = line.replace(footRe, (all, body) => {
      const fr = (body.match(frRe) || [])[1];
      notes.push(`${book} ${(fr || "").trim()} ${clean(body.replace(frRe, ""))}`);
      return "";
    });
    line = line.replace(xRe, "");
    if ((line.startsWith(BS + "d ") || line === BS + "d") && !line.includes(BS + "v ")) { pendingD = clean(line.slice(2)); continue; }
    const parts = line.split(/\\v (\d+[a-z]?)\s/);
    if (cur && clean(parts[0])) cur.text += " " + clean(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      cur = { ref: `${book} ${ch}:${parts[i]}`, text: clean(parts[i + 1] || "") };
      if (pendingD) { cur.text = pendingD + " " + cur.text; pendingD = ""; }
      verses.push(cur);
    }
  }
}
fs.writeFileSync(path.join(out, "bsb.txt"), verses.map(v => `${v.ref} ${v.text.trim()}`).join("\n") + "\n");
fs.writeFileSync(path.join(out, "bsb-footnotes.txt"), notes.join("\n") + "\n");
console.log(verses.length, "verses", notes.length, "footnotes");
