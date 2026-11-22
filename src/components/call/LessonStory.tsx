// A story card in a lesson together: Papa Dorin tells the next piece of the passage in the lesson player's cream
// speech bubble, with its verse reference, and stands under it. Everyone reads the same card; only the host moves
// the lesson on.

import { ScrollView, StyleSheet, Text } from 'react-native';
import { DorinSpeak } from '@/components/lesson/DorinSpeak';
import { cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import type { StoryCard } from '@/types/lesson';

/** Papa Dorin's height under the bubble. */
const DORIN_HEIGHT = 130;

/** Props for a story card. */
type LessonStoryProps = {
  /** The card. */
  card: StoryCard;
};

/** A story card, scrolling when its words are long. */
export function LessonStory({ card }: LessonStoryProps) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <DorinSpeak key={`${card.card}-${card.verses}`} length={card.text.length} height={DORIN_HEIGHT}>
        <Text style={styles.words}>{card.text}</Text>
        <Text style={styles.cite}>{card.verses}</Text>
      </DorinSpeak>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 8 },
  words: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 27, color: cream.ink },
  cite: { fontFamily: fonts.extraBold, fontSize: 13, color: cream.cite, marginTop: 6 },
});
