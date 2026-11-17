// Moves the camera each frame: smooth flights, gliding after a throw, and springing back at the sky's edges.

import { SKY_BOUNDS } from './skyLayout';
import { clamp, easeInOutCubic, lerp } from './skyMath';
import type { SkyState } from './skyState';

/** Fastest the sky may glide after a throw, in points per second. */
const MAX_THROW_SPEED = 4200;

/**
 * Moves the camera for one frame. Returns the arrival tag when a flight just finished, otherwise an empty string.
 * `now` is in milliseconds and `dt` in seconds.
 */
export function stepCamera(s: SkyState, now: number, dt: number): string {
  'worklet';
  const cam = s.camera;
  const fly = s.flight;
  if (fly.on) {
    const k = clamp((now - fly.startedAt) / fly.duration, 0, 1);
    const e = easeInOutCubic(k);
    const px = cam.x;
    const py = cam.y;
    cam.x = lerp(fly.fromX, fly.toX, e);
    cam.y = lerp(fly.fromY, fly.toY, e);
    cam.vx = (cam.x - px) / dt;
    cam.vy = (cam.y - py) / dt;
    if (k >= 1) {
      fly.on = false;
      cam.vx = 0;
      cam.vy = 0;
      const tag = fly.arrivalTag;
      fly.arrivalTag = '';
      return tag;
    }
    return '';
  }
  if (s.drag.on) return '';
  cam.x += cam.vx * dt;
  cam.y += cam.vy * dt;
  const friction = Math.pow(0.06, dt);
  cam.vx *= friction;
  cam.vy *= friction;
  if (Math.abs(cam.vx) < 2) cam.vx = 0;
  if (Math.abs(cam.vy) < 2) cam.vy = 0;
  const pastX = cam.x < SKY_BOUNDS.left ? SKY_BOUNDS.left - cam.x : cam.x > SKY_BOUNDS.right ? SKY_BOUNDS.right - cam.x : 0;
  const pastY = cam.y < SKY_BOUNDS.top ? SKY_BOUNDS.top - cam.y : cam.y > SKY_BOUNDS.bottom ? SKY_BOUNDS.bottom - cam.y : 0;
  if (pastX) {
    cam.x += pastX * Math.min(1, dt * 7);
    cam.vx *= 0.8;
  }
  if (pastY) {
    cam.y += pastY * Math.min(1, dt * 7);
    cam.vy *= 0.8;
  }
  return '';
}

/** Starts a smooth flight to a sky spot. Longer trips take longer, between 0.9 and 2.6 seconds. */
export function startFlight(s: SkyState, x: number, y: number, arrivalTag: string, now: number): void {
  'worklet';
  const cam = s.camera;
  const distance = Math.hypot(x - cam.x, y - cam.y);
  const fly = s.flight;
  fly.on = true;
  fly.fromX = cam.x;
  fly.fromY = cam.y;
  fly.toX = x;
  fly.toY = y;
  fly.startedAt = now;
  fly.duration = clamp(700 + distance * 0.42, 900, 2600);
  fly.arrivalTag = arrivalTag;
  cam.vx = 0;
  cam.vy = 0;
}

/** A finger touched the sky: stop gliding and flying, and start tracking the drag. */
export function beginDrag(s: SkyState, x: number, y: number, now: number): void {
  'worklet';
  s.flight.on = false;
  s.flight.arrivalTag = '';
  s.camera.vx = 0;
  s.camera.vy = 0;
  s.drag.on = true;
  s.drag.startX = x;
  s.drag.startY = y;
  s.drag.startedAt = now;
  s.drag.history = [];
}

/** The finger moved by (dx, dy). Past the edges the sky moves at a third of the speed, like a rubber band. */
export function moveDrag(s: SkyState, dx: number, dy: number, now: number): void {
  'worklet';
  const cam = s.camera;
  const rubberX = cam.x < SKY_BOUNDS.left || cam.x > SKY_BOUNDS.right ? 0.35 : 1;
  const rubberY = cam.y < SKY_BOUNDS.top || cam.y > SKY_BOUNDS.bottom ? 0.35 : 1;
  cam.x -= dx * rubberX;
  cam.y -= dy * rubberY;
  const h = s.drag.history;
  h.push({ t: now, x: cam.x, y: cam.y });
  while (h.length && now - h[0].t > 90) h.shift();
}

/** The finger lifted. Throws the sky with the finger's last speed and returns true if it was a tap instead of a drag. */
export function endDrag(s: SkyState, x: number, y: number, now: number): boolean {
  'worklet';
  const d = s.drag;
  if (!d.on) return false;
  d.on = false;
  const h = d.history;
  if (h.length > 1) {
    const a = h[0];
    const b = h[h.length - 1];
    const seconds = (b.t - a.t) / 1000 || 1;
    s.camera.vx = (b.x - a.x) / seconds;
    s.camera.vy = (b.y - a.y) / seconds;
    const speed = Math.hypot(s.camera.vx, s.camera.vy);
    if (speed > MAX_THROW_SPEED) {
      s.camera.vx *= MAX_THROW_SPEED / speed;
      s.camera.vy *= MAX_THROW_SPEED / speed;
    }
  }
  const moved = Math.hypot(x - d.startX, y - d.startY);
  return moved < 10 && now - d.startedAt < 450;
}
