// Turns text into what QrCode draws: one SVG path holding every dark module, with the quiet border around it.
// Each answer is kept in a small saved list, so opening the same code again never redoes the work.

import { encodeQr } from './encodeQr';

/** How many light modules of border go around the code, as the QR standard asks. */
export const QUIET_ZONE = 4;

/** What a QR code needs to be drawn: the side length in modules (border included) and the dark modules' path. */
export type QrPicture = {
  /** Modules along one side, border included, for the SVG viewBox. */
  side: number;
  /** One SVG path with a rectangle for each run of dark modules in a row. */
  path: string;
};

/** The most codes kept; a person sees only a few, so this stays tiny. */
const KEEP = 8;

/** Codes already made, keyed by their text. */
const saved = new Map<string, QrPicture | null>();

/** Builds the path: each run of dark modules in a row becomes one rectangle, so the path stays short. */
function buildPicture(text: string): QrPicture | null {
  const grid = encodeQr(text);
  if (!grid) return null;
  const parts: string[] = [];
  for (let y = 0; y < grid.size; y++) {
    const row = grid.modules[y];
    let x = 0;
    while (x < grid.size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < grid.size && row[x]) x++;
      const run = x - start;
      parts.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${run}v1h-${run}z`);
    }
  }
  return { side: grid.size + QUIET_ZONE * 2, path: parts.join('') };
}

/** Gives the picture for some text, made once and then reused. Null when the text is too long for a QR code. */
export function qrPicture(text: string): QrPicture | null {
  if (saved.has(text)) return saved.get(text) ?? null;
  const picture = buildPicture(text);
  if (saved.size >= KEEP) {
    const oldest = saved.keys().next().value;
    if (oldest !== undefined) saved.delete(oldest);
  }
  saved.set(text, picture);
  return picture;
}
