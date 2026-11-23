// A thin bar that fills in the constellation's color as lessons are finished, on book tiles and story cards. It is
// drawn once per change and never animates.

import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { shelfColors } from '@/theme/lessonColors';

/** Props for a progress bar. */
type ProgressBarProps = {
  /** How many are done. */
  done: number;
  /** How many there are in all. */
  total: number;
  /** The fill's color. */
  color: string;
  /** Where it sits. */
  style?: StyleProp<ViewStyle>;
};

/** The bar: an empty track with the done share filled. */
export const ProgressBar = memo(function ProgressBar({ done, total, color, style }: ProgressBarProps) {
  const share = total > 0 ? Math.min(done / total, 1) : 0;
  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: color }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: shelfColors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
