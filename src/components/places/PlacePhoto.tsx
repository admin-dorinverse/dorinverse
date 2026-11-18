// A place's photo, drawn by expo-image from the phone's disk cache (the photos are fetched when the app starts):
// the round grid thumbnail or the wide page header. With no photo, or if it can't be shown, the plain look shows
// instead: a sage gradient with the sign for the kind of place.

import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { kindSign } from '@/data/queries/places';
import { places } from '@/theme/colors';
import type { PlaceCard } from '@/types/place';

/** The photo's box, which both the photo and the plain look take. */
type PhotoBox = Pick<ViewStyle, 'width' | 'height' | 'aspectRatio' | 'borderRadius' | 'borderWidth' | 'borderColor'>;

/** Props for a place photo. */
type PlacePhotoProps = {
  /** The place shown. */
  place: PlaceCard;
  /** Which copy: the small round thumbnail or the wide header. */
  size: 'small' | 'header';
  /** The photo's box: its width, height and corner rounding. */
  style: PhotoBox;
  /** How big the kind sign is in the plain look. */
  signSize: number;
};

/** The photo, or the plain look. */
export const PlacePhoto = memo(function PlacePhoto({ place, size, style, signSize }: PlacePhotoProps) {
  // The address that failed to show, if any; a different place's photo gets its own try.
  const [failed, setFailed] = useState<string | null>(null);
  const url = place.photo ? place.photo[size] : null;
  if (url && failed !== url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.photo, style]}
        contentFit="cover"
        cachePolicy={size === 'small' ? 'memory-disk' : 'disk'}
        recyclingKey={place.lookup}
        transition={0}
        accessibilityIgnoresInvertColors
        onError={() => setFailed(url)}
      />
    );
  }
  return (
    <View style={[styles.plain, style]}>
      <Text style={{ fontSize: signSize }}>{kindSign(place.kind)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  photo: { backgroundColor: places.chipOn, overflow: 'hidden' },
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundImage: `linear-gradient(135deg, ${places.badgeLight}, ${places.badgeDark})`,
  },
});
