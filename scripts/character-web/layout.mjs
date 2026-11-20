// Works out where every character sits in the Character Connections web, once, so the phone never has to.
// It runs the same two-step layout as the owner's Bible Character Web artifact (design/character-web/index.html):
// people pulled toward their era around a big oval, linked people drawn together, then nudged off lines they
// don't belong to. The answer never changes for the same people and links, so the app just reads the spots.
//
//   node scripts/character-web/layout.mjs     # writes src/data/characterWebLayout.ts and characterWebLinks.ts
//
// Run it again whenever the web's people or links change. It reads the people (with their era) and links from the
// artifact's data, so the spots match what the owner approved.
import fs from 'node:fs';
import path from 'node:path';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';

const ROOT = path.join(import.meta.dirname, '..', '..');
const SOURCE = path.join(ROOT, 'design', 'character-web', 'index.html');
const OUT = path.join(ROOT, 'src', 'data', 'characterWebLayout.ts');
const LINKS_OUT = path.join(ROOT, 'src', 'data', 'characterWebLinks.ts');
const PASSAGES_OUT = path.join(ROOT, 'src', 'data', 'characterWebPassages.ts');

// The artifact keeps its data on one line: "const DATA = {...};"
const line = fs.readFileSync(SOURCE, 'utf8').split('\n').find((l) => l.startsWith('const DATA = '));
const data = JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1));

const nodes = data.nodes.map((d) => ({ id: d.id, era: d.era, degree: d.degree, size: 64 + Math.min(d.degree, 24) * 1.4 }));
const byId = new Map(nodes.map((n) => [n.id, n]));
// One spring per linked pair, however many links the pair has.
const pairs = new Map();
for (const l of data.links) {
  const key = l.a < l.b ? `${l.a}|${l.b}` : `${l.b}|${l.a}`;
  if (!pairs.has(key)) pairs.set(key, { s: byId.get(l.a), t: byId.get(l.b) });
}

// Step 1: eras around an oval, springs between linked people, everyone pushing apart.
const ERA_N = 8;
const R = 1900;
const eraPos = Array.from({ length: ERA_N }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / ERA_N;
  return [Math.cos(a) * R * 1.2, Math.sin(a) * R];
});
const springs = [...pairs.values()].map((p) => ({ source: p.s, target: p.t }));
forceSimulation(nodes)
  .force('link', forceLink(springs).distance((e) => 220 + 55 * Math.sqrt(Math.max(e.source.degree, e.target.degree))).strength((e) => 0.5 / Math.min(e.source.degree || 1, e.target.degree || 1)))
  .force('charge', forceManyBody().strength((d) => -900 - 260 * Math.sqrt(d.degree)))
  .force('collide', forceCollide((d) => d.size * 1.7 + 14 * Math.sqrt(d.degree)).strength(0.9))
  .force('x', forceX((d) => eraPos[d.era][0]).strength(0.07))
  .force('y', forceY((d) => eraPos[d.era][1]).strength(0.07))
  .stop()
  .tick(700);

// Step 2: nudge each person off lines that pass under them but aren't theirs.
const segs = [...pairs.values()];
forceSimulation(nodes)
  .stop()
  .force('avoid', (alpha) => {
    for (const n of nodes) {
      const clear = n.size * 0.75 + 26;
      for (const l of segs) {
        if (l.s === n || l.t === n) continue;
        const ax = l.s.x, ay = l.s.y, dx = l.t.x - ax, dy = l.t.y - ay;
        if (n.x < Math.min(ax, l.t.x) - clear || n.x > Math.max(ax, l.t.x) + clear || n.y < Math.min(ay, l.t.y) - clear || n.y > Math.max(ay, l.t.y) + clear) continue;
        const u = Math.max(0, Math.min(1, ((n.x - ax) * dx + (n.y - ay) * dy) / (dx * dx + dy * dy || 1)));
        const px = n.x - (ax + u * dx), py = n.y - (ay + u * dy), d = Math.hypot(px, py) || 0.01;
        if (d < clear) {
          const f = ((clear - d) / d) * alpha * 0.6;
          n.vx += px * f;
          n.vy += py * f;
        }
      }
    }
  })
  .force('collide', forceCollide((d) => d.size * 1.7 + 14 * Math.sqrt(d.degree)).strength(0.9))
  .alpha(0.5)
  .alphaDecay(0.04)
  .tick(90);

// The people file: each person's lookup, name, tag (only when others share the name, as in the artifact) and spot.
const nameCount = new Map();
for (const d of data.nodes) nameCount.set(d.name, (nameCount.get(d.name) ?? 0) + 1);
const source = new Map(data.nodes.map((d) => [d.id, d]));
const people = nodes
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((n) => {
    const d = source.get(n.id);
    const tag = nameCount.get(d.name) > 1 && d.tag ? d.tag : null;
    return `  [${JSON.stringify(n.id)}, ${JSON.stringify(d.name)}, ${JSON.stringify(tag)}, ${Math.round(n.x)}, ${Math.round(n.y)}, ${Math.round(n.size * 10) / 10}],`;
  })
  .join('\n');
fs.writeFileSync(
  OUT,
  `// Everyone in the Character Connections web and where they sit: [lookup, name, tag, x, y, card size].
// Made by scripts/character-web/layout.mjs from the owner's Bible Character Web artifact. Do not edit by hand;
// run the script again when the web's people or links change.

/** One person in the web: lookup, name, tag (only when others share the name), spot across and down, card size. */
export type WebPerson = readonly [lookup: string, name: string, tag: string | null, x: number, y: number, size: number];

/** Everyone in the web, by lookup order. */
export const CHARACTER_WEB_PEOPLE: readonly WebPerson[] = [
${people}
];
`,
);

// The links file: every link as [lookup, lookup, kind], four to a line to keep the file short.
const linkRows = data.links.map((l) => `[${JSON.stringify(l.a)}, ${JSON.stringify(l.b)}, ${JSON.stringify(l.type)}]`);
const lines = [];
for (let i = 0; i < linkRows.length; i += 4) lines.push('  ' + linkRows.slice(i, i + 4).join(', ') + ',');
fs.writeFileSync(
  LINKS_OUT,
  `// Every link in the Character Connections web: [lookup, lookup, kind]. The reasons come from the collected cards.
// Made by scripts/character-web/layout.mjs from the owner's Bible Character Web artifact. Do not edit by hand.

/** One link: the two people's lookups and the kind of link. */
export type WebLinkRow = readonly [a: string, b: string, type: string];

/** Every link in the web. */
export const CHARACTER_WEB_LINKS: readonly WebLinkRow[] = [
${lines.join('\n')}
];
`,
);
// The passages file: each link's Scripture references (and, for a prophecy, where it came true), in the same order as
// the links. Only the references: the verses' words come from the phone's Bible, and only once revealed.
const passageRows = data.links.map((l) => `  [${JSON.stringify(l.refs.map((r) => r.ref))}, ${JSON.stringify(l.fulfilled ? l.fulfilled.map((r) => r.ref) : [])}],`);
const twoPerLine = [];
for (let i = 0; i < passageRows.length; i += 2) twoPerLine.push(passageRows.slice(i, i + 2).map((r) => r.trim()).join(' '));
fs.writeFileSync(
  PASSAGES_OUT,
  `// Each Character Connections link's Scripture references, in the same order as characterWebLinks.ts:
// [proof passages, fulfilled passages (a prophecy only)]. References only; the words come from the phone's Bible.
// Made by scripts/character-web/layout.mjs from the owner's Bible Character Web artifact. Do not edit by hand.

/** One link's passages: where Scripture shows the link, and for a prophecy where it came true. */
export type WebLinkPassages = readonly [proof: readonly string[], fulfilled: readonly string[]];

/** Every link's passages, two links to a line. */
export const CHARACTER_WEB_PASSAGES: readonly WebLinkPassages[] = [
${twoPerLine.map((l) => '  ' + l).join('\n')}
];
`,
);
console.log(`Wrote ${nodes.length} people and ${data.links.length} links`);
