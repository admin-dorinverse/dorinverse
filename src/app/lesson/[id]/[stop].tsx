// One stop of a lesson, opened by tapping its cookie in the orbit view: Papa Dorin's story and questions for that
// stretch of the passage, the fix round for missed questions, and "Cookie baked!" with the revealed verses. The
// lesson is normally already in memory, fetched while its card showed in the list.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cookieArtFor } from '@/components/common/cookieArt';
import { LoadState } from '@/components/common/LoadState';
import { StopPlayer } from '@/components/lesson/StopPlayer';
import { useSky } from '@/components/sky/SkyProvider';
import { useLesson, useLessonOutline } from '@/data/queries/lessons';
import { lessonSky } from '@/theme/lessonColors';

/** The stop player page. */
export default function StopPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, stop, c } = useLocalSearchParams<{ id: string; stop: string; c?: string }>();
  const lessonId = Number(id);
  const lesson = useLesson(lessonId);
  const outline = useLessonOutline(lessonId);
  const { constellations } = useSky();
  const constellation = constellations.find((k) => k.id === c) ?? constellations[0];
  const found = lesson.data?.stops.find((s) => s.stop === Number(stop));

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ animation: 'fade', gestureEnabled: false }} />
      {found && outline ? (
        <StopPlayer
          lessonId={lessonId}
          stop={found}
          foundIn={outline.startChapter}
          color={constellation.color}
          art={cookieArtFor(constellation.id)}
          onClose={() => router.back()}
        />
      ) : (
        <View style={{ paddingTop: insets.top + 80 }}>
          <LoadState failed={lesson.isError} onRetry={() => lesson.refetch()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
});
