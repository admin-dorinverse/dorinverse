// Builds out/tracker.md and sets the two flags on every output item.
const fs = require("fs");
const rows = require("../out/findings-all.json");
const name = { p1: "Psalm 139", p2: "Isaiah 55", p3: "Luke 6", p4: "Luke 16", p5: "Acts 13", p6: "Ephesians 2", passages: "Passages" };
const place = r => {
  const p = r.passage === "passages" ? "Passages" : name[r.passage.slice(0, 2)];
  const w = r.where;
  let at = "whole output";
  if (w && w.line != null) at = `line ${w.line}`;
  else if (w && w.stop != null && w.card != null) at = `stop ${w.stop} card ${w.card}`;
  else if (w && w.stop == null && w.card != null) at = `line ${w.card}`;
  else if (w && w.stop != null) at = `stop ${w.stop}`;
  return `${p}, ${r.step.replace("_", " ")}, ${at} (${r.check})`;
};

// Needs human decision groups: index lists into findings-all.json, plus groups from the run itself.
const H = [
  ["Do the poetry, letters and prophecy rules apply to Sermons, and to teaching inside Parables?", "prep-walkthrough.md says not to make the baker guess the next words of a line, to use fewer choice cards, and allows 4 story cards in a row, but only for poetry, letters and prophecy. Luke 6 (Sermons) and Luke 16:9-13 (Jesus' teaching in a Parables passage) got fill-in-the-blanks on Jesus' exact words.", [44, 46, 54, 65, 66, 69]],
  ["In poetry, letters and prophecy, which wins: \"choice cards equal to or more than story cards\" or \"fewer choice cards\"?", "Both lines are in prep-walkthrough.md. Psalm 139 and Ephesians 2 sat exactly even to satisfy both.", [12, 18, 119, 120]],
  ["Fixes vs. counts: \"a fix changes only the items in the findings\" collides with stop counts and coverage.", "From the run, not a checker. Adding a setup story card broke the story/choice count (Psalm 139 stops ended 8:7 and 9:8). Fixers merged or cut untouched cards to stay even (Isaiah 55 lost part of 55:5; Ephesians 2 merged cards). A Big Idea fix to cover missed verses turned it back into a retelling (Ephesians 2). A Burnt Cookies fix undid the previous fix (Acts 13 line 5). A rewrite for \"no formula\" added 16 new slips (Acts 13 explanations). Should a fix be allowed to touch nearby items when a rule forces it?", []],
  ["May cards use facts from outside the passage, and how are they cited?", "Opening cards named Paul and the Ephesians (from Eph 1:1) and the choosing of the Twelve (Luke 6:12-16). Pilate is never described in Acts 13. A Big Idea named Luke as the writer of Acts. An explanation named God as speaker from Hab 1:5, called untying sandals \"the lowest job\", and credited \"brood of vipers\" only to John the Baptist.", [47, 55, 125, 102, 107, 91, 70, 71, 33]],
  ["On a choice card, does \"verses\" cover context the question retells, or only the right answer's verses?", "Scripture rules say the reference runs from the first verse a card uses to the last. The Output section says it is also the right answer's verses. Questions must give context, so they retell earlier verses.", [48, 104, 108]],
  ["Does every choice card need a story card right before it?", "\"The setup for a choice is always on a story card.\" One checker read it as a story card before every choice card; another let the setup sit in the question. Checkers disagreed across rounds.", [10]],
  ["Big Idea: does \"about 5 to 7 lines\" also limit how long a line is?", "Entries ran 40 to 75 words; whole Big Ideas ran 230 to 400 words.", [62, 63, 92, 94, 115]],
  ["Big Idea: what must \"covers the whole passage\" include?", "Luke 6 left out the setting before the sermon (6:17-19). Acts 13 left out the opening at Perga and the sermon's closing warning.", [38, 39, 42, 90]],
  ["Big Idea: can it state a meaning or link the text doesn't say outright?", "Psalm 139: \"that's not a trap, it's a comfort.\" Isaiah 55: \"freely pardon\" (55:7) tied to the \"without cost\" water (55:1).", [8, 25]],
  ["Should a passage with no story group still say \"the teaching continues\"?", "Ephesians 2:1-10 has no group, but the letter carries on at 2:11. The Big Idea ended \"Paul's not done with this letter yet.\"", [112]],
  ["Do praise openers count as a reaction?", "answer-explanations.md: \"The explanation never includes a reaction\" and lists the reaction phrases. Explanations open with \"You got it, baker\", \"That's right!\", \"True!\", so the baker sees two reactions in a row.", [32, 58, 72, 89, 110, 111]],
  ["Can jokes invent small bakery events or habits?", "papa-dorin.md: he \"never adds anything new\" to his world, and \"never holds a grudge\". Jokes had him hunting a spatula for twenty minutes, a cash register, sneaking cookies, sulking for a week.", [0, 5, 20, 24, 61, 31, 37]],
  ["May an explanation reuse a Prep joke word for word?", "Psalm 139 stop 1 card 10 repeats \"I STILL got found\" from the story card the baker just read.", [1, 4]],
  ["Do short fragments count as sentences in \"about 3 to 5 sentences\"?", "Some explanations hit 6 when fragments like \"Never.\" count.", [19, 23]],
  ["Definitions: which words get a pop-up?", "No reading level is set. Names were uneven: Canaan and Pilate got pop-ups; Paphos, Perga, Samuel, Barnabas and others didn't.", [9, 99, 101]],
  ["Definitions: do word forms count as one word?", "debtor/debtors, commend/commended, shrewd/shrewdly; and \"bless\" (a different sense from \"blessed\").", [64, 43]],
  ["Definitions: may a meaning go beyond its cited source?", "\"mercy\" credited to Easton's but defined differently; \"like a work of art\" added to \"workmanship\"; applying \"witness\" to David; \"fear God\" adds facts Webster's lacks.", [26, 100, 117, 118]],
  ["Sample Table rule cookies: how to pick 3, and which commands count?", "Luke 6 has about 9 commands; Prep asked about most, so \"choice cards first\" doesn't narrow it. The Golden Rule (6:31) was left out. Also: a command inside a parable (6:42), and Paul's spoken commands in Acts 13.", [56, 57, 109]],
  ["Burnt Cookies: can good lines and callbacks hint at the burnt detail?", "Acts 13 line 5 says \"Paul and Barnabas\" right after burnt line 4 swaps in Silas. Ephesians 2 line 5 keeps \"God doesn't stamp crooked\", a callback tied to the true word \"workmanship\".", [98, 116]],
  ["Passages: three boundary calls.", "(1) Where an included parable ends when the text doesn't mark it (Luke 6:39, 6:39-40 or 6:39-42; and is 6:47-49 a parable?). (2) Can a Sermons passage keep the short narrative setting before it (Luke 6:17-19)? (3) Is Luke 16:13/16:14 a natural break, or one conversation?", [127, 128, 129]],
  ["Prep isn't given the passage's included parables and sermons.", "From the run. prep-walkthrough.md says an included parable or sermon gets its own stop, but readme.md's table gives Prep only the type, story group and position. Luke 6's included parable (6:39-40) got no stop of its own because Prep had no way to know. Should Prep also get the passage's \"included\" list? A checker also asked how stops work when the whole passage is a sermon.", [45]],
  ["checker.md and idioms.md formats don't fit every step.", "From the run. checker.md's \"where\" has only stop and card; Burnt Cookies and the Big Idea have lines, so checkers made up {\"line\": n}. checker.md's step list has no \"idioms\", so idioms got no check. idioms.md never defines passage_id (passages.json has no id) or the card entry; the agent used list position and {passage_id, stop, card}. It also asks: do reworded idiom forms count, overlapping idioms, and wrong-answer text?", []],
  ["Checkers don't agree from one round to the next.", "From the run. The same item was \"not covered\" in one check and \"covered\" in the next (setup on a story card; \"brood of vipers\"). Some checks missed slips a later check caught (Acts 13 Burnt Cookies line lengths). Should the checker see the earlier checks?", []],
  ["Small Prep wording calls.", "A true/false that hinges on a poetic picture (Ps 139:18). An unclear question (Isa 55, stop 2 card 7). Keeping a speaker's \"us\" in a paraphrase (Acts 13). Comma splices to stay at 2 sentences (Eph 2). \"Real prophets\" for \"the prophets\" (Luke 6 explanations).", [11, 27, 103, 126, 34]],
];

// Assigned rows must cover every human row.
const used = new Set(H.flatMap(g => g[2]));
const missing = rows.map((r, i) => i).filter(i => rows[i].list === "human" && !used.has(i));
if (missing.length) { console.log("UNGROUPED", missing); process.exit(1); }

// Needs agent fix groups: by rule.
const agent = rows.filter(r => r.list === "agent");
const byRule = {};
for (const r of agent) { const k = r.rule.link; (byRule[k] = byRule[k] || { text: r.rule.text, rows: [] }).rows.push(r); }

let md = `# Round 5 tracker\n\nRun of 2026-11-08. Six passages from passages.md: Psalm 139:1-24, Isaiah 55:1-13, Luke 6:17-49 (Sermons, included parable 6:39-40), Luke 16:1-13 (Parables), Acts 13:13-52 (Narrative, included sermon 13:16-41), Ephesians 2:1-10. Every step ran: Passages, Prep, Burnt Cookies, Big Idea, Sample Table, Definitions, Answer explanations, Idioms. Every output loaded. The run never stopped.\n\n`;
md += `## Needs human decision\n\n${H.length} groups. Each asks its question once.\n\n`;
H.forEach((g, n) => {
  const hits = g[2].map(i => rows[i]);
  md += `### H${n + 1}. ${g[0]}\n\n${g[1]}\n\n`;
  if (hits.length) {
    md += `Places (${hits.length}):\n`;
    for (const r of hits) md += `- ${place(r)}: ${r.question}\n`;
    md += `\n`;
  }
});
md += `## Needs agent fix\n\n${agent.length} items left after two fixes, grouped by rule. Each is a builder slip a rule already covers. A batch rerun fixes only these.\n\n`;
Object.entries(byRule).sort((a, b) => b[1].rows.length - a[1].rows.length).forEach(([link, g], n) => {
  md += `### A${n + 1}. ${link} (${g.rows.length})\n\nRule: "${g.text}"\n\n`;
  for (const r of g.rows) md += `- ${place(r)}: ${r.problem}\n`;
  md += `\n`;
});
fs.writeFileSync("out/tracker.md", md);

// Flags.
const hmap = {};
H.forEach((g, n) => g[2].forEach(i => hmap[i] = n));
const flagFile = { prep: "prep.json", burnt_cookies: "burnt-cookies.json", big_idea: "big-idea.json", sample_table: "sample-table.json", definitions: "definitions.json", answer_explanations: "answer-explanations.json" };
const setF = (o, k) => { o[k] = true; };
const clean = o => { if (o && typeof o === "object") { if (!("needs_agent_fix" in o)) o.needs_agent_fix = false; if (!("needs_human_decision" in o)) o.needs_human_decision = false; } };
const outs = {};
const load = (p, s) => { const f = `out/${p}/${flagFile[s]}`; return outs[f] = outs[f] || JSON.parse(fs.readFileSync(f, "utf8")); };
for (const p of ["p1-psalm139", "p2-isaiah55", "p3-luke6", "p4-luke16", "p5-acts13", "p6-ephesians2"]) {
  for (const s of Object.keys(flagFile)) {
    const d = load(p, s);
    if (s === "prep") d.stops.forEach(st => st.cards.forEach(clean));
    if (s === "burnt_cookies") d.lines.forEach(clean);
    if (s === "big_idea") clean(d);
    if (s === "sample_table") d.cookies.forEach(clean);
    if (s === "definitions") d.words.forEach(clean);
    if (s === "answer_explanations") d.cards.forEach(clean);
  }
}
rows.forEach((r, i) => {
  if (r.passage === "passages") return;
  const k = r.list === "agent" ? "needs_agent_fix" : "needs_human_decision";
  const d = load(r.passage, r.step);
  const w = r.where || {};
  let hit = [];
  const line = w.line != null ? w.line : (w.stop == null && w.card != null ? w.card : null);
  if (r.step === "prep" && w.stop != null) { const st = d.stops.find(x => x.stop === w.stop); hit = st ? (w.card != null ? st.cards.filter(c => c.card === w.card) : st.cards) : []; }
  else if (r.step === "answer_explanations" && w.stop != null) hit = d.cards.filter(c => c.stop === w.stop && c.card === w.card);
  else if (r.step === "definitions" && w.stop != null) hit = d.words.filter(x => x.cards.some(c => c.stop === w.stop && c.card === w.card));
  else if (r.step === "sample_table" && w.stop != null) hit = d.cookies.filter(c => c.stop === w.stop && c.card === w.card);
  else if (r.step === "burnt_cookies" && line != null) hit = d.lines.filter(l => l.line === line);
  else if (r.step === "big_idea") hit = [d];
  if (!hit.length) { d.output_flags = d.output_flags || { needs_agent_fix: false, needs_human_decision: false }; hit = [d.output_flags]; }
  hit.forEach(o => setF(o, k));
});
// Passage entries.
const P = JSON.parse(fs.readFileSync("out/passages.json", "utf8"));
P.forEach(clean);
for (const i of [127, 128]) P[2].needs_human_decision = true;
P[3].needs_human_decision = true;
fs.writeFileSync("out/passages.json", JSON.stringify(P, null, 2));
for (const [f, d] of Object.entries(outs)) fs.writeFileSync(f, JSON.stringify(d, null, 2));
console.log("tracker written:", H.length, "human groups,", Object.keys(byRule).length, "agent groups,", agent.length, "agent items");
