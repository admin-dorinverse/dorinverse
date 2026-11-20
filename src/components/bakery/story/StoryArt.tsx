// Picks the picture a chapter of Papa Dorin's Story shows above its words, as in the design's storyArt().

import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import type { StoryArtKind } from '@/types/papaDorinStory';
import { Stage, type ArtProps } from './artParts';
import { CuttersArt, FoundArt, FriendArt, NewArt, PriceArt, WornArt } from './DorinArt';
import { DrawerClosing, DrawerLight } from './DrawerArt';
import { BatchArt, JunkArt, NoteArt } from './KitchenArt';
import { KidsRow } from './KidsRow';
import { AngelArt, FeastArt, PlanetArt, WordArt } from './SkyArt';

/** Chapter 4: the six kids with their names, on a wider stage. */
function KidsArt({ clock }: ArtProps) {
  return (
    <Stage style={styles.wide}>
      <KidsRow clock={clock} named />
    </Stage>
  );
}

/** Each kind of picture's drawing. */
const ART: Record<StoryArtKind, ComponentType<ArtProps>> = {
  price: PriceArt,
  batch: BatchArt,
  cutters: CuttersArt,
  kids: KidsArt,
  worn: WornArt,
  drawer: DrawerClosing,
  junk: JunkArt,
  friend: FriendArt,
  light: DrawerLight,
  angel: AngelArt,
  angel2: AngelArt,
  feast: FeastArt,
  new: NewArt,
  note: NoteArt,
  planet: PlanetArt,
  word: WordArt,
  found: FoundArt,
};

/** Props for a chapter's picture. */
type StoryArtProps = ArtProps & {
  /** Which picture to show. */
  kind: StoryArtKind;
};

/** A chapter's picture. */
export function StoryArt({ kind, clock }: StoryArtProps) {
  const Art = ART[kind];
  return <Art clock={clock} />;
}

const styles = StyleSheet.create({
  wide: { width: 320, alignItems: 'center', justifyContent: 'center' },
});
