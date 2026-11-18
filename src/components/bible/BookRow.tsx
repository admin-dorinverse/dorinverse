// One book in the Bible book list. A book with no revealed verses is dimmed and can't be opened. Tapping an
// open book shows how many verses are revealed and a tile for each chapter, plus an ⓘ tile about the book.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';

/** How many chapter tiles sit in one row. */
const TILES_PER_ROW = 5;

/** Props for a book row. */
type BookRowProps = {
  /** The book. */
  book: BibleBook;
  /** How many verses are revealed in each chapter, by chapter number. */
  revealed: Record<number, number>;
  /** True while the book's chapters show. */
  open: boolean;
  /** Opens or closes the book's chapters. */
  onToggle: () => void;
  /** Opens a chapter in the reader. */
  onOpenChapter: (chapter: number) => void;
  /** Shows the book's info sheet. */
  onInfo: () => void;
};

/** A book row that opens to its chapter tiles. */
export function BookRow({ book, revealed, open, onToggle, onOpenChapter, onInfo }: BookRowProps) {
  const total = Object.values(revealed).reduce((a, b) => a + b, 0);
  const live = total > 0;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !live, expanded: open }}
        accessibilityLabel={live ? book.name : `${book.name}, no verses revealed yet`}
        disabled={!live}
        onPress={() => {
          playSound('tap');
          onToggle();
        }}
        style={styles.head}
      >
        <Text style={[styles.name, !live && styles.nameLocked]}>{book.name}</Text>
        {live && <Text style={[styles.chevron, open && styles.chevronOpen]}>›</Text>}
      </Pressable>
      {open && (
        <View style={styles.body}>
          <Text style={styles.status}>
            <Text style={styles.statusNumber}>{total}</Text> {total === 1 ? 'verse' : 'verses'} revealed
          </Text>
          <View style={styles.grid}>
            <Tile label={`About ${book.name}`} onPress={onInfo} look="info">
              ⓘ
            </Tile>
            {book.chapterVerses.map((count, i) => {
              const chapter = i + 1;
              const n = revealed[chapter] ?? 0;
              const look = n === 0 ? 'locked' : n >= count ? 'full' : 'some';
              const state = look === 'full' ? 'all verses revealed' : look === 'some' ? 'some verses revealed' : 'no verses revealed yet';
              return (
                <Tile key={chapter} label={`Chapter ${chapter}, ${state}`} look={look} onPress={() => onOpenChapter(chapter)}>
                  {chapter}
                </Tile>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

/** How a chapter tile looks: fully revealed, partly revealed, locked, or the info tile. */
type TileLook = 'full' | 'some' | 'locked' | 'info';

/** Props for a chapter tile. */
type TileProps = {
  /** What the tile is, read out by screen readers. */
  label: string;
  /** Its look. */
  look: TileLook;
  /** Opens the chapter (or the info sheet). */
  onPress: () => void;
  /** The chapter number or the ⓘ sign. */
  children: string | number;
};

/** One square tile in the chapter grid. */
function Tile({ label, look, onPress, children }: TileProps) {
  return (
    <View style={styles.cell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={look === 'locked'}
        onPress={() => {
          playSound('tap');
          onPress();
        }}
        style={({ pressed }) => [styles.tile, styles[look], pressed && styles.pressed]}
      >
        <Text style={[styles.tileText, look === 'locked' && styles.tileTextLocked]}>{children}</Text>
        {look === 'full' && <Text style={styles.done}>✓</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 4 },
  name: { flex: 1, fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  nameLocked: { color: reader.locked, fontFamily: fonts.extraBold },
  chevron: { fontFamily: fonts.black, fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  body: { paddingHorizontal: 4, paddingBottom: 14 },
  status: { fontFamily: fonts.extraBold, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  statusNumber: { fontFamily: fonts.black, fontSize: 20, color: reader.verseNumber },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: `${100 / TILES_PER_ROW}%`, padding: 4 },
  tile: { height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  info: { backgroundColor: 'transparent', borderColor: reader.edge },
  locked: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.08)' },
  some: { backgroundColor: reader.surface, borderColor: reader.someEdge, borderWidth: 2 },
  full: { backgroundColor: reader.fullFill, borderColor: reader.fullEdge, borderWidth: 2 },
  pressed: { transform: [{ scale: 0.95 }] },
  tileText: { fontFamily: fonts.black, fontSize: 16, color: text.onDark },
  tileTextLocked: { color: 'rgba(255,255,255,0.25)' },
  done: { fontFamily: fonts.black, fontSize: 12, lineHeight: 13, color: reader.fullEdge, marginTop: 2 },
});
