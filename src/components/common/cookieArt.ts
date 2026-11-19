// Each constellation's one kind of cookie, from papa-dorin.md: the dough scoop shown until a stop is baked, and the
// baked cookie after. Narrative is Chip's chocolate chip, Poetry & Wisdom Sparkle's sprinkles, Letters Minty's
// peppermint, Prophetic Berry's raisin, Parables Buttercup's butterscotch, and Sermons Ruby's strawberry.

import { PixelRatio } from 'react-native';

/** A cookie's two pictures. */
export type CookieArt = { dough: number; baked: number };

/** The cookies by constellation id. */
const ART: Readonly<Record<string, CookieArt>> = {
  stories: { dough: require('../../../assets/images/cookies/chocolate-chip-scoop.webp'), baked: require('../../../assets/images/cookies/chocolate-chip-cooked.webp') },
  poems: { dough: require('../../../assets/images/cookies/sprinkles-scoop.webp'), baked: require('../../../assets/images/cookies/sprinkles-cooked.webp') },
  letters: { dough: require('../../../assets/images/cookies/peppermint-scoop.webp'), baked: require('../../../assets/images/cookies/peppermint-cooked.webp') },
  prophecies: { dough: require('../../../assets/images/cookies/raisin-scoop.webp'), baked: require('../../../assets/images/cookies/raisin-cooked.webp') },
  parables: { dough: require('../../../assets/images/cookies/butterscotch-scoop.webp'), baked: require('../../../assets/images/cookies/butterscotch-cooked.webp') },
  sermons: { dough: require('../../../assets/images/cookies/strawberry-scoop.webp'), baked: require('../../../assets/images/cookies/strawberry-cooked.webp') },
};

/** The cookie of a constellation (chocolate chip when the id is unknown). */
export function cookieArtFor(constellationId: string): CookieArt {
  return ART[constellationId] ?? ART.stories;
}

/** The cookie pictures are 200 pixels wide. */
const ART_PIXELS = 200;

/** Papa Dorin's picture is 688 pixels tall. */
const DORIN_PIXELS_TALL = 688;

/** The biggest a cookie can be drawn on this phone without being stretched past its pixels (which blurs it). */
export function sharpCookieSize(wanted: number): number {
  return Math.min(wanted, Math.floor(ART_PIXELS / PixelRatio.get()));
}

/** The tallest Papa Dorin can be drawn on this phone without being stretched past his pixels. */
export function sharpDorinHeight(wanted: number): number {
  return Math.min(wanted, Math.floor(DORIN_PIXELS_TALL / PixelRatio.get()));
}

/** Papa Dorin's picture. */
export const PAPA_DORIN = require('../../../assets/images/papa-dorin.webp');
