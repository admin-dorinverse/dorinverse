// One collected character in the Characters grid: badge, name (and name tag), where they were met, and how many
// verses name them. Tapping opens their page.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { characters, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { MetCharacter } from '@/types/character';
import { CharacterBadge } from './CharacterBadge';

/** Props for a grid cell. */
type CharacterCellProps = {
  /** The character shown. */
  character: MetCharacter;
  /** Opens the character's page. */
  onPress: (character: MetCharacter) => void;
};

/** A grid cell. */
export const CharacterCell = memo(function CharacterCell({ character, onPress }: CharacterCellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${character.name}, met in ${character.metIn}`}
      onPress={() => {
        playSound('tap');
        onPress(character);
      }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
    >
      <CharacterBadge name={character.name} size={52} />
      <Text style={styles.name} numberOfLines={2}>
        {character.name}
      </Text>
      {character.nameTag && (
        <Text style={styles.tag} numberOfLines={1}>
          {character.nameTag}
        </Text>
      )}
      <Text style={styles.met}>{character.metIn}</Text>
      <Text style={styles.count}>
        {character.verseCount} {character.verseCount === 1 ? 'verse' : 'verses'} mentioned
      </Text>
    </Pressable>
  );
});

/** An empty spot that fills out the last row, so every cell in the grid is the same width. */
export function BlankCell() {
  return <View style={styles.blank} />;
}


const styles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  pressed: { opacity: 0.7 },
  blank: { flex: 1 },
  name: { fontFamily: fonts.black, fontSize: 15, lineHeight: 18, color: text.onDark, textAlign: 'center', marginTop: 4 },
  tag: { fontFamily: fonts.bold, fontSize: 11, color: characters.soft, textAlign: 'center' },
  met: { fontFamily: fonts.bold, fontSize: 12.5, color: characters.soft },
  count: { fontFamily: fonts.extraBold, fontSize: 12, color: characters.accent },
});
