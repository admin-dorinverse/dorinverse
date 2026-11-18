// A book in the one-letter search results: its name, then a row of tiles for the chapters that can be opened,
// which swipes sideways when there are many.

import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';

/** Props for a book's chapter row. */
type BookChapterRowProps = {
  /** The book. */
  book: BibleBook;
  /** The chapters that can be opened. */
  chapters: readonly number[];
  /** Opens a chapter in the reader. */
  onChapter: (chapter: number) => void;
};

/** A book's name and its open chapters. */
export function BookChapterRow({ book, chapters, onChapter }: BookChapterRowProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{book.name}</Text>
      <FlatList
        horizontal
        data={chapters}
        keyExtractor={(c) => String(c)}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.tiles}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${book.name} chapter ${item}`}
            onPress={() => {
              playSound('tap');
              onChapter(item);
            }}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <Text style={styles.tileText}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  name: { fontFamily: fonts.black, fontSize: 21, color: text.onDark, marginBottom: 10 },
  tiles: { gap: 8 },
  tile: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: reader.surface, borderWidth: 1.5, borderColor: reader.edge },
  pressed: { transform: [{ scale: 0.95 }] },
  tileText: { fontFamily: fonts.black, fontSize: 16, color: text.onDark },
});
