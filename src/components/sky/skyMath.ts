// Small math helpers the sky uses on the animation thread. Each one is a worklet so the sky can call it every frame.

/** Keeps a number between a low and a high limit. */
export function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.max(low, Math.min(high, value));
}

/** Moves a part of the way from one number to another (0 = start, 1 = end). */
export function lerp(from: number, to: number, amount: number): number {
  'worklet';
  return from + (to - from) * amount;
}

/** Starts slow, speeds up, then slows into the end. Used for camera flights. */
export function easeInOutCubic(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** A smooth 0-to-1 step with soft ends. */
export function smoothStep(v: number): number {
  'worklet';
  return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

/** A repeatable "random" number between 0 and 1 for a grid cell, so each star keeps its spot. */
export function cellHash(a: number, b: number, c: number): number {
  'worklet';
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Makes a repeatable random number maker from a seed. The same seed always gives the same numbers. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Follows a CSS cubic-bezier easing curve, so timings match the design exactly. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  'worklet';
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
  let lo = 0;
  let hi = 1;
  let s = t;
  for (let i = 0; i < 20; i++) {
    s = (lo + hi) / 2;
    if (bez(x1, x2, s) < t) lo = s;
    else hi = s;
  }
  return bez(y1, y2, s);
}

/** Turns an angle in degrees into radians. */
export function toRadians(degrees: number): number {
  'worklet';
  return (degrees * Math.PI) / 180;
}
