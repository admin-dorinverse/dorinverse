// Papa Dorin's Bakery, opened by tapping the bakery planet, as in the Constellations design: the kitchen conveyor belt
// across the top, Papa Dorin swaying as he says hello, and four bright cards: Bakery TV, Papa Dorin's Story, Chat with
// Papa Dorin, and the Order Ticket. It fits one screen, with soft colored lights drifting behind.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BakeryOption } from '@/components/bakery/BakeryOption';
import { KitchenBelt } from '@/components/bakery/KitchenBelt';
import { RoomLights } from '@/components/bakery/RoomLights';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { bakeryCards, bakeryRoom } from '@/theme/bakeryColors';
import { fonts } from '@/theme/text';

/** How long Papa Dorin's sway takes, there and back (ms), and how far he leans (degrees). */
const SWAY_MS = 4500;
const SWAY_DEG = 2;

/** The room's lights and Papa Dorin move slowly; 20 ticks a second is plenty. */
function calm(): boolean {
  'worklet';
  return false;
}

/** The open book on the story card, as in the design. */
function BookArt() {
  return (
    <Svg width={50} height={44} viewBox="0 0 64 56">
      <Path d="M4 12 L32 16 L60 12 L60 48 L32 52 L4 48 Z" fill={bakeryRoom.bookCover} />
      <Path d="M7 9 C16 7 25 8 31 13 L31 47 C25 43 16 42 7 44 Z" fill={bakeryRoom.bookPage} stroke={bakeryRoom.bookEdge} />
      <Path d="M57 9 C48 7 39 8 33 13 L33 47 C39 43 48 42 57 44 Z" fill={bakeryRoom.bookPage} stroke={bakeryRoom.bookEdge} />
    </Svg>
  );
}

/** The bakery page. */
export default function BakeryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clock = useAmbientClock(calm);
  const sway = useAnimatedStyle(() => {
    if (clock.still) return {};
    const p = (clock.time.get() % SWAY_MS) / SWAY_MS;
    return { transform: [{ rotate: `${-SWAY_DEG * Math.cos(p * Math.PI * 2)}deg` }] };
  });

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the stars"
          onPress={() => {
            playSound('tap');
            router.back();
          }}
          style={styles.back}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" fill="none" stroke={bakeryRoom.back} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={styles.barTitle}>Papa Dorin’s Bakery</Text>
      </View>
      <KitchenBelt />
      <View style={[styles.room, { paddingBottom: insets.bottom + 22 }]}>
        <RoomLights clock={clock} />
        <View style={styles.hello}>
          <Animated.View style={[styles.dorinBox, sway]}>
            <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
          </Animated.View>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Well, look who walked into my bakery! Pull up a stool, baker. Mm-hm.</Text>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={styles.row}>
            <BakeryOption title="Bakery TV" line="See what’s on right now" colors={bakeryCards.tv} index={0} clock={clock} onPress={() => router.push('/bakery/tv')}>
              <Image source={require('../../../assets/images/bakery-tv.webp')} style={styles.artImage} contentFit="contain" />
            </BakeryOption>
            <BakeryOption title="Papa Dorin’s Story" line="From the junk drawer to the stars" colors={bakeryCards.story} index={1} clock={clock} onPress={() => router.push('/bakery/story')}>
              <BookArt />
              <Image source={PAPA_DORIN} style={styles.storyDorin} contentFit="contain" />
            </BakeryOption>
          </View>
          <View style={styles.row}>
            <BakeryOption title="Chat with Papa Dorin" line="Ask him anything about the Bible" colors={bakeryCards.chat} index={2} clock={clock} onPress={() => router.push('/chat')}>
              <Image source={PAPA_DORIN} style={styles.chatDorin} contentFit="contain" />
              <Text style={styles.chatDots}>…</Text>
            </BakeryOption>
            <BakeryOption title="Order Ticket" line="No. 19:9 · Huge Order" colors={bakeryCards.ticket} index={3} clock={clock} onPress={() => router.push('/bakery/ticket')}>
              <Image source={require('../../../assets/images/icons/order-ticket.webp')} style={styles.artImage} contentFit="contain" />
            </BakeryOption>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: bakeryRoom.floor },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: bakeryRoom.bar, borderBottomWidth: 2, borderBottomColor: bakeryRoom.barLine },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontFamily: fonts.extraBold, fontSize: 19, color: bakeryRoom.barTitle },
  room: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  hello: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  dorinBox: { transformOrigin: '50% 100%' },
  dorin: { width: 52, height: 118 },
  bubble: {
    flex: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: bakeryRoom.bubble,
    borderWidth: 1.5,
    borderColor: bakeryRoom.bubbleEdge,
    boxShadow: `inset 0 1px 0 #ffffff, 0 0 0 1px ${bakeryRoom.bubbleRing}, 0 12px 24px -14px ${bakeryRoom.shadow}`,
  },
  bubbleText: { fontFamily: fonts.extraBold, fontSize: 15, lineHeight: 21, color: bakeryRoom.ink },
  grid: { flex: 1, gap: 12, maxHeight: 440, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flex: 1, flexDirection: 'row', gap: 12 },
  artImage: { width: '76%', height: '76%' },
  storyDorin: { position: 'absolute', right: 2, bottom: 2, width: 20, height: 40 },
  chatDorin: { width: 30, height: 62, marginTop: 8 },
  chatDots: { position: 'absolute', top: 6, right: 4, paddingHorizontal: 6, borderRadius: 10, borderBottomLeftRadius: 3, backgroundColor: bakeryRoom.bar, fontFamily: fonts.black, fontSize: 13, lineHeight: 16, color: bakeryCards.chat[1] },
});
