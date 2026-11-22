// The Continue with Google and Sign in with Apple buttons, with an "or" line under them, at the top of the sign-in
// and new account pages. iPhones get Apple's own button (Apple requires it); Android gets a black Apple button
// that signs in through the browser. Each shows only while switched on in src/data/signInOptions.ts.

import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgPicture } from '@/components/common/SvgPicture';
import { playSound } from '@/components/common/sounds';
import { APPLE_SIGN_IN_ON, GOOGLE_SIGN_IN_ON } from '@/data/signInOptions';
import { appleSheetAvailable, signInInBrowser, signInWithAppleSheet } from '@/data/socialSignIn';
import { account } from '@/theme/accountColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { SocialProvider } from '@/types/account';
import { GOOGLE_G_SVG } from './googleArt';

/** Props for the sign-in service buttons. */
type SocialButtonsProps = {
  /** Shows what went wrong (an empty line clears it). */
  onNote: (note: string) => void;
};

/** The Google and Apple buttons, or nothing when both are switched off. */
export function SocialButtons({ onNote }: SocialButtonsProps) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  // Apple's own button shows only once the iPhone says it offers Sign in with Apple.
  const [appleSheet, setAppleSheet] = useState(false);
  useEffect(() => {
    if (APPLE_SIGN_IN_ON && Platform.OS === 'ios') void appleSheetAvailable().then(setAppleSheet);
  }, []);

  if (!GOOGLE_SIGN_IN_ON && !APPLE_SIGN_IN_ON) return null;

  /** Runs one sign-in, showing its spinner and any problem. Success moves the person on by itself. */
  const run = async (provider: SocialProvider, signIn: () => Promise<boolean>) => {
    onNote('');
    setBusy(provider);
    try {
      await signIn();
    } catch (e) {
      onNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const showApple = APPLE_SIGN_IN_ON && (Platform.OS === 'android' || appleSheet);
  return (
    <View style={styles.wrap}>
      {GOOGLE_SIGN_IN_ON && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          disabled={busy !== null}
          onPress={() => {
            playSound('tap');
            void run('google', () => signInInBrowser('google'));
          }}
          style={({ pressed }) => [styles.button, styles.google, pressed && styles.pressed]}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={account.googleInk} />
          ) : (
            <>
              <SvgPicture svg={GOOGLE_G_SVG} width={20} height={20} />
              <Text style={[styles.label, { color: account.googleInk }]}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      )}
      {showApple && Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={25}
          style={styles.button}
          onPress={() => void run('apple', signInWithAppleSheet)}
        />
      )}
      {showApple && Platform.OS === 'android' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
          disabled={busy !== null}
          onPress={() => {
            playSound('tap');
            void run('apple', () => signInInBrowser('apple'));
          }}
          style={({ pressed }) => [styles.button, styles.apple, pressed && styles.pressed]}
        >
          {busy === 'apple' ? <ActivityIndicator color={account.appleInk} /> : <Text style={[styles.label, { color: account.appleInk }]}>Continue with Apple</Text>}
        </Pressable>
      )}
      <View style={styles.or} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.rule} />
        <Text style={styles.orText}>or use your email</Text>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  button: { height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  google: { backgroundColor: account.googleFill },
  apple: { backgroundColor: account.appleFill },
  label: { fontFamily: fonts.extraBold, fontSize: 16 },
  pressed: { transform: [{ scale: 0.97 }] },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  rule: { flex: 1, height: 1, backgroundColor: account.rule },
  orText: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
});
