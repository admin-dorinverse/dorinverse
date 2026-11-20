// The picture at the top of a cookie's quick look: a place's photo, a character's round badge, or the same little
// animated scene the collection shows (the compass for instructions, the candle for prayers, the light running from
// prophecy to fulfillment). Place photos are fetched ahead when the card shows, so they appear at once.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { CharacterBadge } from '@/components/characters/CharacterBadge';
import { CompassScene, PrayerCandle, ProphecyLink } from '@/components/collections/SmallScenes';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { cream } from '@/theme/lessonColors';
import type { LessonCookie } from '@/types/lesson';

/** The photo's width and height. */
const PHOTO_W = 300;
const PHOTO_H = 170;

/** Props for a cookie's picture. */
type CookiePictureProps = {
  /** The cookie. */
  cookie: LessonCookie;
  /** The card's shared timer, for the animated scenes. */
  clock: AmbientClock;
};

/** A cookie's picture, or nothing for a place with no photo. */
export function CookiePicture({ cookie, clock }: CookiePictureProps) {
  if (cookie.target.kind === 'place') {
    return cookie.photo ? <Image source={{ uri: cookie.photo }} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={0} /> : null;
  }
  if (cookie.target.kind === 'character') return <CharacterBadge name={cookie.title} size={88} />;
  // The collection cookies show their collection's scene on a dark round, as on the Collections tab.
  const scene = cookie.label === 'Prayer' ? <PrayerCandle clock={clock} /> : cookie.label.startsWith('Prophecy') ? <ProphecyLink clock={clock} /> : <CompassScene clock={clock} />;
  return <View style={[styles.stage, cookie.label.startsWith('Prophecy') && styles.wide]}>{scene}</View>;
}

/** The photo addresses among a card's cookies, for fetching ahead. */
export function cookiePhotos(cookies: readonly LessonCookie[]): string[] {
  return cookies.flatMap((k) => (k.photo ? [k.photo] : []));
}

/** Fetches a card's cookie photos ahead, so a quick look opens with its photo already there. */
export function prefetchCookiePhotos(cookies: readonly LessonCookie[]): void {
  const photos = cookiePhotos(cookies);
  if (photos.length) void Image.prefetch(photos, 'disk');
}

const styles = StyleSheet.create({
  photo: { width: PHOTO_W, height: PHOTO_H, maxWidth: '100%', borderRadius: 16, backgroundColor: cream.photoBack },
  stage: { minWidth: 130, minHeight: 110, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: cream.sceneBack },
  wide: { paddingHorizontal: 6 },
});
