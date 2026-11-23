// A constellation's Bible books as two-column tiles: each tile shows the book's name, how many of its lessons are
// done, a progress bar, and a ✓ once every lesson is baked. Also the "Old Testament" and "New Testament" headings
// above them.

import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { DoneMark, type CardLook } from '@/components/constellation/LessonCard';
import { ProgressBar } from '@/components/constellation/ProgressBar';
import type { LessonBook } from '@/data/lessonBooks';
import { text } from '@/theme/colors';
import { shelfColors } from '@/theme/lessonColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Every tile's height, so all tiles are the same size whatever the book's name. */
const TILE_HEIGHT = 92;

/** Props for a book tile. */
type BookTileProps = {
  /** The book and its lessons. */
  book: LessonBook;
  /** How many of its lessons are fully baked. */
  done: number;
  /** The constellation's card colors. */
  look: CardLook;
  /** Opens the book's page. */
  onOpen: (book: LessonBook) => void;
};

/** One book's tile, always the same size: a long name shrinks to fit one line. Drawn again only when its done count changes. */
export const BookTile = memo(function BookTile({ book, done, look, onOpen }: BookTileProps) {
  const total = book.lessons.length;
  const finished = done >= total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.book.name}, ${done} of ${total} lessons done`}
      onPress={() => {
        playSound('tap');
        onOpen(book);
      }}
      style={({ pressed }) => [styles.tile, { borderColor: look.edge }, pressed && styles.pressed]}
    >
      {finished && <DoneMark color={look.color} size={24} />}
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {book.book.name}
      </Text>
      <Text style={styles.count}>{done > 0 ? `${done} of ${total} done` : `0 of ${total}`}</Text>
      <ProgressBar done={done} total={total} color={look.color} style={styles.bar} />
    </Pressable>
  );
});

/** Props for a testament heading. */
type TestamentHeadingProps = {
  /** The heading's words, like "Old Testament". */
  title: string;
};

/** The small gold heading above a testament's book tiles. */
export const TestamentHeading = memo(function TestamentHeading({ title }: TestamentHeadingProps) {
  return <Text style={styles.heading}>{title}</Text>;
});

const styles = StyleSheet.create({
  tile: { flex: 1, height: TILE_HEIGHT, borderWidth: 1.5, borderRadius: radius.tile, padding: 12, backgroundColor: shelfColors.back },
  pressed: { transform: [{ scale: 0.98 }] },
  name: { fontFamily: fonts.black, fontSize: 18, lineHeight: 22, color: text.onDark, marginRight: 26 },
  count: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft, marginTop: 2 },
  bar: { marginTop: 'auto' },
  heading: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: text.goldNote, marginTop: 4, marginBottom: 8, marginLeft: 4 },
});
