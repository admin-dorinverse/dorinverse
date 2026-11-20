// The Order Ticket, opened from the bakery: Papa Dorin's paper "Huge Order" slip, shown like a sheet over the dimmed
// bakery with a Close button under it. Tapping the dim area or Close goes back to the bakery.

import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderTicket } from '@/components/bakery/ticket/OrderTicket';
import { playSound } from '@/components/common/sounds';
import { sampleBaker } from '@/data/sample/baker';
import { orderTicket } from '@/theme/bakeryTvColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** The Order Ticket page. */
export default function OrderTicketPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /** Closes the ticket. */
  const close = () => {
    playSound('tap');
    router.back();
  };

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()} accessibilityLabel="Close">
      <Stack.Screen options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <ScrollView
        style={[styles.sheet, { marginTop: insets.top + 20 }]}
        contentContainerStyle={[styles.inner, { paddingBottom: 22 + insets.bottom }]}
        bounces={false}
      >
        {/* Taps on the ticket itself are caught here so they do not close it. */}
        <Pressable accessible={false}>
          <OrderTicket bakerName={sampleBaker.name} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: orderTicket.backdrop },
  sheet: { flexGrow: 0, width: '100%', maxWidth: 560 },
  inner: { paddingTop: 22, paddingHorizontal: 20 },
  close: {
    marginTop: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.button,
    backgroundColor: orderTicket.close,
    boxShadow: `0 5px 0 ${orderTicket.closeEdge}`,
    alignItems: 'center',
  },
  pressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 ${orderTicket.closeEdge}` },
  closeText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: orderTicket.closeText },
});
