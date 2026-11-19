// Where the orbit view's pieces sit, as in the Constellations design: the big star right of center, each stop's
// cookie on its own ring around it (inner ring first), fanned out to the left, and the curved paths between them.
// Worked out once per screen size, never while anything moves.

/** One stop's spot. */
export type NodeSpot = { x: number; y: number; ring: number };

/** The whole layout. */
export type OrbitLayout = {
  /** The big star's center. */
  starX: number;
  starY: number;
  /** The cookie size. */
  size: number;
  /** Each stop's spot, first stop first. */
  nodes: NodeSpot[];
  /** The curved path from each stop to the next, as SVG path text. */
  paths: string[];
};

/** Goes from `a` to `b` as `t` goes 0 to 1. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lays out `count` stops for a screen of `width` by `height`, with cookies of `size`. */
export function orbitLayout(count: number, width: number, height: number, size: number): OrbitLayout {
  const starX = width > 760 ? width * 0.72 : width * 0.8;
  const starY = height * 0.53;
  const r0 = Math.min(150, width * 0.34);
  const rMax = Math.min(Math.max(r0, starX - size * 0.75), height * 0.42, 520);
  const nodes: NodeSpot[] = [];
  for (let i = 0; i < count; i++) {
    const ring = count === 1 ? Math.min(r0 * 1.25, rMax) : lerp(r0, rMax, i / (count - 1));
    const angle = count === 1 ? 180 : 180 - 26 * ((count - 1) / 2 - i) * (count > 2 ? 1 : 1.2);
    const a = (angle * Math.PI) / 180;
    nodes.push({ x: starX + Math.cos(a) * ring, y: starY + Math.sin(a) * ring, ring });
  }
  const paths: string[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i - 1];
    const q = nodes[i];
    paths.push(`M${p.x} ${p.y} Q${(p.x + q.x) / 2 - 28} ${(p.y + q.y) / 2} ${q.x} ${q.y}`);
  }
  return { starX, starY, size, nodes, paths };
}

/** The design's star rays as SVG text: `n` thin diamonds of `len`, long and short in turn. */
export function raysSvg(color: string, n: number, len: number): string {
  const rays = Array.from({ length: n }, (_, i) => {
    const l = len * (i % 2 ? 0.62 : 1);
    return `<path d="M0 -${l} L3 0 L0 ${l} L-3 0Z" fill="${color}" opacity="${i % 2 ? 0.25 : 0.45}" transform="rotate(${(i / n) * 360})"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300">${rays}</svg>`;
}
