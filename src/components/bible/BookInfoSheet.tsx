// The sheet opened by a book's ⓘ tile: which testament it is in, how many chapters it has, and how much of it
// the person has revealed so far.

import { StyleSheet, Text } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';

/** Props for the book info sheet. */
type BookInfoSheetProps = {
  /** The book shown, or none while the sheet is closed. */
  book: BibleBook | null;
  /** How many verses are revealed in each of its chapters. */
  revealed: Record<number, number>;
  /** Closes the sheet. */
  onClose: () => void;
};

/** A short summary of one book. */
export function BookInfoSheet({ book, revealed, onClose }: BookInfoSheetProps) {
  const verses = Object.values(revealed).reduce((a, b) => a + b, 0);
  const fullChapters = book ? book.chapterVerses.filter((count, i) => (revealed[i + 1] ?? 0) >= count).length : 0;
  return (
    <GlassSheet open={!!book} onClose={onClose} title={book ? `📖 ${book.name}` : ''}>
      {book && (
        <>
          <Text style={styles.note}>
            {book.testament === 'OT' ? 'Old Testament' : 'New Testament'} · {book.chapterVerses.length} {book.chapterVerses.length === 1 ? 'chapter' : 'chapters'}
          </Text>
          <Text style={styles.body}>
            {verses > 0 ? (
              <>
                You’ve revealed <Text style={styles.strong}>{verses}</Text> {verses === 1 ? 'verse' : 'verses'} here
                {fullChapters > 0 && (
                  <>
                    , with <Text style={styles.strong}>{fullChapters}</Text> {fullChapters === 1 ? 'chapter' : 'chapters'} fully revealed
                  </>
                )}
                .
              </>
            ) : (
              'Nothing revealed here yet. Finish lessons to bring its verses to light.'
            )}
          </Text>
          <Text style={styles.note}>Crumbs cover the verses you haven’t revealed yet. Each lesson clears some away.</Text>
        </>
      )}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.65)', marginBottom: 10 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: text.onDark, marginBottom: 10 },
  strong: { fontFamily: fonts.black, color: reader.verseNumber },
});
