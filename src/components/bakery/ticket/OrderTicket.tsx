// Papa Dorin's "Huge Order" ticket: a slip of paper, tilted a little, with the bakery's name and number, a red RUSH
// stamp, the order's rows, the verse it comes from and both signatures. It drops in with a small bounce and
// straightens as it lands; when the phone asks for less motion it is simply there.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { orderTicket } from '@/theme/bakeryTvColors';
import { fonts, readingFont } from '@/theme/text';
import { EDGE_HEIGHT, PrintedLine, TicketEdge, TicketRow } from './TicketLines';
import { TicketSigners } from './TicketSigners';
import { TicketVerse } from './TicketVerse';

/** The order's rows, as on the design's ticket. */
const ROWS = [
  ['ORDER', 'Marriage Supper of the Lamb'],
  ['ITEM', 'Cookie boxes'],
  ['QUANTITY', 'A LOT!'],
  ['DUE', 'When the Bridegroom comes'],
] as const;

/** How long the ticket takes to land (ms), and its springy ease from the design. */
const LAND_MS = 500;
const LAND_EASE = Easing.bezier(0.3, 1.3, 0.5, 1);

/** Props for the ticket. */
type OrderTicketProps = {
  /** The person's baker name, signed at the bottom. */
  bakerName: string;
};

/** The paper order ticket. */
export function OrderTicket({ bakerName }: OrderTicketProps) {
  const still = useReducedMotion();
  const land = useSharedValue(still ? 1 : 0);

  // Drops the ticket in once, when it opens.
  useEffect(() => {
    if (!still) land.set(withTiming(1, { duration: LAND_MS, easing: LAND_EASE }));
  }, [still, land]);

  const landing = useAnimatedStyle(() => {
    const t = land.get();
    return {
      opacity: Math.min(1, t),
      transform: [{ translateY: (1 - t) * 40 }, { rotate: `${-6 + t * 5}deg` }],
    };
  });

  return (
    <Animated.View style={landing}>
      <TicketEdge />
      <View style={styles.paper}>
        <View style={styles.head}>
          <Text style={styles.small}>PAPA DORIN’S BAKERY</Text>
          <Text style={styles.small}>No. 19:9</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Huge Order</Text>
          <Text style={styles.stamp}>RUSH</Text>
        </View>
        <View style={styles.rows}>
          {ROWS.map(([name, value]) => (
            <TicketRow key={name} name={name} value={value} />
          ))}
        </View>
        <PrintedLine kind="dashed" />
        <TicketVerse />
        <PrintedLine kind="dashed" />
        <TicketSigners bakerName={bakerName} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: orderTicket.paper,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingTop: 18 - EDGE_HEIGHT,
    paddingHorizontal: 18,
    paddingBottom: 16,
    boxShadow: orderTicket.shadow,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: fonts.black, fontSize: 11.5, letterSpacing: 1, color: orderTicket.label },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 20 },
  title: { fontFamily: readingFont, fontWeight: '700', fontSize: 30, color: orderTicket.red },
  stamp: {
    fontFamily: fonts.black,
    fontSize: 13,
    letterSpacing: 3,
    color: orderTicket.red,
    borderWidth: 3,
    borderColor: orderTicket.red,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 10,
    opacity: 0.85,
    transform: [{ rotate: '10deg' }],
  },
  rows: { gap: 7 },
});
