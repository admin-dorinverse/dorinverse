// One page of Papa Dorin's Story on its cream card, as in the design: the chapter's picture, "Chapter N", the
// title, and the paragraphs fading in one after another. A turned page slides in from the side it came from.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, withDelay, withTiming } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { storyPage } from '@/theme/bakeryStoryColors';
import { fonts, readingFont } from '@/theme/text';
import type { StoryChapter } from '@/types/papaDorinStory';
import { StoryArt } from './StoryArt';

/** Which way a page was turned: forward slides in from the right, back from the left. */
export type TurnDirection = 'forward' | 'back';

/** How a turned page slides in, as in the design's page turn. */
const PAGE_MOVE = { duration: 450, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };

/** Makes the page-turn entrance for one direction. */
function pageIn(from: 1 | -1) {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: 60 * from }, { rotate: `${2 * from}deg` }] },
      animations: {
        opacity: withTiming(1, PAGE_MOVE),
        transform: [{ translateX: withTiming(0, PAGE_MOVE) }, { rotate: withTiming('0deg', PAGE_MOVE) }],
      },
    };
  };
}

/** The two page-turn entrances, made once. */
const PAGE_IN = { forward: pageIn(1), back: pageIn(-1) } as const;

/** How a paragraph fades in: up from a little lower, each one a bit after the one before. */
const PARA_MOVE = { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

/** Makes the fade-in for the paragraph at `index`. */
function paragraphIn(index: number) {
  const delay = 150 + index * 180;
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
      animations: { opacity: withDelay(delay, withTiming(1, PARA_MOVE)), transform: [{ translateY: withDelay(delay, withTiming(0, PARA_MOVE)) }] },
    };
  };
}

/** The fade-ins for the first few paragraphs, made once (no chapter has more than three). */
const PARA_IN = [0, 1, 2, 3, 4].map(paragraphIn);

/** Props for a story page. */
type StoryCardProps = {
  /** The chapter on this page. */
  chapter: StoryChapter;
  /** The chapter's number, from 1. */
  number: number;
  /** Which way the page was turned to get here; none when the story first opens. */
  turned: TurnDirection | null;
  /** The page's shared timer, for the picture. */
  clock: AmbientClock;
};

/** A story page on its cream card. */
export function StoryCard({ chapter, number, turned, clock }: StoryCardProps) {
  return (
    <Animated.View entering={turned ? PAGE_IN[turned] : undefined} style={styles.card}>
      <View style={styles.margin} />
      <View style={styles.art}>
        <StoryArt kind={chapter.art} clock={clock} />
      </View>
      <Text style={styles.number}>Chapter {number}</Text>
      <Text style={styles.title}>{chapter.title}</Text>
      {chapter.paragraphs.map((words, k) => (
        <Animated.View key={k} entering={PARA_IN[Math.min(k, PARA_IN.length - 1)]}>
          {k === chapter.noteIndex ? <HandNote words={words} /> : <Text style={styles.paragraph}>{words}</Text>}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** Space between the note's blue ruled lines. */
const RULE_GAP = 28;

/** Papa Dorin's note on white ruled paper, tilted a little. The design's handwriting font is the serif italic here. */
function HandNote({ words }: { words: string }) {
  const [height, setHeight] = useState(0);
  const rules = Math.floor(height / RULE_GAP);
  return (
    <View style={styles.note} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: rules }, (_, k) => (
        <View key={k} style={[styles.rule, { top: RULE_GAP * (k + 1) - 1 }]} />
      ))}
      <Text style={styles.noteWords}>{words}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: storyPage.paper,
    borderWidth: 2,
    borderColor: storyPage.edge,
    borderRadius: 26,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: 'hidden',
    boxShadow: `0 6px 0 ${storyPage.edge}, 0 24px 34px -20px ${storyPage.cardShadow}`,
  },
  margin: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: storyPage.margin },
  art: { height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  number: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: storyPage.chapter },
  title: { fontFamily: readingFont, fontWeight: 'bold', fontSize: 27, lineHeight: 34, color: storyPage.title, marginTop: 2, marginBottom: 10 },
  paragraph: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26, color: storyPage.ink, marginBottom: 10 },
  note: {
    backgroundColor: storyPage.notePaper,
    borderWidth: 1,
    borderColor: storyPage.noteEdge,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
    transform: [{ rotate: '-1deg' }],
    boxShadow: `0 6px 12px -6px ${storyPage.noteShadow}`,
  },
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: storyPage.noteRule },
  noteWords: { fontFamily: readingFont, fontStyle: 'italic', fontSize: 19, lineHeight: RULE_GAP, color: storyPage.noteInk },
});
