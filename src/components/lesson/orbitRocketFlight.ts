// How the orbit view's rocket flies: it follows the baker's finger, springing just behind it so it moves smoothly.
// A flick sends it gliding on the same way until it slows to a stop. It turns toward where it goes, sways when it
// rests, and leaves a glowing ember trail like the home sky's rocket.

import { TRAIL_COLORS } from '@/components/sky/stepRocket';
import type { TrailParticle } from '@/components/sky/skyState';

/** Fastest a flick can send the rocket, in points a second. */
const MAX_FLICK_SPEED = 2600;

/** How much of a glide's speed is left after one second (it slows like the home sky after a throw). */
const GLIDE_LEFT = 0.06;

/** The screen area the rocket stays in. */
export type FlightEdges = { left: number; right: number; top: number; bottom: number };

/** Everything the rocket remembers between frames. It is changed in place on the animation thread. */
export type OrbitFlight = {
  /** The rocket: where it is, how fast it goes, its turn and bob, and its speed. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  bob: number;
  speed: number;
  /** The spot it springs after, and how fast that spot glides after a flick. */
  tx: number;
  ty: number;
  tvx: number;
  tvy: number;
  /** True while a finger drags; true once it heads off to the Bakery (it may then leave the screen). */
  dragging: boolean;
  leaving: boolean;
  /** The ember trail, and the time since the last ember. */
  trail: TrailParticle[];
  trailTimer: number;
};

/** A rocket at (x, y), springing toward (tx, ty). */
export function newFlight(x: number, y: number, tx: number, ty: number): OrbitFlight {
  return { x, y, vx: 0, vy: 0, rotation: 0, bob: 0, speed: 0, tx, ty, tvx: 0, tvy: 0, dragging: false, leaving: false, trail: [], trailTimer: 0 };
}

/** True while the rocket moves fast enough to need 60 frames a second; resting embers drift fine at 20. */
export function flightBusy(f: OrbitFlight): boolean {
  'worklet';
  return f.dragging || f.leaving || f.speed > 20 || f.tvx !== 0 || f.tvy !== 0;
}

/** Keeps the spot inside the edges (unless leaving). */
function keepInside(f: OrbitFlight, e: FlightEdges): void {
  'worklet';
  if (f.leaving) return;
  if (f.tx < e.left || f.tx > e.right) f.tvx = 0;
  if (f.ty < e.top || f.ty > e.bottom) f.tvy = 0;
  f.tx = Math.min(e.right, Math.max(e.left, f.tx));
  f.ty = Math.min(e.bottom, Math.max(e.top, f.ty));
}

/** A finger moved by (dx, dy): the spot moves with it. */
export function dragFlight(f: OrbitFlight, dx: number, dy: number, e: FlightEdges): void {
  'worklet';
  f.tx += dx;
  f.ty += dy;
  keepInside(f, e);
}

/** A finger took hold: any glide stops. */
export function holdFlight(f: OrbitFlight): void {
  'worklet';
  f.dragging = true;
  f.tvx = 0;
  f.tvy = 0;
}

/** The finger let go moving at (vx, vy): the rocket glides on that way and slows to a stop. */
export function flickFlight(f: OrbitFlight, vx: number, vy: number): void {
  'worklet';
  f.dragging = false;
  const speed = Math.hypot(vx, vy);
  const k = speed > MAX_FLICK_SPEED ? MAX_FLICK_SPEED / speed : 1;
  f.tvx = vx * k;
  f.tvy = vy * k;
}

/** Moves the rocket and its trail for one frame. `now` is in milliseconds and `dt` in seconds. */
export function stepFlight(f: OrbitFlight, now: number, dt: number, e: FlightEdges): void {
  'worklet';
  if (!f.dragging && (f.tvx !== 0 || f.tvy !== 0)) {
    f.tx += f.tvx * dt;
    f.ty += f.tvy * dt;
    const slow = Math.pow(GLIDE_LEFT, dt);
    f.tvx *= slow;
    f.tvy *= slow;
    if (Math.hypot(f.tvx, f.tvy) < 8) {
      f.tvx = 0;
      f.tvy = 0;
    }
    keepInside(f, e);
  }
  // Close behind the finger while dragging or gliding; a softer spring when flying in, settling and flying off.
  const close = f.dragging || f.tvx !== 0 || f.tvy !== 0;
  const stiffness = close ? 90 : f.leaving ? 34 : 15;
  const damping = close ? 19 : f.leaving ? 11 : 7;
  f.vx += ((f.tx - f.x) * stiffness - f.vx * damping) * dt;
  f.vy += ((f.ty - f.y) * stiffness - f.vy * damping) * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  // Turn toward travel, or sway gently when resting.
  const speed = Math.hypot(f.vx, f.vy);
  f.speed = speed;
  const want = speed > 60 ? (Math.atan2(f.vx, -f.vy) * 180) / Math.PI : Math.sin(now / 900) * 5;
  const turn = ((((want - f.rotation + 540) % 360) + 360) % 360) - 180;
  f.rotation += turn * Math.min(1, dt * (speed > 60 ? 7 : 2.5));
  // The resting bob eases in and out, so it never jumps when the rocket starts or stops.
  const bob = !f.dragging && speed < 60 ? Math.sin(now / 650) * 5 : 0;
  f.bob += (bob - f.bob) * Math.min(1, dt * 5);

  // Drop an ember from the engine every 30 ms while it speeds along, and now and then otherwise, as on the home sky.
  f.trailTimer += dt;
  if (f.trailTimer > 0.03) {
    f.trailTimer = 0;
    if (speed > 140 || Math.random() < 0.35) {
      const r = (f.rotation * Math.PI) / 180;
      f.trail.push({
        x: f.x - Math.sin(r) * 58,
        y: f.y + f.bob + Math.cos(r) * 58,
        vx: -Math.sin(r) * 60 + (Math.random() - 0.5) * 40,
        vy: Math.cos(r) * 60 + (Math.random() - 0.5) * 40,
        life: 0.9,
        maxLife: 0.9,
        radius: speed > 140 ? 3.2 : 2,
        color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
      });
    }
  }
  for (let i = f.trail.length - 1; i >= 0; i--) {
    const p = f.trail[i];
    p.life -= dt;
    if (p.life <= 0) {
      f.trail.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
