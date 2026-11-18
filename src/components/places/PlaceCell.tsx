// One collected place in the Places grid: its round photo (or the plain look), its name, and where it was found.
// Tapping opens its page.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { places, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { FoundPlace } from '@/types/place';
import { PlacePhoto } from './PlacePhoto';

/** How wide the round thumbnail shows, in points. */
const THUMB = 56;

/** Props for a grid cell. */
type PlaceCellProps = {
  /** The place shown. */
  place: FoundPlace;
  /** Opens the place's page. */
  onPress: (place: FoundPlace) => void;
};

/** A grid cell. */
export const PlaceCell = memo(function PlaceCell({ place, onPress }: PlaceCellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, found in ${place.foundIn}`}
      onPress={() => {
        playSound('tap');
        onPress(place);
      }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
    >
      <PlacePhoto place={place} size="small" style={styles.thumb} signSize={26} />
      <Text style={styles.name} numberOfLines={2}>
        {place.name}
      </Text>
      <Text style={styles.found} numberOfLines={2}>
        Found in {place.foundIn}
      </Text>
    </Pressable>
  );
});

/** An empty spot that fills out the last row, so every cell in the grid is the same width. */
export function BlankPlaceCell() {
  return <View style={styles.blank} />;
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  pressed: { opacity: 0.7 },
  blank: { flex: 1 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 1.5, borderColor: places.accent },
  name: { fontFamily: fonts.black, fontSize: 15, lineHeight: 18, color: text.onDark, textAlign: 'center', marginTop: 6 },
  found: { fontFamily: fonts.bold, fontSize: 12.5, color: places.soft, textAlign: 'center' },
});
