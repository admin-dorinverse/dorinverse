// An invisible full-screen layer on the Sky tab that lets a finger drag and throw the sky, or tap things in it.
// Dragging only pans. The sky never zooms.

import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSky } from './SkyProvider';

/** Catches drags and taps on the sky and hands them to the sky's animation thread. */
export function SkyTouchLayer() {
  const { touch } = useSky();
  const pan = usePanGesture({
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => {
      'worklet';
      touch.begin(e.x, e.y);
    },
    onUpdate: (e) => {
      'worklet';
      touch.move(e.changeX, e.changeY);
    },
    onFinalize: (e) => {
      'worklet';
      touch.end(e.x, e.y);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill} accessibilityLabel="The sky. Drag to look around, tap a constellation, the bakery or the red Clue Book." />
    </GestureDetector>
  );
}
