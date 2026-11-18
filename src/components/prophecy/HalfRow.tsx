// One half of a prophecy link on its card or page: a held half shows a star, "Promise" or "Fulfillment", its
// reference and its exact words. A half still to find shows its reference over a line of stardust, like a covered
// Bible verse; its words are not on the phone, so the stardust is a made-up shape, not the verse's.

import { StyleSheet, Text, View } from 'react-native';
import { stardustWords } from '@/components/bible/stardust';
import { ReadInBible } from '@/components/common/ReadInBible';
import { prophecy, reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { HalfSlot } from '@/types/cookie';

/** Word lengths for the stand-in stardust line, the same for every half still to find. */
const DUST_SHAPE = [3, 5, 2, 6, 4, 3, 7, 2, 5, 4, 6, 3];

/** Props for one half. */
type HalfRowProps = {
  /** The half: held, or still to find. */
  slot: HalfSlot;
  /** Cuts a held half's words to a few lines (on the list); the page shows them all. */
  short?: boolean;
  /** Shows "Read in the Bible" under a held half (on the page). */
  readable?: boolean;
  /** A number that varies the stardust letters between halves. */
  seed: number;
};

/** One half of a link. */
export function HalfRow({ slot, short, readable, seed }: HalfRowProps) {
  if (slot.kind === 'missing') {
    const side = slot.half.half === 'promise' ? 'Promise' : 'Fulfillment';
    const dust = stardustWords(short ? DUST_SHAPE.slice(0, 7) : DUST_SHAPE, seed);
    return (
      <View style={styles.row}>
        <Text style={styles.missingStar}>✧</Text>
        <View style={styles.body}>
          <Text style={styles.missingLabel}>
            {side} still to find · <Text style={styles.ref}>{slot.half.reference}</Text>
          </Text>
          <Text style={styles.dust} accessibilityLabel="Words still covered in stardust">
            {dust.map((word, i) => (
              <Text key={i} style={{ color: reader.stardust[(seed + i) % reader.stardust.length] }}>
                {i > 0 ? ' ' : ''}
                {word}
              </Text>
            ))}
          </Text>
        </View>
      </View>
    );
  }
  const { cookie } = slot;
  return (
    <View style={styles.row}>
      <Text style={styles.star}>★</Text>
      <View style={styles.body}>
        <Text style={styles.label}>
          {cookie.half === 'promise' ? 'Promise' : 'Fulfillment'} · <Text style={styles.ref}>{cookie.reference}</Text>
        </Text>
        <Text style={short ? styles.quoteShort : styles.quote} numberOfLines={short ? 3 : undefined}>
          {cookie.quote}
        </Text>
        {readable && (
          <View style={styles.read}>
            <ReadInBible reference={cookie.reference} accent={prophecy.accent} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  body: { flex: 1, gap: 4 },
  star: { fontFamily: fonts.black, fontSize: 16, lineHeight: 20, color: prophecy.accent },
  missingStar: { fontFamily: fonts.black, fontSize: 16, lineHeight: 20, color: prophecy.soft },
  label: { fontFamily: fonts.extraBold, fontSize: 12.5, letterSpacing: 0.4, color: prophecy.accent, textTransform: 'uppercase' },
  missingLabel: { fontFamily: fonts.extraBold, fontSize: 12.5, letterSpacing: 0.4, color: prophecy.soft, textTransform: 'uppercase' },
  ref: { fontFamily: fonts.extraBold, color: text.onDark, textTransform: 'none' },
  quoteShort: { fontFamily: readingFont, fontSize: 15.5, lineHeight: 22, color: reader.text },
  quote: { fontFamily: readingFont, fontSize: 18, lineHeight: 27, color: reader.text },
  dust: { fontFamily: fonts.stardust, fontSize: 17, lineHeight: 24 },
  read: { marginTop: 8 },
});
