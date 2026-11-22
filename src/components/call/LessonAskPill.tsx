// "Hold to ask Papa Dorin" during a lesson together, as in the call mockups: a dark glass pill with a gold edge on
// the question card's result, or a cream button on the Explain the Answer page ("Still curious? Hold to ask him").
// It only works once the question is answered. While someone asks, what he hears shows just above it, over the
// card, so nothing under the finger moves and letting go always reaches it.

import type { Participant } from 'livekit-client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { explainColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import { DorinFace, LessonDorinAnswer, type DorinPhase } from './LessonDorinAnswer';
import { HOLD_IN_BROWSER, useAskPress } from './tapToTalkPress';
import type { PapaDorin } from './usePapaDorin';
import { useTapToTalk } from './useTapToTalk';

/** Props for the hold-to-ask pill. */
type LessonAskPillProps = {
  /** Dark on the question card, cream on the explain page. */
  look: 'dark' | 'cream';
  /** False until asking is allowed (it shows, dimmed, with its line saying when it opens). */
  enabled: boolean;
  /** The big words, like "Hold to ask Papa Dorin". */
  title: string;
  /** The small line under them. */
  line: string;
  /** Papa Dorin, held to ask. */
  dorin: PapaDorin;
  /** What he's doing with a question now. */
  phase: DorinPhase;
  /** The person holding this phone. */
  me: Participant;
};

/** The hold-to-ask pill, with what he hears above it while someone asks. */
export function LessonAskPill({ look, enabled, title, line, dorin, phase, me }: LessonAskPillProps) {
  const cream = look === 'cream';
  const holding = dorin.holding;
  // Open only when allowed here and nobody else is asking or being answered (one asker at a time).
  const open = enabled && !dorin.closed;
  const press = useAskPress(dorin);
  const tapMode = useTapToTalk();
  // With Tap to talk on, the words say tap instead of hold.
  const shownTitle = holding ? (tapMode ? 'Tap again when you’re done' : 'Let go when you’re done') : tapMode ? title.replace('Hold', 'Tap') : title;
  return (
    <View style={[styles.wrap, !cream && styles.wrapDark]}>
      {phase === 'asking' && (
        <View style={styles.above} pointerEvents="none">
          <LessonDorinAnswer dorin={dorin} phase={phase} me={me} />
        </View>
      )}
      {dorin.note !== '' && <Text style={[styles.note, cream && styles.noteCream]}>{dorin.note}</Text>}
      <Pressable
        accessibilityRole="button"
        {...press}
        accessibilityLabel={open ? press.accessibilityLabel : `${title}. ${enabled ? dorin.closedLine : line}`}
        accessibilityState={{ disabled: !open }}
        disabled={!open}
        style={[cream ? styles.cream : styles.dark, HOLD_IN_BROWSER, !open && styles.off]}
      >
        <DorinFace size={cream ? 42 : 46} ring={holding ? 'listening' : 'thin'} />
        <View style={styles.words}>
          <Text style={[styles.title, cream && styles.titleCream]}>{shownTitle}</Text>
          <Text style={[styles.line, cream && styles.lineCream]}>{holding ? 'Talking to Papa Dorin' : enabled && dorin.closed ? dorin.closedLine : line}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapDark: { alignItems: 'flex-end' },
  above: { position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 12, zIndex: 3, borderRadius: 22, backgroundColor: show.ringDark },
  dark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: show.pillEdge,
    backgroundColor: show.pillFill,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 16,
    boxShadow: `0 0 22px ${show.pillGlow}, 0 8px 18px -6px ${show.dropShadow}`,
  },
  cream: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: 1.5, borderColor: explainColors.edge, backgroundColor: explainColors.card, paddingVertical: 8, paddingLeft: 8, paddingRight: 14 },
  off: { opacity: 0.55 },
  words: { flexShrink: 1 },
  title: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  titleCream: { color: explainColors.ink },
  line: { fontFamily: fonts.bold, fontSize: 11.5, color: text.onDarkSoft },
  lineCream: { color: explainColors.back },
  note: { fontFamily: fonts.bold, fontSize: 12.5, color: text.goldNote, textAlign: 'right' },
  noteCream: { color: explainColors.back, textAlign: 'center' },
});
