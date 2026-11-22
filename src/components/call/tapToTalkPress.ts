// How a picture of Papa Dorin is pressed to ask him something, the same on every call screen: hold to talk, or
// with Tap to talk on, tap once to start and again to finish. In the browser it also stops the long-press menu,
// text selection and page scrolling, which would otherwise take the finger away and end the hold early.

import { Platform, type PressableProps, type ViewStyle } from 'react-native';
import type { PapaDorin } from './usePapaDorin';
import { useTapToTalk } from './useTapToTalk';

/** The browser styles that keep a hold from turning into a selection, the "Save image" menu, or a scroll. */
export const HOLD_IN_BROWSER = (
  Platform.OS === 'web' ? { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' } : {}
) as ViewStyle;

/** Does nothing; having a long-press action stops the browser's long-press menu from ending the hold. */
export function keepHolding() {}

/** The press actions for a Papa Dorin picture: hold to talk, or Tap to talk when that setting is on. */
export function useAskPress(dorin: PapaDorin): Pick<PressableProps, 'onPress' | 'onPressIn' | 'onPressOut' | 'onLongPress' | 'accessibilityLabel'> {
  const tapMode = useTapToTalk();
  if (tapMode) return { onPress: dorin.holding ? dorin.stopAsking : dorin.startAsking, accessibilityLabel: 'Tap to ask Papa Dorin something' };
  return { onPressIn: dorin.startAsking, onPressOut: dorin.stopAsking, onLongPress: keepHolding, accessibilityLabel: 'Hold to ask Papa Dorin something' };
}
