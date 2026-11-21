// The baker's packed cookie box: the app's cookie box picture in the constellation's color (the same boxes that ride
// the Bakery's conveyor belt), with a cream label saying "Baked by" and the baker's name, their signature under it
// when they signed, and Papa Dorin's "approved" seal, both laid flat on the box's front face. It is laid out at one
// size and scaled, so it looks the same big on the signing page and small on the belt.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn } from 'react-native-reanimated';
import { boxLabel } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import { SignatureInk } from './SignaturePad';

/** The size the box is laid out at before scaling (the box pictures are 132 by 110). */
export const BOX_W = 300;
export const BOX_H = 250;

/** Papa Dorin's seal. */
const SEAL = require('../../../assets/images/cookies/papa-dorin-approved.webp');

/** How the seal stamps down when it lands. */
const SEAL_IN = ZoomIn.delay(450).duration(380).easing(Easing.out(Easing.back(2.2)));

/**
 * The box front's slant: its sides stand straight and its top and bottom rise to the right, so the label and seal
 * are slanted the same way to lie flat on it.
 */
const FRONT_SLANT = '-11deg';

/** Props for the box. */
type CookieBoxProps = {
  /** How wide to show it. */
  width: number;
  /** The box picture in the constellation's color. */
  box: number;
  /** The baker's name. */
  bakerName: string;
  /** The signature's path, or empty when not signed. */
  signature: string;
  /** True to stamp the seal down as the box shows; false shows it already on. */
  stampNow?: boolean;
};

/** The packed, labeled and sealed box. */
export function CookieBox({ width, box, bakerName, signature, stampNow = false }: CookieBoxProps) {
  const scale = width / BOX_W;
  return (
    <View style={{ width, height: BOX_H * scale }} accessibilityLabel={`Your cookie box, baked by ${bakerName}${signature ? ', signed' : ''}, approved by Papa Dorin`}>
      <View style={[styles.drawn, { transform: [{ scale }] }]}>
        <Image source={box} style={StyleSheet.absoluteFill} contentFit="contain" />
        <View style={styles.front}>
          <View style={styles.label}>
            <Text style={styles.bakedBy}>Baked by</Text>
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
              {bakerName}
            </Text>
            {signature ? <SignatureInk path={signature} width={86} /> : null}
          </View>
          <Animated.View entering={stampNow ? SEAL_IN : undefined}>
            <Image source={SEAL} style={styles.seal} contentFit="contain" />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawn: { position: 'absolute', left: 0, top: 0, width: BOX_W, height: BOX_H, transformOrigin: 'top left' },
  front: {
    position: 'absolute',
    left: 108,
    top: 112,
    width: 172,
    height: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    transformOrigin: 'left top',
    transform: [{ skewY: FRONT_SLANT }],
  },
  label: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: boxLabel.edge,
    backgroundColor: boxLabel.card,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bakedBy: { fontFamily: fonts.black, fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', color: boxLabel.label },
  name: { fontFamily: fonts.black, fontSize: 17, color: boxLabel.ink },
  seal: { width: 62, height: 62 },
});
