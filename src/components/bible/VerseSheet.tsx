// The sheet opened from the reader. Tapping a revealed verse shows its reference, words and footnotes; tapping a
// footnote's gold star shows just that note; tapping a covered verse says it is still covered.

import { StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { Footnote, PageVerse } from '@/types/bible';

/** What the sheet shows: a whole verse, or one of its footnotes (by its place in the verse's list). */
export type SheetContent = { verse: PageVerse; note?: number };

/** Props for the verse sheet. */
type VerseSheetProps = {
  /** What to show, or none while the sheet is closed. */
  content: SheetContent | null;
  /** The chapter's name, like "Judges 3". */
  chapterName: string;
  /** The translation's short name, like "BSB". */
  translation: string;
  /** Closes the sheet. */
  onClose: () => void;
};

/** One verse, or one footnote, up close. */
export function VerseSheet({ content, chapterName, translation, onClose }: VerseSheetProps) {
  const verse = content?.verse;
  const reference = verse ? `${chapterName}:${verse.number}` : '';
  const note = verse?.kind === 'revealed' && content?.note !== undefined ? verse.notes[content.note] : undefined;
  return (
    <GlassSheet open={!!content} onClose={onClose} title={note ? `✦ Note · ${reference}` : `📖 ${reference}`}>
      {note && <NoteBody note={note} />}
      {!note && verse?.kind === 'revealed' && (
        <>
          <Text style={styles.words}>{verse.text}</Text>
          <Text style={styles.tag}>{translation}</Text>
          {verse.notes.map((n, i) => (
            <View key={i} style={styles.noteRow}>
              <Text style={styles.star}>✦</Text>
              <View style={styles.noteText}>
                <NoteBody note={n} />
              </View>
            </View>
          ))}
        </>
      )}
      {verse?.kind === 'covered' && <Text style={styles.note}>This verse is still covered in stardust. Finish lessons to reveal it.</Text>}
    </GlassSheet>
  );
}

/** A footnote: the words it follows, then the note. */
function NoteBody({ note }: { note: Footnote }) {
  return (
    <>
      <Text style={styles.after}>“{note.after}”</Text>
      <Text style={styles.note}>{note.text}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  words: { fontFamily: readingFont, fontSize: 17, lineHeight: 26, color: text.onDark },
  tag: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 0.8, color: reader.verseNumber, marginTop: 10, marginBottom: 6 },
  noteRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  star: { fontSize: 13, lineHeight: 21, color: reader.verseNumber },
  noteText: { flex: 1 },
  after: { fontFamily: readingFont, fontStyle: 'italic', fontSize: 14.5, lineHeight: 21, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  note: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: text.onDarkSoft, marginBottom: 8 },
});
