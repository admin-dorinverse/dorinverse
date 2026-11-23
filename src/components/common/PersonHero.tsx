// A person shown big at the top of a page: their round avatar, a title under it and an optional soft line.
// Used on a friend's code page (just their username) and in a friend's universe ("Mia's universe").

import { StyleSheet, Text, View } from 'react-native';
import { PersonAvatar } from './PersonAvatar';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** How wide the big avatar is. */
const AVATAR_SIZE = 132;

/** Props for the big person. */
type PersonHeroProps = {
  /** Their username, for the avatar's letter and color. */
  username: string;
  /** The big line under the avatar, like their username. */
  title: string;
  /** A soft line under the title, like when they joined; none when not given. */
  line?: string;
};

/** A big avatar with a title and an optional soft line. */
export function PersonHero({ username, title, line }: PersonHeroProps) {
  return (
    <View style={styles.wrap}>
      <PersonAvatar username={username} size={AVATAR_SIZE} />
      <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
        {title}
      </Text>
      {line ? <Text style={styles.line}>{line}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingTop: 12, paddingBottom: 4 },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34, color: text.onDark, textAlign: 'center' },
  line: { fontFamily: fonts.bold, fontSize: 14, color: text.onDarkSoft, textAlign: 'center' },
});
