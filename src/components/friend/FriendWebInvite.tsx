// The web page a texted friend link opens in a phone's browser, in the voice call join page's look: a few words and
// one big "Open in the Dorinverse app" button that hands the code to the app (dorinverse://friend/<code>). It asks
// the server nothing, so it shows nothing about the person, and it needs no account.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { friendAndroidLink, friendAppLink } from '@/data/friendLinks';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for the web friend link page. */
type FriendWebInviteProps = {
  /** The friend code from the link. */
  code: string;
};

/** The web page with the "Open in the Dorinverse app" button. */
export function FriendWebInvite({ code }: FriendWebInviteProps) {
  const insets = useSafeAreaInsets();

  /** Opens the same code in the phone app, through the app's own link (Android's browsers need the intent form). */
  const openApp = () => {
    playSound('tap');
    const android = /android/i.test(navigator.userAgent);
    window.location.assign(android ? friendAndroidLink(code) : friendAppLink(code));
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.top}>
          <Text style={styles.kicker}>A FRIEND CODE</Text>
          <Text style={styles.title}>Someone wants to be friends</Text>
          <Text style={styles.subtitle}>Open this link in the Dorinverse app to see who it is and add them as a friend.</Text>
        </View>
        <View style={styles.space} />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open in the Dorinverse app"
          disabled={code.trim() === ''}
          onPress={openApp}
          style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        >
          <Text style={styles.openText}>Open in the Dorinverse app</Text>
        </Pressable>
        <Text style={styles.foot}>Open this link on the phone that has the Dorinverse app. Friends are added in the app.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: call.page, backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${call.pageGlow[0]} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)` },
  content: { flexGrow: 1, paddingHorizontal: gutter + 4, gap: 18, width: '100%', maxWidth: 480, alignSelf: 'center' },
  top: { alignItems: 'center', gap: 6 },
  kicker: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.4, color: call.kicker },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34, color: text.onDark, textAlign: 'center' },
  subtitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: text.onDarkSoft, textAlign: 'center' },
  space: { flex: 1, minHeight: 24 },
  open: { height: 58, borderRadius: 29, backgroundColor: call.talking, alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 0 ${call.joinShadow}` },
  pressed: { transform: [{ scale: 0.97 }] },
  openText: { fontFamily: fonts.black, fontSize: 18, color: call.ink },
  foot: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 18, color: text.onDarkSoft, textAlign: 'center' },
});
