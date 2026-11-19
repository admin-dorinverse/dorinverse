// The Collections area in the sky: the six collection cards kept together in the old Collections page's order,
// shrunk as one group inside a dotted frame, each with its usual animated scene. The group slides with the camera;
// its scenes animate only while it is on screen on the Sky tab, and taps reach the cards through skyTap.ts.

import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
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
import { gutter } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import type { CollectedCharacter, CollectedPlace, CollectionKind } from '@/types/collection';
import { CARD_SCALE, COLLECTIONS_ZONE, SKY_COLLECTIONS, collectionsOnScreen, type CardBox } from './collectionsZone';
import { useSky } from './SkyProvider';

/** Widest a wide card gets, the same as on a page, before the sky shrinks it. */
const CARD_MAX = 560;

/** Space between cards, inside the dotted frame, and the frame's line width, before shrinking. */
const GAP = 12;
const FRAME_PAD = 22;
const FRAME_LINE = 2;

/** A first guess at the group's height before shrinking, used until it is measured. */
const GUESS_HEIGHT = 1400;

/** Width of the box the area's name is centered in, and its height. */
const TITLE_W = 400;
const TITLE_H = 44;

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
  const { sky, pulse, collectionBoxes } = useSky();
  const { width } = useWindowDimensions();
  // The newest collected characters and places, from memory (loaded when the app starts).
  const characters = useFanCharacters();
  const places = usePlacePins();
  const clock = useAmbientClock(collectionsBusy, () => {
    'worklet';
    const s = sky.get();
    return s.worldShown > 0 && collectionsOnScreen(s.camera.x, s.camera.y, s.width, s.height);
  });

  // The group is laid out at page size, then shrunk around its top-left corner and centered on the area.
  const groupW = Math.min(width, CARD_MAX) - gutter * 2 + (FRAME_PAD + FRAME_LINE) * 2;
  const [groupH, setGroupH] = useState(GUESS_HEIGHT);
  const left = COLLECTIONS_ZONE.x - (groupW * CARD_SCALE) / 2;
  const top = COLLECTIONS_ZONE.y - (groupH * CARD_SCALE) / 2;
  // Each card's spot inside the group, and the narrow pair's row. Narrow cards are measured inside that row.
  const spots = useRef<(LayoutRectangle | null)[]>(SKY_COLLECTIONS.map(() => null));
  const pair = useRef({ x: 0, y: 0 });

  /** Turns the measured spots into sky boxes, so taps land on the cards as they show. */
  const publish = (groupTop: number) => {
    const boxes: CardBox[] = [];
    SKY_COLLECTIONS.forEach((item, i) => {
      const r = spots.current[i];
      if (!r) return;
      const inPair = item.layout === 'narrow';
      const x = inPair ? pair.current.x + r.x : r.x;
      const y = inPair ? pair.current.y + r.y : r.y;
      boxes[i] = { x: left + x * CARD_SCALE, y: groupTop + y * CARD_SCALE, w: r.width * CARD_SCALE, h: r.height * CARD_SCALE };
    });
    collectionBoxes.set(boxes);
  };
  const measureCard = (i: number) => (e: LayoutChangeEvent) => {
    spots.current[i] = e.nativeEvent.layout;
    publish(top);
  };
  const measurePair = (e: LayoutChangeEvent) => {
    pair.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
    publish(top);
  };
  const measureGroup = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setGroupH(h);
    publish(COLLECTIONS_ZONE.y - (h * CARD_SCALE) / 2);
  };

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

  /** One card with its scene. */
  const card = (i: number) => {
    const item = SKY_COLLECTIONS[i];
    return (
      <CollectionCard title={item.title} note={item.note} hue={item.hue} layout={item.layout} index={i} clock={clock} onPress={() => {}}>
        <Scene kind={item.kind} clock={clock} characters={characters} places={places} />
      </CollectionCard>
    );
  };

  return (
    <Animated.View pointerEvents="none" style={[styles.origin, place]}>
      <Text style={[textStyles.tabTitle, styles.title, { left: COLLECTIONS_ZONE.x - TITLE_W / 2, top: top - TITLE_H - 10 }]}>Collections</Text>
      <View onLayout={measureGroup} style={[styles.group, { left, top, width: groupW }]}>
        {SKY_COLLECTIONS.map((item, i) =>
          item.layout === 'wide' ? (
            <View key={item.kind} onLayout={measureCard(i)}>
              {card(i)}
            </View>
          ) : null,
        )}
        <View style={styles.pair} onLayout={measurePair}>
          {SKY_COLLECTIONS.map((item, i) =>
            item.layout === 'narrow' ? (
              <View key={item.kind} style={styles.narrow} onLayout={measureCard(i)}>
                {card(i)}
              </View>
            ) : null,
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' },
  title: {
    position: 'absolute',
    width: TITLE_W,
    height: TITLE_H,
    textAlign: 'center',
    color: text.onDark,
    textShadowColor: skyColors.collectionsGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  group: {
    position: 'absolute',
    padding: FRAME_PAD,
    gap: GAP,
    borderRadius: 44,
    borderWidth: FRAME_LINE,
    borderStyle: 'dashed',
    borderColor: skyColors.collectionsEdge,
    transformOrigin: '0 0',
    transform: [{ scale: CARD_SCALE }],
  },
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: GAP },
  // A narrow card fills its half of the row, as it does on a page.
  narrow: { flex: 1, minWidth: 0, flexDirection: 'row' },
});
