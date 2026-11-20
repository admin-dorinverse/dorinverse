// A person's page in Character Connections, as in the owner's artifact: their small web of links in rings, their name,
// tag and summary, a "View Character Details" button (their full character page), then every connection as a row.
// Tapping someone opens their page; tapping a line or a row opens the link. Only collected people can be opened.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { ConnectionList } from '@/components/connections/ConnectionList';
import { CreamHeader } from '@/components/connections/CreamHeader';
import { PersonWeb, personLinks } from '@/components/connections/MiniWeb';
import { useWeb } from '@/components/connections/useWeb';
import { fullName } from '@/components/connections/WebBar';
import type { WebLink, WebNode } from '@/components/connections/webModel';
import { webPage } from '@/theme/characterWebColors';
import { fonts, readingFont } from '@/theme/text';

/** The person page. */
export default function ConnectionPersonPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lookup } = useLocalSearchParams<{ lookup: string }>();
  const { web } = useWeb();
  const node = web?.nodes.find((n) => n.lookup === lookup);
  const links = node && web ? personLinks(node, web.links) : [];

  /** Opens another collected person's page. */
  const openPerson = (n: WebNode) => router.push({ pathname: '/connections/[lookup]', params: { lookup: n.lookup } });
  /** Opens a link's page. */
  const openLink = (l: WebLink) => router.push({ pathname: '/connections/link', params: { index: String(l.index) } });

  return (
    <View style={styles.page}>
      <CreamHeader title={node ? fullName(node) : 'Character'} onBack={() => router.back()} />
      {node && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}>
          {links.length > 0 && <PersonWeb node={node} links={links} onPerson={openPerson} onLink={openLink} />}
          <Text style={styles.title}>{node.name}</Text>
          {node.tag && <Text style={styles.tagline}>{node.tag}</Text>}
          {node.character && <Text style={styles.summary}>{node.character.summary}</Text>}
          {node.character && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                playSound('tap');
                router.push({ pathname: '/characters/[id]', params: { id: node.lookup } });
              }}
              style={({ pressed }) => [styles.details, pressed && styles.pressed]}
            >
              <Text style={styles.detailsText}>View Character Details</Text>
            </Pressable>
          )}
          <Text style={styles.label}>
            {links.length} {links.length === 1 ? 'CONNECTION' : 'CONNECTIONS'}
          </Text>
          <ConnectionList node={node} links={links} onLink={openLink} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: webPage.background },
  body: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8 },
  title: { fontFamily: readingFont, fontSize: 26, lineHeight: 31, color: webPage.ink, marginTop: 14, marginBottom: 4 },
  tagline: { fontFamily: fonts.body, fontSize: 15, color: webPage.muted, marginBottom: 10 },
  summary: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: webPage.ink, marginTop: 8, marginBottom: 18 },
  details: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1.5, borderColor: webPage.cardEdge, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 4 },
  pressed: { transform: [{ scale: 0.97 }] },
  detailsText: { fontFamily: fonts.extraBold, fontSize: 15, color: webPage.accent },
  label: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1, color: webPage.muted, marginTop: 20, marginBottom: 8 },
});
