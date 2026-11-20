// The verse on the Order Ticket, Revelation 19:9. Its words come only from the verses the person has revealed on the
// phone; while it is still hidden the ticket shows the reference alone and says where to reveal it.

import { StyleSheet, Text, View } from 'react-native';
import { READER_TRANSLATION, useVerseLookup } from '@/data/queries/bible';
import { orderTicket } from '@/theme/bakeryTvColors';
import { fonts, readingFont } from '@/theme/text';
import type { VerseRef } from '@/types/bible';

/** The verse's reference as the Bible data names it. */
const VERSE_REF: VerseRef = 'Rev.19.9';

/** The reference as people read it. */
const VERSE_NAME = 'Revelation 19:9';

/** The ticket's verse, or its reference alone while it is hidden. */
export function TicketVerse() {
  const verse = useVerseLookup()?.get(VERSE_REF);
  return (
    <View>
      {verse ? (
        <Text style={styles.quote}>“{verse.text}”</Text>
      ) : (
        <Text style={styles.hidden}>Reveal it in a lesson to read it here.</Text>
      )}
      <Text style={styles.cite}>
        {VERSE_NAME} {READER_TRANSLATION}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quote: { fontFamily: readingFont, fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: orderTicket.quote },
  hidden: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: orderTicket.quote },
  cite: { marginTop: 4, fontFamily: fonts.extraBold, fontSize: 12, color: orderTicket.label },
});
