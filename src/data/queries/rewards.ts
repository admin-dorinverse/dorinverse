// The rewards waiting to be shown: badges earned or leveled up whose pop-up the person hasn't seen yet. They wait
// here until an activity is over (RewardHost decides when), then show one after another, each only once.

import { useCallback, useEffect, useMemo } from 'react';
import { useBadges } from '@/data/queries/badges';
import { markCelebrated, useCelebrated } from '@/data/storage/rewardStore';
import type { ShownBadge } from '@/types/badges';

/** One reward pop-up: a badge reaching a level. The streak going up joins here once the server keeps the streak. */
export type Reward = { kind: 'badge'; badge: ShownBadge; level: number };

/** The saved key for a badge's level, like "baker:2". */
function levelKey(badgeId: string, level: number): string {
  return `${badgeId}:${level}`;
}

/** Every level key the person has reached. */
function reachedKeys(badges: readonly ShownBadge[]): string[] {
  return badges.flatMap((b) => Array.from({ length: b.level }, (_, i) => levelKey(b.id, i + 1)));
}

/** The rewards waiting, in list order, and how to mark one as seen. */
export function useWaitingRewards(): { rewards: Reward[]; celebrate: (reward: Reward) => void } {
  const { badges, ready } = useBadges();
  const celebrated = useCelebrated();

  // The first time, everything already reached counts as celebrated, so an existing baker isn't flooded with pop-ups.
  useEffect(() => {
    if (ready && celebrated === null) markCelebrated(reachedKeys(badges));
  }, [ready, celebrated, badges]);

  const rewards = useMemo<Reward[]>(() => {
    if (!celebrated) return [];
    const waiting: Reward[] = [];
    for (const badge of badges) {
      for (let level = 1; level <= badge.level; level++) {
        if (!celebrated.has(levelKey(badge.id, level))) waiting.push({ kind: 'badge', badge, level });
      }
    }
    return waiting;
  }, [badges, celebrated]);

  /** Marks a reward as seen, so it never shows again. */
  const celebrate = useCallback((reward: Reward) => markCelebrated([levelKey(reward.badge.id, reward.level)]), []);

  return { rewards, celebrate };
}
