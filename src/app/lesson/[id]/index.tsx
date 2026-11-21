// A lesson's orbit view, opened from its card in a constellation's list: its title and range, and its stops as the
// constellation's cookies on rings around a big star. Only the first unbaked stop can be opened. Once every stop
// is baked, the baker's rocket flies in to collect the cookies; then a calm note shows, with the way back to Papa
// Dorin's Bakery for the steps after the stops.

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cookieArtFor } from '@/components/common/cookieArt';
import { RoundButton } from '@/components/common/DrillHeader';
import { AllBaked } from '@/components/lesson/AllBaked';
import { OrbitView } from '@/components/lesson/OrbitView';
import { RocketCollect } from '@/components/lesson/RocketCollect';
import { useRocketCollected } from '@/components/lesson/useRocketCollected';
import { useShownBaked } from '@/components/lesson/useShownBaked';
import { useSky } from '@/components/sky/SkyProvider';
import { StillSky } from '@/components/sky/StillSky';
import { useLesson, useLessonOutline } from '@/data/queries/lessons';
import { REPLAY_BAKERY_STEPS } from '@/data/devTesting';
import { resetKitchenSteps, useKitchenDone, useProgress } from '@/data/queries/progress';
import { text } from '@/theme/colors';
import { lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** No cookies collected: before every stop is baked. */
const NONE: ReadonlySet<number> = new Set();

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
  const kitchenDone = useKitchenDone(lessonId);
  const baked = useShownBaked(progress ? (progress.baked[lessonId] ?? 0) : undefined);
  const { constellations } = useSky();
  const constellation = constellations.find((k) => k.id === c) ?? constellations[0];
  const color = constellation.color;
  const art = cookieArtFor(constellation.id);
  const stopCount = outline?.stopCount ?? 0;
  const allBaked = !!outline && baked !== undefined && kitchenDone !== undefined && baked >= stopCount;
  const rocket = useRocketCollected(lessonId, stopCount, (kitchenDone ?? 0) > 0);
  const [leaving, setLeaving] = useState(false);
  const [rocketGone, setRocketGone] = useState(false);

  // DEVELOPMENT ONLY, for testing: opening the lesson, or coming back from the Bakery steps, starts those steps over
  // with the cookies back out.
  const away = useRef(false);
  const progressLoaded = kitchenDone !== undefined;
  const [round, setRound] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (REPLAY_BAKERY_STEPS && (away.current || (kitchenDone ?? 0) > 0)) {
        void resetKitchenSteps(lessonId);
        rocket.forget();
        setRocketGone(false);
        setLeaving(false);
        setRound((n) => n + 1);
      }
      return () => {
        away.current = true;
      };
      // When the page comes into view, and when its progress first loads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId, progressLoaded]),
  );

  /** Opens the steps after the stops: the Quality Check, the Big Idea and signing the box. */
  const openKitchen = () => router.push({ pathname: '/lesson/[id]/kitchen', params: { id, c: constellation.id } });

  /** Heads back to the Bakery: the rocket flies off first, then the Bakery steps open. */
  const headBack = () => {
    if (rocketGone || kitchenDone !== 0) openKitchen();
    else setLeaving(true);
  };

  /** Opens a stop's player. */
  const openStop = (index: number) => router.push({ pathname: '/lesson/[id]/[stop]', params: { id, stop: String(index + 1), c: constellation.id } });

  return (
    <View style={styles.page}>
      <StillSky />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundImage: `radial-gradient(ellipse at 85% 50%, ${mixColor(color, 0.18)}, rgba(0,0,0,0) 55%), linear-gradient(90deg, ${lessonSky.orbitVeil.join(', ')})` },
        ]}
      />
      {outline && baked !== undefined && <OrbitView stopCount={stopCount} baked={baked} color={color} art={art} collected={allBaked ? rocket.collected : NONE} onOpen={openStop} />}
      {allBaked && kitchenDone === 0 && !rocketGone && (
        <RocketCollect
          key={round}
          stopCount={stopCount}
          collected={rocket.collected}
          art={art}
          onCollect={rocket.add}
          onAllIn={rocket.finish}
          leaving={leaving}
          onGone={() => {
            setRocketGone(true);
            setLeaving(false);
            openKitchen();
          }}
        />
      )}
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <RoundButton label="Back to the lessons" onPress={() => router.back()}>
          <Text style={styles.arrow}>←</Text>
        </RoundButton>
        {outline && (
          <View style={styles.words}>
            <Text style={[styles.title, { textShadowColor: color }]}>{outline.title}</Text>
            <Text style={[styles.ref, { color: mixColor(color, 0.7, lessonSky.white) }]}>{outline.reference}</Text>
          </View>
        )}
      </View>
      {allBaked && rocket.allIn && !leaving && <AllBaked color={color} kitchenDone={kitchenDone} onHeadBack={headBack} onBack={() => router.back()} />}
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
