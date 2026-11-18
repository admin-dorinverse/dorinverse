// The Collections tab: everything the person has collected from their lessons, as glass cards over the stars.
// Bible verses, characters, places, prophecy and fulfillment, instructions for today, and prayers.

import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookShelf } from '@/components/collections/BookShelf';
import { CharacterFan } from '@/components/collections/CharacterFan';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { PlacesMap } from '@/components/collections/PlacesMap';
import { CompassScene, PrayerCandle, ProphecyLink } from '@/components/collections/SmallScenes';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { useFanCharacters } from '@/data/queries/characters';
import { samplePlaces, sampleVerseBooks } from '@/data/sample/collections';
import { glass, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import type { CollectionKind } from '@/types/collection';

/** Space above the title, under the HUD pills and the tabs. */
const TOP_SPACE = 124;

/**
 * True while something on the page moves fast, so the page's timer ticks 60 times a second then:
 * the cards coming in, the books sliding along the shelf, and the character cards changing places.
 */
function collectionsBusy(time: number): boolean {
  'worklet';
  if (time < 1800) return true;
  if (time >= 2600 && (time - 2600) % 3000 < 900) return true;
  return time >= 3400 && time % 3400 < 800;
}

/** The Collections page. */
export default function CollectionsPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clock = useAmbientClock(collectionsBusy);
  // The newest collected characters, from memory (loaded when the app starts); "Who's next?" cards until then.
  const fanCharacters = useFanCharacters();

  /** Opens one collection's full list. */
  const open = (kind: CollectionKind) => {
    playSound('tap');
    // The generated route list names these lists "/bible/index" and "/characters/index"; their real addresses
    // are "/bible" and "/characters".
    if (kind === 'verses') router.push('/bible' as Href);
    else if (kind === 'characters') router.push('/characters' as Href);
    else router.push({ pathname: '/collection/[kind]', params: { kind } });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_SPACE }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={[textStyles.tabTitle, styles.title]}>Collections</Text>
        <View style={styles.list}>
          <CollectionCard title="Bible verses" note="The Bible verses you have brought to life." hue="amber" layout="wide" index={0} clock={clock} onPress={() => open('verses')}>
            <BookShelf books={sampleVerseBooks} clock={clock} />
          </CollectionCard>
          <CollectionCard title="Characters" note="The people you have met." hue="berry" layout="wide" index={1} clock={clock} onPress={() => open('characters')}>
            <CharacterFan characters={fanCharacters} clock={clock} />
          </CollectionCard>
          <CollectionCard title="Places" note="Where your latest lessons have taken you." hue="sage" layout="wide" index={2} clock={clock} onPress={() => open('places')}>
            <PlacesMap places={samplePlaces} clock={clock} />
          </CollectionCard>
          <CollectionCard
            title="Prophecy and Fulfillment of Jesus"
            note="Prophecy and fulfillment of Jesus."
            hue="blue"
            layout="wide"
            index={3}
            clock={clock}
            onPress={() => open('prophecy')}
          >
            <ProphecyLink clock={clock} />
          </CollectionCard>
          <View style={styles.pair}>
            <CollectionCard title="Instructions for Today" note="What Scripture tells you to do." hue="cocoa" layout="narrow" index={4} clock={clock} onPress={() => open('instructions')}>
              <CompassScene clock={clock} />
            </CollectionCard>
            <CollectionCard title="Prayers" note="Bible prayers to pray too." hue="lav" layout="narrow" index={5} clock={clock} onPress={() => open('prayers')}>
              <PrayerCandle clock={clock} />
            </CollectionCard>
          </View>
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
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
});
