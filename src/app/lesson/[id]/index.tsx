// A lesson's orbit view, opened from its card in a constellation's list: its title and range, and its stops as the
// constellation's cookies on rings around a big star. Only the first unbaked stop can be opened. Once every stop
// is baked, a calm "All cookies baked" note shows.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cookieArtFor } from '@/components/common/cookieArt';
import { RoundButton } from '@/components/common/DrillHeader';
import { AllBaked } from '@/components/lesson/AllBaked';
import { OrbitView } from '@/components/lesson/OrbitView';
import { useShownBaked } from '@/components/lesson/useShownBaked';
import { useSky } from '@/components/sky/SkyProvider';
import { useLesson, useLessonOutline } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import { text } from '@/theme/colors';
import { lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** The orbit view page. */
export default function LessonPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const lessonId = Number(id);
  const outline = useLessonOutline(lessonId);
  // Asking for the content here makes sure it is ready before a stop opens; normally it is already in memory.
  useLesson(lessonId);
  const progress = useProgress().data;
  const baked = useShownBaked(progress ? (progress.baked[lessonId] ?? 0) : undefined);
  const { constellations } = useSky();
  const constellation = constellations.find((k) => k.id === c) ?? constellations[0];
  const color = constellation.color;

  /** Opens a stop's player. */
  const openStop = (index: number) => router.push({ pathname: '/lesson/[id]/[stop]', params: { id, stop: String(index + 1), c: constellation.id } });

  return (
    <View
      style={[
        styles.page,
        { backgroundImage: `radial-gradient(ellipse at 85% 50%, ${mixColor(color, 0.18)}, rgba(0,0,0,0) 55%), linear-gradient(90deg, ${lessonSky.orbitVeil.join(', ')})` },
      ]}
    >
      {outline && baked !== undefined && <OrbitView stopCount={outline.stopCount} baked={baked} color={color} art={cookieArtFor(constellation.id)} onOpen={openStop} />}
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <RoundButton label="Back to the lessons" onPress={() => router.back()}>
          <Text style={styles.arrow}>←</Text>
        </RoundButton>
        {outline && (
          <View style={styles.words}>
            <Text style={[styles.title, { textShadowColor: color }]}>{outline.title}</Text>
            <Text style={[styles.ref, { color: mixColor(color, 0.7, '#ffffff') }]}>{outline.reference}</Text>
          </View>
        )}
      </View>
      {outline && baked !== undefined && baked >= outline.stopCount && <AllBaked color={color} onBack={() => router.back()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  head: { position: 'absolute', left: 14, right: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  words: { flex: 1, paddingTop: 2 },
  title: { fontFamily: fonts.black, fontSize: 20, lineHeight: 22, color: text.onDark, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, marginTop: 2 },
});
