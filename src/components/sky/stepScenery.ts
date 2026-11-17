// Updates the sky's scenery each frame: shooting stars, constellations drawing themselves in, names fading,
// cookie boxes puffing from the bakery chimney, and the planet fading away on other tabs.

import type { Constellation } from '@/types/constellation';
import type { SkyState } from './skyState';

/** How many cookie boxes can float out of the chimney at once. */
const MAX_CHIMNEY_BOXES = 3;

/** How many different box pictures there are. */
export const CHIMNEY_BOX_KINDS = 8;

/** True when a constellation's center is near enough to the screen to be drawn. */
export function constellationOnScreen(s: SkyState, c: Constellation): boolean {
  'worklet';
  const sx = c.x - s.camera.x + s.width / 2;
  const sy = c.y - s.camera.y + s.height / 2;
  return sx > -400 && sx < s.width + 400 && sy > -400 && sy < s.height + 400;
}

/** Updates the scenery for one frame. `now` is in milliseconds and `dt` in seconds. */
export function stepScenery(s: SkyState, now: number, dt: number, constellations: readonly Constellation[]): void {
  'worklet';
  // Shooting stars: one every 5 to 12 seconds, each lasting 0.9 seconds.
  if (s.nextShootingStar < 0) s.nextShootingStar = now + 4000;
  if (now > s.nextShootingStar) {
    s.nextShootingStar = now + 5000 + Math.random() * 7000;
    const a = (0.15 + Math.random() * 0.5) * Math.PI;
    s.shootingStars.push({
      x: Math.random() * s.width,
      y: Math.random() * s.height * 0.5,
      vx: Math.cos(a) * 900 * (Math.random() < 0.5 ? -1 : 1),
      vy: Math.sin(a) * 500,
      life: 0,
    });
  }
  for (let i = s.shootingStars.length - 1; i >= 0; i--) {
    const st = s.shootingStars[i];
    st.life += 1 / 60;
    st.x += st.vx / 60;
    st.y += st.vy / 60;
    if (st.life > 0.9) s.shootingStars.splice(i, 1);
  }

  // Constellations draw themselves in over 2.4 seconds the first time they come into view.
  for (let i = 0; i < constellations.length; i++) {
    const visible = s.atHome && constellationOnScreen(s, constellations[i]);
    if (visible && s.drawnIn[i] < 1) s.drawnIn[i] = Math.min(1, s.drawnIn[i] + dt / 2.4);
    const wantLabel = s.atHome && s.drawnIn[i] > 0.55 ? 1 : 0;
    const step = dt / 0.9;
    s.labelShown[i] = wantLabel > s.labelShown[i] ? Math.min(1, s.labelShown[i] + step) : Math.max(0, s.labelShown[i] - step);
  }

  // The planet, rocket and other sky objects fade over half a second when leaving or returning to the Sky tab.
  const wantWorld = s.atHome ? 1 : 0;
  const fade = dt / 0.5;
  s.worldShown = wantWorld > s.worldShown ? Math.min(1, s.worldShown + fade) : Math.max(0, s.worldShown - fade);

  // A cookie box puffs out of the chimney every 2.6 to 5.6 seconds.
  if (s.nextChimneyBox < 0) s.nextChimneyBox = now;
  if (now >= s.nextChimneyBox) {
    s.nextChimneyBox = now + 2600 + Math.random() * 3000;
    if (s.chimneyBoxes.length < MAX_CHIMNEY_BOXES) {
      s.chimneyBoxes.push({
        startedAt: now,
        duration: 4200 + Math.random() * 1600,
        dx: (Math.random() * 90 + 20) * (Math.random() < 0.35 ? -1 : 1),
        dy: -(150 + Math.random() * 120),
        spin: Math.random() * 260 - 130,
        image: Math.floor(Math.random() * CHIMNEY_BOX_KINDS),
      });
    }
  }
  for (let i = s.chimneyBoxes.length - 1; i >= 0; i--) {
    const b = s.chimneyBoxes[i];
    if (now - b.startedAt > b.duration) s.chimneyBoxes.splice(i, 1);
  }

  // Remember when the sky last moved, so the map button can grow while it moves.
  const moving = s.atHome && (s.drag.on || s.flight.on || Math.hypot(s.camera.vx, s.camera.vy) > 40);
  if (moving) s.lastMovedAt = now;
}
