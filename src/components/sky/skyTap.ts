// Works out what a tap on the sky landed on: the bakery planet or a constellation (its shape or
// its name).
// Runs on the animation thread.

import type { Constellation } from '@/types/constellation';
import { hitsBakery } from './bakeryLayout';
import { CONSTELLATION_SCALE, HOME_Y } from './skyLayout';
import type { SkyState } from './skyState';
import { startFlight } from './stepCamera';

/**
 * Handles a tap at screen point (x, y). Far-away constellations start a flight; the bakery and close
 * constellations open right away. Returns the tag to open now, or an empty string.
 */
export function handleSkyTap(s: SkyState, x: number, y: number, constellations: readonly Constellation[]): string {
  'worklet';
  const wx = s.camera.x + x - s.width / 2;
  const wy = s.camera.y + y - s.height / 2;
  if (hitsBakery(wx, wy)) return 'bakery';
  for (const c of constellations) {
    const onShape = Math.hypot(c.x - wx, c.y - wy) < CONSTELLATION_SCALE * 125;
    const onName = Math.abs(c.x - wx) < 140 && wy > c.y + CONSTELLATION_SCALE * 95 && wy < c.y + CONSTELLATION_SCALE * 150;
    if (!onShape && !onName) continue;
    const tag = `constellation:${c.id}`;
    if (Math.hypot(c.x - s.camera.x, c.y - s.camera.y) <= 40) return tag;
    startFlight(s, c.x, c.y, tag, s.lastFrameAt);
    return '';
  }
  return '';
}

/** The camera's resting spot over the bakery. */
export const BAKERY_SPOT = { x: 0, y: HOME_Y } as const;
