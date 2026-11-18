// A glass sheet that slides up from the bottom over a dimmed page, as in Constellations. Tapping the dim
// area or the close button closes it.

import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glass, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** How the sheet comes in: a smooth slide up that slows to a stop, with no bounce. */
const SHEET_IN = SlideInDown.duration(260).easing(Easing.out(Easing.cubic));

/** Props for a sheet. */
type GlassSheetProps = {
  /** True while the sheet shows. */
  open: boolean;
  /** Closes the sheet. */
  onClose: () => void;
  /** The sheet's heading. */
  title: string;
  /** What the sheet shows under its heading. */
  children: ReactNode;
};

/** A bottom sheet on dark glass. */
export function GlassSheet({ open, onClose, title, children }: GlassSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        {open && (
          <Animated.View entering={SHEET_IN} style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            {children}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: glass.backdrop },
  sheet: {
    width: '100%',
    maxWidth: 560,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 22,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(22,24,64,0.97)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 21, color: text.onDark },
  close: { fontFamily: fonts.black, fontSize: 18, color: 'rgba(255,255,255,0.6)' },
});
