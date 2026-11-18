// One prophecy link's page, opened from the Prophecy list: its title, whether it is joined, the promise and every
// fulfillment in full, each held half with "Read in the Bible". Halves still to find show their reference over
// stardust. Everything is already on the phone.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { HalfRow } from '@/components/prophecy/HalfRow';
import { useCookieLibrary } from '@/data/queries/cookies';
import { prophecy, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** A prophecy link's page. */
export default function ProphecyLinkPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useCookieLibrary();
  const card = library.data?.byLinkNo[Number(id)];

  return (
    <View style={styles.page}>
      <DrillHeader title="Prophecy" onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : library.data && !card ? (
        <Text style={styles.empty}>This prophecy isn’t in your collection yet.</Text>
      ) : (
        card && (
          <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}>
            <Text style={styles.title}>{card.title}</Text>
            <Text style={[styles.status, card.joined && styles.joined]}>
              {card.joined ? '✦ Joined: promise and fulfillment' : 'Waiting for a half. Keep going in your lessons to find it.'}
            </Text>
            <View style={[styles.box, card.joined && styles.boxJoined]}>
              <HalfRow slot={card.promise} readable seed={card.linkNo} />
            </View>
            {card.fulfillments.map((slot, i) => (
              <View key={slot.kind === 'held' ? slot.cookie.key : slot.half.key} style={[styles.box, card.joined && slot.kind === 'held' && styles.boxJoined]}>
                <HalfRow slot={slot} readable seed={card.linkNo + i + 1} />
              </View>
            ))}
          </ScrollView>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontFamily: fonts.black, fontSize: 26, lineHeight: 32, color: text.onDark },
  status: { fontFamily: fonts.extraBold, fontSize: 14, color: prophecy.soft, marginBottom: 4 },
  joined: { color: prophecy.accent },
  box: { borderRadius: 20, padding: 16, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  boxJoined: { borderColor: prophecy.joinedEdge, backgroundColor: prophecy.joinedFill, boxShadow: prophecy.joinedGlow },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 40 },
});
