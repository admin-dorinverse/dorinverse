// The Games area in the sky: two glass cards, Cookie Box Trivia and Verse Games, side by side in a dotted frame
// under a glowing "Games" name. Nothing on it moves except the whole area sliding with the camera; taps reach the
// cards through the sky's tap check (see skyTap.ts).

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { collectionHues, glass, navy, sky as skyColors, text } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { fonts, textStyles } from '@/theme/text';
import { GAME_BOXES, GAMES_FRAME, GAMES_ZONE, SKY_GAMES, gamesOnScreen, type SkyGame } from './gamesZone';
import { useSky } from './SkyProvider';

/** Width of the box the area's name is centered in, and its height. */
const TITLE_W = 300;
const TITLE_H = 44;

/** One game card. */
function GameCard({ game }: { game: SkyGame }) {
  const c = collectionHues[game.hue];
  return (
    <View style={[styles.card, { backgroundImage: `linear-gradient(180deg, ${mixColor(c, 0.16, 'rgba(255,255,255,0.11)')} 0%, ${glass.cardBottom} 100%)` }]}>
      <View style={styles.art}>
        {game.game === 'trivia' ? (
          <Image source={require('../../../assets/images/boxes/box-gold.webp')} style={styles.box} contentFit="contain" />
        ) : (
          <Text style={styles.emoji}>🧩</Text>
        )}
      </View>
      <Text style={styles.title}>{game.title}</Text>
      <Text style={styles.note}>{game.note}</Text>
      <View style={[styles.pill, { backgroundColor: c, boxShadow: `0 3px 0 ${mixColor(c, 0.55, '#000000')}` }]}>
        <Text style={styles.pillText}>Play</Text>
      </View>
    </View>
  );
}

/** The Games area. Place it over the sky canvas, under the rocket. */
export function SkyGames() {
  const { sky, pulse } = useSky();

  // Follows the camera: the sky's (0, 0) spot, slid to where it is on screen. Hidden while far off screen.
  const place = useAnimatedStyle(() => {
    pulse.get();
    const s = sky.get();
    return {
      opacity: gamesOnScreen(s.camera.x, s.camera.y, s.width, s.height) ? s.worldShown : 0,
      transform: [{ translateX: s.width / 2 - s.camera.x }, { translateY: s.height / 2 - s.camera.y }],
    };
  });

  const f = GAMES_FRAME;
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, place]}>
      <Text style={[textStyles.tabTitle, styles.areaName, { left: GAMES_ZONE.x - TITLE_W / 2, top: f.y - TITLE_H - 10 }]}>Games</Text>
      <View style={[styles.frame, { left: f.x, top: f.y, width: f.w, height: f.h }]} />
      {SKY_GAMES.map((game, i) => (
        <View key={game.game} style={[styles.slot, { left: GAME_BOXES[i].x, top: GAME_BOXES[i].y, width: GAME_BOXES[i].w, height: GAME_BOXES[i].h }]}>
          <GameCard game={game} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' },
  areaName: {
    position: 'absolute',
    width: TITLE_W,
    height: TITLE_H,
    textAlign: 'center',
    color: text.onDark,
    textShadowColor: skyColors.collectionsGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  frame: { position: 'absolute', borderRadius: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: skyColors.collectionsEdge },
  slot: { position: 'absolute' },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 14,
    backgroundColor: glass.cardBase,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 28px -14px rgba(0,0,0,0.65)',
  },
  art: { height: 66, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  box: { width: 64, height: 64 },
  emoji: { fontSize: 46, lineHeight: 60 },
  title: { fontFamily: fonts.black, fontSize: 16, lineHeight: 19, color: text.onDark },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, marginTop: 3, color: 'rgba(255,255,255,0.75)' },
  pill: { position: 'absolute', left: 14, bottom: 14, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  pillText: { fontFamily: fonts.black, fontSize: 13, color: navy },
});
