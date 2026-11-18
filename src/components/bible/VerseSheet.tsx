// The sheet opened by tapping a verse in the reader. A revealed verse shows its reference and words; a covered
// verse says it is still covered and how to reveal it.

import { StyleSheet, Text } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { PageVerse } from '@/types/bible';

/** Props for the verse sheet. */
type VerseSheetProps = {
  /** The tapped verse, or none while the sheet is closed. */
  verse: PageVerse | null;
  /** The chapter's name, like "Judges 3". */
  chapterName: string;
  /** The translation's short name, like "BSB". */
  translation: string;
  /** Closes the sheet. */
  onClose: () => void;
};

/** One verse, up close. */
export function VerseSheet({ verse, chapterName, translation, onClose }: VerseSheetProps) {
  const reference = verse ? `${chapterName}:${verse.number}` : '';
  return (
    <GlassSheet open={!!verse} onClose={onClose} title={`📖 ${reference}`}>
      {verse?.kind === 'revealed' && (
        <>
          <Text style={styles.words}>{verse.text}</Text>
          <Text style={styles.tag}>{translation}</Text>
        </>
      )}
      {verse?.kind === 'covered' && <Text style={styles.note}>This verse is still covered in stardust. Finish lessons to reveal it.</Text>}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  words: { fontFamily: readingFont, fontSize: 17, lineHeight: 26, color: text.onDark },
  tag: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 0.8, color: reader.verseNumber, marginTop: 10, marginBottom: 6 },
  note: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: text.onDarkSoft, marginBottom: 8 },
});
