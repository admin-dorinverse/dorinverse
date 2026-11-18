// The search box at the top of the Bible search pages: a magnifier, the typed words, and a clear button.

import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for the search box. */
type SearchFieldProps = {
  /** What is typed. */
  value: string;
  /** Runs as the person types. */
  onChange: (value: string) => void;
  /** Runs when the keyboard's search key is pressed. */
  onSubmit: () => void;
  /** Opens the keyboard as soon as the page shows. */
  autoFocus?: boolean;
};

/** The search box. */
export function SearchField({ value, onChange, onSubmit, autoFocus = false }: SearchFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Search your revealed verses"
        placeholderTextColor="rgba(255,255,255,0.45)"
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear the search" onPress={() => onChange('')} hitSlop={10} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 50,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  icon: { fontSize: 16 },
  input: { flex: 1, height: '100%', color: text.onDark, fontFamily: fonts.bold, fontSize: 16 },
  clear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  clearText: { fontFamily: fonts.black, fontSize: 12, color: text.onDark },
});
