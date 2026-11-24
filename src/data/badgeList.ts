// Every badge the app offers, in the order the Profile page shows them, as the owner approved them (2026-11-23).
// Only names and rules live here. Whether a person has earned one is decided by the server (badgeSource.ts).

import type { Badge, BadgeGroup } from '@/types/badges';

/** The groups, in the order the Profile page shows them. */
export const BADGE_GROUPS: readonly BadgeGroup[] = ['Lessons', 'Streak', 'Collections', 'Verse Memory', 'Trivia and calls', 'Papa Dorin and guests', 'Weekly Mystery', 'Friends'];

/** A part of the Bible, by the first and last book's place in the Bible (Genesis is 1). */
export type BiblePart = { id: string; name: string; where: string; first: number; last: number; art: string };

/** The parts of the Bible, each with its own badge for finishing a lesson in it. */
export const BIBLE_PARTS: readonly BiblePart[] = [
  { id: 'part-law', name: 'The Law', where: 'the Law (Genesis to Deuteronomy)', first: 1, last: 5, art: '📜' },
  { id: 'part-history', name: 'History', where: 'the history books (Joshua to Esther)', first: 6, last: 17, art: '🏰' },
  { id: 'part-wisdom', name: 'Poetry and Wisdom', where: 'the poetry and wisdom books (Job to Song of Solomon)', first: 18, last: 22, art: '🎵' },
  { id: 'part-prophets', name: 'The Prophets', where: 'the Prophets (Isaiah to Malachi)', first: 23, last: 39, art: '🔥' },
  { id: 'part-gospels', name: 'The Gospels', where: 'the Gospels (Matthew to John)', first: 40, last: 43, art: '✝️' },
  { id: 'part-church', name: 'The Early Church', where: 'Acts', first: 44, last: 44, art: '⛵' },
  { id: 'part-letters', name: 'The Letters', where: 'the Letters (Romans to Jude)', first: 45, last: 65, art: '✉️' },
  { id: 'part-revelation', name: 'Revelation', where: 'Revelation', first: 66, last: 66, art: '👑' },
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
  ...BIBLE_PARTS.map((p) => badge('Lessons', p.id, p.name, `Finish a lesson in ${p.where}.`, p.art)),
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
