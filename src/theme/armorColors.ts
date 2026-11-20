// Colors for the Armor of God in the sky, taken from the Constellations design: polished silver glass shards, the
// gold, red, steel and leather parts, the faint outlines of shards not earned yet, the glowing edges, and the shine.

/** A gradient as [stops, colors], laid along a line in the armor drawing and mirrored past its ends. */
export type ArmorGradient = { from: readonly [number, number]; to: readonly [number, number]; stops: readonly number[]; colors: readonly string[] };

/** Each shard color's look: its gradient (or plain fill) and the thin line between shards. */
export const shardLooks: Readonly<Record<string, { fill: ArmorGradient | string; seam: string }>> = {
  silver: {
    fill: {
      from: [0, 0],
      to: [160, 220],
      stops: [0, 0.14, 0.26, 0.4, 0.52, 0.66, 0.8, 1],
      colors: ['#ffffff', '#aab4c8', '#f4f7fc', '#7d889f', '#dfe5f0', '#9ca7bc', '#f2f5fa', '#8691a8'],
    },
    seam: 'rgba(30,38,62,0.6)',
  },
  gold: { fill: { from: [0, 0], to: [60, 80], stops: [0, 0.35, 0.6, 1], colors: ['#fff3c4', '#e9b64a', '#fbe08e', '#a06a1c'] }, seam: 'rgba(90,56,10,0.6)' },
  red: { fill: { from: [0, 0], to: [50, 70], stops: [0, 0.45, 0.7, 1], colors: ['#ff8a7a', '#c8332b', '#e2544a', '#7e1d17'] }, seam: 'rgba(70,10,8,0.6)' },
  steel: { fill: { from: [0, 0], to: [40, 60], stops: [0, 0.5, 1], colors: ['#9aa6bf', '#5d6880', '#8691a8'] }, seam: 'rgba(30,38,62,0.6)' },
  leather: { fill: { from: [0, 0], to: [14, 30], stops: [0, 0.5, 1], colors: ['#9a6238', '#6b3f22', '#8a5530'] }, seam: 'rgba(40,20,8,0.6)' },
  dark: { fill: '#2a1a0c', seam: 'rgba(30,38,62,0.6)' },
};

/** The four light and shade layers over earned shards, so neighbors catch the light differently: [color, opacity]. */
export const shardShades: readonly (readonly [string, number])[] = [
  ['#ffffff', 0.16],
  ['#ffffff', 0.05],
  ['#0e1430', 0.06],
  ['#0e1430', 0.14],
];

/** The armor's other colors. */
export const armor = {
  /** A shard not earned yet: its faint fill and outline. */
  missingFill: 'rgba(255,255,255,0.035)',
  missingLine: 'rgba(205,215,240,0.28)',
  /** A piece's edge at rest, and at the top of its glow. */
  rim: 'rgba(225,233,250,0.45)',
  rimBright: 'rgba(240,246,255,0.95)',
  /** The soft light blue glow around a piece as it pulses. */
  pulseGlow: 'rgba(205,222,255,0.75)',
  /** The glow around the whole armor, and its shadow. */
  halo: 'rgba(200,220,255,0.35)',
  shadow: 'rgba(0,0,0,0.5)',
  /** The shine that sweeps across earned shards: its bright middle. */
  sheen: 'rgba(255,255,255,0.85)',
  sheenClear: 'rgba(255,255,255,0)',
  /** The glow behind the "My Armor" name. */
  nameGlow: 'rgba(255,214,140,0.9)',
} as const;
