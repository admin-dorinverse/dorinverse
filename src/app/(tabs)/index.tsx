// The Sky tab, the app's home page: the living sky you can drag around, the dock, and the Star Map. Tapping the
// bakery planet or a constellation opens its page; the red Clue Book sits in the dock beside the bell.

import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { playSound } from '@/components/common/sounds';
import { Dock } from '@/components/sky/Dock';
import type { MapSnapshot } from '@/components/sky/drawStarMap';
import { MapButton } from '@/components/sky/MapButton';
import { useSky, type SkyDestination } from '@/components/sky/SkyProvider';
import { SkyTouchLayer } from '@/components/sky/SkyTouchLayer';
import { StarMapPanel } from '@/components/sky/StarMapPanel';
import { refreshFriendNews } from '@/data/queries/friends';

/** The Sky page. */
export default function SkyPage() {
  const router = useRouter();
  const { sky, setAtHome, setArrivalHandler } = useSky();
  const [mapSnapshot, setMapSnapshot] = useState<MapSnapshot | null>(null);

  // While this tab shows, the sky shows its constellations, planet and rocket, and taps open pages.
  useFocusEffect(
    useCallback(() => {
      setAtHome(true);
      // Checks for new friends news for the bell's dot (at most once a minute).
      void refreshFriendNews();
      setArrivalHandler((d: SkyDestination) => {
        // The route list names the bakery "/bakery/index"; its real address is "/bakery".
        if (d.kind === 'bakery') router.push('/bakery' as Href);
        else router.push({ pathname: '/constellation/[id]', params: { id: d.id } });
      });
      return () => setAtHome(false);
    }, [router, setAtHome, setArrivalHandler]),
  );

  /** Opens the Star Map with a picture of where the camera and rocket are right now. */
  const openMap = () => {
    playSound('tap');
    // The sky's camera and rocket move on the animation thread, so the live spot is read there and sent back.
    scheduleOnUI(() => {
      'worklet';
      const s = sky.get();
      scheduleOnRN(setMapSnapshot, {
        cameraX: s.camera.x,
        cameraY: s.camera.y,
        screenW: s.width,
        screenH: s.height,
        rocketX: s.rocket.x,
        rocketY: s.rocket.y,
        rocketTurn: s.rocket.rotation,
      });
    });
  };

  return (
    <View style={styles.page}>
      <SkyTouchLayer />
      <Dock />
      <MapButton onPress={openMap} />
      {mapSnapshot && <StarMapPanel snapshot={mapSnapshot} onClose={() => setMapSnapshot(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
