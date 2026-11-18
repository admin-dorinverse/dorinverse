// The top of a character's page: their badge, name (with name tag and other names), who they were, and how many
// verses name them, with a "Find in scripture" button that lists the person's revealed verses naming them.

import { StyleSheet, Text, View } from 'react-native';
import { VersesMentioned } from '@/components/common/VersesMentioned';
import { characters, text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';
import type { MetCharacter } from '@/types/character';
import { CharacterBadge } from './CharacterBadge';
import { SectionHeading } from './CharacterRows';

/** Props for the page top. */
type CharacterHeadProps = {
  /** The character shown. */
  character: MetCharacter;
  /** How many verses naming them the person has revealed, or undefined while the Bible loads. */
  revealed: number | undefined;
  /** Opens the list of revealed verses that name them. */
  onFind: () => void;
};

/** The page top. */
export function CharacterHead({ character, revealed, onFind }: CharacterHeadProps) {
  const { name, nameTag, alsoKnownAs, summary, verseCount } = character;
  return (
    <View>
      <View style={styles.head}>
        <CharacterBadge name={name} size={76} />
        <Text style={styles.name}>{name}</Text>
        {nameTag && <Text style={styles.tag}>{nameTag}</Text>}
        {alsoKnownAs.length > 0 && <Text style={styles.tag}>Also called {alsoKnownAs.join(', ')}</Text>}
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <SectionHeading title="VERSES MENTIONED" />
      <VersesMentioned count={verseCount} revealed={revealed} accent={characters.accent} soft={characters.soft} onFind={onFind} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4, paddingTop: 4 },
  name: { fontFamily: fonts.black, fontSize: 24, color: text.onDark, marginTop: 8, textAlign: 'center' },
  tag: { fontFamily: fonts.extraBold, fontSize: 13, color: characters.soft, textAlign: 'center' },
  summary: { ...textStyles.body, color: text.onDarkSoft, textAlign: 'center', marginTop: 8, marginHorizontal: 6 },
});
