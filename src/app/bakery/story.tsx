// Papa Dorin's Story, opened from Papa Dorin's Bakery: his 17 chapters from the junk drawer to the stars, one page
// at a time on a warm light page. Turn pages with the buttons or by swiping left and right; "The end" closes it.

import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { StoryCard, type TurnDirection } from '@/components/bakery/story/StoryCard';
import { StoryFooter } from '@/components/bakery/story/StoryFooter';
import { StoryHeader } from '@/components/bakery/story/StoryHeader';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { papaDorinStory } from '@/data/papaDorinStory';
import { storyPage } from '@/theme/bakeryStoryColors';

/** How far a finger must move sideways to turn the page, as in the design. */
const SWIPE_PX = 60;

/** The story's pictures only drift and bob, so the page's timer never needs to tick fast. */
function storyBusy(): boolean {
  'worklet';
  return false;
}

/** The story page. */
export default function PapaDorinStoryPage() {
  const router = useRouter();
  const clock = useAmbientClock(storyBusy);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState({ index: 0, turned: null as TurnDirection | null });
  const last = papaDorinStory.length - 1;
  // The page that shows, kept fresh for the swipe, which may hold on to an older render.
  const shown = useRef(0);

  /** Turns to the page before or after, with the page-turn sound, starting it at the top. */
  const turn = (direction: TurnDirection) => {
    const index = shown.current + (direction === 'forward' ? 1 : -1);
    if (index < 0 || index > last) return;
    playSound('next');
    shown.current = index;
    setPage({ index, turned: direction });
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  /** Next page, or on the last page the collect sound and back to the bakery. */
  const next = () => {
    if (shown.current < last) return turn('forward');
    playSound('collect');
    router.back();
  };

  // A sideways swipe turns the page; an up-and-down drag is left to the scrolling.
  const swipe = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-20, 20],
    failOffsetY: [-20, 20],
    onDeactivate: (e) => {
      if (e.translationX < -SWIPE_PX) turn('forward');
      else if (e.translationX > SWIPE_PX) turn('back');
    },
  });

  const chapter = papaDorinStory[page.index];
  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.page}>
        <StoryHeader onBack={() => router.back()} />
        <ScrollView ref={scroll} style={styles.body} contentContainerStyle={styles.bodyInner}>
          <StoryCard key={page.index} chapter={chapter} number={page.index + 1} turned={page.turned} clock={clock} />
        </ScrollView>
        <StoryFooter page={page.index} pages={papaDorinStory.length} onBack={() => turn('back')} onNext={next} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundImage: `radial-gradient(ellipse at 50% 0%, ${storyPage.glowTop}, ${storyPage.glowEdge})` },
  body: { flex: 1 },
  bodyInner: { paddingTop: 6, paddingHorizontal: 18, paddingBottom: 10 },
});
