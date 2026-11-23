// Turns text into the bytes a QR code stores: the text as UTF-8 in byte mode with its length in front, padding up
// to the version's size, then each block's Reed-Solomon check bytes, all woven together in the standard's order.

import { reedSolomonCheckBytes } from './reedSolomon';
import { countBitLength, dataByteCount, type QrVersion } from './versionTables';

/** Turns text into UTF-8 bytes by hand, so it works the same on every phone. Lone half-emoji become "?". */
export function utf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0x3f;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return Uint8Array.from(out);
}

/** A growing list of bits, written a few at a time, highest bit first. */
class BitWriter {
  /** The bits so far, one 0 or 1 per entry. */
  bits: number[] = [];

  /** Adds the lowest `length` bits of `value`, highest first. */
  write(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

/** Builds the padded data bytes: mode, length, the text, an end mark, then the standard's filler bytes. */
function paddedDataBytes(textBytes: Uint8Array, v: QrVersion): Uint8Array {
  const capacityBits = dataByteCount(v) * 8;
  const writer = new BitWriter();
  writer.write(0b0100, 4);
  writer.write(textBytes.length, countBitLength(v));
  for (const byte of textBytes) writer.write(byte, 8);
  writer.write(0, Math.min(4, capacityBits - writer.bits.length));
  writer.write(0, (8 - (writer.bits.length % 8)) % 8);
  for (let filler = 0xec; writer.bits.length < capacityBits; filler ^= 0xec ^ 0x11) writer.write(filler, 8);

  const bytes = new Uint8Array(capacityBits / 8);
  writer.bits.forEach((bit, i) => {
    bytes[i >>> 3] |= bit << (7 - (i & 7));
  });
  return bytes;
}

/** Makes every byte the code will draw: data split into blocks, check bytes added, then woven column by column. */
export function codewords(textBytes: Uint8Array, v: QrVersion): Uint8Array {
  const data = paddedDataBytes(textBytes, v);
  const dataBlocks: Uint8Array[] = [];
  const checkBlocks: Uint8Array[] = [];
  let start = 0;
  for (const length of v.blockDataLengths) {
    const block = data.subarray(start, start + length);
    dataBlocks.push(block);
    checkBlocks.push(reedSolomonCheckBytes(block, v.checkPerBlock));
    start += length;
  }

  const out: number[] = [];
  const longest = Math.max(...v.blockDataLengths);
  for (let i = 0; i < longest; i++) for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  for (let i = 0; i < v.checkPerBlock; i++) for (const block of checkBlocks) out.push(block[i]);
  return Uint8Array.from(out);
}
