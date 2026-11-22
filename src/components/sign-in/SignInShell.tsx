// The frame every sign-in page shares: the still night sky behind (drawn once, so it costs nothing while the page
// is open), an optional back button, a heading, and one dark glass card holding the page's boxes and buttons.
// It moves up out of the way of the keyboard.

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { RoundButton } from '@/components/common/DrillHeader';
import { StillSky } from '@/components/sky/StillSky';
import { text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';

/** Props for the sign-in frame. */
type SignInShellProps = {
  /** The small gold line above the heading, like "WELCOME". */
  kicker: string;
  /** The heading. */
  title: string;
  /** A short line under the heading. */
  subtitle?: string;
  /** Goes back a page; no back button when not given. */
  onBack?: () => void;
  /** What sits on the glass card. */
  children: ReactNode;
  /** What sits under the card, like "New here? Make an account". */
  footer?: ReactNode;
};

/** The sign-in pages' frame. */
export function SignInShell({ kicker, title, subtitle, onBack, children, footer }: SignInShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <StillSky />
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>{onBack && <RoundButton label="Back" onPress={onBack}><Text style={styles.arrow}>←</Text></RoundButton>}</View>
          <View style={styles.heading}>
            <Text style={[textStyles.tabSubtitle, styles.kicker]}>{kicker}</Text>
            <Text style={[textStyles.tabTitle, styles.title]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[textStyles.body, styles.subtitle]}>{subtitle}</Text> : null}
          </View>
          <GlassSurface style={styles.card}>{children}</GlassSurface>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: gutter, gap: 18, width: '100%', maxWidth: 480, alignSelf: 'center' },
  top: { minHeight: 44, flexDirection: 'row' },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  heading: { alignItems: 'center', gap: 6 },
  kicker: { color: text.goldNote },
  title: { color: text.onDark, textAlign: 'center' },
  subtitle: { color: text.onDarkSoft, textAlign: 'center' },
  card: { borderRadius: radius.card, padding: 20, gap: 16 },
});
