// Bakery TV's schedule for pages. The page opens on the schedule saved on the phone, then the newest one is
// downloaded in the background and saved. It is downloaded again only when it is old or running out.

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { readSavedShowings, saveShowings } from '@/data/storage/tvStore';
import { downloadTvShowings } from '@/data/tvSource';
import type { TvShowing } from '@/types/tv';

/** How long a downloaded schedule counts as fresh (30 minutes). */
const FRESH_MS = 30 * 60 * 1000;

/** The shortest wait between two top-up downloads (1 minute), so a short schedule is never asked for over and over. */
const RETRY_MS = 60 * 1000;

/** When fewer showings than this are left to come (about an hour), the schedule is topped up. */
const LOW_SHOWINGS = 8;

/** Downloads the schedule and saves it on the phone. */
async function loadShowings(): Promise<TvShowing[]> {
  const showings = await downloadTvShowings();
  saveShowings(showings);
  return showings;
}

/**
 * The showings that have not ended at `now` (milliseconds since 1970), in order. When only a few are left on the
 * phone, a new download is asked for.
 */
export function useTvShowings(now: number) {
  const query = useQuery({
    queryKey: ['tv', 'showings'],
    queryFn: loadShowings,
    initialData: readSavedShowings,
    // The saved copy is shown at once but counts as old, so a fresh one is downloaded when the page opens.
    initialDataUpdatedAt: 0,
    staleTime: FRESH_MS,
  });
  const { refetch, isFetching, dataUpdatedAt, data } = query;
  const left = data.filter((s) => s.endsAt > now).length;

  // Tops the schedule up when only a few showings are left on the phone, at most once a minute.
  useEffect(() => {
    if (left < LOW_SHOWINGS && !isFetching && Date.now() - dataUpdatedAt > RETRY_MS) void refetch();
  }, [left, isFetching, dataUpdatedAt, refetch]);

  return query;
}
