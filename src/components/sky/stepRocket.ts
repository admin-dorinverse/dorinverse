// Moves the rocket each frame. It springs after the view, turns toward where it is going, never leaves the
// screen, never parks on a constellation's name, and leaves a glowing trail.

import type { Constellation } from '@/types/constellation';
import { CONSTELLATION_SCALE } from './skyLayout';
import type { SkyState } from './skyState';
import { rocketOffset } from './skyState';

/** The ember trail colors. Other trail styles come later with the Hangar. */
const TRAIL_COLORS = ['#ffd25a', '#ff9a3a', '#fff3c4', '#c98f4a'];

/** Where the rocket wants to be: under the view's center, slid aside if a constellation name is in the way. */
function rocketTarget(s: SkyState, constellations: readonly Constellation[], labelWidths: readonly number[]) {
  'worklet';
  const cam = s.camera;
  let x = cam.x;
  let y = cam.y + rocketOffset(s.height);
  for (let i = 0; i < constellations.length; i++) {
    const c = constellations[i];
    if (s.drawnIn[i] < 0.55) continue;
    const lw = labelWidths[i] || 120;
    const lx0 = c.x - lw / 2 - 10;
    const lx1 = c.x + lw / 2 + 10;
    const ly0 = c.y + CONSTELLATION_SCALE * 112 - 6;
    const ly1 = ly0 + 44;
    if (x + 28 > lx0 && x - 28 < lx1 && y + 62 > ly0 && y - 62 < ly1) {
      const sx0 = cam.x - s.width / 2 + 30;
      const sx1 = cam.x + s.width / 2 - 30;
      const right = lx1 + 30;
      const left = lx0 - 30;
      if (right <= sx1 && (Math.abs(right - x) <= Math.abs(left - x) || left < sx0)) x = right;
      else if (left >= sx0) x = left;
      else y = ly1 + 68;
    }
  }
  return { x, y };
}

/** Moves the rocket and its trail for one frame. `now` is in milliseconds and `dt` in seconds. */
export function stepRocket(
  s: SkyState,
  now: number,
  dt: number,
  constellations: readonly Constellation[],
  labelWidths: readonly number[],
): void {
  'worklet';
  const cam = s.camera;
  const rk = s.rocket;
  const W = s.width;
  const H = s.height;
  const flying = s.flight.on;
  const target = rocketTarget(s, constellations, labelWidths);
  const stiffness = flying ? 34 : 15;
  const damping = flying ? 11 : 7;
  rk.vx += ((target.x - rk.x) * stiffness - rk.vx * damping) * dt;
  rk.vy += ((target.y - rk.y) * stiffness - rk.vy * damping) * dt;
  rk.x += rk.vx * dt;
  rk.y += rk.vy * dt;

  // Keep the rocket inside the frame.
  const off = rocketOffset(H);
  const margin = Math.max(40, W / 2 - 160);
  const x0 = Math.min(cam.x - W / 2 + margin, target.x);
  const x1 = Math.max(cam.x + W / 2 - margin, target.x);
  const y0 = Math.min(cam.y + off - 170, target.y);
  const y1 = Math.max(target.y, cam.y + Math.min(off, H / 2 - 200));
  if (rk.x < x0) {
    rk.x = x0;
    if (rk.vx < cam.vx) rk.vx = cam.vx;
  } else if (rk.x > x1) {
    rk.x = x1;
    if (rk.vx > cam.vx) rk.vx = cam.vx;
  }
  if (rk.y < y0) {
    rk.y = y0;
    if (rk.vy < cam.vy) rk.vy = cam.vy;
  } else if (rk.y > y1) {
    rk.y = y1;
    if (rk.vy > cam.vy) rk.vy = cam.vy;
  }

  // Turn toward travel, or sway gently when resting.
  const speed = Math.hypot(rk.vx, rk.vy);
  rk.speed = speed;
  const want = speed > 60 ? (Math.atan2(rk.vx, -rk.vy) * 180) / Math.PI : Math.sin(now / 900) * 5;
  const turn = ((((want - rk.rotation + 540) % 360) + 360) % 360) - 180;
  rk.rotation += turn * Math.min(1, dt * (speed > 60 ? 7 : 2.5));
  rk.bob = speed < 60 ? Math.sin(now / 650) * 5 : 0;

  // Drop a trail particle from the engine every 30 ms.
  s.trailTimer += dt;
  if (s.trailTimer > 0.03) {
    s.trailTimer = 0;
    if (speed > 140 || Math.random() < 0.35) {
      const r = (rk.rotation * Math.PI) / 180;
      s.trail.push({
        x: rk.x - Math.sin(r) * 58,
        y: rk.y + rk.bob + Math.cos(r) * 58,
        vx: -Math.sin(r) * 60 + (Math.random() - 0.5) * 40,
        vy: Math.cos(r) * 60 + (Math.random() - 0.5) * 40,
        life: 0.9,
        maxLife: 0.9,
        radius: speed > 140 ? 3.2 : 2,
        color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
      });
    }
  }
  for (let i = s.trail.length - 1; i >= 0; i--) {
    const p = s.trail[i];
    p.life -= dt;
    if (p.life <= 0) {
      s.trail.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
