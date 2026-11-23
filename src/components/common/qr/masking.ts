// The 8 mask patterns a QR code may use to flip its data modules, and the standard's penalty score that says how
// hard a masked code is for a camera to read (long runs, solid blocks, look-alike corner squares, too dark or light).

import type { QrCanvas } from './modulePlacement';

/** Says whether mask `mask` flips the module at a column and row, using the standard's 8 formulas. */
function maskFlips(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Flips every data module the mask picks. Running it twice with the same mask undoes it. */
export function applyMask(canvas: QrCanvas, mask: number): void {
  for (let y = 0; y < canvas.size; y++) {
    for (let x = 0; x < canvas.size; x++) {
      if (!canvas.fixed[y][x] && maskFlips(mask, x, y)) canvas.dark[y][x] = !canvas.dark[y][x];
    }
  }
}

/** The two 11-module patterns that look like a corner square's middle line (dark = 1), for penalty rule 3. */
const FINDER_LIKE = [
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
];

/** Scores one line of modules for rule 1 (runs of 5 or more of one color) and rule 3 (corner look-alikes). */
function lineScore(line: boolean[]): number {
  let score = 0;
  let runLength = 1;
  for (let i = 1; i <= line.length; i++) {
    if (i < line.length && line[i] === line[i - 1]) {
      runLength++;
      continue;
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
    runLength = 1;
  }
  for (let start = 0; start + 11 <= line.length; start++) {
    for (const pattern of FINDER_LIKE) {
      let same = true;
      for (let k = 0; k < 11 && same; k++) same = line[start + k] === (pattern[k] === 1);
      if (same) score += 40;
    }
  }
  return score;
}

/** Gives the standard's penalty score for a finished grid. Lower is easier to read. */
export function penaltyScore(canvas: QrCanvas): number {
  const { size, dark } = canvas;
  let score = 0;

  // Rules 1 and 3, along every row and every column.
  for (let y = 0; y < size; y++) score += lineScore(dark[y]);
  for (let x = 0; x < size; x++) score += lineScore(dark.map((row) => row[x]));

  // Rule 2: every 2 by 2 block of one color.
  for (let y = 0; y + 1 < size; y++) {
    for (let x = 0; x + 1 < size; x++) {
      const c = dark[y][x];
      if (c === dark[y][x + 1] && c === dark[y + 1][x] && c === dark[y + 1][x + 1]) score += 3;
    }
  }

  // Rule 4: 10 points for each 5% the dark share is away from half.
  let darkCount = 0;
  for (const row of dark) for (const isDark of row) if (isDark) darkCount++;
  const total = size * size;
  score += 10 * Math.floor(Math.abs(darkCount * 20 - total * 10) / total);
  return score;
}
