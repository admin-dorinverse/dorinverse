// Every badge the app offers, in the order they are shown, as the owner approved them (2026-11-23).
// Only names and rules live here. Whether a person has earned one is decided by the server (badgeSource.ts).

import type { Badge, BadgeGroup } from '@/types/badges';
import type { LessonType } from '@/types/lesson';

/** One of the six constellations in the sky, by the kind of lesson it holds, with its badge for finishing a lesson there. */
export type ConstellationBadge = { id: string; name: string; type: LessonType; art: string };

/** The six constellations' badges, named like the constellations. */
export const CONSTELLATION_BADGES: readonly ConstellationBadge[] = [
  { id: 'sky-stories', name: 'Stories', type: 'Narrative', art: '🍪' },
  { id: 'sky-poems', name: 'Poems & Wisdom', type: 'Poetry & Wisdom', art: '💗' },
  { id: 'sky-letters', name: 'Letters', type: 'Letters', art: '🕊️' },
  { id: 'sky-prophecies', name: 'Prophecies', type: 'Prophetic', art: '⭐' },
  { id: 'sky-parables', name: 'Parables', type: 'Parables', art: '🌸' },
  { id: 'sky-sermons', name: 'Sermons', type: 'Sermons', art: '🔔' },
];

/** Makes one badge. */
function badge(group: BadgeGroup, id: string, name: string, howToEarn: string, art: string): Badge {
  return { id, name, howToEarn, group, art };
}

/** Every badge, in the order shown. */
export const BADGES: readonly Badge[] = [
  badge('Lessons', 'first-batch', 'First Batch', 'Finish your first lesson.', '🍪'),
  badge('Lessons', 'bakers-dozen', "Baker's Dozen", 'Finish 13 lessons.', '🧁'),
  badge('Lessons', 'whole-book', 'Whole Book', 'Finish every lesson in one book of the Bible.', '📖'),
  badge('Lessons', 'old-and-new', 'Old and New', 'Finish a lesson in the Old Testament and one in the New Testament.', '📚'),
  ...CONSTELLATION_BADGES.map((k) => badge('Lessons', k.id, k.name, `Finish a lesson in the ${k.name} constellation.`, k.art)),
  badge('Lessons', 'front-to-back', 'Front to Back', 'Finish every lesson in the Bible.', '🏆'),
  badge('Lessons', 'no-burnt-cookies', 'No Burnt Cookies', 'Answer every question in a lesson right the first time.', '⭐'),

  badge('Streak', 'streak-3', 'Spark', 'Keep a 3-day streak.', '✨'),
  badge('Streak', 'streak-7', 'Flame', 'Keep a 7-day streak.', '🕯️'),
  badge('Streak', 'streak-30', 'Bonfire', 'Keep a 30-day streak.', '🔥'),
  badge('Streak', 'streak-100', 'Pillar of Fire', 'Keep a 100-day streak.', '🌋'),
  badge('Streak', 'streak-365', 'Year of Bread', 'Keep a 365-day streak.', '🍞'),
  badge('Streak', 'back-at-it', 'Back at It', 'Start a new streak after losing one.', '🌅'),

  badge('Collections', 'people-10', 'Meet the Family · 10', 'Meet 10 Bible people.', '👪'),
  badge('Collections', 'people-50', 'Meet the Family · 50', 'Meet 50 Bible people.', '👪'),
  badge('Collections', 'people-100', 'Meet the Family · 100', 'Meet 100 Bible people.', '👪'),
  badge('Collections', 'people-all', 'Meet the Family · All', 'Meet every Bible person in the lessons.', '👑'),
  badge('Collections', 'mighty-few', 'Mighty Few', 'Meet someone the Bible names fewer than 5 times.', '🔎'),
  badge('Collections', 'places-10', 'Traveler', 'Visit 10 places.', '🧭'),
  badge('Collections', 'places-50', 'Pilgrim', 'Visit 50 places.', '🗺️'),
  badge('Collections', 'prophecy-1', 'Prophecy Hunter', 'Join your first prophecy link.', '🔗'),
  badge('Collections', 'prophecy-25', 'Fulfilled', 'Join 25 prophecy links.', '🌟'),
  badge('Collections', 'prayers-10', 'Prayer Keeper', 'Collect 10 prayers.', '🙏'),
  badge('Collections', 'instructions-25', 'Instruction Follower', 'Collect 25 instructions.', '🪧'),

  badge('Verse Memory', 'memory-1', 'Hidden in My Heart', 'Memorize your first verse.', '💛'),
  badge('Verse Memory', 'memory-10', 'Hidden in My Heart · 10', 'Memorize 10 verses.', '💛'),
  badge('Verse Memory', 'memory-50', 'Hidden in My Heart · 50', 'Memorize 50 verses.', '💛'),
  badge('Verse Memory', 'memory-100', 'Hidden in My Heart · 100', 'Memorize 100 verses.', '💛'),
  badge('Verse Memory', 'psalm-singer', 'Psalm Singer', 'Memorize a whole psalm.', '🎶'),

  badge('Trivia and calls', 'quick-draw', 'Quick Draw', 'Answer a trivia question in under 3 seconds.', '⚡'),
  badge('Trivia and calls', 'trivia-champ', 'Trivia Champ', 'Win a family trivia game.', '🥇'),
  badge('Trivia and calls', 'study-together', 'Study Together', 'Finish a lesson with others on a voice call.', '🤝'),
  badge('Trivia and calls', 'host-10', 'Host with the Most', 'Host 10 voice calls, each at least 10 minutes long with at least one other person.', '📞'),

  badge('Papa Dorin and guests', 'curious-baker', 'Curious Baker', 'Ask Papa Dorin your first question.', '❓'),
  badge('Papa Dorin and guests', 'guest-list', 'Guest List', 'Chat with 5 different weekly guests.', '💬'),

  badge('Weekly Mystery', 'mystery-1', 'Detective', 'Solve your first Weekly Mystery.', '🕵️'),
  badge('Weekly Mystery', 'mystery-10', 'Case Closed', 'Solve 10 Weekly Mysteries.', '📕'),

  badge('Friends', 'friends-1', 'Bread Breaker', 'Add your first friend.', '🥖'),
  badge('Friends', 'friends-12', 'Full Table', 'Have 12 friends.', '🍽️'),
];
