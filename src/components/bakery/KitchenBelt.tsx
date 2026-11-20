// The kitchen conveyor belt across the top of Papa Dorin's Bakery, as in the Constellations design: cookie boxes ride
// the belt into the oven, the oven mouth flashes, and each box shoots up the glass chimney. The belt's treads slide
// and the oven glows. It is one Skia canvas drawn 20 times a second from the page's shared timer, so it rests when
// the page is hidden; box spots are worked out from the time, so nothing is stored between frames.

import { Canvas, Picture, Skia, TileMode, createPicture, useImage, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { beltSide, kitchen } from '@/theme/bakeryColors';

/** The belt's height, the ceiling beam's height, and the belt picture's spot from the top and right. */
export const BELT_H = 100;
const CEILING = 9;
const ART_TOP = 11;
const ART_RIGHT = 6;

/** The belt picture's size in pixels, which all its spots below are measured in. */
const ART_PX_W = 1327;
const ART_PX_H = 684;

/** Belt speed in points a second, and how long a box spends in the oven and going up the chimney (ms). */
const SPEED = 64;
const IN_OVEN_MS = 1150;
const UP_MS = 620;

/** Average time between boxes (ms), and the box's size. */
const EVERY_MS = 2350;
const BOX_W = 26;
const BOX_H = 24;

/** The page's timer only needs 20 ticks a second for the belt. */
function calm(): boolean {
  'worklet';
  return false;
}

/** A steady pseudo-random number (0 to 1) for box number `n`, so each box always looks and times the same. */
function hash(n: number): number {
  'worklet';
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Draws a part of the belt picture over itself: the post and the glass chimney that boxes pass behind. */
function drawCut(canvas: SkCanvas, image: SkImage, ax: number, ay: number, k: number, fx: number, fy: number, fw: number, fh: number, alpha: number): void {
  'worklet';
  const paint = Skia.Paint();
  paint.setAlphaf(alpha);
  const src = Skia.XYWHRect(fx * ART_PX_W, fy * ART_PX_H, fw * ART_PX_W, fh * ART_PX_H);
  canvas.drawImageRect(image, src, Skia.XYWHRect(ax + fx * ART_PX_W * k, ay + fy * ART_PX_H * k, fw * ART_PX_W * k, fh * ART_PX_H * k), paint);
}

/** The belt. */
export function KitchenBelt() {
  const [width, setWidth] = useState(0);
  const clock = useAmbientClock(calm);
  const art = useImage(require('../../../assets/images/kitchen-belt.webp'));
  const logo = useImage(require('../../../assets/images/cookies/bakery-logo.webp'));
  const boxes = [
    useImage(require('../../../assets/images/boxes/box-0.webp')),
    useImage(require('../../../assets/images/boxes/box-1.webp')),
    useImage(require('../../../assets/images/boxes/box-2.webp')),
    useImage(require('../../../assets/images/boxes/box-3.webp')),
    useImage(require('../../../assets/images/boxes/box-4.webp')),
    useImage(require('../../../assets/images/boxes/box-5.webp')),
    useImage(require('../../../assets/images/boxes/box-6.webp')),
    useImage(require('../../../assets/images/boxes/box-7.webp')),
  ];
  const ready = !!art && boxes.every((b) => !!b);

  const picture = useDerivedValue(() => {
    const t = clock.time.get();
    return createPicture((canvas) => {
      if (!width || !art) return;
      const artH = BELT_H - ART_TOP;
      const k = artH / ART_PX_H;
      const artW = ART_PX_W * k;
      const ax = width - ART_RIGHT - artW;
      const ay = ART_TOP;
      const P = (fx: number, fy: number) => [ax + fx * artW, ay + fy * artH];

      // The wall: stripes, with a wooden post and a cream line at each end.
      const wall = Skia.Paint();
      for (let x = 0, i = 0; x < width; x += 18, i++) {
        wall.setColor(Skia.Color(i % 2 ? kitchen.stripeB : kitchen.stripeA));
        canvas.drawRect(Skia.XYWHRect(x, 0, 18, BELT_H), wall);
      }
      const edge = width * 0.023256;
      const line = width * 0.0093;
      wall.setColor(Skia.Color(kitchen.post));
      canvas.drawRect(Skia.XYWHRect(0, 0, edge, BELT_H), wall);
      canvas.drawRect(Skia.XYWHRect(width - edge, 0, edge, BELT_H), wall);
      wall.setColor(Skia.Color(kitchen.postLine));
      canvas.drawRect(Skia.XYWHRect(edge, 0, line, BELT_H), wall);
      canvas.drawRect(Skia.XYWHRect(width - edge - line, 0, line, BELT_H), wall);

      // The belt's long side running in from the left, then the belt picture.
      const side = Skia.Paint();
      side.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: ay }, { x: 0, y: ay + artH }, beltSide.map(([, c]) => Skia.Color(c)), beltSide.map(([p]) => p), TileMode.Clamp));
      canvas.drawRect(Skia.XYWHRect(0, ay, ax + 3, artH), side);
      canvas.drawImageRect(art, Skia.XYWHRect(0, 0, ART_PX_W, ART_PX_H), Skia.XYWHRect(ax, ay, artW, artH), Skia.Paint());

      // Treads sliding along the belt's top and front.
      const shift = ((t / 1000) * SPEED) % 24;
      const tread = Skia.Paint();
      const [, topY] = P(0, 0.653509);
      const [topEnd] = P(0.75358, 0);
      const [, frontY] = P(0, 0.732456);
      const [frontEnd] = P(0.17483, 0);
      tread.setColor(Skia.Color(kitchen.treadTop));
      for (let x = -24 + shift; x < topEnd; x += 24) canvas.drawRect(Skia.XYWHRect(x, topY, 2, 0.074561 * artH), tread);
      tread.setColor(Skia.Color(kitchen.treadFront));
      for (let x = -24 + shift; x < frontEnd; x += 24) canvas.drawRect(Skia.XYWHRect(x, frontY, 2, 0.081871 * artH), tread);

      // Where a box rides, slips into the oven, and comes out up the chimney.
      const beltY = ay + 491 * k;
      const x0 = -24;
      const xm = ax + 1000 * k;
      const xp = ax + 1046 * k;
      const xt = ax + 1172 * k;
      const yh = ay + 340 * k;
      const rideMs = ((xm - x0) / SPEED) * 1000;
      const hideMs = ((xp - xm) / SPEED) * 1000;
      const lifeMs = rideMs + hideMs + IN_OVEN_MS + UP_MS;
      let flash = 0;
      let zoom = 0;
      const boxPaint = Skia.Paint();
      const first = Math.floor((t - lifeMs) / EVERY_MS) - 1;
      const last = Math.floor(t / EVERY_MS) + 1;
      for (let n = first; n <= last; n++) {
        // Two boxes are already on the belt when the page opens, as in the design.
        const born = n * EVERY_MS + (hash(n) - 0.5) * 600 - rideMs * 0.7;
        const a = t - born;
        if (a < 0 || a > lifeMs) continue;
        const image = boxes[Math.floor(hash(n + 99) * 8)];
        if (!image) continue;
        let x = 0, y = 0, s = 0.95, o = 1, turn = 0;
        if (a < rideMs) {
          x = x0 + (SPEED * a) / 1000;
          y = beltY - 1.5 * Math.abs(Math.sin((a / 420) * Math.PI));
        } else if (a < rideMs + hideMs) {
          const f = (a - rideMs) / hideMs;
          x = xm + (xp - xm) * f;
          y = beltY;
          s = 0.95 - 0.08 * f;
          o = 1 - f;
        } else if (a < rideMs + hideMs + IN_OVEN_MS) {
          const f = (a - rideMs - hideMs) / IN_OVEN_MS;
          if (f > 0.36) flash = Math.max(flash, 1 - (f - 0.36) / 0.5);
          continue;
        } else {
          const f = (a - rideMs - hideMs - IN_OVEN_MS) / UP_MS;
          x = xt;
          y = yh + (-44 - yh) * f * f * f;
          s = 0.72 - 0.02 * f;
          turn = -4 * f;
          zoom = Math.max(zoom, 1 - f);
        }
        boxPaint.setAlphaf(o);
        canvas.save();
        canvas.translate(x, y - BOX_H / 2);
        canvas.rotate(turn, 0, 0);
        canvas.scale(s, s);
        canvas.drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H), boxPaint);
        canvas.restore();
      }

      // The oven mouth's warm glow: a slow breath, and a bright flash as a box goes in.
      const breath = 0.15 + 0.2 * (0.5 - 0.5 * Math.cos(((t % 2200) / 2200) * Math.PI * 2));
      const [mx, my] = P(0.883195, 0.723684);
      const glow = Skia.Paint();
      glow.setAlphaf(Math.max(breath, flash));
      const rx = 0.128109 * artW * (1 + 0.25 * flash) * 0.5;
      const ry = 0.175439 * artH * (1 + 0.25 * flash) * 0.5;
      glow.setShader(Skia.Shader.MakeRadialGradient({ x: mx, y: my }, Math.max(rx, ry), kitchen.ovenGlow.map((c) => Skia.Color(c)), [0, 0.55, 1], TileMode.Clamp));
      canvas.drawOval(Skia.XYWHRect(mx - rx, my - ry, rx * 2, ry * 2), glow);

      // The post and the glass chimney over the boxes, so they pass behind; the glass brightens as one shoots up.
      drawCut(canvas, art, ax, ay, k, 0.765637, 0.494152, 0.040693, 0.494152, 1);
      drawCut(canvas, art, ax, ay, k, 0.833459, 0, 0.099472, 0.45614, 0.5 + 0.25 * zoom);

      // The bakery's sign, and the ceiling beam.
      if (logo) {
        const lh = artH * 0.32 * 1.4;
        const lw = Math.min(104, (lh * logo.width()) / logo.height());
        const h = (lw * logo.height()) / logo.width();
        canvas.drawImageRect(logo, Skia.XYWHRect(0, 0, logo.width(), logo.height()), Skia.XYWHRect(width * 0.46 - lw / 2, 20, lw, h), Skia.Paint());
      }
      const beam = Skia.Paint();
      beam.setColor(Skia.Color(kitchen.ceilingShadow));
      canvas.drawRect(Skia.XYWHRect(0, CEILING, width, 3), beam);
      beam.setColor(Skia.Color(kitchen.ceiling));
      canvas.drawRect(Skia.XYWHRect(0, 0, width, CEILING), beam);
    });
  });

  return (
    <View style={styles.belt} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ready && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  belt: { height: BELT_H, overflow: 'hidden', backgroundColor: kitchen.stripeA },
});
