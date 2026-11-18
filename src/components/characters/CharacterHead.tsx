// The top of a character's page: their badge, name (with name tag and other names), who they were, and how many
// verses name them, with a "Find in scripture" button that lists the person's revealed verses naming them.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { characters, navy, reader, text } from '@/theme/colors';
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
      <View style={styles.verses}>
        <View style={styles.countBox}>
          <Text style={styles.countLine}>
            <Text style={styles.count}>{verseCount}</Text> {verseCount === 1 ? 'verse' : 'verses'}
          </Text>
          {revealed !== undefined && <Text style={styles.revealed}>{revealed} in your revealed verses</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            playSound('tap');
            onFind();
          }}
          style={({ pressed }) => [styles.find, pressed && styles.pressed]}
        >
          <Text style={styles.findText}>📖 Find in scripture</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4, paddingTop: 4 },
  name: { fontFamily: fonts.black, fontSize: 24, color: text.onDark, marginTop: 8, textAlign: 'center' },
  tag: { fontFamily: fonts.extraBold, fontSize: 13, color: characters.soft, textAlign: 'center' },
  summary: { ...textStyles.body, color: text.onDarkSoft, textAlign: 'center', marginTop: 8, marginHorizontal: 6 },
  verses: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  countBox: { flex: 1 },
  countLine: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft },
  count: { fontFamily: fonts.black, fontSize: 20, color: characters.accent },
  revealed: { fontFamily: fonts.bold, fontSize: 12, color: characters.soft, marginTop: 2 },
  find: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: reader.verseNumber },
  pressed: { opacity: 0.75 },
  findText: { fontFamily: fonts.black, fontSize: 13.5, color: navy },
});
