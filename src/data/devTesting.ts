// DEVELOPMENT ONLY: switches for testing on the phone. Each is off in the real app, whatever it is set to here.

/**
 * When true, opening a lesson's orbit view, or coming back to it from the Bakery steps (Quality Check, Big Idea,
 * the box), starts those steps over: the cookies show again, the rocket flies in to collect them, and the box can be sent again. Set it to
 * false to keep finished lessons finished while testing.
 */
export const REPLAY_BAKERY_STEPS = __DEV__ && true;

/**
 * A lesson that always counts as fully baked, so the rocket, the Quality Check, the Big Idea and the box can be
 * tested at once: "The Man and the Woman in the Garden of Eden" (Genesis 2, in Stories), which has 2 stops.
 */
export const TEST_LESSON = __DEV__ ? { id: 2, stops: 2 } : null;

/**
 * Speeds up the Weekly Word for testing: each "day" lasts this many milliseconds (one minute), the reveal comes a
 * minute after the 7th clue, and a new week starts a minute after that. Set it to null to follow the real week
 * (a clue a day from Monday, the reveal on Sunday evening).
 */
export const MYSTERY_TEST_DAY_MS: number | null = __DEV__ ? 60_000 : null;
