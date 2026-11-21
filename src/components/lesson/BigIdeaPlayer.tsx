// The Big Idea, page by page: Papa Dorin says one paragraph of what the passage teaches in his speech bubble, with
// dots showing how many there are (tap one already read to go back). Nothing is quizzed. The last page's button goes
// on to signing the cookie box.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { glass, navy, text } from '@/theme/colors';
import { cream, lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { DorinSpeak } from './DorinSpeak';

/** Props for the Big Idea. */
type BigIdeaPlayerProps = {
  /** Papa Dorin's paragraphs, in order. */
  paragraphs: readonly string[];
  /** The constellation's color. */
  color: string;
  /** Leaves without finishing. */
  onClose: () => void;
  /** Goes on to signing the box. */
  onDone: () => void;
};

/** The Big Idea player. */
export function BigIdeaPlayer({ paragraphs, color, onClose, onDone }: BigIdeaPlayerProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [at, setAt] = useState(0);
  const [seen, setSeen] = useState(0);
  const last = at === paragraphs.length - 1;
  const dorinHeight = height < 700 ? 112 : 150;

  /** Shows a page. */
  const show = (page: number) => {
    setAt(page);
    setSeen((s) => Math.max(s, page));
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            playSound('tap');
            onClose();
          }}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>The Big Idea</Text>
      </View>
      <ScrollView style={styles.stage} contentContainerStyle={styles.inner}>
        <DorinSpeak key={at} length={paragraphs[at].length} height={dorinHeight}>
          <Text style={styles.say}>{paragraphs[at]}</Text>
        </DorinSpeak>
      </ScrollView>
      <View style={styles.dots}>
        {paragraphs.map((p, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Page ${i + 1} of ${paragraphs.length}`}
            disabled={i > seen}
            onPress={() => show(i)}
            hitSlop={8}
            style={[styles.dot, { backgroundColor: i === at ? color : glass.borderTop }]}
          />
        ))}
      </View>
      <View style={[styles.foot, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (last) onDone();
            else {
              playSound('next');
              show(at + 1);
            }
          }}
          style={({ pressed }) => [
            styles.go,
            { backgroundColor: color, boxShadow: `0 5px 0 ${mixColor(color, 0.6, lessonSky.black)}, 0 0 22px ${mixColor(color, 0.6)}` },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.goText}>{last ? 'Box them up' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: glass.button, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  stage: { flex: 1 },
  inner: { paddingTop: 22, paddingBottom: 24, paddingHorizontal: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  say: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28, color: cream.ink },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  foot: { paddingTop: 10, paddingHorizontal: 18, width: '100%', maxWidth: 596, alignSelf: 'center' },
  go: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: navy },
  pressed: { transform: [{ translateY: 4 }] },
});
