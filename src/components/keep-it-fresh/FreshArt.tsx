// The picture at the bottom of each Keep it fresh card: Papa Dorin for the chat, the gold cookie box for Cookie Box
// Trivia, an open Bible for Verse Memory, and a puzzle piece for Verse Trivia.
// They are still pictures; the card's own glow does the moving.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

/** Which card the picture is for. */
type FreshArtKind = 'chat' | 'trivia' | 'verse' | 'verseTrivia';

/** Props for a card picture. */
type FreshArtProps = {
  /** Which card the picture is for. */
  kind: FreshArtKind;
};

/** A card's picture, sitting at the card's bottom right. */
export function FreshArt({ kind }: FreshArtProps) {
  return (
    <View style={styles.stage}>
      {kind === 'chat' && <Image source={require('../../../assets/images/papa-dorin.webp')} style={styles.dorin} contentFit="contain" />}
      {kind === 'trivia' && <Image source={require('../../../assets/images/boxes/box-gold.webp')} style={styles.box} contentFit="contain" />}
      {kind === 'verse' && <Text style={styles.emoji}>📖</Text>}
      {kind === 'verseTrivia' && <Text style={styles.emoji}>🧩</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 120, alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 18, paddingBottom: 6 },
  emoji: { fontSize: 84, lineHeight: 104, transform: [{ rotate: '-8deg' }], textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 10 } },
  dorin: { width: 120, height: 120 },
  box: { width: 104, height: 104, transform: [{ rotate: '-8deg' }] },
});
