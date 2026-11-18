// One row in the search suggestions: a recent search (clock), a suggested search (magnifier), a chapter or verse
// reference (book), or a verse whose words match (with a short piece of it). Suggested searches have an arrow
// that puts them in the search box without searching yet.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';

/** What kind of suggestion a row is, which picks its icon. */
export type SuggestionKind = 'recent' | 'suggested' | 'reference' | 'verse';

/** The icon for each kind of row. */
const ICONS: Record<SuggestionKind, string> = { recent: '🕐', suggested: '🔍', reference: '📖', verse: '✦' };

/** Props for a suggestion row. */
type SuggestionRowProps = {
  /** The kind of suggestion. */
  kind: SuggestionKind;
  /** The main words, like "Hope" or "Hebrews 10:24". */
  label: string;
  /** A short second line, like a piece of the verse. */
  detail?: string;
  /** Runs the search or opens the reference. */
  onPress: () => void;
  /** Puts the label in the search box. Shown as an arrow when given. */
  onFill?: () => void;
};

/** A tappable suggestion. */
export function SuggestionRow({ kind, label, detail, onPress, onFill }: SuggestionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Text style={[styles.icon, kind === 'verse' && styles.star]}>{ICONS[kind]}</Text>
      </View>
      <View style={styles.words}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {onFill && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Put “${label}” in the search box`} onPress={onFill} hitSlop={10} style={styles.fill}>
          <Text style={styles.fillText}>↖</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
  iconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: reader.surface },
  icon: { fontSize: 16 },
  star: { color: reader.verseNumber, fontSize: 15 },
  words: { flex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 16.5, color: text.onDark },
  detail: { fontFamily: readingFont, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  fill: { paddingHorizontal: 6, paddingVertical: 4 },
  fillText: { fontFamily: fonts.black, fontSize: 18, color: 'rgba(255,255,255,0.65)' },
});
