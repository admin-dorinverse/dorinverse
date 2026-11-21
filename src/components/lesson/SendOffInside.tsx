// The first half of sending a box off, inside Papa Dorin's Bakery: the kitchen wall and conveyor belt under the
// ceiling, and Papa Dorin with the baker's signed box on the floor below. The baker drags it up onto the belt; the belt carries it
// into the oven, which flashes, and it rises up the glass chimney into the ceiling. Each move plays once.

import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { bakeryRoom, kitchen } from '@/theme/bakeryColors';
import { fonts } from '@/theme/text';
import { BeltOver, beltSpots, KitchenWall } from './BeltScene';
import { BOX_H, BOX_W, CookieBox } from './CookieBox';

/** How fast the belt carries the box (points a second), and how long each part of the trip takes (ms). */
const BELT_SPEED = 90;
const SETTLE_MS = 260;
const SLIP_MS = 420;
const OVEN_MS = 900;
const UP_MS = 900;

/** Papa Dorin's height on the floor. */
const DORIN_H = 112;

/** How far down its picture the box's bottom edge is. */
const BOX_FOOT = 0.97;

/** Props for the inside half. */
type SendOffInsideProps = {
  /** The box picture in the constellation's color. */
  box: number;
  /** The baker's name and signature (empty when not signed). */
  bakerName: string;
  signature: string;
  /** Called once the box has gone up the chimney into the ceiling. */
  onUp: () => void;
  /** Leaves before sending. */
  onClose: () => void;
};

/** The kitchen, the belt and the box. */
export function SendOffInside({ box, bakerName, signature, onUp, onClose }: SendOffInsideProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const [placed, setPlaced] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ceilingTop = insets.top + 56;
  const belt = beltSpots(width, ceilingTop);
  const wallBottom = belt.top + belt.height;
  const big = Math.min(220, width * 0.56);
  const small = belt.height * 0.29;
  const dorinTop = wallBottom + 16;
  const home = { x: width / 2, y: dorinTop + DORIN_H + (height - dorinTop - DORIN_H - insets.bottom - 70) / 2 };
  const onBeltY = belt.surfaceY - small * (BOX_H / BOX_W) * (BOX_FOOT - 0.5);
  const tubeW = small * 0.75;
  const bx = useSharedValue(home.x);
  const by = useSharedValue(home.y);
  const bs = useSharedValue(1);
  const bo = useSharedValue(1);
  const up = useSharedValue(belt.chimneyBottom - belt.top);
  const upShown = useSharedValue(0);
  const start = useSharedValue({ x: 0, y: 0 });
  const flash = useSharedValue(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** The box is on the belt at `x`: the belt carries it into the oven and up the chimney, once. */
  const ride = (x: number) => {
    setPlaced(true);
    playSound('box');
    const d = (ms: number) => (still ? 0 : ms);
    const rideMs = d(((belt.mouthX - x) / BELT_SPEED) * 1000);
    const toOven = d(SETTLE_MS) + rideMs + d(SLIP_MS);
    bx.set(withSequence(withTiming(x, { duration: d(SETTLE_MS) }), withTiming(belt.mouthX, { duration: rideMs, easing: Easing.linear }), withTiming(belt.insideX, { duration: d(SLIP_MS) })));
    by.set(withTiming(onBeltY, { duration: d(SETTLE_MS) }));
    bs.set(withTiming(small / big, { duration: d(SETTLE_MS) }));
    bo.set(withDelay(d(SETTLE_MS) + rideMs, withTiming(0, { duration: d(SLIP_MS) })));
    flash.set(withDelay(toOven + d(150), withSequence(withTiming(1, { duration: d(220) }), withTiming(0, { duration: d(700) }))));
    upShown.set(withDelay(toOven + d(OVEN_MS), withTiming(1, { duration: 0 })));
    up.set(
      withDelay(
        toOven + d(OVEN_MS),
        withTiming(-tubeW * 1.2, { duration: d(UP_MS), easing: Easing.in(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(onUp);
        }),
      ),
    );
    timers.current.push(setTimeout(() => playSound('burn'), toOven + 150));
    timers.current.push(setTimeout(() => playSound('join'), toOven + d(OVEN_MS)));
  };

  const drag = usePanGesture({
    minDistance: 0,
    enabled: !placed,
    onBegin: () => {
      'worklet';
      start.set({ x: bx.get(), y: by.get() });
      bs.set(withTiming(1.05, { duration: 120 }));
    },
    onUpdate: (e) => {
      'worklet';
      bx.set(start.get().x + e.translationX);
      by.set(start.get().y + e.translationY);
    },
    onFinalize: () => {
      'worklet';
      const x = bx.get();
      const y = by.get();
      if (x > belt.dropLeft - big * 0.3 && x < belt.dropRight + big * 0.2 && y < belt.surfaceY + big * 0.45) {
        scheduleOnRN(ride, Math.min(belt.dropRight, Math.max(belt.dropLeft, x)));
      } else {
        bx.set(withTiming(home.x, { duration: 300 }));
        by.set(withTiming(home.y, { duration: 300 }));
        bs.set(withTiming(1, { duration: 300 }));
      }
    },
  });

  const boxStyle = useAnimatedStyle(() => ({ opacity: bo.get(), transform: [{ translateX: bx.get() }, { translateY: by.get() }, { scale: bs.get() }] }));
  const tubeStyle = useAnimatedStyle(() => ({ opacity: upShown.get(), transform: [{ translateY: up.get() }] }));

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { paddingTop: insets.top + 10, height: ceilingTop }]}>
        {!placed && (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={styles.back}>
            <Text style={styles.backText}>✕</Text>
          </Pressable>
        )}
        <Text style={styles.barTitle}>Send It Off</Text>
      </View>
      <KitchenWall width={width} ceilingTop={ceilingTop} spots={belt} />
      <View pointerEvents="none" style={[styles.hello, { top: dorinTop }]}>
        <Image source={PAPA_DORIN} style={{ width: (DORIN_H * 300) / 688, height: DORIN_H }} contentFit="contain" accessibilityLabel="Papa Dorin" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{placed ? 'There it goes! Up the chimney.' : 'Set it on the belt, baker. The oven does the rest.'}</Text>
        </View>
      </View>
      {!placed && <View pointerEvents="none" style={[styles.drop, { left: belt.dropLeft, top: belt.surfaceY - 30, width: belt.dropRight - belt.dropLeft }]} />}
      <View pointerEvents="none" style={[styles.tube, { top: belt.top, height: belt.height }]}>
        <Animated.View style={[{ position: 'absolute', left: belt.chimneyX - tubeW / 2, top: -(tubeW * BOX_H) / BOX_W / 2 }, tubeStyle]}>
          <CookieBox width={tubeW} box={box} bakerName={bakerName} signature={signature} />
        </Animated.View>
      </View>
      <GestureDetector gesture={drag}>
        <Animated.View style={[styles.box, { left: -big / 2, top: (-big * BOX_H) / BOX_W / 2 }, boxStyle]} accessibilityHint="Drag up onto the belt">
          <CookieBox width={big} box={box} bakerName={bakerName} signature={signature} />
        </Animated.View>
      </GestureDetector>
      <BeltOver spots={belt} flash={flash} />
      {!placed && (
        <View style={[styles.hint, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.hintText}>Drag your box up onto the belt</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Put the box on the belt" onPress={() => ride((belt.dropLeft + belt.dropRight) / 2)} hitSlop={8}>
            <Text style={styles.skip}>or tap here</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: bakeryRoom.floor },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, backgroundColor: bakeryRoom.bar },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: fonts.black, fontSize: 17, color: bakeryRoom.back },
  barTitle: { fontFamily: fonts.extraBold, fontSize: 19, color: bakeryRoom.barTitle },
  drop: { position: 'absolute', height: 36, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: kitchen.post },
  tube: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  box: { position: 'absolute' },
  hello: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10, maxWidth: 520 },
  bubble: {
    flex: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: bakeryRoom.bubble,
    borderWidth: 1.5,
    borderColor: bakeryRoom.bubbleEdge,
    boxShadow: `0 0 0 1px ${bakeryRoom.bubbleRing}, 0 12px 24px -14px ${bakeryRoom.shadow}`,
  },
  bubbleText: { fontFamily: fonts.extraBold, fontSize: 15, lineHeight: 21, color: bakeryRoom.ink },
  hint: { position: 'absolute', left: 18, right: 18, alignItems: 'center', gap: 2 },
  hintText: { fontFamily: fonts.extraBold, fontSize: 16, color: bakeryRoom.ink },
  skip: { fontFamily: fonts.bold, fontSize: 13, color: bakeryRoom.back, textDecorationLine: 'underline' },
});
