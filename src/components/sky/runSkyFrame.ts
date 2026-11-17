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
