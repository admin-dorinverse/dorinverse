// The bar across the top of the Character Connections web, as in the owner's artifact: a back button, "Find a
// character" with a list of matches under it, and the link filter button ("All Links ▾").

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';
import type { WebNode } from './webModel';

/** The most matches the list shows. */
const MAX_MATCHES = 12;

/** Props for the bar. */
type WebBarProps = {
  /** Everyone in the web, to search. */
  nodes: readonly WebNode[];
  /** The filter button's words, like "All Links" or "3 link types". */
  filterLabel: string;
  /** Goes back. */
  onBack: () => void;
  /** Opens a person picked from the matches. People not collected yet show greyed and can't be picked. */
  onPick: (node: WebNode) => void;
  /** Opens the link filter. */
  onFilter: () => void;
};

/** A person's full name, with their tag when others share the name. */
export function fullName(n: WebNode): string {
  return n.tag ? `${n.name} (${n.tag})` : n.name;
}

/** The top bar. */
export function WebBar({ nodes, filterLabel, onBack, onPick, onFilter }: WebBarProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  // Names that contain the search, those starting with it first, as in the artifact.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => fullName(n).toLowerCase().includes(q))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q) || a.name.localeCompare(b.name))
      .slice(0, MAX_MATCHES);
  }, [nodes, query]);

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { playSound('tap'); onBack(); }} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.find}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a character"
          placeholderTextColor={webPage.muted}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Find a character"
          style={styles.input}
        />
        {matches.length > 0 && (
          <View style={styles.results}>
            {matches.map((n) => (
              <Pressable
                key={n.lookup}
                accessibilityRole="button"
                accessibilityState={{ disabled: !n.character }}
                disabled={!n.character}
                onPress={() => {
                  playSound('tap');
                  setQuery('');
                  onPick(n);
                }}
                style={styles.result}
              >
                <Text style={[styles.resultName, !n.character && styles.locked]}>
                  {n.name}
                  {n.tag ? <Text style={styles.resultTag}> {n.tag}</Text> : null}
                  {!n.character ? <Text style={styles.resultTag}>  Not met yet</Text> : null}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Link filter: ${filterLabel}`} onPress={() => { playSound('tap'); onFilter(); }} style={styles.filter}>
        <Text style={styles.filterText}>{filterLabel} ▾</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: webPage.background, borderBottomWidth: 1, borderBottomColor: webPage.line, zIndex: 5 },
  back: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: fonts.black, fontSize: 32, lineHeight: 36, color: webPage.ink },
  find: { flex: 1, minWidth: 0 },
  input: { height: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: webPage.line, borderRadius: 10, backgroundColor: webPage.background, fontFamily: fonts.bold, fontSize: 16, color: webPage.ink },
  results: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: webPage.line,
    borderRadius: 10,
    backgroundColor: webPage.background,
    boxShadow: '0 12px 28px rgba(10,20,40,0.18)',
    overflow: 'hidden',
  },
  result: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: webPage.line },
  resultName: { fontFamily: fonts.bold, fontSize: 16, color: webPage.ink },
  locked: { color: webPage.lockedInk },
  resultTag: { fontFamily: fonts.body, fontSize: 13, color: webPage.muted },
  filter: { height: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: webPage.line, borderRadius: 10, backgroundColor: webPage.background },
  filterText: { fontFamily: fonts.extraBold, fontSize: 15, color: webPage.ink },
});
