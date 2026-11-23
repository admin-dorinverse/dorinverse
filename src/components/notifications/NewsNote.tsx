// The calm lines the Notifications page shows on its own: a gentle note when the server can't be reached (the
// saved news stays shown), and the line for when there is no news yet.

import { StyleSheet, Text, View } from 'react-native';
import { notifications } from '@/theme/notificationColors';
import { fonts } from '@/theme/text';

/** A gentle note over the list when the newest news couldn't be fetched. */
export function OfflineNote() {
  return (
    <View style={styles.note} accessibilityLiveRegion="polite">
      <Text style={styles.noteText}>Can’t reach Dorinverse right now, so this is what was saved on your phone.</Text>
    </View>
  );
}

/** The line shown when there is no news yet. */
export function NoNewsYet() {
  return <Text style={styles.empty}>Friend requests will show up here.</Text>;
}

const styles = StyleSheet.create({
  note: { borderRadius: 16, borderWidth: 1, borderColor: notifications.noteEdge, backgroundColor: notifications.noteFill, paddingVertical: 10, paddingHorizontal: 14 },
  noteText: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: notifications.line, textAlign: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: notifications.line, textAlign: 'center', marginTop: 30 },
});
