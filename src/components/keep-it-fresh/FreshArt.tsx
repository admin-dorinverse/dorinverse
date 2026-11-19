// The picture at the bottom of each Keep it fresh card: a web for Character Connections, Papa Dorin for the chat,
// and an open Bible for Verse Memory. They are still pictures; the card's own glow does the moving.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

/** Which card the picture is for. */
type FreshArtKind = 'web' | 'chat' | 'verse';

/** Props for a card picture. */
type FreshArtProps = {
  /** Which card the picture is for. */
  kind: FreshArtKind;
};

/** The emoji shown for the cards that use one. */
const EMOJI: Record<Exclude<FreshArtKind, 'chat'>, string> = { web: '🕸️', verse: '📖' };

/** A card's picture, sitting at the card's bottom right. */
export function FreshArt({ kind }: FreshArtProps) {
  return (
    <View style={styles.stage}>
      {kind === 'chat' ? (
        <Image source={require('../../../assets/images/papa-dorin.webp')} style={styles.dorin} contentFit="contain" />
      ) : (
        <Text style={styles.emoji}>{EMOJI[kind]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 120, alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 18, paddingBottom: 6 },
  emoji: { fontSize: 84, lineHeight: 104, transform: [{ rotate: '-8deg' }], textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 10 } },
  dorin: { width: 120, height: 120 },
});
