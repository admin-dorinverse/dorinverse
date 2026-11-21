// Works out where the Weekly Word's week stands at a given moment: which day it is, whether the word has been
// revealed, and when that next changes. The real week runs Monday to Sunday on the phone's own clock, with the
// reveal on Sunday evening. The test week squeezes the same steps into minutes (see devTesting.ts).

/** The hour on Sunday when the word is revealed (6 PM). */
const REVEAL_HOUR = 18;

/** How many test "days" a test week lasts: seven clue days and one more for the reveal to stay up. */
const TEST_WEEK_DAYS = 8;

/** Where the week stands at one moment. */
export type MysteryMoment = {
  /** Which week it is. */
  weekId: string;
  /** Today, 1 (Monday) to 7 (Sunday). */
  today: number;
  /** True once the word is revealed. */
  revealed: boolean;
  /** When any of this next changes, in milliseconds. */
  changesAt: number;
};

/** The real week: a clue each day from Monday, the reveal on Sunday evening, a new week at midnight. */
function realMoment(now: number): MysteryMoment {
  const d = new Date(now);
  const today = ((d.getDay() + 6) % 7) + 1;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (today - 1));
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const revealAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), REVEAL_HOUR).getTime();
  const revealed = today === 7 && now >= revealAt;
  return {
    weekId: `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`,
    today,
    revealed,
    changesAt: today === 7 && !revealed ? revealAt : midnight,
  };
}

/** The test week: it began at `start`, each day lasts `dayMs`, and it starts over when it ends. */
function testMoment(now: number, start: number, dayMs: number): MysteryMoment {
  const weekMs = TEST_WEEK_DAYS * dayMs;
  const weekStart = start + Math.floor((now - start) / weekMs) * weekMs;
  const into = now - weekStart;
  const today = Math.min(7, Math.floor(into / dayMs) + 1);
  const revealed = into >= 7 * dayMs;
  return { weekId: `test-${weekStart}`, today, revealed, changesAt: revealed ? weekStart + weekMs : weekStart + today * dayMs };
}

/** Where the week stands at `now`. Give `test` (when the test week began, and how long its days are) to speed it up. */
export function mysteryMoment(now: number, test: { start: number; dayMs: number } | null): MysteryMoment {
  return test ? testMoment(now, test.start, test.dayMs) : realMoment(now);
}
