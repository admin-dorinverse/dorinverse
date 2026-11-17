// One knob tab. When it is not selected it is a small round icon. When selected it grows into a bright pill
// that shows its name, with the springy timing from the design.

import { forwardRef, useState, type ComponentRef, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { tabs as tabColors } from '@/theme/colors';
import { chrome, radius } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import { playSound } from './sounds';

/** The design's springy easing for the knob growing (cubic-bezier .2, .9, .3, 1.1). */
const GROW = { duration: 450, easing: Easing.bezier(0.2, 0.9, 0.3, 1.1) };

/** Props for a knob tab. `isFocused` and `onPress` come from the tab system. */
type KnobTabProps = TabTriggerSlotProps & {
  /** The tab's name, shown when it is selected. */
  label: string;
  /** The tab's icon. */
  Icon: ComponentType<{ color: string; size?: number }>;
};

/** A knob tab button. */
export const KnobTab = forwardRef<ComponentRef<typeof View>, KnobTabProps>(function KnobTab({ label, Icon, isFocused, onPress, ...rest }, ref) {
  const [labelWidth, setLabelWidth] = useState(0);
  const selected = !!isFocused;
  const color = selected ? tabColors.selectedInk : tabColors.idle;

  const labelStyle = useAnimatedStyle(() => ({
    width: withTiming(selected ? labelWidth + 6 : 0, GROW),
    opacity: withTiming(selected ? 1 : 0, { duration: 300 }),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    paddingLeft: withTiming(selected ? 12 : 12.5, GROW),
    paddingRight: withTiming(selected ? 14 : 12.5, GROW),
    backgroundColor: withTiming(selected ? tabColors.selectedFill : 'rgba(255,255,255,0)', { duration: 300 }),
  }));

  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={(e) => {
        if (selected) return;
        playSound('tap');
        onPress?.(e);
      }}
    >
      <Animated.View style={[styles.knob, knobStyle]}>
        <Icon color={color} size={19} />
        <Animated.View style={[styles.labelBox, labelStyle]}>
          <Text numberOfLines={1} style={[textStyles.tabLabel, styles.label, { color }]}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
      {/* Measures the label once so the knob knows how wide to grow. */}
      <Text style={[textStyles.tabLabel, styles.measure]} onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  knob: {
    height: chrome.tabKnob.height,
    minWidth: chrome.tabKnob.width,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labelBox: { overflow: 'hidden', height: '100%', justifyContent: 'center' },
  label: { position: 'absolute', left: 6 },
  measure: { position: 'absolute', opacity: 0, left: -9999 },
});
