// Blends colors the way the Constellations design does with CSS color-mix, so tinted glass and glows match it.
// The results are worked out once when a screen loads, never while it animates.

/** A color split into red, green, blue (0 to 255) and alpha (0 to 1). */
type Rgba = { r: number; g: number; b: number; a: number };

/** Reads "#rrggbb" or "rgba(r,g,b,a)" into its parts. */
function parse(color: string): Rgba {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1, 7), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const [r, g, b, a = 1] = color.replace(/[^\d.,]/g, '').split(',').map(Number);
  return { r, g, b, a };
}

/** Mixes `share` (0 to 1) of `color` with the rest made of `other`, like CSS color-mix in srgb. */
export function mixColor(color: string, share: number, other = 'rgba(0,0,0,0)'): string {
  const x = parse(color);
  const y = parse(other);
  const a = x.a * share + y.a * (1 - share);
  if (a === 0) return 'rgba(0,0,0,0)';
  // Like CSS, each color counts by how see-through it is, so mixing with "transparent" only fades the color.
  const part = (p: number, q: number) => Math.round((p * x.a * share + q * y.a * (1 - share)) / a);
  return `rgba(${part(x.r, y.r)},${part(x.g, y.g)},${part(x.b, y.b)},${Number(a.toFixed(3))})`;
}
