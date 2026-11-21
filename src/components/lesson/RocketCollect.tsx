// Once every stop is baked, the baker's rocket flies in at the bottom of the orbit view. Dragging anywhere moves it
// with the finger and a flick sends it gliding; it springs just behind, turns the way it goes, and leaves a glowing
// ember trail like the home sky's rocket. Passing over a cookie takes it in: the cookie slides into the rocket, which gives
// a little gulp. Once all are in, it waits in the scene; heading back to the Bakery blasts it off the screen. It
// moves on the page's shared timer: 60 times a second while it flies, 20 at rest, and not at all when hidden.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import type { CookieArt } from '@/components/common/cookieArt';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { BODY_SVG, FLAME_ORIGIN, FLAME_SVG, ROCKET_BOX } from '@/components/sky/rocketSvg';
import { text } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { dragFlight, flickFlight, flightBusy, holdFlight, newFlight, stepFlight, type OrbitFlight } from './orbitRocketFlight';
import { RocketTrail } from './RocketTrail';
import { SwallowedCookie } from './SwallowedCookie';
import { useOrbitLayout } from './useOrbitLayout';

/** How close the rocket's middle must come to a cookie's middle to take it, as a share of the cookie size. */
const REACH = 0.6;

/** How long the rocket waits before flying in, so the last cookie's bake bounce finishes first. */
const ARRIVE_AFTER_MS = 800;

/** Props for the rocket. */
type RocketCollectProps = {
  /** How many stops the lesson has. */
  stopCount: number;
  /** The stops (by place, from 0) already taken in. */
  collected: ReadonlySet<number>;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** Called when the rocket takes a cookie. */
  onCollect: (index: number) => void;
  /** Called once the last cookie is inside. */
  onAllIn: () => void;
  /** True to fly the rocket off the screen, toward the Bakery. */
  leaving: boolean;
  /** Called once it is off the screen. */
  onGone: () => void;
};

/** The rocket, its trail, its hint, and the cookies going in. */
export function RocketCollect({ stopCount, collected, art, onCollect, onAllIn, leaving, onGone }: RocketCollectProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useOrbitLayout(stopCount);
  const [going, setGoing] = useState<number[]>([]);
  const home = { x: width * 0.22, y: height - insets.bottom - 200 };
  const flight = useSharedValue<OrbitFlight>(newFlight(home.x, height + 140, home.x, height + 140));
  const rocketX = useSharedValue(home.x);
  const rocketY = useSharedValue(height + 140);
  const gulp = useSharedValue(1);
  const gone = useSharedValue(false);
  // The finger's speed at its last move, for a flick when it lets go.
  const fingerSpeed = useSharedValue({ x: 0, y: 0 });
  const taken = useSharedValue<number[]>([...collected]);
  const spots = layout.nodes.map((n) => ({ x: n.x, y: n.y }));
  const reach = layout.size * REACH;
  const edges = { left: 30, right: width - 30, top: insets.top + 70, bottom: height - insets.bottom - 70 };

  /** Fast while the rocket flies, calm at rest. */
  const isBusy = () => {
    'worklet';
    return flightBusy(flight.get());
  };
  const clock = useAmbientClock(isBusy);

  /** Moves the rocket to its spot at once: for phones set to less motion, where the timer never ticks. */
  const jump = (f: OrbitFlight) => {
    'worklet';
    f.x = f.tx;
    f.y = f.ty;
    rocketX.set(f.x);
    rocketY.set(f.y);
  };

  // The rocket flies up into place once.
  useEffect(() => {
    const t = setTimeout(() => {
      playSound('route');
      scheduleOnUI(() => {
        'worklet';
        const f = flight.get();
        f.tx = home.x;
        f.ty = home.y;
        if (clock.still) jump(f);
      });
    }, ARRIVE_AFTER_MS);
    return () => clearTimeout(t);
    // Runs once, when the rocket first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heading back: the rocket blasts off up and to the right, off the screen, once.
  useEffect(() => {
    if (!leaving) return;
    playSound('join');
    scheduleOnUI(() => {
      'worklet';
      const f = flight.get();
      f.leaving = true;
      f.tx = width + 220;
      f.ty = -260;
      if (clock.still) scheduleOnRN(onGone);
    });
    // Runs once, when the baker heads back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  /** Takes cookie `index` if the rocket at (x, y) is over it. */
  const reachCookies = (x: number, y: number) => {
    'worklet';
    const done = taken.get();
    for (let i = 0; i < spots.length; i++) {
      if (done.includes(i) || Math.hypot(spots[i].x - x, spots[i].y - y) >= reach) continue;
      taken.set([...done, i]);
      scheduleOnRN(take, i);
      return;
    }
  };

  // Each tick: the rocket flies a step, takes any cookie it passes over, and says when it has left the screen.
  useAnimatedReaction(
    () => clock.time.get(),
    (now, before) => {
      if (before === null) return;
      const dt = Math.min(0.05, Math.max(0, (now - before) / 1000));
      if (dt === 0) return;
      const f = flight.get();
      stepFlight(f, now, dt, edges);
      rocketX.set(f.x);
      rocketY.set(f.y + f.bob);
      if (!f.leaving) reachCookies(f.x, f.y);
      else if (!gone.get() && (f.y < -150 || f.x > width + 120)) {
        gone.set(true);
        scheduleOnRN(onGone);
      }
    },
  );

  /** The rocket took a cookie: it leaves the orbit and slides into the rocket. */
  function take(index: number) {
    playSound('collect');
    onCollect(index);
    setGoing((g) => [...g, index]);
  }

  /** A cookie is inside: the rocket gulps, and after the last one the way back to the Bakery shows. */
  const inside = (index: number) => {
    gulp.set(withSequence(withTiming(1.22, { duration: 110 }), withTiming(1, { duration: 240 })));
    setGoing((g) => g.filter((i) => i !== index));
    if (taken.get().length >= stopCount) {
      playSound('ding');
      setTimeout(onAllIn, 450);
    }
  };

  /** For screen readers, where dragging is not possible: the rocket takes every cookie left. */
  const collectAll = () => {
    const left = spots.map((_, i) => i).filter((i) => !taken.get().includes(i));
    taken.set([...taken.get(), ...left]);
    left.forEach(take);
  };

  const fly = usePanGesture({
    minDistance: 0,
    maxPointers: 1,
    enabled: !leaving,
    onBegin: () => {
      'worklet';
      holdFlight(flight.get());
    },
    onUpdate: (e) => {
      'worklet';
      const f = flight.get();
      dragFlight(f, e.changeX, e.changeY, edges);
      fingerSpeed.set({ x: e.velocityX, y: e.velocityY });
      if (clock.still) {
        jump(f);
        reachCookies(f.x, f.y);
      }
    },
    onFinalize: () => {
      'worklet';
      const v = fingerSpeed.get();
      flickFlight(flight.get(), clock.still ? 0 : v.x, clock.still ? 0 : v.y);
      fingerSpeed.set({ x: 0, y: 0 });
    },
  });

  const rocket = useAnimatedStyle(() => {
    clock.time.get();
    const f = flight.get();
    return { transform: [{ translateX: rocketX.get() }, { translateY: rocketY.get() }, { rotate: `${f.rotation}deg` }, { scale: gulp.get() }] };
  });
  // The flame flickers like the home sky's rocket, and grows longer as the rocket speeds up.
  const flame = useAnimatedStyle(() => {
    const now = clock.time.get();
    const speed = flight.get().speed;
    const flicker = clock.still ? 0 : (Math.sin((now / 90) * Math.PI) + 1) / 2;
    const grow = Math.min(1.9, 1 + speed / 900);
    const widen = Math.min(1.2, 1 + speed / 2500);
    return { transform: [{ scaleX: widen * (1 - 0.08 * flicker) }, { scaleY: grow * (1 + 0.12 * flicker) }] };
  });

  return (
    <GestureDetector gesture={fly}>
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Collect the cookies with your rocket"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={collectAll}
      >
        <RocketTrail flight={flight} time={clock.time} />
        {going.map((i) => (
          <SwallowedCookie key={i} source={art.baked} size={layout.size} fromX={spots[i].x} fromY={spots[i].y} toX={rocketX} toY={rocketY} onIn={() => inside(i)} />
        ))}
        <Animated.View pointerEvents="none" style={[styles.rocket, rocket]} accessibilityLabel="Your rocket">
          <Animated.View style={[StyleSheet.absoluteFill, styles.flame, flame]}>
            <SvgXml xml={FLAME_SVG} width={ROCKET_BOX.width} height={ROCKET_BOX.height} />
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            <SvgXml xml={BODY_SVG} width={ROCKET_BOX.width} height={ROCKET_BOX.height} />
          </View>
        </Animated.View>
        {collected.size < stopCount && (
          <View pointerEvents="none" style={[styles.hintWrap, { bottom: insets.bottom + 22 }]}>
            <GlassSurface style={styles.hint}>
              <Text style={styles.hintText}>Drag your rocket over the cookies to collect them</Text>
            </GlassSurface>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rocket: { position: 'absolute', left: -ROCKET_BOX.width / 2, top: -ROCKET_BOX.height / 2, width: ROCKET_BOX.width, height: ROCKET_BOX.height },
  flame: { transformOrigin: FLAME_ORIGIN },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: { borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18 },
  hintText: { fontFamily: fonts.extraBold, fontSize: 15, color: text.onDark, textAlign: 'center' },
});
