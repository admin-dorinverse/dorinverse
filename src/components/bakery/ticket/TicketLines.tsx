// The small printed marks on the Order Ticket: the bitten-out top edge of the paper, the dotted line between a
// row's name and value, the dashed tear line, and one name-and-value row.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { orderTicket } from '@/theme/bakeryTvColors';
import { fonts } from '@/theme/text';

/** Height of the bitten-out top edge: half-circle bites every 20 points, as in the design. */
export const EDGE_HEIGHT = 4;

/** The paper's top edge with its row of small round bites, drawn once. */
export const TicketEdge = memo(function TicketEdge() {
  return (
    <Svg width="100%" height={EDGE_HEIGHT}>
      <Defs>
        <Pattern id="ticketBites" width={20} height={EDGE_HEIGHT} patternUnits="userSpaceOnUse">
          <Path d="M0 0H3.07A8 8 0 0 0 16.93 0H20V4H0Z" fill={orderTicket.paper} />
        </Pattern>
      </Defs>
      <Rect width="100%" height={EDGE_HEIGHT} fill="url(#ticketBites)" />
    </Svg>
  );
});

/** Props for a dotted or dashed line. */
type PrintedLineProps = {
  /** "dotted" between a row's name and value, "dashed" for a tear line. */
  kind: 'dotted' | 'dashed';
};

/** A thin dotted or dashed line. Only one side of a box is shown, as phones draw dashes only on whole borders. */
export function PrintedLine({ kind }: PrintedLineProps) {
  return (
    <View style={kind === 'dotted' ? styles.dotsClip : styles.cutClip}>
      <View style={[styles.dash, { borderStyle: kind }]} />
    </View>
  );
}

/** Props for a ticket row. */
type TicketRowProps = {
  /** The row's name, like "ORDER". */
  name: string;
  /** What it says, like "Cookie boxes". */
  value: string;
};

/** One row: its name, a dotted line, and its value on the right. */
export function TicketRow({ name, value }: TicketRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.fill}>
        <PrintedLine kind="dotted" />
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dotsClip: { height: 2, overflow: 'hidden' },
  cutClip: { height: 2, overflow: 'hidden', marginVertical: 14, marginHorizontal: -18 },
  dash: { height: 10, borderWidth: 2, borderColor: orderTicket.dots },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  name: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1, color: orderTicket.label, marginBottom: 1 },
  fill: { flex: 1, minWidth: 12, marginBottom: 4 },
  value: { flexShrink: 1, fontFamily: fonts.extraBold, fontSize: 14, color: orderTicket.ink, textAlign: 'right' },
});
