// Renders the app's little sound effects into WAV files, once. Constellations makes these sounds live with
// Web Audio; this copies the same tones (pitch, shape, length, volume) so the app plays identical sounds.
//
// Run from the repo root:  node scripts/app/render-sounds.mjs
// Output goes to assets/sounds/. Rerun only if a sound recipe below changes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join('assets', 'sounds');

/** One wave cycle value (0..1 phase) for each oscillator type. */
const WAVES = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  triangle: (p) => 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25)),
  sawtooth: (p) => 2 * (p - Math.floor(p + 0.5)),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
};

/** Adds one tone to the buffer, with the same quick fade-in and long fade-out as the design. */
function tone(buf, f, t0, dur, type = 'sine', vol = 0.18, slideTo) {
  const start = Math.floor(t0 * RATE);
  const end = Math.floor((t0 + dur + 0.05) * RATE);
  let phase = 0;
  for (let i = start; i < end && i < buf.length; i++) {
    const t = (i - start) / RATE;
    const freq = slideTo && t <= dur ? f * Math.pow(slideTo / f, t / dur) : slideTo ? slideTo : f;
    phase += freq / RATE;
    let gain;
    if (t < 0.01) gain = (vol * t) / 0.01;
    else if (t < dur) gain = vol * Math.pow(0.0001 / vol, (t - 0.01) / (dur - 0.01));
    else gain = 0.0001;
    buf[i] += WAVES[type](phase % 1) * gain;
  }
}

/** Adds a short filtered noise burst, like a splash. */
function splashNoise(buf) {
  const n = Math.floor(0.5 * RATE);
  const w0 = (2 * Math.PI * 900) / RATE;
  const q = 1;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const x = rand() * Math.pow(1 - i / n, 2);
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] += y * 0.35;
  }
}

/** The recipes, copied from the design's sound list. */
const RECIPES = {
  tap: (b) => tone(b, 660, 0, 0.07, 'triangle', 0.12),
  next: (b) => { tone(b, 520, 0, 0.06, 'triangle', 0.1); tone(b, 780, 0.05, 0.08, 'triangle', 0.1); },
  right: (b) => [523, 659, 784].forEach((f, i) => tone(b, f, i * 0.07, 0.25, 'triangle', 0.16)),
  wrong: (b) => tone(b, 220, 0, 0.25, 'sawtooth', 0.07, 150),
  word: (b) => tone(b, 880, 0, 0.12, 'sine', 0.12, 1320),
  collect: (b) => [988, 1319, 1568, 1976].forEach((f, i) => tone(b, f, i * 0.06, 0.3, 'sine', 0.12)),
  burn: (b) => tone(b, 140, 0, 0.18, 'square', 0.06, 90),
  join: (b) => { tone(b, 196, 0, 0.1, 'square', 0.1); tone(b, 392, 0.95, 0.12, 'triangle', 0.14); [523, 659, 784, 1047].forEach((f, i) => tone(b, f, 1.05 + i * 0.09, 0.6, 'sine', 0.13)); },
  box: (b) => { tone(b, 180, 0.15, 0.12, 'triangle', 0.14); [392, 523, 659, 784, 1047].forEach((f, i) => tone(b, f, 0.4 + i * 0.1, 0.5, 'sine', 0.12)); },
  route: (b) => tone(b, 440, 0, 0.15, 'triangle', 0.12, 880),
  reveal: (b) => [392, 523, 659].forEach((f, i) => tone(b, f, i * 0.11, 0.5, 'triangle', 0.12)),
  ding: (b) => { tone(b, 1568, 0, 0.6, 'sine', 0.12); tone(b, 2093, 0, 0.6, 'sine', 0.08); },
  splash: (b) => { splashNoise(b); tone(b, 260, 0, 0.3, 'sine', 0.12, 140); },
};

/** Writes 16-bit mono WAV bytes. */
function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, recipe] of Object.entries(RECIPES)) {
  const buf = new Float32Array(Math.floor(2 * RATE));
  recipe(buf);
  let last = buf.length - 1;
  while (last > 0 && Math.abs(buf[last]) < 1e-5) last--;
  const trimmed = buf.slice(0, last + Math.floor(0.02 * RATE));
  writeFileSync(join(OUT, `${name}.wav`), toWav(trimmed));
  console.log(`${name}.wav  ${(trimmed.length / RATE).toFixed(2)}s`);
}
