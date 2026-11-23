// One lesson in a constellation's list, as in the Constellations design: its reference, its title, its place in a
// story, and a row of the constellation's cookie, one per stop (dough until baked, baked after), with a ✓ once every
// stop is baked. The lesson to pick up next in a story gets a gold edge. Also the ✓ and the cookie row on their own,
// for the other cards.

import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CookieArt } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { mixColor } from '@/theme/mixColor';
import { lessonSky, shelfColors, upNextColors } from '@/theme/lessonColors';
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
    refInk: mixColor(color, 0.7, lessonSky.white),
    fill: `linear-gradient(150deg, ${mixColor(color, 0.22, 'rgba(255,255,255,0.06)')}, rgba(255,255,255,0.04) 60%)`,
    edge: mixColor(color, 0.6),
    glow: `0 0 16px ${mixColor(color, 0.35)}, 0 10px 24px rgba(0,0,0,0.3)`,
  };
}

/** Props for the ✓ in a card's corner. */
type DoneMarkProps = {
  /** The constellation's color. */
  color: string;
  /** Its width and height. */
  size?: number;
};

/** The round ✓ in a card's top corner, shown once everything in the card is baked. */
export const DoneMark = memo(function DoneMark({ color, size = 30 }: DoneMarkProps) {
  const corner = size < 30 ? 9 : 14;
  return (
    <View style={[styles.done, { width: size, height: size, borderRadius: size / 2, right: corner, top: corner, backgroundColor: color, boxShadow: `0 0 12px ${color}` }]}>
      <Text style={[styles.doneMark, { fontSize: size * 0.53 }]}>✓</Text>
    </View>
  );
});

/** Props for a lesson's cookie row. */
type CookieDotsProps = {
  /** How many stops the lesson has. */
  stops: number;
  /** How many of them are baked. */
  baked: number;
  /** The constellation's cookie pictures. */
  art: CookieArt;
};

/** One cookie per stop: baked for the stops baked, dough for the rest. */
export const CookieDots = memo(function CookieDots({ stops, baked, art }: CookieDotsProps) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: stops }, (_, i) => (
        <Image key={i} source={i < baked ? art.baked : art.dough} style={[styles.dot, i >= baked && styles.dim]} contentFit="contain" />
      ))}
    </View>
  );
});

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
  /** True for the lesson to pick up next in a story: it gets a gold edge and says so. */
  upNext?: boolean;
  /** Opens the lesson. */
  onOpen: (lesson: LessonOutline) => void;
};

/** A lesson card. Drawn again only when its lesson or its baked count changes. */
export const LessonCard = memo(function LessonCard({ lesson, baked, art, look, upNext = false, onOpen }: LessonCardProps) {
  const done = baked >= lesson.stopCount;
  const edge = upNext ? { borderColor: upNextColors.gold, boxShadow: upNextColors.partGlow } : { borderColor: look.edge, boxShadow: look.glow };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${upNext ? 'Up next: ' : ''}${lesson.title}, ${lesson.reference}, ${baked} of ${lesson.stopCount} cookies baked`}
      onPress={() => {
        playSound('tap');
        onOpen(lesson);
      }}
      style={({ pressed }) => [styles.card, { backgroundImage: look.fill }, edge, pressed && styles.pressed]}
    >
      {done && <DoneMark color={look.color} />}
      <Text style={[styles.ref, { color: upNext ? upNextColors.refInk : look.refInk }]}>{upNext ? `${lesson.reference} · Up next` : lesson.reference}</Text>
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.storyPosition && <Text style={styles.part}>Part {lesson.storyPosition}</Text>}
      <CookieDots stops={lesson.stopCount} baked={baked} art={art} />
    </Pressable>
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
    backgroundColor: shelfColors.back,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.4, marginRight: 36 },
  title: { fontFamily: fonts.black, fontSize: 21, lineHeight: 24, color: text.onDark, marginTop: 4, marginRight: 30 },
  part: { fontFamily: fonts.body, fontSize: 14, color: text.onDarkSoft, marginTop: 4 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' },
  dot: { width: DOT, height: DOT },
  dim: { opacity: 0.8 },
  done: { position: 'absolute', zIndex: 1, alignItems: 'center', justifyContent: 'center' },
  doneMark: { fontFamily: fonts.black, color: navy },
});
