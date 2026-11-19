// The two tabs: Sky and Keep it fresh. The collections and the games live in the sky itself, each in its own area. The living sky sits behind all of them,
// with the HUD pills and the knob tabs floating on top.

import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { GlassBackdrop } from '@/components/common/Glass';
import { KnobTabs } from '@/components/common/KnobTabs';
import { BakeryPlanet } from '@/components/sky/BakeryPlanet';
import { Hud } from '@/components/sky/Hud';
import { RocketView } from '@/components/sky/RocketView';
import { SkyCanvas } from '@/components/sky/SkyCanvas';
import { SkyCollections } from '@/components/sky/SkyCollections';
import { SkyGames } from '@/components/sky/SkyGames';

/** The tabs layout. The hidden list declares the tabs; the knob tabs are the buttons people see. */
export default function TabsLayout() {
  return (
    <Tabs style={styles.fill}>
      <GlassBackdrop
        overlay={
          <>
            <TabSlot style={styles.fill} />
            <Hud />
            <KnobTabs />
          </>
        }
      >
        <SkyCanvas />
        <BakeryPlanet />
        <SkyCollections />
        <SkyGames />
        <RocketView />
      </GlassBackdrop>
      <TabList style={styles.hidden}>
        <TabTrigger name="sky" href="/" />
        <TabTrigger name="keep-it-fresh" href="/keep-it-fresh" />
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
