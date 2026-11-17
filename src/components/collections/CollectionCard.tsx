// One glass card on the Collections page: a title, a short note, a "See all" pill and a little animated scene,
// all tinted in the collection's color. It slides in when the page opens and a soft glow drifts across it.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { easeInOut, easeOutBack, mix, progress } from '@/components/common/motion';
import { collectionHues, glass, navy, text, type CollectionHue } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** How long a card takes to slide in, and the extra wait for each card after the first (ms). */
const ENTER_MS = 600;
const ENTER_STAGGER_MS = 90;

/** How long the glow takes to drift one way across the card (ms). It then drifts back. */
const ORB_DRIFT_MS = 9000;

/** The card layouts: a wide card with its pill beside the title, or a narrow one with the pill at the bottom. */
type CardLayout = 'wide' | 'narrow';

/** Props for a collection card. */
type CollectionCardProps = {
  /** The card's title, like "Bible verses". */
  title: string;
  /** One short line under the title. */
  note: string;
  /** The collection's accent color. */
  hue: CollectionHue;
  /** Wide (the full row) or narrow (half a row). */
  layout: CardLayout;
  /** The card's place on the page, which sets when it slides in. */
  index: number;
  /** The page's shared animation timer. */
  clock: AmbientClock;
  /** Opens the collection. */
  onPress: () => void;
  /** The card's animated scene. */
  children: ReactNode;
};

/** A tinted glass card for one collection. */
export function CollectionCard({ title, note, hue, layout, index, clock, onPress, children }: CollectionCardProps) {
  const c = collectionHues[hue];
  const { time, still } = clock;

  const enter = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ translateY: 0 }] };
    const t = progress(time.get(), index * ENTER_STAGGER_MS, ENTER_MS);
    return { opacity: t, transform: [{ translateY: mix(easeOutBack(t, 0.6), 14, 0) }] };
  });
  const orb = useAnimatedStyle(() => {
    const cycle = (time.get() / ORB_DRIFT_MS) % 2;
    const t = easeInOut(cycle < 1 ? cycle : 2 - cycle);
    return { transform: [{ translateX: -90 * t }, { translateY: 70 * t }, { scale: 1 + 0.25 * t }] };
  });

  const pill = (
    <View style={[styles.pill, { backgroundColor: c, boxShadow: `0 3px 0 ${mixColor(c, 0.55, '#000000')}, 0 6px 10px -2px rgba(0,0,0,0.4)` }]}>
      <Text style={styles.pillText}>See all</Text>
    </View>
  );
  const heading = (
    <View style={layout === 'wide' ? styles.headText : null}>
      <Text style={[styles.title, layout === 'narrow' && styles.titleNarrow]}>{title}</Text>
      <Text style={[styles.note, layout === 'narrow' && styles.noteNarrow]}>{note}</Text>
    </View>
  );

  return (
    <Animated.View style={[layout === 'narrow' && styles.narrowSlot, enter]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. See all`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          layout === 'narrow' && styles.cardNarrow,
          {
            backgroundImage: `linear-gradient(180deg, ${mixColor(c, 0.14, 'rgba(255,255,255,0.11)')} 0%, ${mixColor(c, 0.06, 'rgba(255,255,255,0.05)')} 55%, ${glass.cardBottom} 100%)`,
          },
          pressed && styles.pressed,
        ]}
      >
        <View pointerEvents="none" style={styles.sheen} />
        <Animated.View
          pointerEvents="none"
          style={[styles.orb, { backgroundImage: `radial-gradient(circle, ${mixColor(c, 0.32)} 0%, rgba(0,0,0,0) 65%)` }, orb]}
        />
        {layout === 'wide' ? (
          <View style={styles.headWide}>
            {heading}
            {pill}
          </View>
        ) : (
          <View style={styles.headNarrow}>{heading}</View>
        )}
        <View style={layout === 'narrow' ? styles.stageNarrow : styles.stage}>{children}</View>
        {layout === 'narrow' && <View style={styles.foot}>{pill}</View>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  narrowSlot: { flex: 1, minWidth: 0 },
  card: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: glass.cardBase,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 22px 34px -14px rgba(0,0,0,0.65)',
  },
  cardNarrow: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },
  sheen: {
    ...StyleSheet.absoluteFill,
    backgroundImage: 'radial-gradient(120% 70% at 15% 0%, rgba(255,255,255,0.13), rgba(255,255,255,0) 55%)',
  },
  orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -60, top: -80 },
  headWide: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: 16, paddingBottom: 4 },
  headText: { flex: 1 },
  headNarrow: { paddingHorizontal: 14, paddingTop: 14 },
  title: { fontFamily: fonts.black, fontSize: 20, lineHeight: 23, color: text.onDark },
  titleNarrow: { fontSize: 17, lineHeight: 20 },
  note: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18, marginTop: 3, color: 'rgba(255,255,255,0.75)' },
  noteNarrow: { fontSize: 12.5, lineHeight: 17 },
  pill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { fontFamily: fonts.black, fontSize: 13.5, color: navy },
  stage: { width: '100%' },
  // On a narrow card the scene fills the space left, so both narrow cards keep their pill at the same bottom spot.
  stageNarrow: { flexGrow: 1, minHeight: 96, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14 },
});
