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
function level(id: string, mark: string, deed: string): BadgeLevel {
  return { id, mark, deed };
}

/** Makes a one-time badge: one level, sharing the badge's id. */
function once(id: string, name: string, art: string, deed: string): Badge {
  return { id, name, art, levels: [level(id, '', deed)] };
}

/** Every badge, in the order shown. */
export const BADGES: readonly Badge[] = [
  {
    id: 'baker',
    name: 'Baker',
    art: '🍪',
    levels: [
      level('first-batch', '1', 'finishing your first lesson'),
      level('bakers-dozen', '13', 'finishing 13 lessons'),
      level('front-to-back', 'All', 'finishing every lesson in the Bible'),
    ],
  },
  {
    id: 'streak',
    name: 'Streak',
    art: '🔥',
    levels: [3, 7, 30, 100, 365].map((days) => level(`streak-${days}`, String(days), `keeping a ${days}-day streak`)),
  },
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
  {
    id: 'meet-the-family',
    name: 'Meet the Family',
    art: '👪',
    levels: [
      ...[10, 50, 100].map((n) => level(`people-${n}`, String(n), `meeting ${n} Bible people`)),
      level('people-all', 'All', 'meeting every Bible person in the lessons'),
    ],
  },
  { id: 'traveler', name: 'Traveler', art: '🧭', levels: [10, 50].map((n) => level(`places-${n}`, String(n), `visiting ${n} places`)) },
  {
    id: 'prophecy-hunter',
    name: 'Prophecy Hunter',
    art: '🔗',
    levels: [level('prophecy-1', '1', 'joining your first prophecy link'), level('prophecy-25', '25', 'joining 25 prophecy links')],
  },
  {
    id: 'detective',
    name: 'Detective',
    art: '🕵️',
    levels: [level('mystery-1', '1', 'guessing your first Weekly Word'), level('mystery-10', '10', 'guessing 10 Weekly Words')],
  },
  once('whole-book', 'Whole Book', '📖', 'finishing every lesson in one book of the Bible'),
  once('old-and-new', 'Old and New', '📚', 'finishing a lesson in the Old Testament and one in the New'),
  once('no-burnt-cookies', 'No Burnt Cookies', '⭐', 'answering every question in a lesson right the first time'),
  once('back-at-it', 'Back at It', '🌅', 'starting a new streak after losing one'),
  once('mighty-few', 'Mighty Few', '🔎', 'meeting someone the Bible names fewer than 5 times'),
  once('prayers-10', 'Prayer Keeper', '🙏', 'collecting 10 prayers'),
  once('instructions-25', 'Instruction Follower', '🪧', 'collecting 25 instructions'),
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
