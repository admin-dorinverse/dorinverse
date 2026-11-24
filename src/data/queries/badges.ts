// The person's badges: every badge, earned ones first, each marked earned or not, for the Profile page and the reward
// pop-ups. Everything it reads is already on the phone, so it is ready at once. At hookup the server sends the list.

import { useMemo } from 'react';
import { BADGES } from '@/data/badgeList';
import { earnedBadges } from '@/data/badgeSource';
import { useFriends } from '@/data/queries/friends';
import { useLessonOutlines } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import { samplePlayer } from '@/data/sample/player';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { readMysteryRecord } from '@/data/storage/mysteryStore';
import type { BadgeId, ShownBadge } from '@/types/badges';

/** Every badge, and which are earned. */
export type BadgeShelf = {
  /** Every badge: the earned ones first, then the rest, each in list order. */
  badges: ShownBadge[];
  /** The ids of the earned badges. */
  earned: ReadonlySet<BadgeId>;
  /** True once the lessons and progress are loaded, so the earned list is the whole truth. */
  ready: boolean;
};

/** No collected things yet, kept the same so the badges aren't worked out again while progress loads. */
const NOTHING: ReadonlySet<string> = new Set();

/** True when the person solved this week's or last week's mystery. DEVELOPMENT ONLY: read from the phone. */
function solvedAMystery(): boolean {
  const r = readMysteryRecord();
  return r != null && (r.solvedOn != null || r.last?.solvedOn != null);
}

/** Every badge, earned or not. Worked out again only when what it reads changes. */
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
    const shown = BADGES.map((b) => ({ ...b, earned: earned.has(b.id) }));
    const badges = [...shown.filter((b) => b.earned), ...shown.filter((b) => !b.earned)];
    return { badges, earned, ready: outlines != null && progress != null };
  }, [outlines, progress, memorized, friendCount]);
}
