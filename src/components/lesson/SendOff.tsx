// Sending the signed box off, in two scenes: inside Papa Dorin's Bakery the baker puts it on the conveyor belt and
// it goes through the oven and up the chimney; then, outside, it puffs out of the bakery planet's chimney and lands
// in the night sky as a new star. Then Papa Dorin's last word and the way back to the stars.

import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { navy, text } from '@/theme/colors';
import { lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { SendOffInside } from './SendOffInside';
import { SendOffOutside } from './SendOffOutside';

/** Props for the send-off. */
type SendOffProps = {
  /** The box picture in the constellation's color. */
  box: number;
  /** The baker's name and signature (empty when not signed). */
  bakerName: string;
  signature: string;
  /** The constellation's color. */
  color: string;
  /** True when the box was sent before, so the star and last word show at once. */
  alreadySent: boolean;
  /** Records the box as sent, once it lands in the sky. */
  onSent: () => void;
  /** Leaves: back to the stars. */
  onClose: () => void;
};

/** The two scenes and the last word. */
export function SendOff({ box, bakerName, signature, color, alreadySent, onSent, onClose }: SendOffProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'inside' | 'outside' | 'sent'>(alreadySent ? 'sent' : 'inside');

  if (phase === 'inside') return <SendOffInside box={box} bakerName={bakerName} signature={signature} onUp={() => setPhase('outside')} onClose={onClose} />;

  return (
    <Animated.View entering={FadeIn.duration(450)} style={styles.page}>
      <SendOffOutside
        box={box}
        color={color}
        landed={phase === 'sent'}
        onLanded={() => {
          playSound('reveal');
          setPhase('sent');
          onSent();
        }}
      />
      {phase === 'sent' && (
        <Animated.View entering={FadeIn.delay(500).duration(500)} style={[styles.foot, { paddingBottom: insets.bottom + 16 }]}>
          <GlassSurface style={styles.note}>
            <Text style={styles.noteTitle}>Sent off!</Text>
            <Text style={styles.noteText}>Your box is up among the stars, baker. Fine work today.</Text>
          </GlassSurface>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.go,
              { backgroundColor: color, boxShadow: `0 5px 0 ${mixColor(color, 0.6, lessonSky.black)}, 0 0 22px ${mixColor(color, 0.6)}` },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.goText}>Back to the stars</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
  foot: { position: 'absolute', left: 18, right: 18, bottom: 0, gap: 14, maxWidth: 560, alignSelf: 'center' },
  note: { borderRadius: radius.card, padding: 16, gap: 4 },
  noteTitle: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  noteText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: text.onDarkSoft },
  go: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: navy },
  pressed: { transform: [{ translateY: 4 }] },
});
