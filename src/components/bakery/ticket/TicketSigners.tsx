// The bottom of the Order Ticket: who signed it. Papa Dorin, the pastry chef, with his picture, and the person, the
// baker, with a round badge holding the first letter of their name.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { orderTicket } from '@/theme/bakeryTvColors';
import { fonts } from '@/theme/text';

/** Papa Dorin's picture's width divided by its height. */
const DORIN_ASPECT = 300 / 688;

/** Props for the signatures. */
type TicketSignersProps = {
  /** The person's baker name. */
  bakerName: string;
};

/** The two signatures side by side. */
export function TicketSigners({ bakerName }: TicketSignersProps) {
  return (
    <View style={styles.row}>
      <View style={styles.who}>
        <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
        <View>
          <Text style={styles.label}>PASTRY CHEF</Text>
          <Text style={styles.name}>Papa Dorin</Text>
        </View>
      </View>
      <View style={styles.who}>
        <View style={styles.badge}>
          <Text style={styles.initial}>{bakerName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.label}>BAKER</Text>
          <Text style={styles.name}>{bakerName}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dorin: { height: 44, aspectRatio: DORIN_ASPECT },
  label: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1, color: orderTicket.label },
  name: { fontFamily: fonts.black, fontSize: 14, color: orderTicket.ink },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `linear-gradient(135deg, ${orderTicket.badgeLight}, ${orderTicket.badgeDark})`,
  },
  initial: { fontFamily: fonts.black, fontSize: 15, color: orderTicket.badgeInk },
});
