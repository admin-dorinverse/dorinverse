// The row of recently viewed characters at the top of a character's page: small chips with a badge and a name.
// The current character is lit; tapping another opens their page.

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { characters, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { CharacterLibrary, CharacterLookup } from '@/types/character';
import { CharacterBadge } from './CharacterBadge';

/** Props for the recently viewed row. */
type RecentTrailProps = {
  /** Recently viewed characters, newest (the current one) first. */
  trail: readonly CharacterLookup[];
  /** The collected characters, to show names. */
  library: CharacterLibrary;
  /** The character whose page this is. */
  current: CharacterLookup;
  /** Opens another character's page. */
  onOpen: (lookup: CharacterLookup) => void;
};

/** The recently viewed chips. Hidden until a second character has been viewed. */
export function RecentTrail({ trail, library, current, onOpen }: RecentTrailProps) {
  const shown = trail.filter((l) => library.byLookup[l]);
  if (shown.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {shown.map((lookup) => {
        const on = lookup === current;
        const name = library.byLookup[lookup].name;
        return (
          <Pressable
            key={lookup}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name}`}
            disabled={on}
            onPress={() => {
              playSound('tap');
              onOpen(lookup);
            }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <CharacterBadge name={name} size={24} />
            <Text style={[styles.name, on && styles.nameOn]}>{name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: 12, flexGrow: 0 },
  row: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 11,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  chipOn: { backgroundColor: characters.chipOn, borderColor: characters.accent },
  name: { fontFamily: fonts.extraBold, fontSize: 12, color: characters.soft },
  nameOn: { color: text.onDark },
});
