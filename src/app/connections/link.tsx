// A link's page in Character Connections, as in the owner's artifact: the two people joined by every line between
// them, then for each link its colored pill, why they are linked, and the Scripture behind it (for a prophecy, also
// where it came true). Tapping a person opens their page. Verses show once the person has revealed them.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';
import { CreamHeader } from '@/components/connections/CreamHeader';
import { MiniLine } from '@/components/connections/MiniWeb';
import { PassageBlock } from '@/components/connections/PassageBlock';
import { useWeb } from '@/components/connections/useWeb';
import { fullName } from '@/components/connections/WebBar';
import { SquareFills, WebSquare } from '@/components/connections/WebSquare';
import type { WebNode } from '@/components/connections/webModel';
import { CHARACTER_WEB_PASSAGES } from '@/data/characterWebPassages';
import { LINK_LABELS } from '@/data/queries/characters';
import { linkColors, webPage } from '@/theme/characterWebColors';
import { fonts, readingFont } from '@/theme/text';

/** The pair drawing's size, as in the artifact, and its widest. */
const PAIR_W = 400;
const PAIR_H = 170;
const PAIR_MAX = 440;

/** The link page. */
export default function ConnectionLinkPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { index } = useLocalSearchParams<{ index: string }>();
  const { web } = useWeb();
  const link = web?.links.find((l) => l.index === Number(index));
  // The tapped link first, then any other shown links between the same two people.
  const all = link && web ? [link, ...web.links.filter((l) => l !== link && l.a === link.a && l.b === link.b && l.why !== undefined)] : [];
  const drawn = Math.min(width - 36, PAIR_MAX);

  /** Opens a collected person's page. */
  const openPerson = (n: WebNode) => router.push({ pathname: '/connections/[lookup]', params: { lookup: n.lookup } });

  return (
    <View style={styles.page}>
      <CreamHeader title={link ? `${fullName(link.a)} & ${fullName(link.b)}` : 'Connection'} onBack={() => router.back()} />
      {link && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}>
          <Svg width={drawn} height={(drawn * PAIR_H) / PAIR_W} viewBox={`0 0 ${PAIR_W} ${PAIR_H}`} style={styles.pair}>
            <SquareFills />
            {all.map((l, k) => (
              <MiniLine key={l.index} link={l} x1={70} y1={PAIR_H / 2} x2={PAIR_W - 70} y2={PAIR_H / 2} width={4} offset={k - (all.length - 1) / 2} />
            ))}
            <WebSquare node={link.a} x={72} y={PAIR_H / 2} size={120} ring={linkColors[link.type]} ringWidth={4} onPress={() => openPerson(link.a)} />
            <WebSquare node={link.b} x={PAIR_W - 72} y={PAIR_H / 2} size={120} ring={linkColors[link.type]} ringWidth={4} onPress={() => openPerson(link.b)} />
          </Svg>
          {all.map((l, k) => {
            const [proof, fulfilled] = CHARACTER_WEB_PASSAGES[l.index];
            return (
              <View key={l.index} style={k > 0 && styles.next}>
                <View style={[styles.pill, { backgroundColor: linkColors[l.type] }]}>
                  <Text style={styles.pillText}>{(LINK_LABELS[l.type] ?? l.type).toUpperCase()}</Text>
                </View>
                <Text style={styles.why}>{l.why}</Text>
                <Text style={styles.label}>{fulfilled.length ? 'THE PROPHECY' : 'SCRIPTURE'}</Text>
                {proof.map((p) => (
                  <PassageBlock key={p} passage={p} />
                ))}
                {fulfilled.length > 0 && <Text style={styles.label}>FULFILLED</Text>}
                {fulfilled.map((p) => (
                  <PassageBlock key={p} passage={p} />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: webPage.background },
  body: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8 },
  pair: { alignSelf: 'center' },
  next: { marginTop: 28 },
  pill: { alignSelf: 'center', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, marginTop: 4 },
  pillText: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 0.9, color: webPage.pillText },
  why: { fontFamily: readingFont, fontSize: 18, lineHeight: 27, color: webPage.ink, marginTop: 14, marginBottom: 6 },
  label: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1, color: webPage.muted, marginTop: 20, marginBottom: 8 },
});
