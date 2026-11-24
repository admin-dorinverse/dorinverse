// The person's badges: every badge with the level reached, earned ones first, for the Profile page, the Badges page
// and the reward pop-ups. Everything it reads is already on the phone, so it is ready at once. At hookup the server
// sends the levels reached.

import { useMemo } from 'react';
import { BADGES, levelReached } from '@/data/badgeList';
import { earnedLevels } from '@/data/badgeSource';
import { useLessonOutlines } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import { samplePlayer } from '@/data/sample/player';
import { readMysteryRecord } from '@/data/storage/mysteryStore';
import type { ShownBadge } from '@/types/badges';

/** Every badge and how far the person has gone. */
export type BadgeShelf = {
  /** Every badge: the earned ones first, then the rest, each in list order. */
  badges: ShownBadge[];
  /** True once the lessons and progress are loaded, so the levels are the whole truth. */
  ready: boolean;
};

/** No collected things yet, kept the same so the badges aren't worked out again while progress loads. */
const NOTHING: ReadonlySet<string> = new Set();

/** True when the person guessed this week's or last week's Weekly Word. DEVELOPMENT ONLY: read from the phone. */
function guessedAWord(): boolean {
  const r = readMysteryRecord();
  return r != null && (r.solvedOn != null || r.last?.solvedOn != null);
}

/** Every badge with its level. Worked out again only when what it reads changes. */
export function useBadges(): BadgeShelf {
  const outlines = useLessonOutlines().data ?? null;
  const progress = useProgress().data;

  return useMemo(() => {
    const earned = earnedLevels({
      outlines,
      baked: progress?.baked ?? {},
      collected: progress?.collected ?? NOTHING,
      wordGuessed: guessedAWord(),
      streak: samplePlayer.streak,
    });
    const shown = BADGES.map((b) => ({ ...b, level: levelReached(b, earned) }));
    const badges = [...shown.filter((b) => b.level > 0), ...shown.filter((b) => b.level === 0)];
    return { badges, ready: outlines != null && progress != null };
  }, [outlines, progress]);
}
