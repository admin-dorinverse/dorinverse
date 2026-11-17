// Papa Dorin's Bakery, opened by tapping the bakery planet. Its real screen comes in a later phase.

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { bakery, sky } from '@/theme/colors';

/** The bakery page, for now a placeholder. */
export default function BakeryPage() {
  const router = useRouter();
  return (
    <View style={styles.page}>
      <PlaceholderPage
        kicker="WELCOME IN"
        title="Papa Dorin's Bakery"
        note="Bakery TV, Papa Dorin's Story, Chat and the Order Ticket will live here. Coming in a later phase."
        glow={bakery.planetGlow}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: sky.top },
});
