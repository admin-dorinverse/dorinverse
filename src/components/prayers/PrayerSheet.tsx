// The sheet that opens over the Prayers page when a prayer is tapped: what just happened, the key line, where the
// prayer runs, and "Read in the Bible" (only when that verse is revealed). Everything is already on the phone.

import { StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { ReadInBible } from '@/components/common/ReadInBible';
import { prayers, reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { PrayerCookie } from '@/types/cookie';

/** Props for the sheet. */
type PrayerSheetProps = {
  /** The prayer to show, or null when the sheet is closed. */
  cookie: PrayerCookie | null;
  /** Closes the sheet. */
  onClose: () => void;
};

/** A prayer's sheet. */
export function PrayerSheet({ cookie, onClose }: PrayerSheetProps) {
  return (
    <GlassSheet open={cookie !== null} onClose={onClose} title={cookie ? `${cookie.who} prayed` : ''}>
      {cookie && (
        <View style={styles.body}>
          {cookie.whatJustHappened ? (
            <View style={styles.part}>
              <Text style={styles.label}>WHAT JUST HAPPENED</Text>
              <Text style={styles.happened}>{cookie.whatJustHappened}</Text>
            </View>
          ) : null}
          <View style={styles.part}>
            <Text style={styles.label}>THE PRAYER · {cookie.reference}</Text>
            <Text style={styles.line}>“{cookie.keyLine}”</Text>
          </View>
          <ReadInBible reference={cookie.reference} accent={prayers.accent} onLeave={onClose} />
        </View>
      )}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingTop: 4 },
  part: { gap: 5 },
  label: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 0.8, color: prayers.accent },
  happened: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: text.onDarkSoft },
  line: { fontFamily: readingFont, fontSize: 19, lineHeight: 28, color: reader.text },
});
