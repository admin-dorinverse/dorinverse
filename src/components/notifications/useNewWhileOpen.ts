// Keeps track of which news is new while the Notifications page is open, and marks what the page shows as seen so
// the bell's dot goes away. Marking changes those items to "seen" at once, so the new ones are copied first to stay
// highlighted.

import { useEffect, useRef, useState } from 'react';
import { markNotificationsRead } from '@/data/queries/friends';
import type { FriendNotification } from '@/types/friends';

/** The news list last looked at, and the ids that were new in any list seen so far. */
type NewSoFar = { news: FriendNotification[] | undefined; fresh: ReadonlySet<string> };

/**
 * The ids of news that was new when it reached the open page. Once the newest list is in (not while it is still
 * being fetched), everything in it is marked seen. A failed mark is quiet: the dot stays until the page opens again.
 */
export function useNewWhileOpen(news: FriendNotification[] | undefined, fetching: boolean, unread: number): ReadonlySet<string> {
  const [soFar, setSoFar] = useState<NewSoFar>({ news: undefined, fresh: new Set() });
  const marking = useRef(false);

  // Each new list is looked at once, while drawing, so the new rows are copied before marking makes them "seen".
  if (news !== soFar.news) {
    const unseen = news?.filter((item) => !item.read).map((item) => item.id) ?? [];
    setSoFar({ news, fresh: unseen.length > 0 ? new Set([...soFar.fresh, ...unseen]) : soFar.fresh });
  }

  useEffect(() => {
    if (fetching || !news || marking.current) return;
    if (unread === 0 && news.every((item) => item.read)) return;
    marking.current = true;
    // The list comes newest first, so only news up to its first item is marked; anything newer stays unseen.
    markNotificationsRead(news[0]?.createdAt ?? null)
      .catch(() => {})
      .finally(() => {
        marking.current = false;
      });
  }, [news, fetching, unread]);

  return soFar.fresh;
}
