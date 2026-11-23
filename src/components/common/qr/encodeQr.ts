// The QR maker's front door: turns text into a finished QR grid. It picks the smallest size that fits, tries all
// 8 masks and keeps the one the standard scores easiest to read. Pure TypeScript, no packages and no React.

import { codewords, utf8Bytes } from './dataBytes';
import { applyMask, penaltyScore } from './masking';
import { drawFormat, fixedPatterns, placeBytes, type QrCanvas } from './modulePlacement';
import { pickVersion } from './versionTables';

/** A finished QR code: its side length in modules and which modules are dark. */
export type QrGrid = {
  /** Modules along one side (21 for version 1, up to 57 for version 10). */
  size: number;
  /** modules[row][column] is true for a dark module. */
  modules: boolean[][];
};

/**
 * Makes the QR grid for some text (stored as UTF-8, error correction level M, version 1 to 10).
 * Returns null when the text is too long for version 10 (213 bytes).
 */
export function encodeQr(text: string): QrGrid | null {
  const bytes = utf8Bytes(text);
  const version = pickVersion(bytes.length);
  if (!version) return null;

  const canvas: QrCanvas = fixedPatterns(version);
  placeBytes(canvas, codewords(bytes, version));

  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(canvas, mask);
    drawFormat(canvas, mask);
    const score = penaltyScore(canvas);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(canvas, mask);
  }
  applyMask(canvas, bestMask);
  drawFormat(canvas, bestMask);
  return { size: canvas.size, modules: canvas.dark };
}
