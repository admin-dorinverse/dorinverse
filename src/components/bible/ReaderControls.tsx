// The reader's floating controls at the bottom: a round play button that reads the revealed verses aloud,
// and a pill with the chapter's name between previous and next chapter arrows.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { glass, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Height of the controls, for the page to leave room under its text. */
export const READER_CONTROLS_SPACE = 110;

/** Props for the reader controls. */
type ReaderControlsProps = {
  /** The chapter's name, like "Judges 3". */
  title: string;
  /** True while the verses are being read aloud. */
  speaking: boolean;
  /** Starts or stops reading aloud. */
  onPlay: () => void;
  /** Goes to the previous or next chapter that can be opened, or is missing when there is none. */
  onPrevious?: () => void;
  onNext?: () => void;
};

/** The play button and the chapter pill. */
export function ReaderControls({ title, speaking, onPlay, onPrevious, onNext }: ReaderControlsProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'Stop reading aloud' : 'Read aloud'} onPress={onPlay} style={styles.play}>
        <Text style={styles.playIcon}>{speaking ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={styles.pill}>
        <Arrow label="Previous chapter" sign="‹" onPress={onPrevious} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Arrow label="Next chapter" sign="›" onPress={onNext} />
      </View>
    </View>
  );
}

/** A previous or next arrow. It fades out when there is nowhere to go. */
function Arrow({ label, sign, onPress }: { label: string; sign: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      hitSlop={8}
      onPress={() => {
        playSound('tap');
        onPress?.();
      }}
      style={styles.arrow}
    >
      <Text style={[styles.arrowText, !onPress && styles.arrowOff]}>{sign}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 420, alignSelf: 'center' },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.still,
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.borderTop,
    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
  },
  playIcon: { fontSize: 17, color: text.onDark },
  pill: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    backgroundColor: glass.still,
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.borderTop,
    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
  },
  arrow: { paddingHorizontal: 14, paddingVertical: 8 },
  arrowText: { fontFamily: fonts.black, fontSize: 24, color: 'rgba(255,255,255,0.75)' },
  arrowOff: { color: 'rgba(255,255,255,0.18)' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.black, fontSize: 16, color: text.onDark },
});
