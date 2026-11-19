// The Sky tab, the app's home page: the living sky you can drag around (with its Collections area), the dock,
// and the Star Map.

import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { Dock } from '@/components/sky/Dock';
import type { MapSnapshot } from '@/components/sky/drawStarMap';
import { MapButton } from '@/components/sky/MapButton';
import { useSky, type SkyDestination } from '@/components/sky/SkyProvider';
import { SkyTouchLayer } from '@/components/sky/SkyTouchLayer';
import { StarMapPanel } from '@/components/sky/StarMapPanel';

/** The Sky page. */
export default function SkyPage() {
  const router = useRouter();
  const { sky, setAtHome, setArrivalHandler } = useSky();
  const [mapSnapshot, setMapSnapshot] = useState<MapSnapshot | null>(null);

  // While this tab shows, the sky shows its constellations, planet and rocket, and taps open pages.
  useFocusEffect(
    useCallback(() => {
      setAtHome(true);
      setArrivalHandler((d: SkyDestination) => {
        if (d.kind === 'bakery') router.push('/bakery');
        // The route list names these lists "/bible/index" and so on; their real addresses are "/bible", "/characters"...
        else if (d.kind === 'collection') router.push((d.list === 'verses' ? '/bible' : `/${d.list}`) as Href);
        else router.push({ pathname: '/constellation/[id]', params: { id: d.id } });
      });
      return () => setAtHome(false);
    }, [router, setAtHome, setArrivalHandler]),
  );

  /** Opens the Star Map with a picture of where the camera and rocket are right now. */
  const openMap = () => {
    const s = sky.get();
    playSound('tap');
    setMapSnapshot({
      cameraX: s.camera.x,
      cameraY: s.camera.y,
      screenW: s.width,
      screenH: s.height,
      rocketX: s.rocket.x,
      rocketY: s.rocket.y,
      rocketTurn: s.rocket.rotation,
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
