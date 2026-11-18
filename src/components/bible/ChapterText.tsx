// A chapter's verses as one flowing page: revealed verses show their words, covered verses show crumb pills
// in the exact shape of their words. Long chapters are split into blocks of verses, and only the blocks on
// screen are drawn.

import { memo, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { reader } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { ChapterPage, PageVerse } from '@/types/bible';
import { CoveredWord } from './CoveredWord';

/** How many verses go in one block. Blocks start on a new line, like a paragraph. */
const VERSES_PER_BLOCK = 12;

/** Props for the chapter text. */
type ChapterTextProps = {
  /** The chapter to show. */
  page: ChapterPage;
  /** The reading text size. */
  fontSize: number;
  /** Words to mark, from a search, or none. */
  highlight?: string;
  /** A tap on a verse (revealed or covered). */
  onVerse: (verse: PageVerse) => void;
  /** Space above the text, and below it for the floating controls. */
  topSpace: number;
  bottomSpace: number;
  /** Shown above the text, like the top bar. */
  header?: ReactElement;
};

/** The chapter page's text. */
export function ChapterText({ page, fontSize, highlight, onVerse, topSpace, bottomSpace, header }: ChapterTextProps) {
  const blocks: PageVerse[][] = [];
  for (let i = 0; i < page.verses.length; i += VERSES_PER_BLOCK) blocks.push(page.verses.slice(i, i + VERSES_PER_BLOCK));
  return (
    <FlatList
      data={blocks}
      keyExtractor={(block) => String(block[0]?.number ?? 0)}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.content, { paddingTop: topSpace, paddingBottom: bottomSpace }]}
      initialNumToRender={2}
      windowSize={5}
      renderItem={({ item, index }) => (
        <Block verses={item} first={index === 0} chapter={page.chapter} fontSize={fontSize} highlight={highlight} onVerse={onVerse} />
      )}
    />
  );
}

/** Props for one block of verses. */
type BlockProps = {
  /** The verses in the block. */
  verses: PageVerse[];
  /** True for the first block, which starts with the big chapter number. */
  first: boolean;
  /** The chapter number. */
  chapter: number;
  /** The reading text size. */
  fontSize: number;
  /** Words to mark, or none. */
  highlight?: string;
  /** A tap on a verse. */
  onVerse: (verse: PageVerse) => void;
};

/** A block of verses flowing as one paragraph. */
const Block = memo(function Block({ verses, first, chapter, fontSize, highlight, onVerse }: BlockProps) {
  const numberSize = Math.round(fontSize * 0.6);
  return (
    <Text style={[styles.text, { fontSize, lineHeight: fontSize * 2 }]}>
      {first && <Text style={[styles.chapterNumber, { fontSize: fontSize * 3.2 }]}>{chapter} </Text>}
      {verses.map((verse) =>
        verse.kind === 'revealed' ? (
          <Text key={verse.number} onPress={() => onVerse(verse)} suppressHighlighting>
            {!(first && verse.number === 1) && <Text style={[styles.number, { fontSize: numberSize }]}>{verse.number} </Text>}
            <Marked text={verse.text} mark={highlight} />{' '}
          </Text>
        ) : (
          <Text key={verse.number} onPress={() => onVerse(verse)} suppressHighlighting>
            <Text style={[styles.number, styles.numberCovered, { fontSize: numberSize }]}>{verse.number} </Text>
            {verse.wordLengths.map((letters, i) => (
              <Text key={i}>
                <CoveredWord letters={letters} fontSize={fontSize} index={verse.number + i} />{' '}
              </Text>
            ))}
          </Text>
        ),
      )}
    </Text>
  );
});

/** A verse's words with every match of `mark` highlighted. */
function Marked({ text, mark }: { text: string; mark?: string }) {
  if (!mark) return <>{text}</>;
  const parts = text.split(new RegExp(`(${mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.highlight}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  text: { fontFamily: readingFont, color: reader.text },
  chapterNumber: { fontFamily: readingFont, color: reader.chapterNumber },
  number: { fontFamily: fonts.extraBold, color: reader.verseNumber },
  numberCovered: { color: reader.coveredNumber },
  highlight: { backgroundColor: reader.highlight },
});
