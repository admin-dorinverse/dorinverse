// The top of a place's page: its photo with the photo's credit in small type under it (the license asks for it),
// its name and kind, what it is in one sentence, and how many verses name it, with "Find in scripture".

import { openURL } from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';
import { SectionHeading } from '@/components/characters/CharacterRows';
import { VersesMentioned } from '@/components/common/VersesMentioned';
import { creditLine } from '@/data/queries/places';
import { places, text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';
import type { FoundPlace } from '@/types/place';
import { PlacePhoto } from './PlacePhoto';

/** Props for the page top. */
type PlaceHeadProps = {
  /** The place shown. */
  place: FoundPlace;
  /** How many verses naming it the person has revealed, or undefined while the Bible loads. */
  revealed: number | undefined;
  /** Opens the list of revealed verses that name it. */
  onFind: () => void;
};

/** The page top. */
export function PlaceHead({ place, revealed, onFind }: PlaceHeadProps) {
  const credit = place.photo?.credit;
  const link = credit?.link;
  return (
    <View>
      <PlacePhoto place={place} size="header" style={styles.photo} signSize={64} />
      {credit && (
        <Text
          style={[styles.credit, link ? styles.creditLink : null]}
          numberOfLines={2}
          accessibilityRole={link ? 'link' : 'text'}
          onPress={link ? () => void openURL(link) : undefined}
        >
          {creditLine(credit)}
        </Text>
      )}
      <View style={styles.head}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.kind}>{place.kind ? `${place.kind} · Found in ${place.foundIn}` : `Found in ${place.foundIn}`}</Text>
        <Text style={styles.line}>{place.line}</Text>
      </View>
      <SectionHeading title="VERSES MENTIONED" />
      <VersesMentioned count={place.verseRefs.length} revealed={revealed} accent={places.accent} soft={places.soft} onFind={onFind} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 20 },
  credit: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, color: text.onDarkSoft, marginTop: 6, marginHorizontal: 4 },
  creditLink: { textDecorationLine: 'underline' },
  head: { alignItems: 'center', gap: 4, paddingTop: 10 },
  name: { fontFamily: fonts.black, fontSize: 24, color: text.onDark, textAlign: 'center' },
  kind: { fontFamily: fonts.extraBold, fontSize: 13, color: places.accent, textAlign: 'center' },
  line: { ...textStyles.body, color: text.onDarkSoft, textAlign: 'center', marginTop: 6, marginHorizontal: 6 },
});
