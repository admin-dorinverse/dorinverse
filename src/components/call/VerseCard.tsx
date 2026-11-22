// The cream chapter card of a shown verse, as in the call mockups' "A verse on screen": the chapter's name and
// "BSB" over a soft red line, its verses with their numbers (the shown verse lit gold, the others dimmed), kept
// scrolled so the lit verse is in view, and the bar under it to move the verse (host only).

import { memo, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { playSound } from '@/components/common/sounds';
import type { CallVerse } from '@/data/callContent';
import { call, callShowColors as show } from '@/theme/callColors';
import { fonts, readingFont } from '@/theme/text';

/** Where the lit verse sits in the card when scrolled to: a little above the middle. */
const LIT_PLACE = 0.3;

/** How long after a move the scroll is checked again, once the verses passed have been measured. */
const SETTLE_MS = 500;

/** Props for one verse. */
type VerseLineProps = {
  /** The verse. */
  verse: CallVerse;
  /** True for the verse being shown. */
  lit: boolean;
};

/** One verse: its number and words, lit gold or dimmed. Drawn again only when it lights up or dims. */
const VerseLine = memo(function VerseLine({ verse, lit }: VerseLineProps) {
  return (
    <View style={lit ? styles.lit : styles.dim}>
      <Text style={styles.verse}>
        <Text style={[styles.number, lit && styles.litNumber]}>{`${verse.number} `}</Text>
        {verse.text}
      </Text>
    </View>
  );
});

/** Props for a round arrow button in the bar. */
type ArrowProps = {
  /** Which way it moves. */
  back: boolean;
  /** False at the chapter's first or last verse. */
  enabled: boolean;
  /** Moves the verse. */
  onPress: () => void;
};

/** The previous (white) or next (gold) verse button. */
function Arrow({ back, enabled, onPress }: ArrowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={back ? 'Previous verse' : 'Next verse'}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={[styles.arrow, back ? styles.arrowBack : styles.arrowNext, !enabled && styles.off]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={back ? show.verseTitle : call.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d={back ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </Svg>
    </Pressable>
  );
}

/** Props for the chapter card. */
type VerseCardProps = {
  /** The chapter's name, like "Genesis 37". */
  title: string;
  /** Its verses, in order. */
  verses: CallVerse[];
  /** The verse being shown. */
  lit: number;
  /** True for the host, who gets the arrows. */
  isHost: boolean;
  /** The host's name, for "only Mom can move it". */
  hostName: string;
  /** The host moves the lit verse. */
  onMove: (verse: number) => void;
};

/** The chapter card. Only the verses on screen are drawn. */
export function VerseCard({ title, verses, lit, isHost, hostName, onMove }: VerseCardProps) {
  const list = useRef<FlatList<CallVerse>>(null);
  const [height, setHeight] = useState(0);
  // How many times the scroll to the lit verse has waited for it to be laid out; it gives up after a few.
  const tries = useRef(0);
  const at = verses.findIndex((v) => v.number === lit);

  // Keeps the lit verse in view as it moves, and when the card changes size (like when Papa Dorin's box docks).
  useEffect(() => {
    if (at < 0 || height === 0) return;
    tries.current = 0;
    const go = (animated: boolean) => list.current?.scrollToIndex({ index: at, viewPosition: LIT_PLACE, animated });
    go(true);
    // Verses passed on the way are measured as they draw, so it corrects itself once they settle (no move when right).
    const settle = setTimeout(() => go(false), SETTLE_MS);
    return () => clearTimeout(settle);
  }, [at, height]);

  /** A verse far down isn't laid out yet: jump near it by the average size, then scroll to it exactly. */
  const notLaidOut = (info: { index: number; averageItemLength: number }) => {
    tries.current += 1;
    if (tries.current > 3) return;
    list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    setTimeout(() => list.current?.scrollToIndex({ index: info.index, viewPosition: LIT_PLACE, animated: true }), 120);
  };

  const label = isHost ? `Verse ${lit}` : `Verse ${lit} · only ${hostName} can move it`;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.translation}>BSB</Text>
      </View>
      <FlatList
        ref={list}
        data={verses}
        extraData={lit}
        keyExtractor={(v) => String(v.number)}
        renderItem={({ item }) => <VerseLine verse={item} lit={item.number === lit} />}
        contentContainerStyle={styles.words}
        onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}
        onScrollToIndexFailed={notLaidOut}
        initialNumToRender={12}
        windowSize={7}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.bar}>
        {isHost && <Arrow back enabled={at > 0} onPress={() => onMove(verses[at - 1].number)} />}
        <Text style={styles.barText}>{label}</Text>
        {isHost && <Arrow back={false} enabled={at >= 0 && at < verses.length - 1} onPress={() => onMove(verses[at + 1].number)} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 0, borderRadius: 24, borderWidth: 1, borderColor: show.verseEdge, backgroundColor: show.verseCard, boxShadow: `0 20px 34px -14px ${show.verseShadow}`, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: show.verseHeadLine },
  title: { fontFamily: fonts.black, fontSize: 17, color: show.verseTitle },
  translation: { fontFamily: fonts.bold, fontSize: 12, color: show.verseSoft },
  words: { paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
  verse: { fontFamily: readingFont, fontSize: 17, lineHeight: 26, color: show.verseInk },
  dim: { opacity: 0.55 },
  lit: { marginHorizontal: -8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: show.verseLit, boxShadow: `0 0 0 2px ${call.talking}` },
  number: { fontFamily: fonts.black, fontSize: 12, color: show.verseSoft },
  litNumber: { color: show.verseLitNumber },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: show.verseEdge, backgroundColor: show.verseBar },
  barText: { flex: 1, textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 13, color: show.verseTitle },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  arrowBack: { borderWidth: 1, borderColor: show.verseEdge, backgroundColor: show.verseButton },
  arrowNext: { backgroundColor: call.talking },
  off: { opacity: 0.4 },
});
