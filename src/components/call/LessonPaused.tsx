// The lesson while Papa Dorin answers someone's question, as in the call mockups' "Papa Dorin answers during a
// lesson": "Lesson together" and the lesson's name, the answered question kept on screen (smaller, with who picked
// what, its verses and "Paused while he talks"), his answer in the gold box docked at the bottom, and a small row of
// everyone, turned down while he talks.

import type { Participant } from 'livekit-client';
import { StyleSheet, Text, View } from 'react-native';
import { callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { ChoiceCard } from '@/types/lesson';
import { CallPerson } from './CallPerson';
import { LessonChoice } from './LessonChoice';
import { LessonDorinAnswer, type DorinPhase } from './LessonDorinAnswer';
import type { PapaDorin } from './usePapaDorin';

/** How many small avatars show before "+N Everyone". */
const SHOWN = 3;

/** Props for the paused lesson. */
type LessonPausedProps = {
  /** The lesson's name. */
  lessonTitle: string;
  /** The answered question. */
  card: ChoiceCard;
  /** This person's pick. */
  mine: number[];
  /** The right answers. */
  rightIds: readonly number[];
  /** Who picked each answer. */
  pickers: ReadonlyMap<number, string[]>;
  /** Papa Dorin and his answer. */
  dorin: PapaDorin;
  /** Thinking or talking. */
  phase: DorinPhase;
  /** The person holding this phone. */
  me: Participant;
  /** Everyone on the call except him, most important first. */
  people: Participant[];
};

/** The paused lesson with his answer docked. */
export function LessonPaused({ lessonTitle, card, mine, rightIds, pickers, dorin, phase, me, people }: LessonPausedProps) {
  const more = people.length - SHOWN;
  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Text style={styles.title}>Lesson together</Text>
        <Text style={styles.line} numberOfLines={1}>
          {lessonTitle}
        </Text>
      </View>
      <View style={styles.answered}>
        <LessonChoice card={card} mode="paused" mine={mine} rightIds={rightIds} pickers={pickers} />
        <View style={styles.under}>
          <Text style={styles.verses}>{card.verses}</Text>
          <Text style={styles.paused}>Paused while he talks</Text>
        </View>
      </View>
      <View style={styles.space} />
      <LessonDorinAnswer dorin={dorin} phase={phase} me={me} />
      <View style={styles.row}>
        {people.slice(0, more > 0 ? SHOWN : people.length).map((p) => (
          <CallPerson key={p.identity} person={p} size={44} label={p.identity === me.identity ? 'You' : undefined} />
        ))}
        {more > 0 && (
          <View style={styles.cell}>
            <View style={styles.more}>
              <Text style={styles.moreText}>{`+${more}`}</Text>
            </View>
            <Text style={styles.name}>Everyone</Text>
          </View>
        )}
        <Text style={styles.down}>Others turned down</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: 12 },
  head: { gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  answered: { gap: 8, flexShrink: 1, overflow: 'hidden' },
  under: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, opacity: 0.8 },
  verses: { flex: 1, fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
  paused: { fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDarkSoft },
  space: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 2 },
  cell: { width: 52, alignItems: 'center', gap: 4 },
  more: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: show.moreEdge, backgroundColor: show.moreFill, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  name: { fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDark },
  down: { flex: 1, textAlign: 'right', fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15, color: text.onDarkSoft },
});
