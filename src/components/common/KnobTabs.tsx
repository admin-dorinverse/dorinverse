// The glass pill of knob tabs at the top of the screen: Sky, Collections and Keep it fresh.
// The tabs themselves are declared in the tabs layout; these buttons point to them by name.

import { TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chrome, radius } from '@/theme/spacing';
import { GlassSurface } from './Glass';
import { KnobTab } from './KnobTab';
import { CollectionsIcon, FreshIcon, SkyIcon } from './TabIcons';

/** The three knob tabs, in order. */
export function KnobTabs() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { top: insets.top + chrome.tabsTop }]} pointerEvents="box-none">
      <GlassSurface style={styles.pill}>
        <View style={styles.row} accessibilityRole="tablist">
          <TabTrigger name="sky" asChild>
            <KnobTab label="Sky" Icon={SkyIcon} />
          </TabTrigger>
          <TabTrigger name="collections" asChild>
            <KnobTab label="Collections" Icon={CollectionsIcon} />
          </TabTrigger>
          <TabTrigger name="keep-it-fresh" asChild>
            <KnobTab label="Keep it fresh" Icon={FreshIcon} />
          </TabTrigger>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  pill: { borderRadius: radius.pill, padding: 5 },
  row: { flexDirection: 'row', gap: 2 },
});
