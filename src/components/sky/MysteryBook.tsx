// The red Clue Book in the dock, beside the bell: the way into the Weekly Word. While today's clue is waiting
// to be collected (or the word has just been revealed) its red glow pulses; otherwise it glows softly and holds still.
// The book is drawn once; the glow pulses with the star sky's slow timer, which rests when the app is in the background.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { wave } from '@/components/common/motion';
import { mystery } from '@/theme/mysteryColors';
import { chrome } from '@/theme/spacing';
import { useSky } from './SkyProvider';

/** How long one pulse of the glow takes while a clue is waiting (ms). */
const BOOK_PULSE_MS = 1600;

/** The book's drawn size: as tall as a dock picture, keeping the drawing's shape. */
const BOOK = { width: Math.round((chrome.dockIcon * 60) / 72), height: chrome.dockIcon } as const;

/** Radius of the red glow behind the book. It fits inside the dock button. */
const BOOK_GLOW = chrome.dockButton / 2 - 1;

/** The closed red book with gold trim and a gold question mark. */
const BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72"><defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mystery.cover[0]}"/><stop offset=".55" stop-color="${mystery.cover[1]}"/><stop offset="1" stop-color="${mystery.cover[2]}"/></linearGradient></defs><path d="M11 8 H53 a3 3 0 0 1 3 3 V67 a3 3 0 0 1 -3 3 H11 Z" fill="${mystery.pages}" stroke="${mystery.pagesEdge}" stroke-width="1"/><path d="M7 3 H48 a4 4 0 0 1 4 4 V61 a4 4 0 0 1 -4 4 H7 a3 3 0 0 1 -3 -3 V6 a3 3 0 0 1 3 -3 Z" fill="url(#c)" stroke="${mystery.coverEdge}" stroke-width="1.5"/><path d="M4 6 a3 3 0 0 1 3 -3 h5 v62 h-5 a3 3 0 0 1 -3 -3 Z" fill="${mystery.cover[2]}"/><rect x="17" y="9" width="29" height="50" rx="3" fill="none" stroke="${mystery.gold}" stroke-width="1.4" opacity=".85"/><path d="M25.5 27 a6.5 6.5 0 1 1 10 5.5 c-2.6 1.7 -3.6 3.2 -3.6 6.2" fill="none" stroke="${mystery.gold}" stroke-width="4" stroke-linecap="round"/><circle cx="31.9" cy="47.5" r="2.6" fill="${mystery.gold}"/></svg>`;

/** Props for the Clue Book picture. */
type MysteryBookProps = {
  /** True while today's clue is waiting or the word was just revealed: the glow and the book pulse. */
  calling: boolean;
};

/** The Clue Book picture for its dock button: the book over its red glow. The dock button handles the tap. */
export function MysteryBook({ calling }: MysteryBookProps) {
  const { sky, clock } = useSky();

  // The glow breathes only while the book is calling; the star sky's timer moves it 20 times a second.
  const glow = useAnimatedStyle(() => {
    const now = clock.get();
    if (!calling) return { opacity: 0.3, transform: [{ scale: 0.75 }] };
    const w = sky.get().reduceMotion ? 1 : wave(now, BOOK_PULSE_MS);
    return { opacity: 0.55 + 0.45 * w, transform: [{ scale: 0.85 + 0.15 * w }] };
  });
  const beat = useAnimatedStyle(() => {
    const now = clock.get();
    const w = calling && !sky.get().reduceMotion ? wave(now, BOOK_PULSE_MS) : 0;
    return { transform: [{ rotate: '-8deg' }, { scale: 1 + 0.08 * w }] };
  });

  return (
    <View style={styles.spot}>
      <Animated.View style={[styles.glow, glow]} />
      <Animated.View style={beat}>
        <SvgXml xml={BOOK_SVG} width={BOOK.width} height={BOOK.height} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A dock picture's square; the glow and the book are centered in it.
  spot: { width: chrome.dockIcon, height: chrome.dockIcon, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    left: chrome.dockIcon / 2 - BOOK_GLOW,
    top: chrome.dockIcon / 2 - BOOK_GLOW,
    width: BOOK_GLOW * 2,
    height: BOOK_GLOW * 2,
    borderRadius: BOOK_GLOW,
    backgroundImage: `radial-gradient(circle, ${mystery.glow} 0%, ${mystery.glowFade} 68%)`,
  },
});
