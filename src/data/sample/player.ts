// Sample data for building screens: the numbers shown in the HUD pills. Fake data for the UI only.
// The real numbers will come from the server, which is the only place that decides them.

/** The player's numbers shown at the top of the screen. */
export const samplePlayer = {
  /** Days in a row with a finished lesson. */
  streak: 12,
  /** Questions left today on the free allowance. The real amount is not decided yet. */
  questionsLeft: 40,
  /** Chocolate chips, the in-app coins. */
  chips: 120,
} as const;
