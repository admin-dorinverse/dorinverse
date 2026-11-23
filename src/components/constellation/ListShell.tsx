// What every page of a constellation's lessons sits in: the still sky with a dark veil, a round back button, and
// the list, or a Try again message when the lesson outline could not load.

import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { StillSky } from '@/components/sky/StillSky';
import { useLessonOutlines } from '@/data/queries/lessons';
import { text } from '@/theme/colors';
import { lessonSky } from '@/theme/lessonColors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for the page's frame. */
type ListShellProps = {
  /** What the back button says to screen readers, like "Back to the sky". */
  backLabel: string;
  /** The page's list. */
  children: ReactNode;
};

/** The sky, the veil and the back button around a list; a Try again message when the outline failed to load. */
export function ListShell({ backLabel, children }: ListShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const outlines = useLessonOutlines();
  return (
    <View style={styles.page}>
      <StillSky />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil]} />
      <View style={[styles.back, { top: insets.top + 12 }]}>
        <RoundButton label={backLabel} onPress={() => router.back()}>
          <Text style={styles.arrow}>←</Text>
        </RoundButton>
      </View>
      {outlines.isError && !outlines.data ? (
        <View style={{ paddingTop: insets.top + 70 }}>
          <LoadState failed onRetry={() => outlines.refetch()} />
        </View>
      ) : (
        children
      )}
    </View>
  );
}

/** The padding and width every list in the frame uses, clear of the back button and the phone's edges. */
export function useListContentStyle() {
  const insets = useSafeAreaInsets();
  return useMemo(() => [styles.list, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 120 }], [insets.top, insets.bottom]);
}

/** Props for what a list shows when it has no rows. */
type ListEmptyProps = {
  /** True once the outline is loaded; until then a spinner shows. */
  loaded: boolean;
  /** What to say when there is nothing to show, like "No lessons here yet." */
  message: string;
};

/** A spinner while the outline loads, then a short message if there is still nothing to show. */
export function ListEmpty({ loaded, message }: ListEmptyProps) {
  const outlines = useLessonOutlines();
  return loaded ? <Text style={styles.empty}>{message}</Text> : <LoadState failed={false} onRetry={() => outlines.refetch()} />;
}

/** The list settings every page here shares: only the rows on screen, and a few more, are drawn. */
export const LIST_WINDOW = { initialNumToRender: 6, windowSize: 7, maxToRenderPerBatch: 6 } as const;

const styles = StyleSheet.create({
  page: { flex: 1 },
  veil: { backgroundImage: `linear-gradient(180deg, ${lessonSky.listVeil.join(', ')})` },
  back: { position: 'absolute', left: 14, zIndex: 2 },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  list: { paddingHorizontal: gutter + 2, width: '100%', maxWidth: 596, alignSelf: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
