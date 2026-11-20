// The Armor of God's six pieces as drawn in the Constellations design: each piece's outline (the shards fill it),
// its gold, red, steel and leather parts (which color the shards inside them), and the box it sits in. Copied
// from the design; the 1,558 shards are cut from these by scripts/app/make-armor-shards.mjs.

/** One piece of armor. */
export type ArmorPiece = {
  /** Short key, like "helmet". */
  key: string;
  /** Its name, like "Helmet of Salvation". */
  name: string;
  /** The box it sits in, in the armor's 300 × 422 drawing: [left, top, width, height]. */
  box: readonly [number, number, number, number];
  /** Its outline, as one or more SVG paths. */
  sil: readonly string[];
  /** Its colored parts: [color, SVG path, line width (0 = the filled shape)]. Shards inside take that color. */
  regions: readonly (readonly [string, string, number])[];
  /** How far it is moved down in the drawing (only the belt sits a little lower). */
  shiftY: number;
};

/** The six pieces, in the design's order. */
export const ARMOR_PIECES: readonly ArmorPiece[] = [
  {
    key: 'belt',
    name: 'Belt of Truth',
    box: [90, 222, 120, 40],
    sil: ['M118 234 L182 234 L186 254 L114 254 Z', 'M144 232 H156 A4 4 0 0 1 160 236 V252 A4 4 0 0 1 156 256 H144 A4 4 0 0 1 140 252 V236 A4 4 0 0 1 144 232 Z'],
    regions: [
      ['gold', 'M144 232 H156 A4 4 0 0 1 160 236 V252 A4 4 0 0 1 156 256 H144 A4 4 0 0 1 140 252 V236 A4 4 0 0 1 144 232 Z', 0],
      ['dark', 'M147 237 H153 A2 2 0 0 1 155 239 V249 A2 2 0 0 1 153 251 H147 A2 2 0 0 1 145 249 V239 A2 2 0 0 1 147 237 Z', 0],
    ],
    shiftY: 9,
  },
  {
    key: 'breast',
    name: 'Breastplate of Righteousness',
    box: [90, 110, 120, 130],
    sil: ['M104 124 C120 116 136 118 150 122 C164 118 180 116 196 124 L200 160 C198 196 190 222 176 234 L124 234 C110 222 102 196 100 160 Z'],
    regions: [
      ['steel', 'M150 128 V228', 2.6],
      ['gold', 'M150 150 v34 M136 164 h28', 6],
    ],
    shiftY: 0,
  },
  {
    key: 'shoes',
    name: 'Shoes of the Gospel of Peace',
    box: [92, 360, 116, 56],
    sil: [
      'M112 372 L140 372 L142 400 C142 408 136 410 128 410 L100 410 C96 410 96 402 102 400 L112 396 Z',
      'M160 372 L188 372 L188 396 L198 400 C204 402 204 410 200 410 L172 410 C164 410 158 408 158 400 Z',
    ],
    regions: [['gold', 'M114 382 h26 M114 390 h26 M160 382 h26 M160 390 h26', 3.2]],
    shiftY: 0,
  },
  {
    key: 'shield',
    name: 'Shield of Faith',
    box: [6, 196, 112, 136],
    sil: ['M14 264 A48 62 0 1 0 110 264 A48 62 0 1 0 14 264 Z'],
    regions: [
      ['red', 'M24 264 A38 51 0 1 0 100 264 A38 51 0 1 0 24 264 Z', 0],
      ['gold', 'M24 264 A38 51 0 1 0 100 264 A38 51 0 1 0 24 264 Z', 3.6],
      ['gold', 'M62 230 v68 M38 258 h48', 6],
    ],
    shiftY: 0,
  },
  {
    key: 'helmet',
    name: 'Helmet of Salvation',
    box: [104, 14, 92, 96],
    sil: [
      'M112 92 C108 50 124 28 150 26 C176 28 192 50 188 92 L176 96 L174 72 C166 66 134 66 126 72 L124 96 Z',
      'M150 26 C146 10 162 2 176 6 C168 10 160 18 158 28 Z',
      'M133 72 H167 A1 1 0 0 1 168 73 V79 A1 1 0 0 1 167 80 H133 A1 1 0 0 1 132 79 V73 A1 1 0 0 1 133 72 Z',
    ],
    regions: [
      ['red', 'M150 26 C146 10 162 2 176 6 C168 10 160 18 158 28 Z', 0],
      ['gold', 'M133 72 H167 A1 1 0 0 1 168 73 V79 A1 1 0 0 1 167 80 H133 A1 1 0 0 1 132 79 V73 A1 1 0 0 1 133 72 Z', 0],
    ],
    shiftY: 0,
  },
  {
    key: 'sword',
    name: 'Sword of the Spirit',
    box: [226, 120, 52, 230],
    sil: [
      'M252 128 L258 140 L258 300 L246 300 L246 140 Z',
      'M235 298 H269 A3 3 0 0 1 272 301 V304 A3 3 0 0 1 269 307 H235 A3 3 0 0 1 232 304 V301 A3 3 0 0 1 235 298 Z',
      'M250 306 H254 A3 3 0 0 1 257 309 V333 A3 3 0 0 1 254 336 H250 A3 3 0 0 1 247 333 V309 A3 3 0 0 1 250 306 Z',
      'M245 341 A7 7 0 1 0 259 341 A7 7 0 1 0 245 341 Z',
    ],
    regions: [
      ['gold', 'M235 298 H269 A3 3 0 0 1 272 301 V304 A3 3 0 0 1 269 307 H235 A3 3 0 0 1 232 304 V301 A3 3 0 0 1 235 298 Z', 0],
      ['leather', 'M250 306 H254 A3 3 0 0 1 257 309 V333 A3 3 0 0 1 254 336 H250 A3 3 0 0 1 247 333 V309 A3 3 0 0 1 250 306 Z', 0],
      ['gold', 'M245 341 A7 7 0 1 0 259 341 A7 7 0 1 0 245 341 Z', 0],
    ],
    shiftY: 0,
  },
];

/** The whole armor drawing's size. */
export const ARMOR_W = 300;
export const ARMOR_H = 422;
