// Last week's results at the bottom of the Clue Book: a row with last week's word that opens to show all seven
// clues with their references, the missed ones in red.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { text } from '@/theme/colors';
import { mystery } from '@/theme/mysteryColors';
import { fonts } from '@/theme/text';
import type { PastMystery } from '@/types/mystery';
import { ClueCard, DAY_NAMES } from './ClueCard';

/** Props for last week's results. */
type LastWeekProps = {
  /** Last week's word, clues and the day it was guessed. */
  past: PastMystery;
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** Last week's word, and its clues when opened. */
export function LastWeek({ past, clock }: LastWeekProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          playSound('tap');
          setOpen(!open);
        }}
        style={styles.row}
      >
        <View style={styles.words}>
          <Text style={styles.kicker}>LAST WEEK</Text>
          <Text style={styles.word}>{past.word.toUpperCase()}</Text>
        </View>
        <Text style={styles.result}>{past.solvedOn === null ? 'Not solved' : `Solved ${DAY_NAMES[past.solvedOn - 1]}`}</Text>
        <Text style={styles.arrow}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && past.clues.map((c) => <ClueCard key={c.day} clue={c} index={0} clock={clock} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: mystery.missedEdge, backgroundColor: mystery.later, paddingVertical: 12, paddingHorizontal: 16 },
  words: { flex: 1, gap: 1 },
  kicker: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1.2, color: mystery.soft },
  word: { fontFamily: fonts.black, fontSize: 18, letterSpacing: 2, color: text.onDark },
  result: { fontFamily: fonts.extraBold, fontSize: 13, color: mystery.gold },
  arrow: { fontFamily: fonts.black, fontSize: 14, color: mystery.soft },
});
