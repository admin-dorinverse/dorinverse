// Lays out a QR code's grid: the fixed parts a camera uses to find and line up the code (the three big corner
// squares, the dotted timing lines, the small alignment squares), the format and version marks, and the data bits.

import type { QrVersion } from './versionTables';

/** A QR grid being built: which modules are dark, and which belong to the fixed parts (never masked). */
export type QrCanvas = {
  /** Modules along one side. */
  size: number;
  /** dark[row][column] is true for a dark module. */
  dark: boolean[][];
  /** fixed[row][column] is true for a module that is not a data bit. */
  fixed: boolean[][];
};

/** Makes an all-light grid of the version's size. */
function emptyCanvas(size: number): QrCanvas {
  const grid = () => Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { size, dark: grid(), fixed: grid() };
}

/** Sets one fixed module at a column and row. */
function setFixed(canvas: QrCanvas, x: number, y: number, isDark: boolean): void {
  canvas.dark[y][x] = isDark;
  canvas.fixed[y][x] = true;
}

/** Draws a big corner square (7 by 7, with its light ring around it) centered on a column and row. */
function drawFinder(canvas: QrCanvas, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      setFixed(canvas, x, y, ring !== 2 && ring !== 4);
    }
  }
}

/** Draws a small alignment square (5 by 5) centered on a column and row. */
function drawAlignment(canvas: QrCanvas, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) setFixed(canvas, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
}

/** Gives bit `i` of a number as true or false. */
function bit(value: number, i: number): boolean {
  return ((value >>> i) & 1) !== 0;
}

/**
 * Draws the 15 format bits (level M and the mask number) in both of their places, plus the one always-dark module.
 * The bits carry their own error correction, so a camera can read them even when a little is damaged.
 */
export function drawFormat(canvas: QrCanvas, mask: number): void {
  const levelM = 0b00;
  const data = (levelM << 3) | mask;
  let rest = data;
  for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
  const bits = ((data << 10) | rest) ^ 0x5412;
  const size = canvas.size;

  for (let i = 0; i <= 5; i++) setFixed(canvas, 8, i, bit(bits, i));
  setFixed(canvas, 8, 7, bit(bits, 6));
  setFixed(canvas, 8, 8, bit(bits, 7));
  setFixed(canvas, 7, 8, bit(bits, 8));
  for (let i = 9; i < 15; i++) setFixed(canvas, 14 - i, 8, bit(bits, i));

  for (let i = 0; i < 8; i++) setFixed(canvas, size - 1 - i, 8, bit(bits, i));
  for (let i = 8; i < 15; i++) setFixed(canvas, 8, size - 15 + i, bit(bits, i));
  setFixed(canvas, 8, size - 8, true);
}

/** Draws the 18 version bits in their two blocks near the corners. Only versions 7 and up have them. */
function drawVersion(canvas: QrCanvas, version: number): void {
  if (version < 7) return;
  let rest = version;
  for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
  const bits = (version << 12) | rest;
  for (let i = 0; i < 18; i++) {
    const a = canvas.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFixed(canvas, a, b, bit(bits, i));
    setFixed(canvas, b, a, bit(bits, i));
  }
}

/** Makes a grid with every fixed part drawn, and the format spot held (it is filled in once the mask is picked). */
export function fixedPatterns(v: QrVersion): QrCanvas {
  const canvas = emptyCanvas(v.size);
  const size = v.size;
  for (let i = 0; i < size; i++) {
    setFixed(canvas, 6, i, i % 2 === 0);
    setFixed(canvas, i, 6, i % 2 === 0);
  }
  drawFinder(canvas, 3, 3);
  drawFinder(canvas, size - 4, 3);
  drawFinder(canvas, 3, size - 4);

  const spots = v.alignment;
  const last = spots.length - 1;
  for (let i = 0; i < spots.length; i++) {
    for (let j = 0; j < spots.length; j++) {
      const onFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
      if (!onFinder) drawAlignment(canvas, spots[i], spots[j]);
    }
  }
  drawFormat(canvas, 0);
  drawVersion(canvas, v.version);
  return canvas;
}

/**
 * Writes the bytes into every module that is not fixed, two columns at a time, snaking up then down from the
 * bottom-right corner, skipping the vertical timing line. Leftover modules at the end stay light.
 */
export function placeBytes(canvas: QrCanvas, bytes: Uint8Array): void {
  const size = canvas.size;
  const totalBits = bytes.length * 8;
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (canvas.fixed[y][x] || index >= totalBits) continue;
        canvas.dark[y][x] = bit(bytes[index >>> 3], 7 - (index & 7));
        index++;
      }
    }
  }
}
