// The buttons on the sign-in and Account pages: the app's big gold button, a quieter glass one, a red one only for
// deleting the account, and a plain gold-words link. Each plays the tap sound and shows a spinner while busy.

import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from './sounds';
import { account } from '@/theme/accountColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** The button's look. */
type AuthButtonLook = 'main' | 'quiet' | 'danger' | 'link';

/** Props for a button. */
type AuthButtonProps = {
  /** The button's words. */
  label: string;
  /** Runs when tapped, after the tap sound. */
  onPress: () => void;
  /** Which look: gold, glass, red, or just words. Gold when not given. */
  look?: AuthButtonLook;
  /** True while its work runs: shows a spinner and can't be tapped. */
  busy?: boolean;
  /** True when it can't be tapped yet. */
  disabled?: boolean;
};

/** A sign-in page button. */
export function AuthButton({ label, onPress, look = 'main', busy = false, disabled = false }: AuthButtonProps) {
  const off = busy || disabled;
  const ink = look === 'main' ? account.buttonInk : look === 'danger' ? account.dangerInk : look === 'link' ? text.goldNote : text.onDark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      hitSlop={look === 'link' ? 8 : 0}
      style={({ pressed }) => [styles[look], disabled && styles.off, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={ink} /> : <Text style={[look === 'link' ? styles.linkText : styles.text, { color: ink }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  main: { height: 56, borderRadius: 28, backgroundColor: account.button, alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 0 ${account.buttonShadow}` },
  quiet: { height: 50, borderRadius: 25, borderWidth: 1, borderColor: account.quietEdge, backgroundColor: account.quietFill, alignItems: 'center', justifyContent: 'center' },
  danger: { height: 54, borderRadius: 27, backgroundColor: account.danger, alignItems: 'center', justifyContent: 'center' },
  link: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  text: { fontFamily: fonts.black, fontSize: 17 },
  linkText: { fontFamily: fonts.extraBold, fontSize: 14.5 },
  off: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.97 }] },
});
