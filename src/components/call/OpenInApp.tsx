// A small "Have the Dorinverse app? Open this call there" link on the web join page, shown only on phones and
// tablets. Invite links open the browser; this hands the same call to the app through its own link
// (dorinverse://call?room=…). In the app itself it shows nothing.

import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { appLink } from '@/data/callLinks';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** True in a phone or tablet browser (iPads say they're Macs, but have touch screens). */
function onPhoneBrowser(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod|Android/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
}

/** Props for the open-in-the-app link. */
type OpenInAppProps = {
  /** The call to open. */
  room: string;
};

/** The link that opens this call in the phone app, in phone browsers only. */
export function OpenInApp({ room }: OpenInAppProps) {
  if (!onPhoneBrowser()) return null;
  return (
    <Pressable accessibilityRole="link" onPress={() => window.location.assign(appLink(room))} hitSlop={8}>
      <Text style={styles.link}>Have the Dorinverse app? Open this call there</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.extraBold, fontSize: 13, color: text.goldNote, textAlign: 'center', textDecorationLine: 'underline' },
});
