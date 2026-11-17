// One tick of the living sky: works out the time since the last frame, then moves the camera, the rocket
// and the scenery. Runs on the animation thread every frame.

import type { Constellation } from '@/types/constellation';
import type { SkyState } from './skyState';
import { stepCamera } from './stepCamera';
import { stepRocket } from './stepRocket';
import { stepScenery } from './stepScenery';

/** Moves the whole sky forward to time `now` (milliseconds). Returns an arrival tag if a flight just ended. */
export function runSkyFrame(s: SkyState, now: number, constellations: readonly Constellation[], labelWidths: readonly number[]): string {
  'worklet';
  if (s.startedAt < 0) s.startedAt = now;
  const dt = s.lastFrameAt < 0 ? 1 / 60 : Math.min(0.05, Math.max(0.001, (now - s.lastFrameAt) / 1000));
  s.lastFrameAt = now;
  const arrivedAt = stepCamera(s, now, dt);
  stepRocket(s, now, dt, constellations, labelWidths);
  stepScenery(s, now, dt, constellations);
  return arrivedAt;
}

/**
 * True while something in the star sky moves fast: the camera (a drag, a flight, a glide), a shooting star,
 * a constellation drawing itself in, the rocket's trail streaming, or the sky fading between tabs.
 * The star sky draws 60 times a second then, and 20 when only slow things (twinkles) move.
 */
export function skyIsBusy(s: SkyState): boolean {
  'worklet';
  if (s.drag.on || s.flight.on || s.camera.vx !== 0 || s.camera.vy !== 0) return true;
  if (s.shootingStars.length > 0 || s.rocket.speed > 60) return true;
  if (s.worldShown > 0 && s.worldShown < 1) return true;
  for (let i = 0; i < s.drawnIn.length; i++) if (s.drawnIn[i] > 0 && s.drawnIn[i] < 1) return true;
  return false;
}

/** Updates the sky's screen size and whether the phone asks for less motion. */
export function setSkyScreen(s: SkyState, width: number, height: number, reduceMotion: boolean): void {
  'worklet';
  s.width = width;
  s.height = height;
  s.reduceMotion = reduceMotion;
}

/** Switches between the Sky tab (everything shows) and the other tabs (only the stars show). */
export function setSkyAtHome(s: SkyState, atHome: boolean): void {
  'worklet';
  s.atHome = atHome;
  if (!atHome) {
    s.drag.on = false;
    s.flight.on = false;
  }
}
