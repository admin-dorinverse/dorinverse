// One day's page in the Clue Book. A collected clue is a cream page with a red ribbon. Today's clue, not yet
// collected, is a button to collect it. A missed day is an empty dashed page while the week is going; once the word
// is revealed it shows the clue in red. After the reveal every page also says where the Bible says it.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { easeOutBack, mix, progress } from '@/components/common/motion';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { text } from '@/theme/colors';
import { mystery } from '@/theme/mysteryColors';
import { fonts, readingFont } from '@/theme/text';
import type { ClueSlot } from '@/types/mystery';

/** The days' names, Monday first. */
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** How long a page takes to slide in, and the extra wait for each page after the first (ms). */
const ENTER_MS = 450;
const ENTER_STAGGER_MS = 70;

/** Props for a clue page. */
type ClueCardProps = {
  /** The day's clue. */
  clue: ClueSlot;
  /** True when the clue was collected just now, so it wears a NEW badge. */
  fresh?: boolean;
  /** The page's place in the list, which sets when it slides in. */
  index: number;
  /** The page's shared animation timer. */
  clock: AmbientClock;
  /** Collects the clue. Needed only for today's waiting clue. */
  onCollect?: () => void;
};

/** One clue page. */
export function ClueCard({ clue, fresh = false, index, clock, onCollect }: ClueCardProps) {
  const { time, still } = clock;
  const enter = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ translateY: 0 }] };
    const t = progress(time.get(), index * ENTER_STAGGER_MS, ENTER_MS);
    return { opacity: t, transform: [{ translateY: mix(easeOutBack(t, 0.6), 12, 0) }] };
  });
  const day = DAY_NAMES[clue.day - 1];
  const missed = clue.status === 'missed';

  if (clue.status === 'waiting') {
    return (
      <Animated.View style={enter}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Collect ${day}'s clue`} onPress={onCollect} style={({ pressed }) => [styles.waiting, pressed && styles.pressed]}>
          <Text style={styles.waitingDay}>{day.toUpperCase()}</Text>
          <Text style={styles.waitingAction}>Collect clue</Text>
        </Pressable>
      </Animated.View>
    );
  }
  if (clue.text === null) {
    return (
      <Animated.View style={[styles.empty, enter]} accessibilityLabel={`${day}: clue missed`}>
        <Text style={styles.emptyText}>{day.toUpperCase()}</Text>
        <Text style={styles.emptyText}>MISSED</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[styles.page, missed && styles.pageMissed, enter]}>
      <View style={styles.ribbon} />
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={[styles.day, missed && styles.dayMissed]}>
            {day.toUpperCase()} · CLUE {clue.day}
          </Text>
          {missed && <Text style={[styles.day, styles.dayMissed]}>MISSED</Text>}
          {fresh && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text selectable style={[styles.words, missed && styles.wordsMissed]}>
          {clue.text}
        </Text>
        {clue.reference !== null && <Text style={[styles.reference, missed && styles.referenceMissed]}>{clue.reference}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: 'row', borderRadius: 18, overflow: 'hidden', backgroundColor: mystery.paper, borderWidth: 1, borderColor: mystery.paperEdge, boxShadow: '0 8px 18px rgba(0,0,0,0.3)' },
  pageMissed: { backgroundColor: mystery.accentSoft, borderColor: mystery.accent, boxShadow: 'none' },
  ribbon: { width: 8, backgroundColor: mystery.accent },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 5 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  day: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1, color: mystery.heading },
  dayMissed: { color: mystery.accent },
  badge: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9, backgroundColor: mystery.newFill },
  badgeText: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 0.6, color: mystery.newInk },
  words: { fontFamily: readingFont, fontSize: 17, lineHeight: 25, color: mystery.ink },
  wordsMissed: { color: text.onDark },
  reference: { fontFamily: fonts.extraBold, fontSize: 12.5, color: mystery.heading },
  referenceMissed: { color: mystery.accent },
  waiting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderColor: mystery.accent, backgroundColor: mystery.accentSoft, paddingVertical: 14, paddingHorizontal: 16, boxShadow: `0 0 16px ${mystery.glow}` },
  waitingDay: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1, color: mystery.gold },
  waitingAction: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  pressed: { transform: [{ scale: 0.98 }] },
  empty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: mystery.missedEdge, paddingVertical: 12, paddingHorizontal: 16 },
  emptyText: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1, color: mystery.soft },
});
