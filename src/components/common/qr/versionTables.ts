// The fixed facts about QR code sizes 1 to 10 at error correction level M (about 15% of the code can be lost
// and still read): how many bytes each holds, how they split into blocks, and where the small alignment squares go.

/** One QR code size (a "version") at level M. */
export type QrVersion = {
  /** The version number, 1 to 10. Each step adds 4 modules to the side. */
  version: number;
  /** Modules along one side: 17 + 4 x version. */
  size: number;
  /** How many check bytes each block gets. */
  checkPerBlock: number;
  /** How many data bytes each block holds, in order (shorter blocks come first). */
  blockDataLengths: number[];
  /** Where the alignment squares' centers sit, along both sides. Empty for version 1. */
  alignment: number[];
};

/** Builds a version's facts from its block groups: each group is [how many blocks, data bytes per block]. */
function version(
  number: number,
  checkPerBlock: number,
  groups: [number, number][],
  alignment: number[],
): QrVersion {
  const blockDataLengths: number[] = [];
  for (const [count, length] of groups) for (let i = 0; i < count; i++) blockDataLengths.push(length);
  return { version: number, size: 17 + 4 * number, checkPerBlock, blockDataLengths, alignment };
}

/** Versions 1 to 10 at level M, from the QR code standard's tables. */
export const QR_VERSIONS: readonly QrVersion[] = [
  version(1, 10, [[1, 16]], []),
  version(2, 16, [[1, 28]], [6, 18]),
  version(3, 26, [[1, 44]], [6, 22]),
  version(4, 18, [[2, 32]], [6, 26]),
  version(5, 24, [[2, 43]], [6, 30]),
  version(6, 16, [[4, 27]], [6, 34]),
  version(7, 18, [[4, 31]], [6, 22, 38]),
  version(8, 22, [[2, 38], [2, 39]], [6, 24, 42]),
  version(9, 22, [[3, 36], [2, 37]], [6, 26, 46]),
  version(10, 26, [[4, 43], [1, 44]], [6, 28, 50]),
];

/** How many data bytes a version holds in total, across all its blocks. */
export function dataByteCount(v: QrVersion): number {
  return v.blockDataLengths.reduce((sum, length) => sum + length, 0);
}

/** How many bits the byte count takes in byte mode: 8 for versions 1 to 9, 16 from version 10. */
export function countBitLength(v: QrVersion): number {
  return v.version < 10 ? 8 : 16;
}

/** Picks the smallest version that fits this many text bytes, or null when even version 10 is too small. */
export function pickVersion(byteLength: number): QrVersion | null {
  for (const v of QR_VERSIONS) {
    const neededBits = 4 + countBitLength(v) + 8 * byteLength;
    if (neededBits <= dataByteCount(v) * 8) return v;
  }
  return null;
}
