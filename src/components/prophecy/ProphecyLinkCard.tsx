// One prophecy link in the Prophecy list: its title, its promise half and its fulfillment halves, with halves still
// to find in stardust. A joined link (promise and at least one fulfillment held) has a soft, still glow and
// "✦ Joined". Tapping it opens the link's page.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HalfRow } from '@/components/prophecy/HalfRow';
import { playSound } from '@/components/common/sounds';
import { prophecy, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { ProphecyCard } from '@/types/cookie';

/** Props for one link's card. */
type ProphecyLinkCardProps = {
  /** The link to show. */
  card: ProphecyCard;
  /** Opens the link's page. */
  onOpen: (card: ProphecyCard) => void;
};

/** A link's card on the list. */
export function ProphecyLinkCard({ card, onOpen }: ProphecyLinkCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}${card.joined ? ', joined' : ''}`}
      onPress={() => {
        playSound('tap');
        onOpen(card);
      }}
      style={({ pressed }) => [styles.card, card.joined && styles.joined, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={styles.title}>{card.title}</Text>
        {card.joined && <Text style={styles.badge}>✦ Joined</Text>}
      </View>
      <HalfRow slot={card.promise} short seed={card.linkNo} />
      <View style={styles.join} />
      {card.fulfillments.map((slot, i) => (
        <HalfRow key={slot.kind === 'held' ? slot.cookie.key : slot.half.key} slot={slot} short seed={card.linkNo + i + 1} />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, gap: 10, marginBottom: 12, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  joined: { borderColor: prophecy.joinedEdge, backgroundColor: prophecy.joinedFill, boxShadow: prophecy.joinedGlow },
  pressed: { transform: [{ scale: 0.98 }] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 18, lineHeight: 23, color: text.onDark },
  badge: { fontFamily: fonts.black, fontSize: 13, color: prophecy.accent, marginTop: 3 },
  join: { height: 1, marginLeft: 26, backgroundColor: reader.edge },
});
