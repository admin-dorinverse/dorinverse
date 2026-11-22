// A Bible chapter on screen with one verse lit, as in the call mockups' "A verse on screen" (screen 3): the call's
// name and "Mom is showing Genesis 37" (with "Stop showing" for the host), the cream chapter card from the database,
// and the people strip with Papa Dorin. While someone asks him, what he hears and says docks above the strip and
// the verse stays on screen.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadState } from '@/components/common/LoadState';
import { playSound } from '@/components/common/sounds';
import { bookOf } from '@/data/callContent';
import { useCallChapter } from '@/data/queries/call';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { HOST_PREFIX, type VerseShowState } from '@/types/call';
import { LessonDorinAnswer, phaseOf } from './LessonDorinAnswer';
import { useLocalParticipant } from './livekit';
import type { ShowProps } from './showProps';
import { VerseCard } from './VerseCard';
import { VersePeople } from './VersePeople';
import { useTalkers } from './verseTalkers';

/** How tall the call's Mute, Speaker and Leave bar is above the phone's bottom edge (CallRoom draws it). */
export const CONTROLS_HEIGHT = 82;

/** The space left between a shown screen and that bar. */
const ABOVE_CONTROLS = 14;

/** A Bible chapter on screen with one verse lit, as in the call mockups' "A verse on screen" (screen 3). */
export function VerseShow({ show, title, isHost, setShow, people, me, dorin }: ShowProps<VerseShowState>) {
  const insets = useSafeAreaInsets();
  const { localParticipant } = useLocalParticipant();
  const talkers = useTalkers();
  const chapter = useCallChapter(show.book, show.chapter);
  const book = bookOf(show.book);
  const name = `${book?.name ?? show.book} ${show.chapter}`;
  const hostName = people.find((p) => p.identity.startsWith(HOST_PREFIX))?.name || 'The host';
  const phase = phaseOf(dorin);

  return (
    <View style={[styles.page, { paddingBottom: insets.bottom + CONTROLS_HEIGHT + ABOVE_CONTROLS }]}>
      <View style={styles.head}>
        <View style={styles.headWords}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.line} numberOfLines={1}>{`${hostName} is showing ${name}`}</Text>
        </View>
        {isHost && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              setShow({ kind: 'lobby' });
            }}
            style={styles.stop}
          >
            <Text style={styles.stopText}>Stop showing</Text>
          </Pressable>
        )}
      </View>
      {chapter.data ? (
        <VerseCard title={name} verses={chapter.data} lit={show.verse} isHost={isHost} hostName={hostName} onMove={(verse) => setShow({ ...show, verse })} />
      ) : (
        <View style={styles.loading}>
          <LoadState failed={chapter.isError} onRetry={() => void chapter.refetch()} />
        </View>
      )}
      {phase !== 'none' && <LessonDorinAnswer dorin={dorin} phase={phase} me={localParticipant} />}
      {dorin.note !== '' && <Text style={styles.note}>{dorin.note}</Text>}
      <VersePeople dorin={dorin} people={people} recent={talkers.recent} me={me} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: gutter, paddingTop: 8, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headWords: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  stop: { height: 40, borderRadius: 20, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 14, justifyContent: 'center' },
  stopText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  loading: { flex: 1, justifyContent: 'center' },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.goldNote, textAlign: 'center' },
});
