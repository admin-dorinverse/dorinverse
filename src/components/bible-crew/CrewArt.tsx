// The picture at the bottom of each Bible Crew card: Papa Dorin for his chat, the weekly guest's picture (or a big
// round badge with their initial until their art is made), and an open Bible for Verse Memory.
// They are still pictures; the card's own glow does the moving.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { chat } from '@/theme/chatColors';
import { fonts } from '@/theme/text';
import type { ChatCharacter } from '@/types/chat';

/** Props for a card picture: which card it is for, and for the guest card, who the guest is. */
type CrewArtProps = { kind: 'chat' | 'verse' } | { kind: 'guest'; guest: ChatCharacter };

/** A card's picture, sitting at the card's bottom right. */
export function CrewArt(props: CrewArtProps) {
  return (
    <View style={styles.stage}>
      {props.kind === 'chat' && <Image source={PAPA_DORIN} style={styles.picture} contentFit="contain" />}
      {props.kind === 'verse' && <Text style={styles.emoji}>📖</Text>}
      {props.kind === 'guest' &&
        (props.guest.picture ? (
          <Image source={props.guest.picture} style={styles.picture} contentFit="contain" />
        ) : (
          <View style={styles.badge}>
            <Text style={styles.initial}>{props.guest.name.charAt(0)}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 120, alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 18, paddingBottom: 6 },
  emoji: { fontSize: 84, lineHeight: 104, transform: [{ rotate: '-8deg' }], textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 10 } },
  picture: { width: 120, height: 120 },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundImage: `linear-gradient(135deg, ${chat.guestBadge[0]}, ${chat.guestBadge[1]})`,
    boxShadow: `0 0 22px ${chat.guestGlow}, 0 10px 14px rgba(0,0,0,0.4)`,
    transform: [{ rotate: '-6deg' }],
  },
  initial: { fontFamily: fonts.black, fontSize: 50, lineHeight: 58, color: chat.guestInk },
});
