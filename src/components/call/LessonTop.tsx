// The top of a lesson together, as in the call mockups: a small stack of everyone's avatars (a gold ring on whoever
// is talking, then "+1"), and a line beside it like "Mia is talking" or "Everyone else turned down". On the cream
// Explain the Answer page it uses the page's cream colors. Mute and Leave sit at its right, as in the mockups.

import type { Participant } from 'livekit-client';
import { StyleSheet, Text, View } from 'react-native';
import { call, callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { explainColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import { CallControls } from './CallControls';
import { CallAvatar } from './CallPerson';

/** How many avatars show before the "+" circle. */
const STACK = 3;

/** Props for the lesson's top. */
type LessonTopProps = {
  /** Everyone on the call except Papa Dorin. */
  people: Participant[];
  /** The identities of the people talking now. */
  talking: string[];
  /** The line beside the avatars; when left out, who is talking. */
  line?: string;
  /** True on the cream explain page. */
  cream?: boolean;
};

/** "Mia is talking", "Mia and Mom are talking", or nothing while nobody talks. */
function talkingLine(people: Participant[], talking: string[]): string {
  const names = people.filter((p) => talking.includes(p.identity)).map((p) => p.name || 'Guest');
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is talking`;
  return `${names.slice(0, 2).join(' and ')} ${names.length > 2 ? 'and others are' : 'are'} talking`;
}

/** The avatars and the line. */
export function LessonTop({ people, talking, line, cream = false }: LessonTopProps) {
  const edge = cream ? explainColors.page : show.ringDark;
  const more = people.length - STACK;
  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {people.slice(0, STACK).map((p, i) => (
          <View
            key={p.identity}
            style={[styles.item, i > 0 && styles.overlap, { boxShadow: talking.includes(p.identity) ? `0 0 0 2px ${edge}, 0 0 0 4px ${call.talking}` : `0 0 0 2px ${edge}` }]}
          >
            <CallAvatar name={p.name || 'Guest'} size={34} />
          </View>
        ))}
        {more > 0 && (
          <View style={[styles.item, styles.overlap, styles.more, cream && styles.moreCream, { boxShadow: `0 0 0 2px ${edge}` }]}>
            <Text style={[styles.moreText, cream && styles.moreTextCream]}>{`+${more}`}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.line, cream && styles.lineCream]} numberOfLines={1}>
        {line ?? talkingLine(people, talking)}
      </Text>
      <CallControls compact cream={cream} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42 },
  stack: { flexDirection: 'row' },
  item: { width: 34, height: 34, borderRadius: 17 },
  overlap: { marginLeft: -6 },
  more: { backgroundColor: call.mutedBadge, alignItems: 'center', justifyContent: 'center' },
  moreCream: { backgroundColor: explainColors.edge },
  moreText: { fontFamily: fonts.black, fontSize: 12, color: text.onDark },
  moreTextCream: { color: explainColors.ink },
  line: { flex: 1, fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
  lineCream: { color: explainColors.back },
});
