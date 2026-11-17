// One constellation's page, opened by flying to it in the sky. Its lesson list comes in a later phase.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { sampleConstellations } from '@/data/sample/constellations';
import { sky } from '@/theme/colors';

/** The constellation page, for now a placeholder in the constellation's color. */
export default function ConstellationPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const constellation = sampleConstellations.find((c) => c.id === id);
  return (
    <View style={styles.page}>
      <PlaceholderPage
        kicker="CONSTELLATION"
        title={constellation?.name ?? 'Constellation'}
        note="This constellation's lessons will be listed here. Coming in a later phase."
        glow={constellation?.color}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: sky.top },
});
