// The "Up next" card at the top of a constellation or book page: the lesson to pick up, its place in its story, its
// cookies (baked and dough), and a button that says "Keep going" once it is started or "Start" before.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CookieArt } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { CookieDots } from '@/components/constellation/LessonCard';
import type { UpNext } from '@/data/lessonBooks';
import { navy, text } from '@/theme/colors';
import { shelfColors, upNextColors } from '@/theme/lessonColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { LessonOutline } from '@/types/lesson';

/** Props for the "Up next" card. */
type UpNextCardProps = {
  /** The lesson to pick up, and whether it is started. */
  next: UpNext;
  /** How many of its stops are baked. */
  baked: number;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** Opens the lesson. */
  onOpen: (lesson: LessonOutline) => void;
};

/** The card's reference line, like "Genesis 39:1–23 · Joseph and His Brothers, part 2 of 4". */
function placeLine(lesson: LessonOutline): string {
  if (!lesson.storyGroup) return lesson.reference;
  return lesson.storyPosition ? `${lesson.reference} · ${lesson.storyGroup}, part ${lesson.storyPosition}` : `${lesson.reference} · ${lesson.storyGroup}`;
}

/** The "Up next" card. Tapping anywhere on it opens the lesson. */
export const UpNextCard = memo(function UpNextCard({ next, baked, art, onOpen }: UpNextCardProps) {
  const { lesson, started } = next;
  const action = started ? 'Keep going' : 'Start';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${lesson.title}, ${lesson.reference}. ${action}`}
      onPress={() => {
        playSound('tap');
        onOpen(lesson);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tag}>
        <Text style={styles.tagWords}>UP NEXT</Text>
      </View>
      <Text style={styles.ref}>{placeLine(lesson)}</Text>
      <Text style={styles.title}>{lesson.title}</Text>
      <CookieDots stops={lesson.stopCount} baked={baked} art={art} />
      <View style={styles.button}>
        <Text style={styles.buttonWords}>{action}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 18,
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: 16,
    borderColor: upNextColors.edge,
    backgroundColor: shelfColors.back,
    backgroundImage: upNextColors.fill,
    boxShadow: upNextColors.glow,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  tag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: upNextColors.gold },
  tagWords: { fontFamily: fonts.black, fontSize: 11.5, letterSpacing: 0.8, color: navy },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.4, color: upNextColors.refInk, marginTop: 8 },
  title: { fontFamily: fonts.black, fontSize: 20, lineHeight: 23, color: text.onDark, marginTop: 3 },
  button: { marginTop: 12, borderRadius: radius.button, paddingVertical: 10, alignItems: 'center', backgroundColor: upNextColors.gold },
  buttonWords: { fontFamily: fonts.black, fontSize: 15, color: navy },
});
