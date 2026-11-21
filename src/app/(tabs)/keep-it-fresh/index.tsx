// The Keep it fresh tab: ways to keep what the person has learned fresh, as tinted glass cards over the stars:
// Chat with Papa Dorin and Verse Memory.

import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { FreshArt } from '@/components/keep-it-fresh/FreshArt';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { glass, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { textStyles } from '@/theme/text';

/** Space above the title, under the HUD pills and the tabs. */
const TOP_SPACE = 124;

/** True while the cards slide in, so the page's timer ticks 60 times a second then. */
function freshBusy(time: number): boolean {
  'worklet';
  return time < 1200;
}

/** The Keep it fresh page. */
export default function KeepItFreshPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clock = useAmbientClock(freshBusy);
  const memorized = useMemorizedVerses().length;

  /** Opens one of the cards' pages. */
  const open = (href: Href) => {
    playSound('tap');
    router.push(href);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_SPACE }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={[textStyles.tabTitle, styles.title]}>Keep it fresh</Text>
        <View style={styles.list}>
          <CollectionCard
            title="Chat with Papa Dorin"
            note="Ask him anything about the Bible. He answers in text, one baker at a time."
            hue="sage"
            layout="wide"
            index={0}
            clock={clock}
            action="Start chatting"
            onPress={() => open('/chat')}
          >
            <FreshArt kind="chat" />
          </CollectionCard>
          <CollectionCard
            title="Verse Memory"
            note={`Learn verses by heart, step by step. ${memorized} ${memorized === 1 ? 'verse' : 'verses'} memorized.`}
            hue="cocoa"
            layout="wide"
            index={1}
            clock={clock}
            action="Start a verse"
            // The route list names this page "/verse-memory/index"; its real address is "/verse-memory".
            onPress={() => open('/verse-memory' as Href)}
          >
            <FreshArt kind="verse" />
          </CollectionCard>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: glass.tabVeil },
  content: { paddingHorizontal: gutter, paddingBottom: 50 },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { color: text.onDark, marginTop: 2, marginBottom: 14 },
  list: { gap: 12 },
});
