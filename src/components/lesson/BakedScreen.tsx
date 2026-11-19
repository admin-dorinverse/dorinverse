// The end of a stop, as in the design: the baked cookie, "Cookie baked!", and the stop's verses, now revealed in the
// person's Bible, in the Berean Standard Bible. The verses arrive with the bake (a moment after); until then a small
// spinner shows in their place.

import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn } from 'react-native-reanimated';
import { sharpCookieSize, type CookieArt } from '@/components/common/cookieArt';
import type { ShownVerse } from '@/data/queries/progress';
import { bakery, navy, text } from '@/theme/colors';
import { cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';

/** How the cookie comes in: one springy grow. */
const COOKIE_IN = ZoomIn.duration(600).easing(Easing.out(Easing.back(1.6)));

/** Props for the baked screen. */
type BakedScreenProps = {
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** The constellation's color. */
  color: string;
  /** The stop's verses, like "Judges 3:7-18". */
  range: string;
  /** The verses' words, or undefined while they arrive. */
  verses: ShownVerse[] | undefined;
  /** True when the bake could not reach the Bible (no connection). */
  failed: boolean;
};

/** The verse number to show: the verse, or chapter and verse once a stop crosses into a new chapter. */
function verseNumber(ref: string, firstChapter: string): string {
  const [, chapter, verse] = ref.split('.');
  return chapter === firstChapter ? verse : `${chapter}:${verse}`;
}

/** "Cookie baked!" with the revealed verses. */
export function BakedScreen({ art, color, range, verses, failed }: BakedScreenProps) {
  const size = sharpCookieSize(110);
  const firstChapter = verses?.[0]?.ref.split('.')[1] ?? '';
  return (
    <View style={styles.wrap}>
      <Animated.View entering={COOKIE_IN}>
        <Image source={art.baked} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Baked cookie" />
      </Animated.View>
      <Text style={styles.title}>Cookie baked!</Text>
      <Text style={[styles.tag, { backgroundColor: color }]}>VERSES REVEALED</Text>
      <View style={styles.body}>
        {verses ? (
          <Text style={styles.words}>
            {verses.map((v) => (
              <Text key={v.ref}>
                <Text style={styles.number}>{verseNumber(v.ref, firstChapter)} </Text>
                {v.text}{' '}
              </Text>
            ))}
          </Text>
        ) : failed ? (
          <Text style={styles.words}>These verses will show in your Bible once you are back online.</Text>
        ) : (
          <ActivityIndicator color={bakery.gold} />
        )}
      </View>
      <Text style={styles.source}>{`${range} · Berean Standard Bible`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 6 },
  title: { fontFamily: fonts.black, fontSize: 26, color: text.onDark, marginTop: 8 },
  tag: { marginTop: 12, marginBottom: 8, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden', fontFamily: fonts.black, fontSize: 12, letterSpacing: 1, color: navy },
  body: { alignSelf: 'stretch', backgroundColor: cream.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, minHeight: 60, justifyContent: 'center' },
  words: { fontFamily: fonts.body, fontSize: 16.5, lineHeight: 26, color: cream.ink },
  number: { fontFamily: fonts.black, fontSize: 11, color: cream.kind },
  source: { fontFamily: fonts.bold, fontSize: 12, color: bakery.mist, marginTop: 8 },
});
