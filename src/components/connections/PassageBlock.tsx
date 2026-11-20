// One Scripture passage on a link's page, as in the owner's artifact: the reference in bold, then the verses in a
// quote box with small verse numbers. The words come from the phone's Bible, so only verses the person has revealed
// show; a passage that is still hidden says how to reveal it.

import { StyleSheet, Text, View } from 'react-native';
import { bibleOutline, READER_TRANSLATION, useVerseLookup } from '@/data/queries/bible';
import { webPage } from '@/theme/characterWebColors';
import { fonts, readingFont } from '@/theme/text';
import type { VerseRef } from '@/types/bible';

/** A passage written like "1 Samuel 17:45–50" or "Genesis 1:31–2:3". */
const PASSAGE = /^(.+?) (\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$/;

/** The verse labels a passage covers, like ["1Sam.17.45", …], or none if it can't be read. */
export function passageVerses(passage: string): VerseRef[] {
  const m = PASSAGE.exec(passage.trim());
  const book = m && bibleOutline.find((b) => b.name === m[1]);
  if (!m || !book) return [];
  let chapter = Number(m[2]);
  let verse = Number(m[3]);
  // "a–b" ends in the same chapter; "a–c:d" ends in chapter c, verse d.
  const endChapter = m[5] ? Number(m[4]) : chapter;
  const endVerse = m[5] ? Number(m[5]) : m[4] ? Number(m[4]) : verse;
  const out: VerseRef[] = [];
  while (chapter < endChapter || (chapter === endChapter && verse <= endVerse)) {
    out.push(`${book.code}.${chapter}.${verse}`);
    verse++;
    if (verse > (book.chapterVerses[chapter - 1] ?? 0)) {
      chapter++;
      verse = 1;
    }
    if (out.length > 200) break;
  }
  return out;
}

/** Props for a passage. */
type PassageBlockProps = {
  /** The passage, like "Exodus 4:14". */
  passage: string;
};

/** One passage with its revealed verses. */
export function PassageBlock({ passage }: PassageBlockProps) {
  const lookup = useVerseLookup();
  const verses = passageVerses(passage).map((ref) => lookup?.get(ref));
  const shown = verses.filter((v) => v !== undefined);
  return (
    <View style={styles.wrap}>
      <Text style={styles.ref}>
        {passage} <Text style={styles.translation}>{READER_TRANSLATION}</Text>
      </Text>
      <View style={styles.quote}>
        {shown.map((v) => (
          <Text key={v.ref} style={styles.verse}>
            <Text style={styles.number}>{v.verse} </Text>
            {v.text}
          </Text>
        ))}
        {shown.length < verses.length && (
          <Text style={styles.hidden}>{shown.length ? 'Part of this passage is still hidden.' : 'This passage is still hidden.'} Reveal it in a lesson to read it here.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  ref: { fontFamily: fonts.extraBold, fontSize: 15, color: webPage.ink, marginBottom: 8 },
  translation: { fontFamily: fonts.body, color: webPage.muted },
  quote: { gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: webPage.quote, borderLeftWidth: 3, borderLeftColor: webPage.line, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  verse: { fontFamily: readingFont, fontSize: 16, lineHeight: 25, color: webPage.ink },
  number: { fontFamily: fonts.extraBold, fontSize: 11, color: webPage.muted },
  hidden: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: webPage.muted },
});
