// The Characters card's scene: the newest characters the person has met, dealt like collectible cards.
// They take turns stepping to the front, and a "Who's next?" card fills any empty spot.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { clamp01, easeOutBack, mix, progress } from '@/components/common/motion';
import { collectionArt, collectionHues } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { CollectedCharacter } from '@/types/collection';

/** Time between turns, and how long a turn takes (ms). */
const TURN_EVERY_MS = 3400;
const TURN_MS = 800;

/**
 * Where a card can stand: in front, or tucked behind on the left or right. The front card shows at full size;
 * cards are never enlarged past the size they are drawn at, which would make them blurry.
 */
const SPOTS = {
  front: { x: 0, y: -4, turn: 0, scale: 1, dim: 0 },
  left: { x: -82, y: 10, turn: -13, scale: 0.83, dim: 0.28 },
  right: { x: 82, y: 10, turn: 13, scale: 0.83, dim: 0.28 },
} as const;

/** A spot's name. */
type SpotName = keyof typeof SPOTS;

/** The spots the real cards take turns in, by how many real cards there are. */
const TURN_ORDER: SpotName[] = ['front', 'left', 'right'];

/** Which turn the fan is on at `time` (0 before the first turn) and how far along that turn is (0 to 1). */
function turnAt(time: number, count: number): { turn: number; t: number; since: number } {
  'worklet';
  if (count < 2 || time < TURN_EVERY_MS) return { turn: 0, t: 1, since: time };
  const since = time % TURN_EVERY_MS;
  return { turn: Math.floor(time / TURN_EVERY_MS), t: clamp01(since / TURN_MS), since };
}

/** The spot a card stands in on a turn, counting back through the order each turn. */
function spotOn(spots: readonly SpotName[], index: number, turn: number): SpotName {
  'worklet';
  const n = spots.length;
  return spots[(((index - turn) % n) + n) % n];
}

/** Props for the card fan. */
type CharacterFanProps = {
  /** Characters met, oldest first. The newest three are shown. */
  characters: readonly CollectedCharacter[];
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** The fan of character cards. */
export function CharacterFan({ characters, clock }: CharacterFanProps) {
  const shown = characters.slice(-3).reverse();
  const turnSpots = TURN_ORDER.slice(0, Math.max(1, shown.length));
  const restSpots = TURN_ORDER.filter((s) => !turnSpots.includes(s));
  // Which card is on top changes once a turn, so it is kept in React (a re-render every few seconds),
  // never changed from inside the animation, which would redo the page layout on every tick.
  const [turn, setTurn] = useState(0);
  useAnimatedReaction(
    () => (clock.still ? 0 : turnAt(clock.time.get(), turnSpots.length).turn),
    (now, before) => {
      if (now !== before) scheduleOnRN(setTurn, now);
    },
  );
  const layer = (spot: SpotName) => (spot === 'front' ? 3 : spot === 'right' ? 2 : 1);
  return (
    <View style={styles.fan}>
      {restSpots.map((spot, i) => (
        <FanCard key={spot} index={shown.length + i} spots={[spot]} layer={layer(spot)} clock={clock} />
      ))}
      {shown.map((c, i) => (
        <FanCard key={c.name} index={i} character={c} isNew={i === 0} spots={turnSpots} layer={layer(spotOn(turnSpots, i, turn))} clock={clock} />
      ))}
    </View>
  );
}

/** Props for one card. */
type FanCardProps = {
  /** The card's place in the deal, which sets when it comes in and where it starts. */
  index: number;
  /** The character on the card, or none for a "Who's next?" card. */
  character?: CollectedCharacter;
  /** True for the newest character, which gets a NEW badge. */
  isNew?: boolean;
  /** The spots this card takes turns in. A "Who's next?" card stays in one spot. */
  spots: readonly SpotName[];
  /** Which card is drawn on top: 3 in front, then 2 and 1 behind. */
  layer: number;
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** One card in the fan. */
function FanCard({ index, character, isNew = false, spots, layer, clock }: FanCardProps) {
  const { time, still } = clock;

  // Each turn, every card moves one spot back through the order (left to front, front to right, and so on).
  const pose = useAnimatedStyle(() => {
    const now = still ? 0 : time.get();
    const { turn, t } = turnAt(now, spots.length);
    const at = SPOTS[spotOn(spots, index, turn)];
    const was = SPOTS[spotOn(spots, index, Math.max(0, turn - 1))];
    const e = easeOutBack(t, 1.25);
    const deal = still ? 1 : progress(now, 150 + index * 180, 700);
    const d = easeOutBack(deal, 1.3);
    return {
      opacity: still ? 1 : clamp01(deal * 1.5),
      transform: [
        { translateX: mix(e, was.x, at.x) },
        { translateY: mix(e, was.y, at.y) + mix(d, 40, 0) },
        { rotate: `${mix(e, was.turn, at.turn)}deg` },
        { scale: mix(e, was.scale, at.scale) * mix(d, 0.6, 1) },
      ],
    };
  });
  const dim = useAnimatedStyle(() => {
    const { turn, t } = turnAt(still ? 0 : time.get(), spots.length);
    const at = SPOTS[spotOn(spots, index, turn)];
    const was = SPOTS[spotOn(spots, index, Math.max(0, turn - 1))];
    return { opacity: mix(t, was.dim, at.dim) };
  });
  // The shine sweeps across a card as it reaches the front.
  const shine = useAnimatedStyle(() => {
    const { turn, since } = turnAt(still ? 0 : time.get(), spots.length);
    const p = spotOn(spots, index, turn) === 'front' && !still ? progress(since, 350, 1100) : 0;
    return { transform: [{ translateX: mix(p, -100, 190) }, { skewX: '-18deg' }] };
  });

  return (
    <Animated.View style={[styles.card, character ? styles.cardFront : styles.cardBack, { zIndex: layer }, pose]}>
      {character ? (
        <>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{character.initial}</Text>
          </View>
          <Text style={styles.name}>{character.name}</Text>
          <Text style={styles.mentions} numberOfLines={1} adjustsFontSizeToFit>
            Met in {character.reference}
          </Text>
          {isNew && <Text style={styles.newTag}>NEW</Text>}
        </>
      ) : (
        <>
          <Text style={styles.question}>?</Text>
          <Text style={[styles.name, styles.nameBack]}>Who’s next?</Text>
          <Text style={[styles.reference, styles.referenceBack]}>Keep baking</Text>
        </>
      )}
      <Animated.View pointerEvents="none" style={[styles.shine, shine]} />
      <Animated.View pointerEvents="none" style={[styles.dim, dim]} />
    </Animated.View>
  );
}

const [front1, front2, front3] = collectionArt.cardFront;
const [back1, back2] = collectionArt.cardBack;
const berry = collectionHues.berry;

const styles = StyleSheet.create({
  fan: { height: 176, marginTop: 6, marginBottom: 10 },
  card: {
    position: 'absolute',
    left: '50%',
    top: 8,
    width: 119,
    height: 159,
    marginLeft: -59.5,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
    borderWidth: 2,
  },
  cardFront: {
    backgroundImage: `linear-gradient(160deg, ${front1} 0%, ${front2} 45%, ${front3} 100%)`,
    borderColor: 'rgba(255,255,255,0.55)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 14px 24px -10px rgba(0,0,0,0.7)',
  },
  cardBack: {
    backgroundImage: `linear-gradient(160deg, ${back1}, ${back2})`,
    borderColor: 'rgba(255,125,156,0.6)',
    borderStyle: 'dashed',
  },
  badge: {
    width: 59,
    height: 59,
    borderRadius: 29.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundImage: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.45), rgba(255,255,255,0.08) 60%)',
  },
  badgeText: { fontFamily: fonts.black, fontSize: 27.5, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  name: { fontFamily: fonts.black, fontSize: 17, lineHeight: 19, color: '#ffffff' },
  nameBack: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  reference: { fontFamily: fonts.extraBold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  referenceBack: { color: 'rgba(255,255,255,0.5)' },
  mentions: {
    fontFamily: fonts.black,
    fontSize: 11,
    color: collectionArt.cardInk,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 5,
  },
  newTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontFamily: fonts.black,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: collectionArt.cardInk,
    backgroundColor: collectionArt.newBadge,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  question: { fontFamily: fonts.black, fontSize: 42, lineHeight: 49, color: 'rgba(255,125,156,0.85)', textShadowColor: berry, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 }, marginBottom: 4 },
  shine: {
    position: 'absolute',
    top: '-20%',
    bottom: '-20%',
    left: 0,
    width: 59,
    backgroundImage: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))',
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: '#140812' },
});
