// A place to sign with a finger, on a line with a "Sign here" hint and a Clear button. The ink is one drawn path
// that redraws at most 30 times a second, and only while the finger moves. The signature is kept in a fixed
// 300 by 90 box, so it shows the same at any size.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { boxLabel } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';

/** The box the signature is kept in. */
export const SIGN_W = 300;
export const SIGN_H = 90;

/** The least time between two redraws while signing (30 a second). */
const REDRAW_MS = 33;

/** Props for the pad. */
type SignaturePadProps = {
  /** Called with the signature's path, or an empty string once cleared. */
  onChange: (path: string) => void;
};

/** A signature drawn in its 300 by 90 box, at any size. */
export function SignatureInk({ path, width }: { path: string; width: number }) {
  return (
    <Svg width={width} height={(width * SIGN_H) / SIGN_W} viewBox={`0 0 ${SIGN_W} ${SIGN_H}`}>
      <Path d={path} stroke={boxLabel.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** The signing pad. */
export function SignaturePad({ onChange }: SignaturePadProps) {
  const [width, setWidth] = useState(0);
  const [path, setPath] = useState('');
  const ink = useRef('');
  const drawn = useRef(0);

  /** One finger point, in the signature's box. */
  const at = (x: number, y: number) => {
    const k = width ? SIGN_W / width : 1;
    return `${Math.round(x * k * 10) / 10} ${Math.round(y * k * 10) / 10}`;
  };

  /** Redraws the ink, at most 30 times a second unless `now`. */
  const redraw = (now: boolean) => {
    const t = Date.now();
    if (!now && t - drawn.current < REDRAW_MS) return;
    drawn.current = t;
    setPath(ink.current);
  };

  // Each touch starts a new stroke; moving the finger adds to it.
  const sign = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => {
      ink.current += `${ink.current ? ' ' : ''}M${at(e.x, e.y)} L${at(e.x + 0.5, e.y)}`;
      redraw(true);
    },
    onUpdate: (e) => {
      ink.current += ` L${at(e.x, e.y)}`;
      redraw(false);
    },
    onFinalize: () => {
      redraw(true);
      onChange(ink.current);
    },
  });

  /** Starts the signature over. */
  const clear = () => {
    ink.current = '';
    setPath('');
    onChange('');
  };

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={sign}>
        <View style={styles.pad} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Sign here">
          {!path && <Text style={styles.hint}>Sign here</Text>}
          <View style={styles.line} />
          {width > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <SignatureInk path={path} width={width} />
            </View>
          )}
        </View>
      </GestureDetector>
      <Pressable accessibilityRole="button" onPress={clear} hitSlop={8} style={styles.clear}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  pad: { width: '100%', aspectRatio: SIGN_W / SIGN_H },
  hint: { position: 'absolute', left: 4, bottom: 12, fontFamily: fonts.bold, fontSize: 15, color: boxLabel.hint },
  line: { position: 'absolute', left: 0, right: 0, bottom: 8, height: 2, backgroundColor: boxLabel.line },
  clear: { alignSelf: 'flex-end', paddingTop: 4 },
  clearText: { fontFamily: fonts.extraBold, fontSize: 13, color: boxLabel.label },
});
