// Shows waiting rewards one after another, but only on a calm page: never during a lesson, trivia, a voice call, a
// chat or any other activity. A badge earned mid-activity waits until the person is back on a calm page, like the
// lesson's page once the whole lesson is done, then pops up right after.

import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { RewardPopup } from '@/components/common/RewardPopup';
import { useKitchenDone } from '@/data/queries/progress';
import { useWaitingRewards, type Reward } from '@/data/queries/rewards';
import { KITCHEN_STEPS } from '@/types/lesson';

/** Pages where nothing is going on, by exact address: the three tabs, the Profile, Badges and Notifications. */
const CALM_PAGES = new Set(['/', '/collections', '/bible-crew', '/profile', '/badges', '/notifications']);

/** Calm pages by the start of their address: lesson lists and the collections. Anything not listed is an activity. */
const CALM_STARTS = ['/badge/', '/constellation/', '/characters', '/places', '/prophecy', '/prayers', '/instructions', '/connections', '/universe/'];

/** How long to wait on a calm page before the first pop-up, so the page has finished sliding in. */
const SETTLE_MS = 700;

/** The gap between one pop-up and the next. */
const NEXT_MS = 200;

/** The lesson number when the address is a lesson's own page, like "/lesson/12", or null. */
function lessonPage(pathname: string): number | null {
  const found = pathname.match(/^\/lesson\/(\d+)$/);
  return found ? Number(found[1]) : null;
}

/** True when the page is calm: listed above, or a lesson's page once every step of that lesson is done. */
function isCalm(pathname: string, lessonDone: boolean): boolean {
  if (CALM_PAGES.has(pathname) || CALM_STARTS.some((start) => pathname.startsWith(start))) return true;
  return lessonPage(pathname) != null && lessonDone;
}

/** Shows waiting rewards on calm pages. Mounted once, for signed-in people. */
export function RewardHost() {
  const pathname = usePathname();
  const lesson = lessonPage(pathname);
  const kitchenDone = useKitchenDone(lesson ?? 0) ?? 0;
  const calm = isCalm(pathname, lesson != null && kitchenDone >= KITCHEN_STEPS.length);
  const { rewards, celebrate } = useWaitingRewards();
  const [showing, setShowing] = useState<Reward | null>(null);
  // True right after a pop-up closes, so the next one follows quickly instead of waiting for the page to settle.
  const [chaining, setChaining] = useState(false);

  useEffect(() => {
    if (!calm || showing || rewards.length === 0) return;
    const wait = setTimeout(() => setShowing(rewards[0]), chaining ? NEXT_MS : SETTLE_MS);
    return () => clearTimeout(wait);
  }, [calm, showing, rewards, chaining]);

  if (!showing) return null;
  return (
    <RewardPopup
      reward={showing}
      onContinue={() => {
        celebrate(showing);
        setChaining(rewards.length > 1);
        setShowing(null);
      }}
    />
  );
}
