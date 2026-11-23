// The cards on a book page. A story told over several lessons is one card: the chapters it spans, its name, a
// progress bar, how many of its lessons are done, a ✓ once all are, and a faint edge under it like a stack of cards.
// A lesson that stands alone uses the regular lesson card, cookies and all.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { DoneMark, type CardLook } from '@/components/constellation/LessonCard';
import { ProgressBar } from '@/components/constellation/ProgressBar';
import type { ShelfStory } from '@/data/lessonBooks';
import { text } from '@/theme/colors';
import { shelfColors } from '@/theme/lessonColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for a story card. */
type StoryCardProps = {
  /** The story and its lessons. */
  story: ShelfStory;
  /** How many of its lessons are fully baked. */
  done: number;
  /** The constellation's card colors. */
  look: CardLook;
  /** Opens the story's page. */
  onOpen: (story: ShelfStory) => void;
};

/** One story's card. Drawn again only when its done count changes. */
export const StoryCard = memo(function StoryCard({ story, done, look, onOpen }: StoryCardProps) {
  const total = story.lessons.length;
  return (
    <View style={styles.stacked}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${story.name}, ${story.span}, a story in ${total} lessons, ${done} done`}
        onPress={() => {
          playSound('tap');
          onOpen(story);
        }}
        style={({ pressed }) => [styles.card, { backgroundImage: look.fill, borderColor: look.edge, boxShadow: look.glow }, pressed && styles.pressed]}
      >
        {done >= total && <DoneMark color={look.color} />}
        <Text style={[styles.ref, { color: look.refInk }]}>{`${story.span} · Story`}</Text>
        <Text style={styles.title}>{story.name}</Text>
        <View style={styles.meta}>
          <ProgressBar done={done} total={total} color={look.color} style={styles.bar} />
          <Text style={styles.count}>{`${done} of ${total} done`}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
      <View pointerEvents="none" style={[styles.stack, { borderColor: look.edge }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  stacked: { marginBottom: 6 },
  card: { width: '100%', marginBottom: 14, borderRadius: radius.card, borderWidth: 1.5, padding: 16, paddingTop: 18, backgroundColor: shelfColors.back },
  pressed: { transform: [{ scale: 0.98 }] },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.4, marginRight: 36 },
  title: { fontFamily: fonts.black, fontSize: 21, lineHeight: 24, color: text.onDark, marginTop: 4, marginRight: 30 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  bar: { flex: 1, marginRight: 10 },
  count: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  chevron: { fontFamily: fonts.black, fontSize: 20, lineHeight: 22, color: text.onDarkSoft, marginLeft: 8 },
  stack: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 8,
    height: 10,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    opacity: 0.5,
  },
});
