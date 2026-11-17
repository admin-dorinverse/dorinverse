// Small timing helpers for animations driven by a page's shared timer (see useAmbientClock.ts).
// They all run on the animation thread and turn a time into how far along a move is.

/** Keeps a number between 0 and 1. */
export function clamp01(x: number): number {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** How far along (0 to 1) a one-time move is that starts at `delay` ms and lasts `duration` ms. */
export function progress(time: number, delay: number, duration: number): number {
  'worklet';
  return clamp01((time - delay) / duration);
}

/** How far along (0 to 1) a repeating loop of `period` ms is, after a first wait of `delay` ms. */
export function loop(time: number, period: number, delay = 0): number {
  'worklet';
  if (time < delay) return 0;
  return ((time - delay) % period) / period;
}

/** A smooth start and stop, like CSS ease-in-out. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** A quick start that slows to a stop, like CSS ease-out. */
export function easeOut(t: number): number {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

/** A quick start that goes a little past the end and settles back, like the design's springy moves. */
export function easeOutBack(t: number, overshoot = 1.4): number {
  'worklet';
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

/** A soft wave between 0 and 1 and back over `period` ms, for breathing glows and bobbing. */
export function wave(time: number, period: number, offset = 0): number {
  'worklet';
  return (1 - Math.cos(((time + offset) / period) * 2 * Math.PI)) / 2;
}

/** Goes `from` to `to` as `t` goes 0 to 1. */
export function mix(t: number, from: number, to: number): number {
  'worklet';
  return from + (to - from) * t;
}
