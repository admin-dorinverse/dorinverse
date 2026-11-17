// A simple dark glass page for screens that come in a later phase. It shows a title, a short note,
// and an optional back button.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glass, text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import { playSound } from './sounds';

/** Props for a placeholder page. */
type PlaceholderPageProps = {
  /** Small gold line above the title. */
  kicker: string;
  /** The page title. */
  title: string;
  /** A short note about what will be here. */
  note: string;
  /** Glow color for the title, like a constellation's color. */
  glow?: string;
  /** Shows a round back button when given. */
  onBack?: () => void;
  /** Space to leave at the top, for pages under the tabs. */
  topSpace?: number;
};

/** A placeholder page on dark glass over the sky. */
export function PlaceholderPage({ kicker, title, note, glow, onBack, topSpace = 0 }: PlaceholderPageProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + topSpace }]}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the sky"
          onPress={() => {
            playSound('tap');
            onBack();
          }}
          style={[styles.back, { top: insets.top + 12 }]}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
      )}
      <View style={styles.inner}>
        <Text style={[textStyles.tabSubtitle, styles.kicker]}>{kicker}</Text>
        <Text style={[textStyles.tabTitle, styles.title, glow ? { textShadowColor: glow, textShadowRadius: 14 } : null]}>{title}</Text>
        <Text style={[textStyles.body, styles.note]}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: glass.tabVeil, paddingHorizontal: gutter },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingTop: 70 },
  kicker: { color: text.goldNote },
  title: { color: text.onDark, marginTop: 2, marginBottom: 14, textShadowOffset: { width: 0, height: 0 } },
  note: { color: text.onDarkSoft },
  back: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: text.onDark, fontSize: 20, fontWeight: '900' },
});
