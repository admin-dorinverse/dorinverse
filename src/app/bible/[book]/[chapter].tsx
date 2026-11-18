// The Bible reader: one chapter page, drawn at once from memory. Revealed verses show their words; covered
// verses show stardust in the shape of their words. Tap a verse to see it up close; read the revealed verses
// aloud; move between open chapters.

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapterText } from '@/components/bible/ChapterText';
import { READER_CONTROLS_SPACE, ReaderControls } from '@/components/bible/ReaderControls';
import { ReadingOptionsSheet } from '@/components/bible/ReadingOptionsSheet';
import { useReadAloud } from '@/components/bible/useReadAloud';
import { VerseSheet, type SheetContent } from '@/components/bible/VerseSheet';
import { RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { playSound } from '@/components/common/sounds';
import { bibleOutline, bookAt, nearbyOpenChapter, READER_TRANSLATION, useBibleLibrary, useChapterPage, type ChapterSpot } from '@/data/queries/bible';
import { reader, text } from '@/theme/colors';
import { fonts, readingSize } from '@/theme/text';

/** The reader page. */
export default function ReaderPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book: string; chapter: string; mark?: string }>();
  const spot: ChapterSpot = { book: Number(params.book), chapter: Number(params.chapter) };
  const library = useBibleLibrary();
  const book = bookAt(spot.book);
  const page = useChapterPage(book, spot.chapter);
  const [fontSize, setFontSize] = useState<number>(readingSize.start);
  const [sheet, setSheet] = useState<SheetContent | null>(null);
  const [options, setOptions] = useState(false);
  const voice = useReadAloud();
  const { stop } = voice;

  // Reading aloud stops when the chapter changes.
  useEffect(() => stop, [stop, spot.book, spot.chapter]);

  const name = book ? `${book.name} ${spot.chapter}` : '';
  const counts = library.data?.counts;
  const [previous, next] = useMemo(() => {
    const here = { book: Number(params.book), chapter: Number(params.chapter) };
    return counts ? [nearbyOpenChapter(bibleOutline, counts, here, -1), nearbyOpenChapter(bibleOutline, counts, here, 1)] : [null, null];
  }, [counts, params.book, params.chapter]);
  /** Opens another chapter in place of this one. */
  const go = (to: ChapterSpot) => router.replace({ pathname: '/bible/[book]/[chapter]', params: { book: String(to.book), chapter: String(to.chapter) } });

  /** Reads this chapter's revealed verses aloud, or stops. */
  const play = () => {
    playSound('tap');
    if (voice.speaking) return voice.stop();
    const words = (page?.verses ?? []).flatMap((v) => (v.kind === 'revealed' ? [v.text] : [])).join(' ');
    voice.speak(words);
  };

  // The top bar stays at the top while the text scrolls under it.
  const topBar = (
    <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
      <RoundButton label="Back" onPress={() => router.back()}>
        <Text style={styles.arrow}>←</Text>
      </RoundButton>
      <View style={styles.spacer} />
      <RoundButton label="Search your revealed verses" onPress={() => router.push('/bible/search')}>
        <Text style={styles.icon}>🔍</Text>
      </RoundButton>
      <RoundButton label="Reading options" onPress={() => setOptions(true)}>
        <Text style={styles.dots}>···</Text>
      </RoundButton>
      <Pressable accessibilityRole="text" accessibilityLabel={`Translation: ${READER_TRANSLATION}`} style={styles.translation}>
        <Text style={styles.translationText}>🌐 {READER_TRANSLATION}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.page}>
      {topBar}
      {page ? (
        <ChapterText
          page={page}
          fontSize={fontSize}
          highlight={params.mark}
          onVerse={(verse) => setSheet({ verse })}
          onNote={(verse, note) => setSheet({ verse, note })}
          bottomSpace={insets.bottom + READER_CONTROLS_SPACE + 40}
        />
      ) : (
        <LoadState failed={library.isError} onRetry={() => library.refetch()} />
      )}
      <ReaderControls
        title={name}
        speaking={voice.speaking}
        onPlay={play}
        onPrevious={previous ? () => go(previous) : undefined}
        onNext={next ? () => go(next) : undefined}
        onBooks={() => router.dismissTo(`/bible?open=${spot.book}` as Href)}
      />
      <VerseSheet content={sheet} chapterName={name} translation={READER_TRANSLATION} onClose={() => setSheet(null)} />
      <ReadingOptionsSheet open={options} onClose={() => setOptions(false)} fontSize={fontSize} onFontSize={setFontSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: reader.page,
  },
  spacer: { flex: 1 },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  icon: { fontSize: 18 },
  dots: { fontFamily: fonts.black, fontSize: 18, color: text.onDark, marginTop: -6 },
  translation: { height: 44, borderRadius: 22, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  translationText: { fontFamily: fonts.black, fontSize: 13.5, color: text.onDark },
});
