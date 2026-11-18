// The reader's options sheet: make the text smaller or bigger.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts, readingSize } from '@/theme/text';

/** Props for the options sheet. */
type ReadingOptionsSheetProps = {
  /** True while the sheet shows. */
  open: boolean;
  /** Closes the sheet. */
  onClose: () => void;
  /** The current text size. */
  fontSize: number;
  /** Sets a new text size. */
  onFontSize: (size: number) => void;
};

/** Text size buttons. */
export function ReadingOptionsSheet({ open, onClose, fontSize, onFontSize }: ReadingOptionsSheetProps) {
  /** Changes the size by one step, within the allowed range. */
  const step = (by: number) => {
    playSound('tap');
    onFontSize(Math.max(readingSize.min, Math.min(readingSize.max, fontSize + by)));
  };
  return (
    <GlassSheet open={open} onClose={onClose} title="Reading options">
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Smaller text" disabled={fontSize <= readingSize.min} onPress={() => step(-1)} style={styles.button}>
          <Text style={[styles.label, styles.small, fontSize <= readingSize.min && styles.off]}>A−</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Bigger text" disabled={fontSize >= readingSize.max} onPress={() => step(1)} style={styles.button}>
          <Text style={[styles.label, fontSize >= readingSize.max && styles.off]}>A+</Text>
        </Pressable>
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  button: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  label: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  small: { fontSize: 16 },
  off: { color: 'rgba(255,255,255,0.25)' },
});
