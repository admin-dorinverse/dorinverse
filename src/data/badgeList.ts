// Every badge the app offers, in the order they are shown, as the owner approved them (2026-11-23). Badges that are
// steps toward one goal are one badge with levels. Only names and rules live here; the server decides what is
// earned (badgeSource.ts).

import type { Badge, BadgeLevel, CountKind } from '@/types/badges';
import type { LessonType } from '@/types/lesson';

/** One of the six constellations in the sky, by the kind of lesson it holds. */
export type ConstellationLevel = { id: string; name: string; type: LessonType };

/** The six constellations, each one level of Stargazer when a lesson there is finished. */
export const CONSTELLATIONS: readonly ConstellationLevel[] = [
  { id: 'sky-stories', name: 'Stories', type: 'Narrative' },
  { id: 'sky-poems', name: 'Poems & Wisdom', type: 'Poetry & Wisdom' },
  { id: 'sky-letters', name: 'Letters', type: 'Letters' },
  { id: 'sky-prophecies', name: 'Prophecies', type: 'Prophetic' },
  { id: 'sky-parables', name: 'Parables', type: 'Parables' },
  { id: 'sky-sermons', name: 'Sermons', type: 'Sermons' },
];

/**
 * How many of each thing there is to collect, counted in the database on 2026-11-23. The last level of a counting
 * badge is all of them, and its medal shows this number. At hookup the server uses its own live counts.
 */
export const TOTALS = { lessons: 1558, people: 270, places: 394, prophecyLinks: 20, prayers: 10, instructions: 52 } as const;

/** Makes one level. */
function level(id: string, mark: string, deed: string, goal?: number): BadgeLevel {
  return { id, mark, deed, goal };
}

/** Makes a one-time badge: one level, sharing the badge's id. */
function once(id: string, name: string, art: string, deed: string): Badge {
  return { id, name, art, levels: [level(id, '', deed)] };
}

/**
 * Makes a badge whose levels are counts of one thing, like 10, 25 and 50 places. Each level's medal shows its count;
 * `deed` gives the words for a count, and `allDeed` the words for the last level when it is all of them.
 */
function counting(id: string, name: string, art: string, counts: CountKind, goals: readonly number[], deed: (n: number) => string, allDeed?: string): Badge {
  const last = goals[goals.length - 1];
  return {
    id,
    name,
    art,
    counts,
    levels: goals.map((n) => level(`${id}-${n}`, String(n), n === last && allDeed ? allDeed : deed(n), n)),
  };
}

/** Every badge, in the order shown. */
export const BADGES: readonly Badge[] = [
  counting('baker', 'Baker', '🍪', 'lessons', [1, 13, 50, 100, 250, 500, 1000, TOTALS.lessons], (n) => (n === 1 ? 'finishing your first lesson' : `finishing ${n} lessons`), 'finishing every lesson in the Bible'),
  counting('streak', 'Streak', '🔥', 'streak', [3, 7, 14, 30, 50, 100, 200, 365], (n) => `keeping a ${n}-day streak`),
  {
    id: 'stargazer',
    name: 'Stargazer',
    art: '✨',
    anyOrder: true,
    // Each level counts constellations, in any order, so its words count them too.
    levels: CONSTELLATIONS.map((k, i) =>
      level(k.id, '', i === CONSTELLATIONS.length - 1 ? 'finishing a lesson in all six constellations' : `finishing a lesson in ${i === 0 ? 'a constellation' : `${i + 1} constellations`}`),
    ),
  },
  counting('meet-the-family', 'Meet the Family', '👪', 'people', [10, 25, 50, 100, 150, 200, TOTALS.people], (n) => `meeting ${n} Bible people`, 'meeting every Bible person in the lessons'),
  counting('traveler', 'Traveler', '🧭', 'places', [10, 25, 50, 100, 200, 300, TOTALS.places], (n) => `visiting ${n} places`, 'visiting every place in the lessons'),
  counting('prophecy-hunter', 'Prophecy Hunter', '🔗', 'prophecyLinks', [1, 5, 10, 15, TOTALS.prophecyLinks], (n) => (n === 1 ? 'joining your first prophecy link' : `joining ${n} prophecy links`), 'joining every prophecy link'),
  counting('detective', 'Detective', '🕵️', 'weeklyWords', [1, 5, 10, 25, 52], (n) => (n === 1 ? 'guessing your first Weekly Word' : `guessing ${n} Weekly Words`)),
  counting('prayer-keeper', 'Prayer Keeper', '🙏', 'prayers', [1, 5, TOTALS.prayers], (n) => (n === 1 ? 'collecting your first prayer' : `collecting ${n} prayers`), 'collecting every prayer'),
  counting('instruction-follower', 'Instruction Follower', '🪧', 'instructions', [5, 10, 25, TOTALS.instructions], (n) => `collecting ${n} instructions`, 'collecting every instruction'),
  once('whole-book', 'Whole Book', '📖', 'finishing every lesson in one book of the Bible'),
  once('old-and-new', 'Old and New', '📚', 'finishing a lesson in the Old Testament and one in the New'),
  once('no-burnt-cookies', 'No Burnt Cookies', '⭐', 'answering every question in a lesson right the first time'),
  once('mighty-few', 'Mighty Few', '🔎', 'meeting someone the Bible names fewer than 5 times'),
  once('quick-draw', 'Quick Draw', '⚡', 'answering a trivia question in under 3 seconds'),
  once('trivia-champ', 'Trivia Champ', '🥇', 'winning a family trivia game'),
  once('study-together', 'Study Together', '🤝', 'finishing a lesson with others on a voice call'),
  once('host-10', 'Host with the Most', '📞', 'hosting 10 voice calls, each at least 10 minutes long with at least one other person'),
  once('curious-baker', 'Curious Baker', '❓', 'asking Papa Dorin your first question'),
  once('guest-list', 'Guest List', '💬', 'chatting with 5 different weekly guests'),
];

/** How many levels of a badge are reached, given the earned level ids. In order: stops at the first one missing. */
export function levelReached(badge: Badge, earned: ReadonlySet<string>): number {
  if (badge.anyOrder) return badge.levels.filter((l) => earned.has(l.id)).length;
  let reached = 0;
  while (reached < badge.levels.length && earned.has(badge.levels[reached].id)) reached += 1;
  return reached;
}

/** The words after "by" for a badge: its reached level's, or its first level's while not earned yet. */
export function badgeDeed(badge: Badge, level: number): string {
  return badge.levels[Math.max(level, 1) - 1].deed;
}

/** The number on a badge's medal: its reached level's mark, or the first level's while not earned yet. */
export function medalMark(badge: Badge, level: number): string {
  if (badge.anyOrder) return level > 0 ? String(level) : '';
  return badge.levels[Math.max(level, 1) - 1].mark;
}
