// The "Read in the Bible" button under a prayer or a prophecy half. It opens the reader at that chapter only when
// the verse is revealed in the person's Bible; otherwise it shows a short "still under stardust" note instead.

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { useRevealedSpot } from '@/data/queries/cookies';
import { navy, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for the button. */
type ReadInBibleProps = {
  /** The reference to open, like "Genesis 24:12-14". */
  reference: string;
  /** The button's color: the page's accent. */
  accent: string;
  /** Runs just before the reader opens, like closing a sheet. */
  onLeave?: () => void;
};

/** "Read in the Bible", or a note when the verse is still covered. Nothing shows while the Bible loads. */
export function ReadInBible({ reference, accent, onLeave }: ReadInBibleProps) {
  const router = useRouter();
  const spot = useRevealedSpot(reference);
  if (spot === undefined) return null;
  if (spot === null) return <Text style={styles.note}>✧ This verse is still under stardust in your Bible.</Text>;
  /** Opens the reader at the reference's chapter. */
  const read = () => {
    playSound('tap');
    onLeave?.();
    router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(spot.book), chapter: String(spot.chapter) } });
  };
  return (
    <Pressable accessibilityRole="button" onPress={read} style={({ pressed }) => [styles.button, { backgroundColor: accent }, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>📖 Read in the Bible</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18 },
  pressed: { transform: [{ scale: 0.96 }] },
  buttonText: { fontFamily: fonts.black, fontSize: 14, color: navy },
  note: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: text.onDarkSoft },
});
