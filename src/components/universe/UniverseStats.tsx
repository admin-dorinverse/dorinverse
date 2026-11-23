// How a friend is doing, as the server shares it today: their day streak, their best streak and how many friends
// they have, each a number on its own small tile. Lesson progress isn't shared yet, so none is shown.

import { StyleSheet, Text, View } from 'react-native';
import { text } from '@/theme/colors';
import { friendPage } from '@/theme/friendPageColors';
import { fonts } from '@/theme/text';
import type { FriendUniverse } from '@/types/friends';

/** Props for one number tile. */
type TileProps = {
  /** The number. */
  value: number;
  /** What it counts, like "Day streak". */
  label: string;
};

/** One number with its label under it. */
function Tile({ value, label }: TileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Props for the friend's numbers. */
type UniverseStatsProps = {
  /** The friend's universe, from the server or the phone's saved copy. */
  universe: FriendUniverse;
};

/** The streak, best streak and friends tiles in one row. */
export function UniverseStats({ universe }: UniverseStatsProps) {
  return (
    <View style={styles.row}>
      <Tile value={universe.streak} label="Day streak" />
      <Tile value={universe.bestStreak} label="Best streak" />
      <Tile value={universe.friendCount} label={universe.friendCount === 1 ? 'Friend' : 'Friends'} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: friendPage.tileEdge, backgroundColor: friendPage.tileFill },
  value: { fontFamily: fonts.black, fontSize: 26, color: text.onDark },
  label: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
});
