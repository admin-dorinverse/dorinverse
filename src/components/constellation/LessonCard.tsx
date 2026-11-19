// One lesson in a constellation's list, as in the Constellations design: its reference, its title, its place in a
// story, and a row of the constellation's cookie, one per stop (dough until baked, baked after), with a ✓ once every
// stop is baked. Also the heading that starts a story's lessons.

import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CookieArt } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { mixColor } from '@/theme/mixColor';
import { navy, text } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { LessonOutline } from '@/types/lesson';

/** The size of each little cookie on a card. */
const DOT = 26;

/** A card's colors, worked out once per list from the constellation's color. */
export type CardLook = { color: string; refInk: string; fill: string; edge: string; glow: string };

/** Works out a card's colors from the constellation's color, like the design's color-mix. */
export function cardLook(color: string): CardLook {
  return {
    color,
    refInk: mixColor(color, 0.7, '#ffffff'),
    fill: `linear-gradient(150deg, ${mixColor(color, 0.22, 'rgba(255,255,255,0.06)')}, rgba(255,255,255,0.04) 60%)`,
    edge: mixColor(color, 0.6),
    glow: `0 0 16px ${mixColor(color, 0.35)}, 0 10px 24px rgba(0,0,0,0.3)`,
  };
}

/** Props for a lesson card. */
type LessonCardProps = {
  /** The lesson. */
  lesson: LessonOutline;
  /** How many of its stops are baked. */
  baked: number;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** The card's colors. */
  look: CardLook;
  /** Opens the lesson. */
  onOpen: (lesson: LessonOutline) => void;
};

/** A lesson card. Drawn again only when its lesson or its baked count changes. */
export const LessonCard = memo(function LessonCard({ lesson, baked, art, look, onOpen }: LessonCardProps) {
  const done = baked >= lesson.stopCount;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${lesson.reference}, ${baked} of ${lesson.stopCount} cookies baked`}
      onPress={() => {
        playSound('tap');
        onOpen(lesson);
      }}
      style={({ pressed }) => [styles.card, { backgroundImage: look.fill, borderColor: look.edge, boxShadow: look.glow }, pressed && styles.pressed]}
    >
      {done && (
        <View style={[styles.done, { backgroundColor: look.color, boxShadow: `0 0 12px ${look.color}` }]}>
          <Text style={styles.doneMark}>✓</Text>
        </View>
      )}
      <Text style={[styles.ref, { color: look.refInk }]}>{lesson.reference}</Text>
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.storyPosition && <Text style={styles.part}>Part {lesson.storyPosition}</Text>}
      <View style={styles.dots}>
        {Array.from({ length: lesson.stopCount }, (_, i) => (
          <Image key={i} source={i < baked ? art.baked : art.dough} style={[styles.dot, i >= baked && styles.dim]} contentFit="contain" />
        ))}
      </View>
    </Pressable>
  );
});

/** Props for a story heading. */
type GroupHeadingProps = {
  /** The story's name, like "Creation and the Fall". */
  name: string;
  /** How many of this constellation's lessons tell it. */
  count: number;
  /** The constellation's color. */
  color: string;
};

/** The heading above a story's lessons: its name and how many lessons it has. */
export const GroupHeading = memo(function GroupHeading({ name, count, color }: GroupHeadingProps) {
  return (
    <View style={styles.group}>
      <View style={[styles.groupBar, { backgroundColor: color }]} />
      <Text style={styles.groupName} numberOfLines={2}>
        {name}
        <Text style={styles.groupCount}>{`  ·  ${count} ${count === 1 ? 'lesson' : 'lessons'}`}</Text>
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 14,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: 'rgba(16,15,44,0.55)',
  },
  pressed: { transform: [{ scale: 0.98 }] },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.4, marginRight: 36 },
  title: { fontFamily: fonts.black, fontSize: 21, lineHeight: 24, color: text.onDark, marginTop: 4, marginRight: 30 },
  part: { fontFamily: fonts.body, fontSize: 14, color: text.onDarkSoft, marginTop: 4 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' },
  dot: { width: DOT, height: DOT },
  dim: { opacity: 0.8 },
  done: { position: 'absolute', right: 14, top: 14, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  doneMark: { fontFamily: fonts.black, fontSize: 16, color: navy },
  group: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12, paddingHorizontal: 4 },
  groupBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  groupName: { flex: 1, fontFamily: fonts.black, fontSize: 16, color: text.onDark },
  groupCount: { fontFamily: fonts.bold, fontSize: 14, color: text.onDarkSoft },
});
