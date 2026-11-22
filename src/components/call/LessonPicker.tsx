// The host picks a lesson, to do together or to play trivia on its questions, on a full-screen sheet in the call's
// look: a search box for the lesson's name or verses, and every lesson in Bible order with its verses and kind.
// Only the rows on screen are drawn.

import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadState } from '@/components/common/LoadState';
import { playSound } from '@/components/common/sounds';
import { useCallOutlines } from '@/data/queries/call';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { LessonOutline } from '@/types/lesson';

/** Props for the lesson picker. */
type LessonPickerProps = {
  /** What the lesson is for: doing it together, or trivia on its questions. */
  purpose: 'lesson' | 'trivia';
  /** The picked lesson (its passage id). */
  onPick: (passageId: number) => void;
  /** Closes without picking. */
  onClose: () => void;
};

/** The words a lesson is found by: its name and its verses, in small letters. */
function searchWords(l: LessonOutline): string {
  return `${l.title} ${l.reference}`.toLowerCase();
}

/** The host picks a lesson, to do together or to play trivia on its questions. */
export function LessonPicker({ purpose, onPick, onClose }: LessonPickerProps) {
  const insets = useSafeAreaInsets();
  const outlines = useCallOutlines();
  const [query, setQuery] = useState('');
  const trivia = purpose === 'trivia';
  // Each lesson's search words, made once per list.
  const indexed = useMemo(() => (outlines.data ?? []).map((l) => ({ lesson: l, words: searchWords(l) })), [outlines.data]);
  const shown = useMemo(() => {
    const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return parts.length === 0 ? indexed.map((x) => x.lesson) : indexed.filter((x) => parts.every((p) => x.words.includes(p))).map((x) => x.lesson);
  }, [indexed, query]);

  return (
    <View style={[styles.sheet, { paddingTop: insets.top + 12 }]} accessibilityViewIsModal>
      <View style={styles.inner}>
        <View style={styles.head}>
          <View style={styles.headWords}>
            <Text style={styles.title}>{trivia ? 'Trivia' : 'Do a lesson'}</Text>
            <Text style={styles.line}>{trivia ? 'Papa Dorin asks its questions to everyone' : 'Do it together, one card at a time'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onClose();
            }}
            style={styles.pill}
          >
            <Text style={styles.pillText}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search lessons, like Joseph or Genesis 37"
          placeholderTextColor={text.onDarkSoft}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
          accessibilityLabel="Search lessons"
        />
        {outlines.data ? (
          <FlatList
            data={shown}
            keyExtractor={(l) => String(l.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            initialNumToRender={14}
            windowSize={7}
            ListEmptyComponent={<Text style={styles.empty}>No lesson matches that.</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  playSound('tap');
                  onPick(item.id);
                }}
                style={[styles.row, trivia && styles.rowTrivia]}
              >
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.rowLine} numberOfLines={1}>{`${item.reference} · ${item.type}`}</Text>
              </Pressable>
            )}
          />
        ) : (
          <View style={styles.loading}>
            <LoadState failed={outlines.isError} onRetry={() => void outlines.refetch()} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: call.page,
    backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${call.pageGlow[0]} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)`,
  },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: gutter, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headWords: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 22, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  pill: { height: 40, borderRadius: 20, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 14, justifyContent: 'center' },
  pillText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  search: { height: 50, borderRadius: 18, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 16, fontFamily: fonts.bold, fontSize: 16, color: text.onDark },
  list: { gap: 8 },
  row: { borderRadius: 16, borderWidth: 1, borderColor: call.toolLessonEdge, backgroundColor: call.toolLessonFill, paddingVertical: 12, paddingHorizontal: 16, gap: 2 },
  rowTrivia: { borderColor: call.toolTriviaEdge, backgroundColor: call.toolTriviaFill },
  rowTitle: { fontFamily: fonts.extraBold, fontSize: 15.5, color: text.onDark },
  rowLine: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  loading: { flex: 1, justifyContent: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 14, color: text.onDarkSoft, textAlign: 'center', paddingTop: 24 },
});
