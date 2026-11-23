// One part of a friend's universe: a small gold heading and a glass card under it. Each thing the server shares
// about a friend gets its own part, so their constellations and collections can join as new parts later.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from '@/components/common/Glass';
import { text } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import { textStyles } from '@/theme/text';

/** Props for one part of the universe page. */
type UniverseSectionProps = {
  /** The small heading, like "HOW THEY'RE DOING". */
  heading: string;
  /** What the card holds. */
  children: ReactNode;
};

/** A heading and a glass card. */
export function UniverseSection({ heading, children }: UniverseSectionProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[textStyles.tabSubtitle, styles.heading]} accessibilityRole="header">
        {heading}
      </Text>
      <GlassSurface style={styles.card}>{children}</GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { color: text.goldNote, paddingHorizontal: 4 },
  card: { borderRadius: radius.card, padding: 14 },
});
