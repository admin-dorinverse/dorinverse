// The rewards waiting to be shown: badges earned whose pop-up the person hasn't seen yet. They wait here until an
// activity is over (RewardHost decides when), then show one after another, each only once.

import { useCallback, useEffect, useMemo } from 'react';
import { BADGES } from '@/data/badgeList';
import { useBadges } from '@/data/queries/badges';
import { markCelebrated, useCelebrated } from '@/data/storage/rewardStore';
import type { Badge } from '@/types/badges';

/** One reward pop-up. Only badges today; the streak going up joins here once the server keeps the streak. */
export type Reward = { kind: 'badge'; badge: Badge };

/** The rewards waiting, in list order, and how to mark one as seen. */
export function useWaitingRewards(): { rewards: Reward[]; celebrate: (reward: Reward) => void } {
  const { earned, ready } = useBadges();
  const celebrated = useCelebrated();

  // The first time, everything already earned counts as celebrated, so an existing baker isn't flooded with pop-ups.
  useEffect(() => {
    if (ready && celebrated === null) markCelebrated(earned);
  }, [ready, celebrated, earned]);

  const rewards = useMemo<Reward[]>(
    () => (celebrated ? BADGES.filter((b) => earned.has(b.id) && !celebrated.has(b.id)).map((badge) => ({ kind: 'badge', badge })) : []),
    [earned, celebrated],
  );

  /** Marks a reward as seen, so it never shows again. */
  const celebrate = useCallback((reward: Reward) => markCelebrated([reward.badge.id]), []);

  return { rewards, celebrate };
}
