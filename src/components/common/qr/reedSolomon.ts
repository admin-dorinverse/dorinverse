// The math behind a QR code's error correction: multiplying numbers in the 256-number field QR codes use,
// and making the Reed-Solomon check bytes that let a camera fix smudged or missing parts of the code.

/** The field's tables, made once: EXP[i] is 2 to the power i, LOG[n] is the power that gives n. */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

/** Fills the two tables using the field rule QR codes use (the polynomial 0x11D). */
function fillTables(): void {
  let value = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  // A second copy lets multiply skip a "mod 255" step.
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

fillTables();

/** Multiplies two numbers in the field. Zero times anything is zero. */
export function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** The generator polynomials already made, keyed by how many check bytes they give. */
const generators = new Map<number, Uint8Array>();

/**
 * Makes the generator polynomial for a number of check bytes: (x - 1)(x - 2)(x - 4)... in the field.
 * The leading 1 is left out, so the array holds only the lower terms, highest first.
 */
function generatorFor(degree: number): Uint8Array {
  const saved = generators.get(degree);
  if (saved) return saved;
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  generators.set(degree, result);
  return result;
}

/** Makes the check bytes for one block of data bytes: the remainder after dividing by the generator. */
export function reedSolomonCheckBytes(data: Uint8Array, checkCount: number): Uint8Array {
  const generator = generatorFor(checkCount);
  const remainder = new Uint8Array(checkCount);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[checkCount - 1] = 0;
    for (let i = 0; i < checkCount; i++) remainder[i] ^= gfMultiply(generator[i], factor);
  }
  return remainder;
}
