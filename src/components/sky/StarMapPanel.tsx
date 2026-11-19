// The Star Map: a glass card that rises from the bottom with a map of the whole sky. Tapping a pin closes the map
// and flies there. Tapping outside the card or the ✕ closes it.

import { Canvas, Picture, createPicture } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sampleUniverseSpots } from '@/data/sample/universe';
import { GlassSurface } from '@/components/common/Glass';
import { CollectionsIcon } from '@/components/common/TabIcons';
import { playSound } from '@/components/common/sounds';
import { bakery, glass, sky as skyColors, starMap, text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import { COLLECTIONS_ZONE } from './collectionsZone';
import { GAMES_ZONE } from './gamesZone';
import { ConstellationGlyph } from './ConstellationGlyph';
import { drawStarMap, type MapSnapshot } from './drawStarMap';
import { HOME_Y } from './skyLayout';
import { useSky } from './SkyProvider';
import { makeMapProjection } from './starMapLayout';

/** Props for the Star Map. */
type StarMapPanelProps = {
  /** Where the camera and rocket were when the map opened. */
  snapshot: MapSnapshot;
  /** Closes the map. */
  onClose: () => void;
};

/** Props for one pin on the map. */
type PinProps = {
  /** Map position of the pin's spot. */
  x: number;
  y: number;
  /** The pin's glow color. */
  color: string;
  /** The pin's name. */
  name: string;
  /** Smaller name text, used for the player's own things. */
  small?: boolean;
  /** The pin's picture. */
  children: React.ReactNode;
  /** Runs when the pin is tapped. */
  onPress: () => void;
};

/** One map pin: a picture with a glowing name under it. */
function Pin({ x, y, color, name, small, children, onPress }: PinProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Fly to ${name}`} onPress={onPress} style={[styles.pin, { left: x, top: y }]}>
      {({ pressed }) => (
        <>
          <View style={pressed && styles.pinPressed}>{children}</View>
          <Text style={[textStyles.mapPin, small && styles.pinSmall, styles.pinName, { textShadowColor: color }]}>{name}</Text>
        </>
      )}
    </Pressable>
  );
}

/** The Star Map panel. */
export function StarMapPanel({ snapshot, onClose }: StarMapPanelProps) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { constellations, flyTo } = useSky();
  const [mapSize, setMapSize] = useState(0);
  const map = useMemo(() => makeMapProjection(mapSize, mapSize, constellations), [mapSize, constellations]);
  const picture = useMemo(
    () => (mapSize ? createPicture((c) => drawStarMap(c, mapSize, mapSize, map, snapshot, constellations), { width: mapSize, height: mapSize }) : null),
    [mapSize, map, snapshot, constellations],
  );

  /** Closes the map, then flies to a spot a moment later, as in the design. */
  const goTo = (x: number, y: number) => {
    playSound('tap');
    onClose();
    setTimeout(() => {
      playSound('route');
      flyTo(x, y);
    }, 180);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={[styles.backdrop, { paddingBottom: insets.bottom + gutter }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the Star Map" />
      <Animated.View entering={SlideInDown.duration(450).easing(Easing.bezier(0.2, 0.9, 0.3, 1.15))} style={styles.cardWrap}>
        <GlassSurface style={styles.card}>
          <View style={styles.header}>
            <Text style={[textStyles.panelTitle, styles.title]}>Star Map</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => { playSound('tap'); onClose(); }} style={styles.close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <View style={[styles.map, { maxHeight: screenH * 0.62 }]} onLayout={(e) => setMapSize(Math.min(e.nativeEvent.layout.width, screenH * 0.62))}>
            {picture && (
              <Canvas style={StyleSheet.absoluteFill}>
                <Picture picture={picture} />
              </Canvas>
            )}
            {mapSize > 0 && (
              <>
                {constellations.map((c) => (
                  <Pin key={c.id} x={map.x(c.x)} y={map.y(c.y)} color={c.color} name={c.name} onPress={() => goTo(c.x, c.y)}>
                    <ConstellationGlyph constellation={c} size={38} />
                  </Pin>
                ))}
                <Pin x={map.x(0)} y={map.y(0)} color={bakery.planetGlow} name="Bakery" onPress={() => goTo(0, HOME_Y)}>
                  <Image source={require('../../../assets/images/bakery-cookie.webp')} style={styles.bakeryPin} contentFit="contain" />
                </Pin>
                <Pin
                  x={map.x(COLLECTIONS_ZONE.x)}
                  y={map.y(COLLECTIONS_ZONE.y)}
                  color={skyColors.collectionsGlow}
                  name="Collections"
                  onPress={() => goTo(COLLECTIONS_ZONE.x, COLLECTIONS_ZONE.y)}
                >
                  <CollectionsIcon color={skyColors.collectionsGlow} size={26} />
                </Pin>
                <Pin x={map.x(GAMES_ZONE.x)} y={map.y(GAMES_ZONE.y)} color={skyColors.collectionsGlow} name="Games" onPress={() => goTo(GAMES_ZONE.x, GAMES_ZONE.y)}>
                  <Text style={[styles.emoji, { textShadowColor: skyColors.collectionsGlow }]}>🧩</Text>
                </Pin>
                {sampleUniverseSpots.map((u) => (
                  <Pin key={u.id} x={map.x(u.x)} y={map.y(u.y)} color={u.pin} name={u.name} small onPress={() => goTo(u.x, u.y)}>
                    <Text style={[styles.emoji, { textShadowColor: u.pin }]}>{u.emoji}</Text>
                  </Pin>
                ))}
              </>
            )}
          </View>
        </GlassSurface>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, zIndex: 40, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: gutter, backgroundColor: glass.backdrop },
  cardWrap: { width: '100%', maxWidth: 520 },
  card: { borderRadius: radius.mapCard, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: glass.mapCard },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 },
  title: { color: text.onDark },
  close: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: glass.button, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: text.onDark, fontSize: 16, fontWeight: '900' },
  map: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    borderRadius: radius.map,
    overflow: 'hidden',
    backgroundImage: `radial-gradient(ellipse at 50% 50%, ${starMap.center} 0%, #0d0f2e 70%, ${starMap.edge} 100%)`,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
  },
  pin: { position: 'absolute', padding: 6, alignItems: 'center', gap: 2, transform: [{ translateX: '-50%' }, { translateY: '-30%' }] },
  pinPressed: { transform: [{ scale: 0.9 }] },
  pinName: { color: text.onDark, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  pinSmall: { fontSize: 10 },
  bakeryPin: { width: 30, height: 30 },
  emoji: { fontSize: 17, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } },
});
