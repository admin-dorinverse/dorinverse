// One constellation's lesson list, opened by flying to it in the sky: its shape and name, then its kind of lessons in
// Bible order, a story's lessons together under the story's heading. It shows 25 lessons at first and 25 more as the
// person scrolls; only the cards on screen are drawn. Each card's lesson is fetched in the background as it comes on
// screen, so opening one never waits.

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cookieArtFor } from '@/components/common/cookieArt';
import { RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { cardLook, GroupHeading, LessonCard } from '@/components/constellation/LessonCard';
import { ListTop } from '@/components/constellation/ListTop';
import { usePrefetchOnScreen } from '@/components/constellation/usePrefetchOnScreen';
import { useSky } from '@/components/sky/SkyProvider';
import { StillSky } from '@/components/sky/StillSky';
import { useLessonOutlines, useLessonRows, type LessonRow } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import { text } from '@/theme/colors';
import { lessonSky } from '@/theme/lessonColors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { LessonOutline } from '@/types/lesson';

/** How many lessons show at first, and how many more each time the list nears its end. */
const PAGE = 25;

/** The constellation's lesson list page. */
export default function ConstellationPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { constellations } = useSky();
  const constellation = constellations.find((c) => c.id === id) ?? constellations[0];
  const outlines = useLessonOutlines();
  const rows = useLessonRows(constellation.id);
  const baked = useProgress().data?.baked;
  const onScreen = usePrefetchOnScreen();
  const [shown, setShown] = useState(PAGE);

  const art = cookieArtFor(constellation.id);
  const look = useMemo(() => cardLook(constellation.color), [constellation.color]);
  const lessonCount = useMemo(() => rows?.filter((r) => r.kind === 'lesson').length, [rows]);
  // The rows up to the `shown`-th lesson, with their story headings.
  const visible = useMemo(() => {
    if (!rows) return [];
    let lessons = 0;
    const end = rows.findIndex((r) => r.kind === 'lesson' && ++lessons > shown);
    return end < 0 ? rows : rows.slice(0, end);
  }, [rows, shown]);

  /** Opens a lesson's orbit view. */
  // The generated route list names the orbit page "/lesson/[id]/index"; its real address is "/lesson/<id>".
  const open = useCallback((lesson: LessonOutline) => router.push(`/lesson/${lesson.id}?c=${constellation.id}` as Href), [router, constellation.id]);

  /** Draws one row: a story heading or a lesson card. */
  const renderRow = ({ item }: { item: LessonRow }) =>
    item.kind === 'group' ? (
      <GroupHeading name={item.name} count={item.count} color={constellation.color} />
    ) : (
      <LessonCard lesson={item.lesson} baked={baked?.[item.lesson.id] ?? 0} art={art} look={look} onOpen={open} />
    );

  return (
    <View style={styles.page}>
      <StillSky />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil]} />
      <View style={[styles.back, { top: insets.top + 12 }]}>
        <RoundButton label="Back to the sky" onPress={() => router.back()}>
          <Text style={styles.arrow}>←</Text>
        </RoundButton>
      </View>
      {outlines.isError && !outlines.data ? (
        <View style={{ paddingTop: insets.top + 70 }}>
          <LoadState failed onRetry={() => outlines.refetch()} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          extraData={baked}
          ListHeaderComponent={<ListTop constellation={constellation} count={lessonCount} />}
          ListEmptyComponent={rows ? <Text style={styles.empty}>No lessons here yet.</Text> : <LoadState failed={false} onRetry={() => outlines.refetch()} />}
          onEndReached={() => setShown((n) => (lessonCount && n < lessonCount ? n + PAGE : n))}
          onEndReachedThreshold={0.6}
          initialNumToRender={6}
          windowSize={7}
          maxToRenderPerBatch={6}
          {...onScreen}
          contentContainerStyle={[styles.list, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 120 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  veil: { backgroundImage: `linear-gradient(180deg, ${lessonSky.listVeil.join(', ')})` },
  back: { position: 'absolute', left: 14, zIndex: 2 },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  list: { paddingHorizontal: gutter + 2, width: '100%', maxWidth: 596, alignSelf: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
