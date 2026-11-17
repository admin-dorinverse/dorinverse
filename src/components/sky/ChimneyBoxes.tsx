// The cookie boxes that puff out of the bakery's chimney and drift off into space. Each box is a small picture
// the phone's compositor moves, spins and fades; nothing is redrawn. They sit behind the planet picture, so a box
// starts hidden inside the chimney and rises out of it.

import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BOX_WIDTH, CHIMNEY, PLANET_WIDTH, boxPose } from './bakeryLayout';
import { useSky } from './SkyProvider';

/** The eight cookie box pictures. */
const BOX_IMAGES = [
  require('../../../assets/images/boxes/box-0.webp'),
  require('../../../assets/images/boxes/box-1.webp'),
  require('../../../assets/images/boxes/box-2.webp'),
  require('../../../assets/images/boxes/box-3.webp'),
  require('../../../assets/images/boxes/box-4.webp'),
  require('../../../assets/images/boxes/box-5.webp'),
  require('../../../assets/images/boxes/box-6.webp'),
  require('../../../assets/images/boxes/box-7.webp'),
];

/** The box pictures are 132 by 110, so a box is this tall for its width. */
const BOX_HEIGHT = (BOX_WIDTH * 110) / 132;

/** How many boxes can be in the air at once. Matches the sky's limit. */
const SLOTS = 3;

/** Props for one box slot. */
type BoxSlotProps = {
  /** Which of the sky's in-flight boxes this slot shows. */
  index: number;
  /** Height of the planet picture, which places the chimney. */
  planetHeight: number;
};

/** One slot for a flying box. It shows whichever box the sky has in that slot, or nothing. */
function BoxSlot({ index, planetHeight }: BoxSlotProps) {
  const { sky, pulse } = useSky();
  const [kind, setKind] = useState(0);

  // Swaps the picture when a new box takes this slot. That happens while the box is still invisible.
  useAnimatedReaction(
    () => {
      pulse.get();
      const b = sky.get().chimneyBoxes[index];
      return b ? b.image : -1;
    },
    (image, previous) => {
      if (image >= 0 && image !== previous) scheduleOnRN(setKind, image);
    },
  );
  const pose = useAnimatedStyle(() => {
    const now = pulse.get();
    const b = sky.get().chimneyBoxes[index];
    if (!b) return { opacity: 0 };
    const p = boxPose(b, Math.min(1, (now - b.startedAt) / b.duration));
    return {
      opacity: p.opacity,
      transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: `${p.spin}deg` }, { scale: p.scale }],
    };
  });

  return (
    <Animated.View style={[styles.box, { left: PLANET_WIDTH * CHIMNEY.x - BOX_WIDTH / 2, top: planetHeight * CHIMNEY.y }, pose]}>
      <Image source={BOX_IMAGES[kind]} style={styles.picture} contentFit="contain" />
    </Animated.View>
  );
}

/** Props for the chimney boxes. */
type ChimneyBoxesProps = {
  /** Height of the planet picture, which places the chimney. */
  planetHeight: number;
};

/** The three box slots. */
export function ChimneyBoxes({ planetHeight }: ChimneyBoxesProps) {
  return (
    <>
      {Array.from({ length: SLOTS }, (_, i) => (
        <BoxSlot key={i} index={i} planetHeight={planetHeight} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: BOX_WIDTH, height: BOX_HEIGHT },
  picture: { width: BOX_WIDTH, height: BOX_HEIGHT },
});
