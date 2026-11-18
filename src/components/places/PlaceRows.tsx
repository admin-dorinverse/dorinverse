// The rows under a place's page top that the Characters pages don't have: a collected character linked to the
// place (tapping opens their page), and the line counting linked characters not collected yet. Headings and key
// moments use the Characters pages' rows.

import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { CharacterBadge } from '@/components/characters/CharacterBadge';
import { playSound } from '@/components/common/sounds';
import type { PlaceCharacterRow } from '@/data/queries/places';
import { places, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { CharacterLookup } from '@/types/character';

/** Props for a character row. */
type PlaceCharacterLineProps = {
  /** The collected character and how many verses name both. */
  row: PlaceCharacterRow;
  /** Opens the character's page. */
  onOpen: (lookup: CharacterLookup) => void;
};

/** One collected character linked to the place: badge, name, and how many verses name both. */
export const PlaceCharacterLine = memo(function PlaceCharacterLine({ row, onOpen }: PlaceCharacterLineProps) {
  const { character, verseCount } = row;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${character.name}`}
      onPress={() => {
        playSound('tap');
        onOpen(character.lookup);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <CharacterBadge name={character.name} size={36} />
      <Text style={styles.name} numberOfLines={1}>
        {character.name}
      </Text>
      {verseCount > 0 && <Text style={styles.count}>{verseCount === 1 ? '1 verse' : `${verseCount} verses`}</Text>}
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
});

/** Props for the "more to discover" line. */
type MoreCharactersProps = {
  /** How many linked characters are not collected yet. */
  count: number;
};

/** A line saying how many more characters here are waiting in lessons not done yet. No names. */
export function MoreCharacters({ count }: MoreCharactersProps) {
  return <Text style={styles.more}>{count === 1 ? '1 more character to discover' : `${count} more characters to discover`}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  pressed: { opacity: 0.7 },
  name: { flex: 1, fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  count: { fontFamily: fonts.extraBold, fontSize: 12, color: places.accent },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: places.soft },
  more: { fontFamily: fonts.extraBold, fontSize: 13, color: places.soft, textAlign: 'center', marginTop: 2, marginBottom: 4 },
});
