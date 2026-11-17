// Loads and prepares every ready-made picture the sky draws: the planet with its glow, the star shapes, the
// nebula, the dust and the constellation names. The sky waits for these before it shows, so the planet is there
// from the very first frame.

import { useImage, type SkFont } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio } from 'react-native';
import type { Constellation } from '@/types/constellation';
import { PLANET_WIDTH } from './bakeryLayout';
import type { BackdropArt } from './drawBackdrop';
import { makeDustField } from './dustField';
import { makeLabelPictures, type LabelPicture } from './labelPictures';
import { makeNebulaPicture } from './nebulaPicture';
import { makePlanetSprite, type PlanetSprite } from './planetSprite';
import { NEBULA_PARALLAX } from './skyLayout';
import { makeStarSheet } from './starSheet';

/** Everything the sky draws that is made ahead of time. */
export type SkyArt = {
  /** The bakery planet with its glow. */
  planet: PlanetSprite;
  /** The nebula, dust and star shapes. */
  backdrop: BackdropArt;
  /** Each constellation's glowing name. */
  labels: readonly (LabelPicture | null)[];
};

/** Prepares the sky's pictures. Returns null until the planet and the name font are ready. */
export function useSkyArt(constellations: readonly Constellation[], font: SkFont | null): SkyArt | null {
  const pixelRatio = PixelRatio.get();
  const planetImage = useImage(require('../../../assets/images/bakery-cookie.webp'));
  const planet = useMemo(() => (planetImage ? makePlanetSprite(planetImage, PLANET_WIDTH, pixelRatio) : null), [planetImage, pixelRatio]);
  const backdrop = useMemo<BackdropArt>(
    () => ({ dust: makeDustField(), stars: makeStarSheet(pixelRatio), nebula: makeNebulaPicture(NEBULA_PARALLAX) }),
    [pixelRatio],
  );
  const labels = useMemo(() => (font ? makeLabelPictures(constellations, font, pixelRatio) : null), [constellations, font, pixelRatio]);

  return useMemo(() => (planet && labels ? { planet, backdrop, labels } : null), [planet, backdrop, labels]);
}
