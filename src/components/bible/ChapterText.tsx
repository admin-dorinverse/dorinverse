// A chapter's verses as one flowing page: revealed verses show their words, covered verses show soft clouds
// of stardust in the exact shape of their words. Covered words are text in the Stardust font, not pictures, so
// a block of verses is one text view and the whole page appears at once. Long chapters are split into blocks
// of verses, and only the blocks on screen are drawn.

import { memo, useMemo, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { reader } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { ChapterPage, PageVerse } from '@/types/bible';
import { stardustText } from './stardust';

/** How many verses go in one block. Blocks start on a new line, like a paragraph. */
const VERSES_PER_BLOCK = 12;

/** How big the chapter number is, and its line height, as shares of the reading text size. */
const CHAPTER_NUMBER_SIZE = 3.2;
const CHAPTER_NUMBER_LINE = 1.3;

/** A verse ready to draw: covered verses carry their stardust letters, made once per chapter. */
type DrawnVerse = { verse: PageVerse; dust: string };

/** A block of verses, with what a screen reader says for it (covered verses are named, not spelled out). */
type VerseBlock = { verses: DrawnVerse[]; spoken: string };

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
  /** Space below the text, for the floating controls. */
  bottomSpace: number;
  /** Shown above the text, like the top bar. */
  header?: ReactElement;
};

/** The chapter page's text. */
export function ChapterText({ page, fontSize, highlight, onVerse, bottomSpace, header }: ChapterTextProps) {
  const blocks = useMemo(() => makeBlocks(page), [page]);
  // Development timing: when this chapter first drew, to log how long until it was laid out.
  const [drawnAt] = useState(() => performance.now());
  const numberSize = Math.round(fontSize * CHAPTER_NUMBER_SIZE);
  return (
    <FlatList
      data={blocks}
      keyExtractor={(block) => String(block.verses[0]?.verse.number ?? 0)}
      ListHeaderComponent={
        <View>
          {header}
          <Text style={[styles.chapterNumber, { fontSize: numberSize, lineHeight: Math.round(numberSize * CHAPTER_NUMBER_LINE) }]}>{page.chapter}</Text>
        </View>
      }
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpace }]}
      initialNumToRender={2}
      windowSize={5}
      onLayout={() => {
        if (__DEV__) console.log(`[bible] chapter ${page.book}:${page.chapter} (${page.verses.length} verses) laid out ${Math.round(performance.now() - drawnAt)} ms after first draw`);
      }}
      renderItem={({ item }) => <Block block={item} fontSize={fontSize} highlight={highlight} onVerse={onVerse} />}
    />
  );
}

/** Splits a chapter into blocks and makes each covered verse's stardust letters and each block's spoken words. */
function makeBlocks(page: ChapterPage): VerseBlock[] {
  const drawn = page.verses.map((verse) => ({ verse, dust: verse.kind === 'covered' ? stardustText(verse.wordLengths, verse.number) : '' }));
  const blocks: VerseBlock[] = [];
  for (let i = 0; i < drawn.length; i += VERSES_PER_BLOCK) {
    const verses = drawn.slice(i, i + VERSES_PER_BLOCK);
    const spoken = verses.map(({ verse }) => (verse.kind === 'revealed' ? `Verse ${verse.number}. ${verse.text}` : `Verse ${verse.number} is covered.`)).join(' ');
    blocks.push({ verses, spoken });
  }
  return blocks;
}

/** Props for one block of verses. */
type BlockProps = {
  /** The verses in the block, and what a screen reader says for them. */
  block: VerseBlock;
  /** The reading text size. */
  fontSize: number;
  /** Words to mark, or none. */
  highlight?: string;
  /** A tap on a verse. */
  onVerse: (verse: PageVerse) => void;
};

/** A block of verses flowing as one paragraph. Verse 1 has no number: the big chapter number stands for it. */
const Block = memo(function Block({ block, fontSize, highlight, onVerse }: BlockProps) {
  const numberSize = Math.round(fontSize * 0.6);
  return (
    <Text accessibilityLabel={block.spoken} style={[styles.text, { fontSize, lineHeight: fontSize * 2 }]}>
      {block.verses.map(({ verse, dust }) => (
        <Text key={verse.number} onPress={() => onVerse(verse)} suppressHighlighting>
          {verse.number > 1 && <Text style={[styles.number, verse.kind === 'covered' && styles.numberCovered, { fontSize: numberSize }]}>{verse.number} </Text>}
          {verse.kind === 'revealed' ? <Marked text={verse.text} mark={highlight} /> : <Text style={styles.dust}>{dust}</Text>}{' '}
        </Text>
      ))}
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
  dust: { fontFamily: fonts.stardust, color: reader.stardust },
  highlight: { backgroundColor: reader.highlight },
});
