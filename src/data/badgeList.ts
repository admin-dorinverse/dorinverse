// Every badge the app offers, in the order they are shown, as the owner approved them (2026-11-23). Badges that are
// steps toward one goal are one badge with levels. Only names and rules live here; the server decides what is
// earned (badgeSource.ts).

import type { Badge, BadgeLevel } from '@/types/badges';
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

/** Makes one level. */
function level(id: string, mark: string, howToEarn: string): BadgeLevel {
  return { id, mark, howToEarn };
}

/** Makes a one-time badge: one level, sharing the badge's id. */
function once(id: string, name: string, art: string, howToEarn: string): Badge {
  return { id, name, art, levels: [level(id, '', howToEarn)] };
}

/** Every badge, in the order shown. */
export const BADGES: readonly Badge[] = [
  {
    id: 'baker',
    name: 'Baker',
    art: '🍪',
    levels: [
      level('first-batch', '1', 'Finish your first lesson.'),
      level('bakers-dozen', '13', 'Finish 13 lessons.'),
      level('front-to-back', 'All', 'Finish every lesson in the Bible.'),
    ],
  },
  {
    id: 'streak',
    name: 'Streak',
    art: '🔥',
    levels: [3, 7, 30, 100, 365].map((days) => level(`streak-${days}`, String(days), `Keep a ${days}-day streak.`)),
  },
  {
    id: 'stargazer',
    name: 'Stargazer',
    art: '✨',
    anyOrder: true,
    levels: CONSTELLATIONS.map((k) => level(k.id, '', `Finish a lesson in the ${k.name} constellation.`)),
  },
  {
    id: 'meet-the-family',
    name: 'Meet the Family',
    art: '👪',
    levels: [
      ...[10, 50, 100].map((n) => level(`people-${n}`, String(n), `Meet ${n} Bible people.`)),
      level('people-all', 'All', 'Meet every Bible person in the lessons.'),
    ],
  },
  { id: 'traveler', name: 'Traveler', art: '🧭', levels: [10, 50].map((n) => level(`places-${n}`, String(n), `Visit ${n} places.`)) },
  {
    id: 'prophecy-hunter',
    name: 'Prophecy Hunter',
    art: '🔗',
    levels: [level('prophecy-1', '1', 'Join your first prophecy link.'), level('prophecy-25', '25', 'Join 25 prophecy links.')],
  },
  {
    id: 'detective',
    name: 'Detective',
    art: '🕵️',
    levels: [level('mystery-1', '1', 'Guess your first Weekly Word.'), level('mystery-10', '10', 'Guess 10 Weekly Words.')],
  },
  once('whole-book', 'Whole Book', '📖', 'Finish every lesson in one book of the Bible.'),
  once('old-and-new', 'Old and New', '📚', 'Finish a lesson in the Old Testament and one in the New Testament.'),
  once('no-burnt-cookies', 'No Burnt Cookies', '⭐', 'Answer every question in a lesson right the first time.'),
  once('back-at-it', 'Back at It', '🌅', 'Start a new streak after losing one.'),
  once('mighty-few', 'Mighty Few', '🔎', 'Meet someone the Bible names fewer than 5 times.'),
  once('prayers-10', 'Prayer Keeper', '🙏', 'Collect 10 prayers.'),
  once('instructions-25', 'Instruction Follower', '🪧', 'Collect 25 instructions.'),
  once('quick-draw', 'Quick Draw', '⚡', 'Answer a trivia question in under 3 seconds.'),
  once('trivia-champ', 'Trivia Champ', '🥇', 'Win a family trivia game.'),
  once('study-together', 'Study Together', '🤝', 'Finish a lesson with others on a voice call.'),
  once('host-10', 'Host with the Most', '📞', 'Host 10 voice calls, each at least 10 minutes long with at least one other person.'),
  once('curious-baker', 'Curious Baker', '❓', 'Ask Papa Dorin your first question.'),
  once('guest-list', 'Guest List', '💬', 'Chat with 5 different weekly guests.'),
];

/** How many levels of a badge are reached, given the earned level ids. In order: stops at the first one missing. */
export function levelReached(badge: Badge, earned: ReadonlySet<string>): number {
  if (badge.anyOrder) return badge.levels.filter((l) => earned.has(l.id)).length;
  let reached = 0;
  while (reached < badge.levels.length && earned.has(badge.levels[reached].id)) reached += 1;
  return reached;
}

/** The number on a badge's medal: its reached level's mark, or the first level's while not earned yet. */
export function medalMark(badge: Badge, level: number): string {
  if (badge.anyOrder) return level > 0 ? String(level) : '';
  return badge.levels[Math.max(level, 1) - 1].mark;
}
