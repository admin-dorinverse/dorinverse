// The red Clue Book floating beside the bakery planet: the way into the Weekly Word. While today's clue is waiting
// to be collected (or the word has just been revealed) its red glow pulses; otherwise it glows softly and holds still. The book is
// drawn once; the phone's compositor slides, bobs and fades it. The glow pulses with the star sky's slow timer.

import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { wave } from '@/components/common/motion';
import { useMysteryWeek } from '@/data/mysterySource';
import { mystery } from '@/theme/mysteryColors';
import { BOOK, BOOK_GLOW, BOOK_PULSE_MS, bookFloat } from './mysteryBookLayout';
import { useSky } from './SkyProvider';

/** The closed red book with gold trim and a gold question mark. */
const BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72"><defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mystery.cover[0]}"/><stop offset=".55" stop-color="${mystery.cover[1]}"/><stop offset="1" stop-color="${mystery.cover[2]}"/></linearGradient></defs><path d="M11 8 H53 a3 3 0 0 1 3 3 V67 a3 3 0 0 1 -3 3 H11 Z" fill="${mystery.pages}" stroke="${mystery.pagesEdge}" stroke-width="1"/><path d="M7 3 H48 a4 4 0 0 1 4 4 V61 a4 4 0 0 1 -4 4 H7 a3 3 0 0 1 -3 -3 V6 a3 3 0 0 1 3 -3 Z" fill="url(#c)" stroke="${mystery.coverEdge}" stroke-width="1.5"/><path d="M4 6 a3 3 0 0 1 3 -3 h5 v62 h-5 a3 3 0 0 1 -3 -3 Z" fill="${mystery.cover[2]}"/><rect x="17" y="9" width="29" height="50" rx="3" fill="none" stroke="${mystery.gold}" stroke-width="1.4" opacity=".85"/><path d="M25.5 27 a6.5 6.5 0 1 1 10 5.5 c-2.6 1.7 -3.6 3.2 -3.6 6.2" fill="none" stroke="${mystery.gold}" stroke-width="4" stroke-linecap="round"/><circle cx="31.9" cy="47.5" r="2.6" fill="${mystery.gold}"/></svg>`;

/** The Clue Book in the sky. Place it over the sky canvas, with the planet. Taps are handled by the sky itself. */
export function MysteryBook() {
  const { sky, pulse, clock } = useSky();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const calling = useMysteryWeek().hasNews;

  // Follows the camera: a screen-sized box that slides opposite to the camera, like the planet's.
  const place = useAnimatedStyle(() => {
    pulse.get();
    const s = sky.get();
    return { opacity: s.worldShown, transform: [{ translateX: -s.camera.x }, { translateY: -s.camera.y }] };
  });
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: bookFloat(pulse.get() / 1000, sky.get().reduceMotion) }] }));
  // The glow breathes only while the book is calling; the star sky's timer moves it 20 times a second.
  const glow = useAnimatedStyle(() => {
    const now = clock.get();
    if (!calling) return { opacity: 0.3, transform: [{ scale: 0.75 }] };
    const w = sky.get().reduceMotion ? 1 : wave(now, BOOK_PULSE_MS);
    return { opacity: 0.55 + 0.45 * w, transform: [{ scale: 0.85 + 0.3 * w }] };
  });
  const beat = useAnimatedStyle(() => {
    const now = clock.get();
    const w = calling && !sky.get().reduceMotion ? wave(now, BOOK_PULSE_MS) : 0;
    return { transform: [{ rotate: '-8deg' }, { scale: 1 + 0.08 * w }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, place]}>
      <Animated.View style={[styles.spot, { left: screenW / 2 + BOOK.x, top: screenH / 2 + BOOK.y }, float]}>
        <Animated.View style={[styles.glow, glow]} />
        <Animated.View style={[styles.book, beat]}>
          <SvgXml xml={BOOK_SVG} width={BOOK.width} height={BOOK.height} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A point in the sky; the glow and the book are centered on it.
  spot: { position: 'absolute', width: 0, height: 0 },
  glow: {
    position: 'absolute',
    left: -BOOK_GLOW,
    top: -BOOK_GLOW,
    width: BOOK_GLOW * 2,
    height: BOOK_GLOW * 2,
    borderRadius: BOOK_GLOW,
    backgroundImage: `radial-gradient(circle, ${mystery.glow} 0%, ${mystery.glowFade} 68%)`,
  },
  book: { position: 'absolute', left: -BOOK.width / 2, top: -BOOK.height / 2, width: BOOK.width, height: BOOK.height },
});
