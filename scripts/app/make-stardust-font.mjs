// Makes assets/fonts/Stardust.otf, the font the Bible reader draws covered words with. Each letter is a soft
// smudge of sugar-like dust with a few twinkles, dense in the middle and thinning out at the edges, so a covered
// word reads as a glowing blur of stardust. Drawing covers as text keeps a whole chapter one cheap text view.
//   node scripts/app/make-stardust-font.mjs
//
// The letters are split into sets so a word gets rounded ends: A-F start a word, a-l fill its middle, G-L end it,
// and M-P are one-letter words. src/components/bible/stardust.ts picks letters from these same sets.

import { mkdirSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

/** Where the font goes. */
const OUT = 'assets/fonts/Stardust.otf';

/** Font size grid. Ascender and descender match Georgia, the reading font, so lines keep their height. */
const EM = 1000;
const ASCENDER = 917;
const DESCENDER = -219;

/** How wide one covered letter is: about an average Georgia letter. And the gap between words. */
const LETTER_ADVANCE = 470;
const SPACE_ADVANCE = 241;

/** The dust's middle height (half Georgia's x-height) and how tall the smudge spreads around it. */
const MIDDLE_Y = 235;
const SPREAD_Y = 165;

/** The letter sets: which end of the word gets a soft rounded edge. */
const SETS = [
  { letters: 'ABCDEF', fadeLeft: true, fadeRight: false },
  { letters: 'abcdefghijkl', fadeLeft: false, fadeRight: false },
  { letters: 'GHIJKL', fadeLeft: false, fadeRight: true },
  { letters: 'MNOP', fadeLeft: true, fadeRight: true },
];

/** A seeded random number maker, so the font comes out the same every time. */
function randomFrom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A gentle 0-to-1 ramp between two points. */
function ramp(x, from, to) {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** How thick the dust is at a point: 1 in the middle of the word's band, fading to 0 outside it. */
function density(x, y, set) {
  const left = set.fadeLeft ? ramp(x, -50, 210) : ramp(x, -110, 60);
  const right = set.fadeRight ? 1 - ramp(x, LETTER_ADVANCE - 210, LETTER_ADVANCE + 50) : 1 - ramp(x, LETTER_ADVANCE - 60, LETTER_ADVANCE + 110);
  const across = left * right;
  // The smudge gets shorter toward a word's ends, so each word is a soft rounded cloud, not a box.
  const vertical = Math.exp(-0.5 * ((y - MIDDLE_Y) / (SPREAD_Y * (0.5 + 0.5 * across))) ** 2);
  return vertical * across ** 0.7;
}

/** Adds a round dust grain: a circle for bigger grains, a small diamond for the finest ones. */
function addGrain(path, x, y, r) {
  if (r < 16) {
    path.moveTo(x, y - r);
    path.lineTo(x + r, y);
    path.lineTo(x, y + r);
    path.lineTo(x - r, y);
    path.close();
    return;
  }
  const k = r * 0.5523;
  path.moveTo(x, y - r);
  path.curveTo(x + k, y - r, x + r, y - k, x + r, y);
  path.curveTo(x + r, y + k, x + k, y + r, x, y + r);
  path.curveTo(x - k, y + r, x - r, y + k, x - r, y);
  path.curveTo(x - r, y - k, x - k, y - r, x, y - r);
  path.close();
}

/** Adds a four-point twinkle with thin arms. */
function addTwinkle(path, x, y, arm) {
  const w = arm * 0.16;
  path.moveTo(x, y - arm);
  path.lineTo(x + w, y - w);
  path.lineTo(x + arm, y);
  path.lineTo(x + w, y + w);
  path.lineTo(x, y + arm);
  path.lineTo(x - w, y + w);
  path.lineTo(x - arm, y);
  path.lineTo(x - w, y - w);
  path.close();
}

/** The smallest gap between two grains. Grains never touch, so every phone fills them the same way. */
const GRAIN_GAP = 4;

/**
 * Draws one dust letter. Grains are tried all over the letter's box and kept where the dust is thick and they
 * don't touch another grain. Some letters get one twinkle, kept clear of grains so it catches the eye.
 */
function dustLetter(set, seed) {
  const random = randomFrom(seed);
  const path = new opentype.Path();
  const placed = [];
  /** True if a round spot is clear of every grain placed so far. */
  const clear = (x, y, r) => placed.every((g) => Math.hypot(g.x - x, g.y - y) >= g.r + r + GRAIN_GAP);
  if (random() < 0.45) {
    const x = Math.round(40 + random() * (LETTER_ADVANCE - 80));
    const y = Math.round(MIDDLE_Y + (random() < 0.5 ? -1 : 1) * SPREAD_Y * (0.9 + random() * 0.6));
    const arm = Math.round(55 + random() * 40);
    addTwinkle(path, x, y, arm);
    placed.push({ x, y, r: arm });
  }
  for (let i = 0; i < TRIES; i++) {
    const x = Math.round(-110 + random() * (LETTER_ADVANCE + 220));
    const y = Math.round(MIDDLE_Y - 3 * SPREAD_Y + random() * 6 * SPREAD_Y);
    const d = density(x, y, set);
    if (random() > d ** 1.4 * 0.8 + 0.006) continue;
    const r = Math.round(8 + 30 * d ** 0.8 * Math.sqrt(random()));
    if (!clear(x, y, r)) continue;
    addGrain(path, x, y, r);
    placed.push({ x, y, r });
  }
  return path;
}

/** How many grains are tried per letter. More tries pack the middle of the smudge tighter. */
const TRIES = 2400;

const glyphs = [
  new opentype.Glyph({ name: '.notdef', unicode: undefined, advanceWidth: LETTER_ADVANCE, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: SPACE_ADVANCE, path: new opentype.Path() }),
];
SETS.forEach((set, s) => {
  [...set.letters].forEach((letter, i) => {
    glyphs.push(new opentype.Glyph({ name: letter, unicode: letter.charCodeAt(0), advanceWidth: LETTER_ADVANCE, path: dustLetter(set, 1000 * (s + 1) + i * 7919) }));
  });
});

const font = new opentype.Font({
  familyName: 'Stardust',
  styleName: 'Regular',
  unitsPerEm: EM,
  ascender: ASCENDER,
  descender: DESCENDER,
  glyphs,
});
mkdirSync('assets/fonts', { recursive: true });
writeFileSync(OUT, Buffer.from(font.toArrayBuffer()));
console.log(`Wrote ${OUT}: ${glyphs.length} glyphs.`);
