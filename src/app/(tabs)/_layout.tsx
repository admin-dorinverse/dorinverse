// The three tabs: Sky, Collections and Bible Crew. The living sky (with the bakery planet and
// the rocket) sits behind all of them, with the HUD pills and the knob tabs floating on top.

import type { Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { GlassBackdrop } from '@/components/common/Glass';
import { KnobTabs } from '@/components/common/KnobTabs';
import { BakeryPlanet } from '@/components/sky/BakeryPlanet';
import { Hud } from '@/components/sky/Hud';
import { RocketView } from '@/components/sky/RocketView';
import { SkyArmor } from '@/components/sky/SkyArmor';
import { SkyCanvas } from '@/components/sky/SkyCanvas';

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
        <SkyArmor />
        <RocketView />
      </GlassBackdrop>
      <TabList style={styles.hidden}>
        <TabTrigger name="sky" href="/" />
        <TabTrigger name="collections" href="/collections" />
        {/* The route list may name this page "/bible-crew/index"; its real address is "/bible-crew". */}
        <TabTrigger name="bible-crew" href={'/bible-crew' as Href} />
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
