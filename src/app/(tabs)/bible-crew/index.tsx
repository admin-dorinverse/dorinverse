// The Bible Crew tab: the people and tools that help with the Bible, as tinted glass cards over the stars:
// Chat with Papa Dorin, the Bible guest of the week, and Group Voice Calls. Verse Memory is hidden for now.
// Under the cards, a small "Signed in as" row opens the Account page.

import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountRow } from '@/components/bible-crew/AccountRow';
import { CrewArt } from '@/components/bible-crew/CrewArt';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { thisWeeksGuest } from '@/data/weeklyGuestSource';
import { glass } from '@/theme/colors';
import { gutter } from '@/theme/spacing';

/** Verse Memory's card is hidden for now (the owner's call); set to true to show it again. */
const SHOW_VERSE_MEMORY = false;

/** Space above the first card, under the HUD pills and the tabs. */
const TOP_SPACE = 124;

/** True while the cards slide in, so the page's timer ticks 60 times a second then. */
function crewBusy(time: number): boolean {
  'worklet';
  return time < 1200;
}

/** The Bible Crew page. */
export default function BibleCrewPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clock = useAmbientClock(crewBusy);
  const memorized = useMemorizedVerses().length;
  const guest = thisWeeksGuest();

  /** Opens one of the cards' pages. */
  const open = (href: Href) => {
    playSound('tap');
    router.push(href);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_SPACE }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
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
            <CrewArt kind="chat" />
          </CollectionCard>
          <CollectionCard
            title={`This week's guest: ${guest.name}`}
            note={`A new guest from the Bible visits every week. Ask ${guest.name} anything before the week is over.`}
            hue="blue"
            layout="wide"
            index={1}
            clock={clock}
            action="Say hello"
            onPress={() => open({ pathname: '/chat', params: { with: guest.id } })}
          >
            <CrewArt kind="guest" guest={guest} />
          </CollectionCard>
          <CollectionCard
            title="Group Voice Calls"
            note="Talk with family and friends, all at once. Hold Papa Dorin's picture to ask him something, and everyone hears him answer."
            hue="amber"
            layout="wide"
            index={2}
            clock={clock}
            action="Start a call"
            onPress={() => open('/call')}
          >
            <CrewArt kind="call" />
          </CollectionCard>
          {SHOW_VERSE_MEMORY && (
            <CollectionCard
              title="Verse Memory"
              note={`Learn verses by heart, step by step. ${memorized} ${memorized === 1 ? 'verse' : 'verses'} memorized.`}
              hue="cocoa"
              layout="wide"
              index={3}
              clock={clock}
              action="Start a verse"
              // The route list names this page "/verse-memory/index"; its real address is "/verse-memory".
              onPress={() => open('/verse-memory' as Href)}
            >
              <CrewArt kind="verse" />
            </CollectionCard>
          )}
          <AccountRow onOpen={() => router.push('/account')} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: glass.tabVeil },
  content: { paddingHorizontal: gutter, paddingBottom: 50 },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  list: { gap: 12 },
});
