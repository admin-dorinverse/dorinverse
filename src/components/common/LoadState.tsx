// What a page shows while its data downloads, or when the download failed (with a Try again button).

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { bakery, navy, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { playSound } from './sounds';

/** Props for the loading message. */
type LoadStateProps = {
  /** True when the download failed; false while it is still going. */
  failed: boolean;
  /** Starts the download again. */
  onRetry: () => void;
};

/** A spinner while loading, or a short message and a Try again button after a failure. */
export function LoadState({ failed, onRetry }: LoadStateProps) {
  return (
    <View style={styles.wrap}>
      {failed ? (
        <>
          <Text style={styles.message}>Couldn’t load this right now. Check your connection and try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onRetry();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color={bakery.gold} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 60, paddingHorizontal: 30, alignItems: 'center', gap: 16 },
  message: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: text.onDarkSoft, textAlign: 'center' },
  button: { backgroundColor: bakery.gold, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22 },
  buttonText: { fontFamily: fonts.black, fontSize: 15, color: navy },
});
