// One message in a chat, as in the Constellations design: the character beside their white bubble (Papa Dorin's
// picture, or a round badge for a guest without art yet), or the baker's gold bubble with their round initial.
// While the character is thinking, their bubble shows three bouncing dots.

import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { chat } from '@/theme/chatColors';
import { fonts } from '@/theme/text';
import type { ChatCharacter } from '@/types/chat';

/** How long one bounce of the thinking dots takes (ms), and the gap between the dots. */
const BOUNCE_MS = 1000;
const DOT_GAP_MS = 150;

/** One thinking dot. */
function Dot({ index, clock }: { index: number; clock: AmbientClock }) {
  const bounce = useAnimatedStyle(() => {
    if (clock.still) return {};
    const p = ((clock.time.get() - index * DOT_GAP_MS) % BOUNCE_MS + BOUNCE_MS) % BOUNCE_MS / BOUNCE_MS;
    const w = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
    return { opacity: 1 - 0.5 * w, transform: [{ translateY: -5 * w }] };
  });
  return <Animated.View style={[styles.dot, bounce]} />;
}

/** Props for a bubble. */
type ChatBubbleProps = {
  /** Who wrote it. */
  mine: boolean;
  /** Who the chat is with. */
  who: ChatCharacter;
  /** Its words, or null while the character is still thinking. */
  text: string | null;
  /** The baker's initial, for their badge. */
  initial: string;
  /** The page's shared timer, for the thinking dots. */
  clock: AmbientClock;
};

/** One chat bubble. */
export const ChatBubble = memo(function ChatBubble({ mine, who, text, initial, clock }: ChatBubbleProps) {
  if (mine) {
    return (
      <View style={[styles.row, styles.mineRow]}>
        <View style={[styles.bubble, styles.mineBubble]}>
          <Text selectable style={[styles.words, styles.mineWords]}>
            {text}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{initial}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {who.picture ? (
        <Image source={who.picture} style={styles.dorin} contentFit="contain" accessibilityLabel={who.name} />
      ) : (
        <View style={[styles.badge, styles.guestBadge]} accessibilityLabel={who.name}>
          <Text style={[styles.badgeText, styles.guestBadgeText]}>{who.name.charAt(0)}</Text>
        </View>
      )}
      <View style={[styles.bubble, styles.dorinBubble]}>
        {text === null ? (
          <View style={styles.dots} accessibilityLabel={`${who.name} is thinking`}>
            {[0, 1, 2].map((i) => (
              <Dot key={i} index={i} clock={clock} />
            ))}
          </View>
        ) : (
          <Text selectable style={[styles.words, styles.dorinWords]}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  mineRow: { justifyContent: 'flex-end' },
  dorin: { width: 27, height: 62, boxShadow: `0 0 8px ${chat.dorinGlow}` },
  bubble: { maxWidth: '78%', borderRadius: 20, paddingVertical: 11, paddingHorizontal: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.25)' },
  dorinBubble: { backgroundColor: chat.dorinBubble },
  mineBubble: { backgroundImage: `linear-gradient(135deg, ${chat.meBubble[0]}, ${chat.meBubble[1]})` },
  words: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22 },
  dorinWords: { color: chat.dorinInk },
  mineWords: { color: chat.meInk },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundImage: `linear-gradient(135deg, ${chat.meBadge[0]}, ${chat.meBadge[1]})` },
  badgeText: { fontFamily: fonts.black, fontSize: 15, color: chat.meInk },
  guestBadge: { backgroundImage: `linear-gradient(135deg, ${chat.guestBadge[0]}, ${chat.guestBadge[1]})`, boxShadow: `0 0 8px ${chat.guestGlow}` },
  guestBadgeText: { color: chat.guestInk },
  dots: { flexDirection: 'row', gap: 4, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: chat.dots },
});
