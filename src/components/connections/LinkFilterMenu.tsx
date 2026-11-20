// The link filter, as in the owner's artifact: a list under the "All Links ▾" button with "All Links" at the top,
// then every kind of link with its line sample and how many there are. Each can be ticked on or off.
// Tapping outside the list closes it.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { LINK_LABELS } from '@/data/queries/characters';
import { webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';
import { LinkSwatch } from './LinkSwatch';
import { LINK_TYPES } from './webModel';

/** Props for the filter list. */
type LinkFilterMenuProps = {
  /** Where the list's top sits, under the bar. */
  top: number;
  /** The kinds of link shown now. */
  shown: ReadonlySet<string>;
  /** How many links of each kind the web has, and in all. */
  counts: Readonly<Record<string, number>>;
  total: number;
  /** Sets which kinds are shown. */
  onChange: (shown: ReadonlySet<string>) => void;
  /** Closes the list. */
  onClose: () => void;
};

/** One row: a tick box, an optional line sample, a name and a count. */
function Row({ on, label, count, type, onPress }: { on: boolean; label: string; count: number; type?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={styles.row}
    >
      <View style={[styles.box, on && styles.boxOn]}>{on && <Text style={styles.tick}>✓</Text>}</View>
      {type && <LinkSwatch type={type} />}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>{count}</Text>
    </Pressable>
  );
}

/** The filter list. */
export function LinkFilterMenu({ top, shown, counts, total, onChange, onClose }: LinkFilterMenuProps) {
  const all = shown.size === LINK_TYPES.length;

  /** Turns one kind of link on or off. */
  const flip = (type: string) => {
    const next = new Set(shown);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  };

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the link filter" />
      <View style={[styles.menu, { top }]}>
        <ScrollView>
          <Row on={all} label="All Links" count={total} onPress={() => onChange(new Set(all ? [] : LINK_TYPES))} />
          <View style={styles.rule} />
          {LINK_TYPES.map((t) => (
            <Row key={t} on={shown.has(t)} label={LINK_LABELS[t] ?? t} count={counts[t] ?? 0} type={t} onPress={() => flip(t)} />
          ))}
        </ScrollView>
      </View>
    </>
  );
}

/** The filter button's words for the kinds shown, as in the artifact. */
export function filterLabel(shown: ReadonlySet<string>): string {
  if (shown.size === LINK_TYPES.length) return 'All Links';
  if (shown.size === 0) return 'No links';
  if (shown.size === 1) return LINK_LABELS[[...shown][0]] ?? 'One link type';
  return `${shown.size} link types`;
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    right: 12,
    width: 290,
    maxHeight: '70%',
    padding: 6,
    borderWidth: 1,
    borderColor: webPage.line,
    borderRadius: 12,
    backgroundColor: webPage.background,
    boxShadow: '0 12px 28px rgba(10,20,40,0.18)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 10 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: webPage.accent, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: webPage.accent },
  tick: { fontFamily: fonts.black, fontSize: 12, lineHeight: 14, color: webPage.background },
  label: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: webPage.ink },
  count: { fontFamily: fonts.bold, fontSize: 14, color: webPage.muted },
  rule: { height: 1, backgroundColor: webPage.line, marginHorizontal: 6, marginVertical: 4 },
});
