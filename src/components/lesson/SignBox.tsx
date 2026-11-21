// Signing the cookie box: the packed box, with Papa Dorin's "approved" seal stamping onto it and its label saying
// "Baked by" and the baker's name. Signing is optional: "Add your signature" opens a place to sign under the box, and
// the signature shows on the box's label. "Send it off" goes on to the conveyor belt.

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { glass, navy, text } from '@/theme/colors';
import { boxLabel, lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { CookieBox } from './CookieBox';
import { SignaturePad } from './SignaturePad';

/** When the seal's thump plays: as it lands on the box. */
const THUMP_MS = 650;

/** Props for signing the box. */
type SignBoxProps = {
  /** The baker's name. */
  bakerName: string;
  /** The box picture in the constellation's color. */
  box: number;
  /** The constellation's color. */
  color: string;
  /** Goes on to the conveyor belt with the signature's path (empty when not signed). */
  onSend: (signature: string) => void;
  /** Leaves without sending. */
  onClose: () => void;
};

/** The box to sign. */
export function SignBox({ bakerName, box, color, onSend, onClose }: SignBoxProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [signing, setSigning] = useState(false);
  const [signature, setSignature] = useState('');
  const boxWidth = Math.min(width - 40, height < 700 ? 290 : 330);

  // The seal's thump, as it lands on the box when the page opens.
  useEffect(() => {
    const t = setTimeout(() => playSound('burn'), THUMP_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            playSound('tap');
            onClose();
          }}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Box &amp; Send Off</Text>
      </View>
      <ScrollView style={styles.stage} contentContainerStyle={styles.inner} scrollEnabled={!signing}>
        <CookieBox width={boxWidth} box={box} bakerName={bakerName} signature={signature} stampNow />
        {signing ? (
          <Animated.View entering={FadeInDown.duration(250)} style={styles.padCard}>
            <SignaturePad onChange={setSignature} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                playSound('tap');
                setSigning(false);
              }}
              style={styles.doneSign}
            >
              <Text style={styles.doneSignText}>Done</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              setSigning(true);
            }}
            style={styles.addSign}
          >
            <Text style={styles.addSignText}>{signature ? 'Change your signature' : '+ Add your signature'}</Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            playSound('next');
            onSend(signature);
          }}
          style={({ pressed }) => [
            styles.go,
            { backgroundColor: color, boxShadow: `0 5px 0 ${mixColor(color, 0.6, lessonSky.black)}, 0 0 22px ${mixColor(color, 0.6)}` },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.goText}>Send it off</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: glass.button, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  stage: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 18, paddingVertical: 24, paddingHorizontal: 20 },
  padCard: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    marginHorizontal: 'auto',
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: boxLabel.edge,
    backgroundColor: boxLabel.card,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  doneSign: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 18 },
  doneSignText: { fontFamily: fonts.black, fontSize: 16, color: boxLabel.label },
  addSign: { borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: glass.button },
  addSignText: { fontFamily: fonts.extraBold, fontSize: 15, color: text.onDark },
  foot: { paddingTop: 10, paddingHorizontal: 18, width: '100%', maxWidth: 596, alignSelf: 'center' },
  go: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: navy },
  pressed: { transform: [{ translateY: 4 }] },
});
