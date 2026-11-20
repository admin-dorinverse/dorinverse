// Builds the Character Connections web: everyone at their ready-made spot (see characterWebLayout.ts) and every link
// (characterWebLinks.ts). People the person has collected are open; the rest are greyed out. Done once each time the
// collection or the link filter changes, never while panning. Plain functions with no screen.

import { CHARACTER_WEB_PEOPLE } from '@/data/characterWebLayout';
import { CHARACTER_WEB_LINKS } from '@/data/characterWebLinks';
import type { MetCharacter } from '@/types/character';

/** How each kind of link's line is drawn: thicker for some, and a dash pattern for others. From the artifact. */
export const LINK_STYLES: Readonly<Record<string, { width?: number; dash?: readonly number[] }>> = {
  family: {},
  married: { width: 1.3 },
  loved: { width: 1.3 },
  helped: {},
  worked_together: { dash: [9, 5] },
  counseled: { dash: [9, 5] },
  apostle: { width: 1.3 },
  followed: {},
  served: { dash: [9, 5] },
  anointed: { dash: [2, 5] },
  blessed: { dash: [2, 5] },
  rebuked: { dash: [2, 5] },
  enemies: { dash: [8, 4, 2, 4] },
  betrayed: { width: 1.3, dash: [8, 4, 2, 4] },
  rivals: { dash: [8, 4, 2, 4] },
  healed: { dash: [2, 5] },
  friends: {},
  covenant: { dash: [9, 5] },
  judged: { dash: [8, 4, 2, 4] },
  put_to_death: { width: 1.3, dash: [8, 4, 2, 4] },
  saved: { width: 1.3 },
  deceived: { dash: [2, 5] },
  prophesied: { dash: [12, 4] },
  prophecy: { dash: [12, 4] },
  crossed_paths: {},
};

/** The kinds of link, in the artifact's order (the filter list and link lists follow it). */
export const LINK_TYPES = Object.keys(LINK_STYLES);

/** How far apart side-by-side links between the same two people are drawn. */
export const PAIR_GAP = 7.5;

/** A person in the web. Everyone shows; people not collected yet are greyed out and can't be opened. */
export type WebNode = {
  /** Their lookup. */
  lookup: string;
  /** Their name, and their tag when others share the name. */
  name: string;
  tag: string | null;
  /** Their collected card, or undefined while not collected yet. */
  character: MetCharacter | undefined;
  /** Their spot and card size. */
  x: number;
  y: number;
  size: number;
  /** Their name split over one or two lines, and their tag the same way. */
  lines: string[];
  tagLines: string[];
};

/** One link between two people in the web. */
export type WebLink = {
  /** The two people. `a` has the smaller lookup, so side-by-side offsets agree. */
  a: WebNode;
  b: WebNode;
  /** The kind of link. */
  type: string;
  /** Why they are linked, from the collected cards; undefined while either person is not collected yet. */
  why: string | undefined;
  /** Its place among the shown links between the same two people: 0 alone, or -0.5 / 0.5 for two, and so on. */
  offset: number;
  /** Its place in the full link list, which is also where its passages are (characterWebPassages.ts). */
  index: number;
};

/** The whole web: its people, its shown links, and how many links of each kind there are (shown or not). */
export type Web = { nodes: WebNode[]; links: WebLink[]; counts: Readonly<Record<string, number>>; total: number };

/** Splits a name over two lines when it is long, at the space that leaves the lines most even. From the artifact. */
export function wrapName(name: string, max: number): string[] {
  const words = name.split(' ');
  if (words.length === 1 || name.length <= max) return [name];
  let best = [name];
  let longest = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (Math.max(a.length, b.length) < longest) {
      longest = Math.max(a.length, b.length);
      best = [a, b];
    }
  }
  return best;
}

/** The key for one kind of link between two people, the same whichever way round. */
function linkKey(a: string, b: string, type: string): string {
  return a < b ? `${a}|${b}|${type}` : `${b}|${a}|${type}`;
}

/** Builds the web: everyone at their spot, the collected ones open, and only the kinds of link in `shown`. */
export function buildWeb(collected: readonly MetCharacter[], shown: ReadonlySet<string>): Web {
  const mine = new Map(collected.map((c) => [c.lookup, c]));
  const byId = new Map(collected.map((c) => [c.id, c]));
  // Why each link between two collected people exists, from their cards.
  const whys = new Map<string, string>();
  for (const c of collected) {
    for (const l of c.links) {
      const other = byId.get(l.otherId);
      if (other) whys.set(linkKey(c.lookup, other.lookup, l.type), l.why);
    }
  }
  const nodes: WebNode[] = CHARACTER_WEB_PEOPLE.map(([lookup, name, tag, x, y, size]) => ({
    lookup,
    name,
    tag,
    character: mine.get(lookup),
    x,
    y,
    size,
    lines: wrapName(name, 9),
    tagLines: tag ? wrapName(tag, 14) : [],
  }));
  const byLookup = new Map(nodes.map((n) => [n.lookup, n]));
  const counts: Record<string, number> = {};
  const links: WebLink[] = [];
  for (const [index, [x, y, type]] of CHARACTER_WEB_LINKS.entries()) {
    const first = byLookup.get(x);
    const second = byLookup.get(y);
    if (!first || !second || !LINK_STYLES[type]) continue;
    counts[type] = (counts[type] ?? 0) + 1;
    if (!shown.has(type)) continue;
    const [a, b] = x < y ? [first, second] : [second, first];
    links.push({ a, b, type, why: whys.get(linkKey(x, y, type)), offset: 0, index });
  }
  // Several links between the same two people sit side by side, centered on the line between them.
  const pairs = new Map<string, WebLink[]>();
  for (const l of links) {
    const key = `${l.a.lookup}|${l.b.lookup}`;
    pairs.set(key, [...(pairs.get(key) ?? []), l]);
  }
  for (const group of pairs.values()) group.forEach((l, k) => (l.offset = k - (group.length - 1) / 2));
  return { nodes, links, counts, total: CHARACTER_WEB_LINKS.length };
}

/** A link's two ends, moved sideways by its offset: [x1, y1, x2, y2]. */
export function linkEnds(l: WebLink): [number, number, number, number] {
  const dx = l.b.x - l.a.x;
  const dy = l.b.y - l.a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * l.offset * PAIR_GAP;
  const oy = (dx / len) * l.offset * PAIR_GAP;
  return [l.a.x + ox, l.a.y + oy, l.b.x + ox, l.b.y + oy];
}

/** The box around every card, for fitting the whole web on screen. */
export function webBounds(nodes: readonly WebNode[]): { x0: number; y0: number; x1: number; y1: number } {
  if (!nodes.length) return { x0: -100, y0: -100, x1: 100, y1: 100 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    x0 = Math.min(x0, n.x - n.size);
    y0 = Math.min(y0, n.y - n.size);
    x1 = Math.max(x1, n.x + n.size);
    y1 = Math.max(y1, n.y + n.size);
  }
  return { x0, y0, x1, y1 };
}

/** What a tap at a web spot lands on: a person's card first, then the nearest line within reach, or nothing. */
export function webHit(web: Web, x: number, y: number, reach: number): { node: WebNode } | { link: WebLink } | null {
  for (let i = web.nodes.length - 1; i >= 0; i--) {
    const n = web.nodes[i];
    if (Math.abs(x - n.x) <= n.size / 2 + reach / 2 && Math.abs(y - n.y) <= n.size / 2 + reach / 2) return { node: n };
  }
  let best: WebLink | null = null;
  let bestDistance = reach;
  for (const l of web.links) {
    const [x1, y1, x2, y2] = linkEnds(l);
    const dx = x2 - x1, dy = y2 - y1;
    const u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(x - (x1 + u * dx), y - (y1 + u * dy));
    if (d < bestDistance) {
      bestDistance = d;
      best = l;
    }
  }
  return best ? { link: best } : null;
}
