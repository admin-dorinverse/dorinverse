// Papa Dorin's explanation of a pick, as in the design's "Explain the answer / mistake" page: a cream page with a
// back arrow, the explanation in a speech card, Papa Dorin with thumbs up and down, and "Continue lesson". It slides
// in once. The thumbs are only kept on this page for now; nothing is sent anywhere yet.

import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PAPA_DORIN, sharpDorinHeight } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { explainColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';

/** Props for a thumb. */
type ThumbProps = {
  /** Up for helpful, down for not. */
  up: boolean;
  /** True once tapped. */
  on: boolean;
  /** Taps it. */
  onPress: () => void;
};

/** A thumb button, drawn as the design's outline thumb. */
function Thumb({ up, on, onPress }: ThumbProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={up ? 'Helpful' : 'Not helpful'} accessibilityState={{ selected: on }} onPress={onPress} hitSlop={8}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={on ? explainColors.thumbOn : explainColors.thumb} strokeWidth={1.8} strokeLinejoin="round" style={up ? undefined : styles.down}>
        <Path d="M7 10v11H3V10z" />
        <Path d="M7 10l4-8c1.7 0 3 1.3 3 3v4h5.5c1.4 0 2.4 1.3 2 2.6l-2.2 7.5c-.3.9-1.1 1.4-2 1.4H7" />
      </Svg>
    </Pressable>
  );
}

/** Props for the explain page. */
type ExplainPageProps = {
  /** True when the pick was right ("Explain the Answer"), false when missed ("Explain the Mistake"). */
  right: boolean;
  /** Papa Dorin's explanation, one paragraph per pick that needs it. */
  explanations: readonly string[];
  /** Goes back to the result sheet. */
  onBack: () => void;
  /** Goes on with the lesson. */
  onContinue: () => void;
};

/** The explain page. */
export function ExplainPage({ right, explanations, onBack, onContinue }: ExplainPageProps) {
  const insets = useSafeAreaInsets();
  const [thumb, setThumb] = useState<'up' | 'down' | null>(null);
  const h = sharpDorinHeight(150);
  /** Turns a thumb on, or off when tapped again. */
  const tapThumb = (which: 'up' | 'down') => {
    playSound('tap');
    setThumb((t) => (t === which ? null : which));
  };
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      accessibilityViewIsModal
      style={[styles.page, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.inner}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              playSound('tap');
              onBack();
            }}
          >
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={explainColors.back} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 12H4M10 5l-7 7 7 7" />
            </Svg>
          </Pressable>
          <Text style={styles.title}>{right ? 'Explain the Answer' : 'Explain the Mistake'}</Text>
        </View>
        <View style={styles.card}>
          <ScrollView>
            {explanations.map((p, i) => (
              <Text key={i} style={[styles.words, i > 0 && styles.next]}>
                {p}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.tail} />
        </View>
        <View style={styles.foot}>
          <Image source={PAPA_DORIN} style={{ height: h, width: Math.round((h * 300) / 688), marginTop: 14, marginLeft: 14 }} contentFit="contain" accessibilityLabel="Papa Dorin" />
          <View style={styles.thumbs}>
            <Thumb up={false} on={thumb === 'down'} onPress={() => tapThumb('down')} />
            <Thumb up on={thumb === 'up'} onPress={() => tapThumb('up')} />
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={onContinue} style={({ pressed }) => [styles.go, pressed && styles.pressed]}>
          <Text style={styles.goText}>CONTINUE LESSON</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 8, backgroundColor: explainColors.page, paddingHorizontal: 18 },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4, marginBottom: 16 },
  title: { fontFamily: fonts.black, fontSize: 24, color: explainColors.ink },
  card: { flex: 1, minHeight: 0, borderWidth: 2, borderColor: explainColors.edge, borderRadius: 20, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18, backgroundColor: explainColors.card },
  words: { fontFamily: fonts.body, fontSize: 19, lineHeight: 29, color: explainColors.ink },
  next: { marginTop: 14 },
  tail: {
    position: 'absolute',
    left: 46,
    bottom: -14,
    width: 24,
    height: 24,
    backgroundColor: explainColors.card,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: explainColors.edge,
    borderBottomRightRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 },
  thumbs: { flexDirection: 'row', gap: 18, marginBottom: 8 },
  down: { transform: [{ scaleY: -1 }] },
  go: { marginTop: 18, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: explainColors.button, boxShadow: `0 4px 0 ${explainColors.buttonShadow}` },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 1, color: text.onDark },
  pressed: { transform: [{ translateY: 3 }] },
});
