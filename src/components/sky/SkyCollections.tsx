// The Collections area in the sky: a named, softly edged patch where the six collection cards float at random
// spots, each with its usual animated scene. The area slides with the camera; its scenes animate only while it
// is on screen on the Sky tab, and taps reach the cards through the sky's tap check (see skyTap.ts).

import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { BookShelf } from '@/components/collections/BookShelf';
import { CharacterFan } from '@/components/collections/CharacterFan';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { PlacesMap } from '@/components/collections/PlacesMap';
import { CompassScene, PrayerCandle, ProphecyLink } from '@/components/collections/SmallScenes';
import { useAmbientClock, type AmbientClock } from '@/components/common/useAmbientClock';
import { useFanCharacters } from '@/data/queries/characters';
import { usePlacePins } from '@/data/queries/places';
import { sampleVerseBooks } from '@/data/sample/collections';
import { sky as skyColors, text } from '@/theme/colors';
import { textStyles } from '@/theme/text';
import type { CollectedCharacter, CollectedPlace, CollectionKind } from '@/types/collection';
import { COLLECTIONS_TITLE_Y, COLLECTIONS_ZONE, SKY_COLLECTIONS, collectionsOnScreen } from './collectionsZone';
import { useSky } from './SkyProvider';

/** Width of the box the area's name is centered in. */
const TITLE_W = 400;

/**
 * True while something in the area moves fast, so its timer ticks 60 times a second then:
 * the cards coming in, the books sliding along the shelf, and the character cards changing places.
 */
function collectionsBusy(time: number): boolean {
  'worklet';
  if (time < 1800) return true;
  if (time >= 2600 && (time - 2600) % 3000 < 900) return true;
  return time >= 3400 && time % 3400 < 800;
}

/** What a scene needs: the area's timer and the collected things it shows. */
type SceneProps = { clock: AmbientClock; characters: readonly CollectedCharacter[]; places: readonly CollectedPlace[] };

/** The animated scene for one collection, the same one its card shows anywhere. */
function Scene({ kind, clock, characters, places }: SceneProps & { kind: CollectionKind }) {
  switch (kind) {
    case 'verses':
      return <BookShelf books={sampleVerseBooks} clock={clock} />;
    case 'characters':
      return <CharacterFan characters={characters} clock={clock} />;
    case 'places':
      return <PlacesMap places={places} clock={clock} />;
    case 'prophecy':
      return <ProphecyLink clock={clock} />;
    case 'instructions':
      return <CompassScene clock={clock} />;
    case 'prayers':
      return <PrayerCandle clock={clock} />;
  }
}

/** The Collections area. Place it over the sky canvas, under the rocket. */
export function SkyCollections() {
  const { sky, pulse, collectionCards, collectionBoxes } = useSky();
  // The newest collected characters and places, from memory (loaded when the app starts).
  const characters = useFanCharacters();
  const places = usePlacePins();
  const clock = useAmbientClock(collectionsBusy, () => {
    'worklet';
    const s = sky.get();
    return s.worldShown > 0 && collectionsOnScreen(s.camera.x, s.camera.y, s.width, s.height);
  });

  // Follows the camera: the sky's (0, 0) spot, slid to where it is on screen. Hidden while far off screen.
  const place = useAnimatedStyle(() => {
    pulse.get();
    const s = sky.get();
    const near = collectionsOnScreen(s.camera.x, s.camera.y, s.width, s.height);
    return {
      opacity: near ? s.worldShown : 0,
      transform: [{ translateX: s.width / 2 - s.camera.x }, { translateY: s.height / 2 - s.camera.y }],
    };
  });

  /** Remembers a card's real height once it is laid out, so taps match what shows. */
  const measure = (index: number) => (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    const boxes = collectionBoxes.get().map((b, i) => (i === index ? { ...b, h } : b));
    collectionBoxes.set(boxes);
  };

  const z = COLLECTIONS_ZONE;
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, place]}>
      <View style={[styles.edge, { left: z.x - z.halfW, top: z.y - z.halfH, width: z.halfW * 2, height: z.halfH * 2 }]} />
      <Text style={[textStyles.tabTitle, styles.title, { left: z.x - TITLE_W / 2, top: COLLECTIONS_TITLE_Y - 40 }]}>Collections</Text>
      {SKY_COLLECTIONS.map((item, i) => {
        const box = collectionCards[i];
        return (
          <View key={item.kind} onLayout={measure(i)} style={[styles.card, item.layout === 'narrow' && styles.cardNarrow, { left: box.x, top: box.y, width: box.w }]}>
            <CollectionCard title={item.title} note={item.note} hue={item.hue} layout={item.layout} index={i} clock={clock} onPress={() => {}}>
              <Scene kind={item.kind} clock={clock} characters={characters} places={places} />
            </CollectionCard>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' },
  edge: { position: 'absolute', borderRadius: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: skyColors.collectionsEdge },
  title: {
    position: 'absolute',
    width: TITLE_W,
    textAlign: 'center',
    color: text.onDark,
    textShadowColor: skyColors.collectionsGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  card: { position: 'absolute' },
  // A narrow card fills its row the way it does beside its partner on a page.
  cardNarrow: { flexDirection: 'row' },
});
