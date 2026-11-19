// The five practice modes across the top of a verse, as in the prototype: Read, Hide, Recall, Bank and Record.
// The picked mode is lit.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { verseMemory } from '@/theme/verseMemoryColors';

/** A practice mode. */
export type PracticeMode = 'read' | 'cover' | 'recall' | 'bank' | 'record';

/** The modes in order, with their emoji and names. */
const MODES: readonly { mode: PracticeMode; label: string }[] = [
  { mode: 'read', label: '📖 Read' },
  { mode: 'cover', label: '🫣 Hide' },
  { mode: 'recall', label: 'Recall' },
  { mode: 'bank', label: '🧩 Bank' },
  { mode: 'record', label: '🎙️ Record' },
];

/** Props for the mode tabs. */
type ModeTabsProps = {
  /** The picked mode. */
  mode: PracticeMode;
  /** Picks a mode. */
  onPick: (mode: PracticeMode) => void;
};

/** The row of mode tabs. */
export function ModeTabs({ mode, onPick }: ModeTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {MODES.map((m) => {
        const on = m.mode === mode;
        return (
          <Pressable
            key={m.mode}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              playSound('tap');
              onPick(m.mode);
            }}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} adjustsFontSizeToFit>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge, marginBottom: 12 },
  tab: { flex: 1, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 2, alignItems: 'center' },
  tabOn: { backgroundColor: verseMemory.chipOn, borderWidth: 1, borderColor: verseMemory.accent },
  label: { fontFamily: fonts.extraBold, fontSize: 11.5, color: verseMemory.soft },
  labelOn: { color: text.onDark },
});
