// The big glowing count at the top of a collected list (Characters, Places, Prophecy, Instructions, Prayers),
// with a short label under it.

import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/theme/text';

/** A list's accent colors, like `characters` or `prayers` in the theme. */
export type ListColors = { accent: string; glow: string; chipOn: string; soft: string };

/** Props for the count. */
type CountHeroProps = {
  /** The number to show. */
  count: number;
  /** The words under the count, for one and for more, like ["prayer collected", "prayers collected"]. */
  label: readonly [string, string];
  /** The list's accent colors. */
  colors: ListColors;
};

/** The big count and its label. */
export function CountHero({ count, label, colors }: CountHeroProps) {
  return (
    <View style={styles.hero}>
      <Text style={[styles.count, { color: colors.accent, textShadowColor: colors.glow }]}>{count}</Text>
      <Text style={[styles.label, { color: colors.soft }]}>{count === 1 ? label[0] : label[1]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  count: { fontFamily: fonts.black, fontSize: 72, lineHeight: 78, textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  label: { fontFamily: fonts.extraBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
});
