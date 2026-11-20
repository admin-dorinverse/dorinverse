// The player's cream pop-up sheet, as in the design's word sheet: it slides up once over a dimmed page with Papa
// Dorin (or a picture of what it shows), a small heading, a title, what it says, a note, and one button. Used for
// explained words and sayings, and for the quick look at a cookie before collecting it.

import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { glass, text } from '@/theme/colors';
import { cream } from '@/theme/lessonColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** How the sheet comes in: one smooth slide up. */
const SHEET_IN = SlideInDown.duration(300).easing(Easing.out(Easing.cubic));

/** Papa Dorin's height on the sheet. His picture is far taller, so he stays sharp. */
const DORIN_H = 58;

/** Props for a cream sheet. */
type CreamSheetProps = {
  /** True while it shows. */
  open: boolean;
  /** Closes it. */
  onClose: () => void;
  /** The small heading, like "Word on the path". */
  kind: string;
  /** The title, like the word. */
  title: string;
  /** What it says, like the meaning. */
  body: string | null;
  /** A small note under it, like the sources. */
  note: string | null;
  /** The button's words. */
  button: string;
  /** What the button does (it also closes the sheet). Closing only, when not given. */
  onButton?: () => void;
  /** A picture across the top, like a place's photo; Papa Dorin is left out when there is one. */
  picture?: ReactNode;
};

/** A cream sheet over the player. */
export function CreamSheet({ open, onClose, kind, title, body, note, button, onButton, picture }: CreamSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        {open && (
          <Animated.View entering={SHEET_IN} style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            {picture ? <View style={styles.picture}>{picture}</View> : null}
            <View style={styles.head}>
              {!picture && <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />}
              <View style={styles.words}>
                <Text style={styles.kind}>{kind}</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
            </View>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {note ? <Text style={styles.note}>{note}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                playSound('tap');
                onButton?.();
                onClose();
              }}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>{button}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: glass.backdrop },
  sheet: { width: '100%', maxWidth: 560, backgroundColor: cream.sheet, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 20, paddingHorizontal: 20 },
  picture: { alignItems: 'center', marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dorin: { width: Math.round((DORIN_H * 300) / 688), height: DORIN_H },
  words: { flex: 1 },
  kind: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: cream.kind },
  title: { fontFamily: fonts.black, fontSize: 22, lineHeight: 27, color: cream.ink },
  body: { fontFamily: fonts.body, fontSize: 16.5, lineHeight: 25, color: cream.ink, marginTop: 14 },
  note: { fontFamily: fonts.bold, fontSize: 13, color: cream.cite, marginTop: 10 },
  button: { marginTop: 16, borderRadius: radius.button, paddingVertical: 15, alignItems: 'center', backgroundColor: cream.button, boxShadow: `0 5px 0 ${cream.buttonShadow}` },
  pressed: { transform: [{ translateY: 4 }], boxShadow: `0 1px 0 ${cream.buttonShadow}` },
  buttonText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
});
