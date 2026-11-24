// The rewards waiting to be shown: badges earned or leveled up whose pop-up the person hasn't seen yet. They wait
// here until an activity is over (RewardHost decides when), then show one after another, each only once. It also
// notes the day each level is first reached, for the badge page.

import { useCallback, useEffect, useMemo } from 'react';
import { useBadges } from '@/data/queries/badges';
import { markCelebrated, noteReached, useRewardRecord } from '@/data/storage/rewardStore';
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

/** The rewards waiting, in list order, and how to mark one as seen. RewardHost is the one place that calls this. */
export function useWaitingRewards(): { rewards: Reward[]; celebrate: (reward: Reward) => void } {
  const { badges, ready } = useBadges();
  const record = useRewardRecord();

  // Notes newly reached levels with today's date, once the badges are the whole truth.
  useEffect(() => {
    if (ready) noteReached(reachedKeys(badges));
  }, [ready, badges]);

  const rewards = useMemo<Reward[]>(() => {
    if (!record) return [];
    const seen = new Set(record.celebrated);
    const waiting: Reward[] = [];
    for (const badge of badges) {
      for (let level = 1; level <= badge.level; level++) {
        if (!seen.has(levelKey(badge.id, level))) waiting.push({ kind: 'badge', badge, level });
      }
    }
    return waiting;
  }, [badges, record]);

  /** Marks a reward as seen, so it never shows again. */
  const celebrate = useCallback((reward: Reward) => markCelebrated(levelKey(reward.badge.id, reward.level)), []);

  return { rewards, celebrate };
}

/** The day a badge reached a level, like "OCT 16, 2026", or null when it isn't known (reached before dates were kept). */
export function useReachedOn(badgeId: string, level: number): string | null {
  const when = useRewardRecord()?.reached[levelKey(badgeId, level)];
  return when ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : null;
}
