// The steps after a lesson's stops, opened from "Head back to Papa Dorin's Bakery" in the orbit view: the Quality
// Check (Burnt Cookies), then the Big Idea, then signing the cookie box and sending it off on the conveyor belt. It
// shows the first step not done yet, so leaving and coming back picks up where the baker was. The lesson is already
// in memory, fetched with its card.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cookieArtFor } from '@/components/common/cookieArt';
import { LoadState } from '@/components/common/LoadState';
import { BigIdeaPlayer } from '@/components/lesson/BigIdeaPlayer';
import { QualityCheckPlayer } from '@/components/lesson/QualityCheckPlayer';
import { SendOff } from '@/components/lesson/SendOff';
import { SignBox } from '@/components/lesson/SignBox';
import { useSky } from '@/components/sky/SkyProvider';
import { useLesson, useLessonOutline } from '@/data/queries/lessons';
import { finishKitchenStep, useKitchenDone } from '@/data/queries/progress';
import { sampleBaker } from '@/data/sample/baker';
import { lessonSky } from '@/theme/lessonColors';
import { KITCHEN_STEPS } from '@/types/lesson';

/** The kitchen page. */
export default function KitchenPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const lessonId = Number(id);
  const lesson = useLesson(lessonId);
  const outline = useLessonOutline(lessonId);
  const done = useKitchenDone(lessonId);
  const { constellations } = useSky();
  const constellation = constellations.find((k) => k.id === c) ?? constellations[0];
  const art = cookieArtFor(constellation.id);
  // The signature once "Send it off" is pressed (empty when not signed); null while still signing.
  const [sending, setSending] = useState<string | null>(null);
  const ready = lesson.data && outline && done !== undefined && lesson.data.qualityCheck.lines.length > 0;

  /** Marks the step showing done; the page then shows the next one. */
  const finish = (step: number, signature?: string) => {
    if (outline) void finishKitchenStep(lessonId, step, outline.stopCount, signature || undefined);
  };

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ animation: 'fade', gestureEnabled: false }} />
      {ready && done === 0 ? (
        <QualityCheckPlayer
          check={lesson.data.qualityCheck}
          color={constellation.color}
          art={art}
          onClose={() => router.back()}
          onDone={() => finish(1)}
        />
      ) : ready && done === 1 ? (
        <BigIdeaPlayer paragraphs={lesson.data.bigIdea} color={constellation.color} onClose={() => router.back()} onDone={() => finish(2)} />
      ) : ready ? (
        sending === null && done < KITCHEN_STEPS.length ? (
          <SignBox bakerName={sampleBaker.name} box={art.box} color={constellation.color} onSend={setSending} onClose={() => router.back()} />
        ) : (
          <SendOff
            box={art.box}
            bakerName={sampleBaker.name}
            signature={sending ?? ''}
            color={constellation.color}
            alreadySent={sending === null}
            onSent={() => finish(3, sending ?? undefined)}
            onClose={() => router.back()}
          />
        )
      ) : (
        <View style={{ paddingTop: insets.top + 80 }}>
          <LoadState failed={lesson.isError || (!!lesson.data && lesson.data.qualityCheck.lines.length === 0)} onRetry={() => lesson.refetch()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
});
