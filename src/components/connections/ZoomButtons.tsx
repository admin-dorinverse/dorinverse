// The web's zoom buttons at the bottom right, as in the owner's artifact: zoom in, zoom out, and show everything.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';

/** How much one tap of + or − zooms. */
const STEP = 1.6;

/** Props for the zoom buttons. */
type ZoomButtonsProps = {
  /** Zooms by a factor. */
  onZoom: (factor: number) => void;
  /** Shows the whole web. */
  onFit: () => void;
};

/** One square button. */
function ZoomButton({ label, mark, onPress }: { label: string; mark: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.mark}>{mark}</Text>
    </Pressable>
  );
}

/** The three zoom buttons. */
export function ZoomButtons({ onZoom, onFit }: ZoomButtonsProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.column, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <ZoomButton label="Zoom in" mark="+" onPress={() => onZoom(STEP)} />
      <ZoomButton label="Zoom out" mark="−" onPress={() => onZoom(1 / STEP)} />
      <ZoomButton label="Show everything" mark="⛶" onPress={onFit} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', right: 12, gap: 8 },
  button: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: webPage.line,
    backgroundColor: webPage.background,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(10,20,40,0.12)',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  mark: { fontFamily: fonts.black, fontSize: 22, color: webPage.ink },
});
