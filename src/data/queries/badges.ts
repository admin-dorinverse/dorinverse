// The person's badges for the Profile page: every badge in its group, each marked earned or not. Everything it reads
// is already on the phone, so the badges show at once. At hookup the earned list comes from the server instead.

import { useMemo } from 'react';
import { BADGE_GROUPS, BADGES } from '@/data/badgeList';
import { earnedBadges } from '@/data/badgeSource';
import { useFriends } from '@/data/queries/friends';
import { useLessonOutlines } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import { samplePlayer } from '@/data/sample/player';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { readMysteryRecord } from '@/data/storage/mysteryStore';
import type { BadgeShelfGroup } from '@/types/badges';

/** The badges, grouped, and how many are earned. */
export type BadgeShelf = { groups: BadgeShelfGroup[]; earnedCount: number; total: number };

/** No collected things yet, kept the same so the badges aren't worked out again while progress loads. */
const NOTHING: ReadonlySet<string> = new Set();

/** True when the person solved this week's or last week's mystery. DEVELOPMENT ONLY: read from the phone. */
function solvedAMystery(): boolean {
  const r = readMysteryRecord();
  return r != null && (r.solvedOn != null || r.last?.solvedOn != null);
}

/** Every badge in its group, earned or not. Worked out again only when what it reads changes. */
export function useBadges(): BadgeShelf {
  const outlines = useLessonOutlines().data ?? null;
  const progress = useProgress().data;
  const memorized = useMemorizedVerses();
  const friendCount = useFriends().data?.length ?? null;

  return useMemo(() => {
    const earned = earnedBadges({
      outlines,
      baked: progress?.baked ?? {},
      collected: progress?.collected ?? NOTHING,
      memorized,
      mysterySolved: solvedAMystery(),
      friendCount,
      streak: samplePlayer.streak,
    });
    const groups = BADGE_GROUPS.map((group) => ({
      group,
      badges: BADGES.filter((b) => b.group === group).map((b) => ({ ...b, earned: earned.has(b.id) })),
    }));
    return { groups, earnedCount: earned.size, total: BADGES.length };
  }, [outlines, progress, memorized, friendCount]);
}
