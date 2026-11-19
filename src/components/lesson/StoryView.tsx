// A story card in the player: Papa Dorin tells the next piece of the passage in his speech bubble, with its verse
// reference, its explained words and sayings to tap, and a pop-up for each sample cookie its verses tell that the
// person has not collected yet. Collecting one sends it to Collections.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import { collectCookie, useProgress } from '@/data/queries/progress';
import { targetId } from '@/data/queries/lessons';
import { answerColors, cream } from '@/theme/lessonColors';
import { navy, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { LessonCookie, StoryCard } from '@/types/lesson';
import { CreamSheet } from './CreamSheet';
import { DorinSpeak } from './DorinSpeak';
import { MarkedText, type MarkTap } from './MarkedText';
import { WordSheet } from './WordSheet';

/** Props for a story card. */
type StoryViewProps = {
  /** The card. */
  card: StoryCard;
  /** Where the lesson starts, like "Judges 3", saved with what is collected. */
  foundIn: string;
  /** Papa Dorin's height. */
  dorinHeight: number;
  /** The constellation's color, for the pop-up chips. */
  color: string;
};

/** A story card. */
export function StoryView({ card, foundIn, dorinHeight, color }: StoryViewProps) {
  const collected = useProgress().data?.collected;
  const [tap, setTap] = useState<MarkTap | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<LessonCookie | null>(null);
  const [justGot, setJustGot] = useState<ReadonlySet<string>>(new Set());
  // Only cookies not collected yet pop up; one collected here stays as a "Collected" note on this card.
  const cookies = card.cookies.filter((k) => justGot.has(k.key) || !collected?.has(targetId(k.target)));

  /** Opens a word's or saying's meaning. */
  const openTap = (t: MarkTap) => {
    playSound('word');
    setSeen((s) => new Set([...s, `${t.kind}:${t.index}`]));
    setTap(t);
  };

  return (
    <View>
      <DorinSpeak length={card.text.length} height={dorinHeight}>
        <MarkedText text={card.text} words={card.words} idioms={card.idioms} seen={seen} onTap={openTap} style={styles.words} />
        <Text style={styles.cite}>{card.verses}</Text>
      </DorinSpeak>
      {cookies.map((k) => {
        const got = justGot.has(k.key);
        return (
          <Animated.View key={k.key} entering={FadeIn.delay(500).duration(300)}>
            <Pressable
              accessibilityRole="button"
              disabled={got}
              onPress={() => {
                playSound('tap');
                setOpened(k);
              }}
              style={({ pressed }) => [styles.chip, { borderColor: color, boxShadow: `0 0 14px ${color}` }, got && styles.chipDone, pressed && styles.pressed]}
            >
              <Text style={[styles.chipMark, { backgroundColor: color }]}>{got ? '✓' : '✦'}</Text>
              <View style={styles.chipWords}>
                <Text style={styles.chipKind}>{got ? 'Collected' : `Sample cookie · ${k.label}`}</Text>
                <Text style={styles.chipTitle} numberOfLines={2}>
                  {k.title}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
      <WordSheet card={card} tap={tap} onClose={() => setTap(null)} />
      <CreamSheet
        open={!!opened}
        onClose={() => setOpened(null)}
        kind={opened ? `Sample cookie · ${opened.label}` : ''}
        title={opened?.title ?? ''}
        body={opened?.detail ?? null}
        note={opened?.reference ?? null}
        button="Collect"
        onButton={() => {
          if (!opened) return;
          playSound('collect');
          setJustGot((s) => new Set([...s, opened.key]));
          void collectCookie(opened, foundIn);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  words: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 27, color: cream.ink },
  cite: { fontFamily: fonts.extraBold, fontSize: 13, color: cream.cite, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: answerColors.idleFill,
  },
  chipDone: { opacity: 0.7, boxShadow: 'none' },
  pressed: { transform: [{ scale: 0.98 }] },
  chipMark: { width: 32, height: 32, borderRadius: 16, textAlign: 'center', lineHeight: 32, fontFamily: fonts.black, fontSize: 16, color: navy, overflow: 'hidden' },
  chipWords: { flex: 1 },
  chipKind: { fontFamily: fonts.black, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', color: text.goldNote },
  chipTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: text.onDark },
});
