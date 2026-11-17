// The Bible verses card's scene: the books the person has collected verses from stand on a glowing shelf.
// They rise into place, bob gently, and every few seconds slide one place along so each book takes a turn.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { clamp01, easeInOut, easeOutBack, loop, mix, progress, wave } from '@/components/common/motion';
import { collectionArt, collectionHues } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** Wait before the first slide, time between slides, and how long a slide takes (ms). */
const FIRST_SLIDE_MS = 2600;
const SLIDE_EVERY_MS = 3000;
const SLIDE_MS = 900;

/** How many books stand on the shelf at once, and the space from one to the next. */
const SHOWN = 4;
const BOOK_STEP = 54;
const BOOK_WIDTH = 46;

/** Books shown dimmed when fewer than four have been collected. */
const FILLERS = ['Genesis', 'Judges', 'Psalms', 'John', 'Exodus', 'Ruth', 'Matthew'];

/** One book on the shelf. */
type ShelfBook = { title: string; height: number; colors: readonly string[]; blank: boolean };

/** Picks a book's color and height from its name, so the same book always looks the same. */
function bookLook(title: string): { height: number; colors: readonly string[] } {
  let h = 7;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { colors: collectionArt.spines[h % 4], height: 122 + ((h >> 4) % 26) };
}

/** Which slide the shelf is on at `time`, and how far along that slide is (0 to 1). */
export function slideAt(time: number): { step: number; t: number } {
  'worklet';
  if (time < FIRST_SLIDE_MS) return { step: 0, t: 1 };
  const since = time - FIRST_SLIDE_MS;
  return { step: Math.floor(since / SLIDE_EVERY_MS) + 1, t: clamp01((since % SLIDE_EVERY_MS) / SLIDE_MS) };
}

/** Props for the shelf. */
type BookShelfProps = {
  /** Books with collected verses, newest first. */
  books: readonly string[];
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** The shelf of collected books. */
export function BookShelf({ books, clock }: BookShelfProps) {
  const glowColor = collectionHues.amber;
  const shelf: ShelfBook[] = books.map((title) => ({ title, ...bookLook(title), blank: false }));
  const fillers = FILLERS.filter((b) => !books.includes(b));
  for (let k = 0; shelf.length < SHOWN; k++) shelf.push({ title: fillers[k], ...bookLook(fillers[k]), colors: collectionArt.blankSpine, blank: true });
  const slides = books.length > 0;

  const breath = useAnimatedStyle(() => ({ opacity: mix(wave(clock.time.get(), 8000), 0.55, 1) }));

  return (
    <View style={styles.shelf}>
      <Animated.View
        style={[styles.glow, { backgroundImage: `radial-gradient(ellipse at 50% 100%, ${mixColor(glowColor, 0.38)} 0%, rgba(0,0,0,0) 65%)` }, breath]}
      />
      <View style={styles.row}>
        {shelf.map((book, i) => (
          <Book key={book.title} book={book} index={i} count={shelf.length} newest={slides && i === 0} slides={slides} clock={clock} ghost={false} />
        ))}
        {shelf.length === SHOWN &&
          shelf.map((book, i) => (
            <Book key={`${book.title}-leaving`} book={book} index={i} count={shelf.length} newest={false} slides={slides} clock={clock} ghost />
          ))}
      </View>
      <View style={[styles.board, { boxShadow: `0 0 18px ${mixColor(glowColor, 0.5)}, 0 8px 14px -6px rgba(0,0,0,0.7)` }]} />
    </View>
  );
}

/** Props for one book. */
type BookProps = {
  /** The book to draw. */
  book: ShelfBook;
  /** Its place in the shelf's list. */
  index: number;
  /** How many books take turns on the shelf. */
  count: number;
  /** True for the most recently collected book, which glows. */
  newest: boolean;
  /** True when the books take turns sliding along. */
  slides: boolean;
  /** The page's shared animation timer. */
  clock: AmbientClock;
  /**
   * With exactly four books, the book that slides off the right end is the same one that comes in on the left.
   * The ghost copy shows it leaving while the real one comes in.
   */
  ghost: boolean;
};

/** One book spine on the shelf. */
function Book({ book, index, count, newest, slides, clock, ghost }: BookProps) {
  const { time, still } = clock;

  // Where the book stands: its slot moves one place right on every slide, wrapping round to the left end.
  const place = useAnimatedStyle(() => {
    const { step, t } = slides && !still ? slideAt(time.get()) : { step: 0, t: 1 };
    const slot = (index + step) % count;
    const e = easeInOut(t);
    let from = slot === 0 && step > 0 ? -1 : slot - (step > 0 ? 1 : 0);
    let to = slot;
    let opacity = slot < SHOWN ? 1 : slot === SHOWN && step > 0 ? 1 - t : 0;
    if (slot === 0 && step > 0) opacity = clamp01(t / 0.9);
    if (ghost) {
      // The ghost only shows the leaving move of the book that just wrapped round.
      const leaving = slot === 0 && step > 0 && t < 1;
      from = SHOWN - 1;
      to = SHOWN;
      opacity = leaving ? 1 - t : 0;
    }
    return { opacity, transform: [{ translateX: -104 + mix(e, from, to) * BOOK_STEP }] };
  });
  // The first rise into place, then a gentle bob.
  const lift = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ translateY: 0 }, { scaleY: 1 }] };
    const now = time.get();
    const r = progress(now, 150 + index * 140, 800);
    const rise = ghost ? 1 : easeOutBack(r, 1.6);
    const bob = -3 * wave(now, 5000, index * 1200);
    return { opacity: ghost ? 1 : clamp01(r * 2), transform: [{ translateY: mix(rise, 40, 0) + bob }, { scaleY: mix(rise, 0.5, 1) }] };
  });
  // A soft shine that sweeps down the spine now and then.
  const shine = useAnimatedStyle(() => {
    const p = loop(time.get(), 6000, 1500 + index * 250);
    const sweep = clamp01((p - 0.7) / 0.2);
    return { transform: [{ translateY: mix(sweep, -1.5, 3.2) * book.height * 0.4 }] };
  });

  const [c1, c2] = book.colors;
  return (
    <Animated.View style={[styles.slot, place]}>
      <Animated.View style={[styles.lift, lift]}>
        {newest && <Motes clock={clock} />}
        <View
          style={[
            styles.spine,
            {
              height: book.height,
              backgroundImage: `linear-gradient(90deg, ${c2} 0%, ${c1} 30%, ${c1} 70%, ${c2} 100%)`,
            },
            newest && { marginBottom: 6, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.5), 0 0 22px ${mixColor(c1, 0.8)}, 0 14px 20px -8px rgba(0,0,0,0.6)` },
          ]}
        >
          <View style={[styles.band, styles.bandTop]} />
          <View style={[styles.band, styles.bandBottom]} />
          <View style={[styles.titleBox, { width: book.height - 34 }]}>
            <Text numberOfLines={1} style={styles.title}>
              {book.title}
            </Text>
          </View>
          <View style={styles.shineClip} pointerEvents="none">
            <Animated.View style={[styles.shine, { height: book.height * 0.4 }, shine]} />
          </View>
          {book.blank && <View style={styles.dim} />}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Sparks that drift up from the newest book. */
function Motes({ clock }: { clock: AmbientClock }) {
  return (
    <>
      {[
        [30, 0],
        [62, 1100],
        [46, 2200],
      ].map(([x, delay]) => (
        <Mote key={x} x={x} delay={delay} clock={clock} />
      ))}
    </>
  );
}

/** One rising spark, `x` percent across the book. */
function Mote({ x, delay, clock }: { x: number; delay: number; clock: AmbientClock }) {
  const style = useAnimatedStyle(() => {
    if (clock.still) return { opacity: 0 };
    const p = loop(clock.time.get(), 3300, delay);
    const opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
    return { opacity: clock.time.get() < delay ? 0 : opacity, transform: [{ translateX: 6 * p }, { translateY: -58 * easeOutBack(p, 0) }, { scale: mix(p, 0.6, 1.1) / 1.1 }] };
  });
  return <Animated.View style={[styles.mote, { left: `${x}%` }, style]} />;
}

const styles = StyleSheet.create({
  shelf: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16 },
  glow: { position: 'absolute', left: '50%', bottom: 22, width: 300, height: 180, marginLeft: -150 },
  row: { height: 200, marginTop: -34, overflow: 'hidden' },
  slot: { position: 'absolute', left: '50%', bottom: 0, width: BOOK_WIDTH, height: '100%', justifyContent: 'flex-end' },
  lift: { transformOrigin: '50% 100%' },
  spine: {
    width: BOOK_WIDTH,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 8px 0 -4px rgba(255,255,255,0.35), 0 10px 16px -8px rgba(0,0,0,0.6)',
  },
  band: { position: 'absolute', left: 6, right: 6, height: 3, borderRadius: 2, backgroundColor: 'rgba(58,38,6,0.35)' },
  bandTop: { top: 12 },
  bandBottom: { bottom: 12 },
  titleBox: { height: BOOK_WIDTH, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-90deg' }] },
  title: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 0.5, color: collectionArt.spineInk },
  shineClip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  shine: {
    position: 'absolute',
    left: '-30%',
    right: '-30%',
    top: 0,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,12,4,0.24)' },
  mote: {
    position: 'absolute',
    bottom: '100%',
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    boxShadow: '0 0 6px #ffd27a, 0 0 12px #ffc65c',
  },
  board: {
    height: 10,
    marginHorizontal: 8,
    borderRadius: 5,
    backgroundImage: `linear-gradient(180deg, ${collectionArt.shelfTop}, ${collectionArt.shelfBottom})`,
  },
});
