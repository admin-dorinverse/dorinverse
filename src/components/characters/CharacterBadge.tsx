// A collected character's round badge: the first letter of their name on a berry gradient, as in Constellations.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { initialOf } from '@/data/queries/characters';
import { characters, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for a badge. */
type CharacterBadgeProps = {
  /** The character's name; its first letter is shown. */
  name: string;
  /** The badge's width and height. */
  size: number;
};

/** The round letter badge. */
export const CharacterBadge = memo(function CharacterBadge({ name, size }: CharacterBadgeProps) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>{initialOf(name)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `linear-gradient(135deg, ${characters.badgeLight}, ${characters.badgeDark})`,
  },
  letter: { fontFamily: fonts.black, color: text.onDark },
});
