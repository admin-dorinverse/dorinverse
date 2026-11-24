// Works out what the always-on Bakery TV channel plays at a moment, and the guide of what comes next, from the
// schedule the server writes. Also small helpers for showing times and video names.

import { bakeryTvShowColors } from '@/theme/bakeryTvColors';
import type { TvShowing } from '@/types/tv';

/** What is on at a moment. */
export type TvNow = {
  /** Where the showing playing now is in the list, or -1 when nothing is on (between showings or no schedule). */
  index: number;
  /** Seconds since it started. */
  offset: number;
};

/** One row of the guide. */
export type GuideRow = {
  /** The showing. */
  showing: TvShowing;
  /** "Now playing", "Up next" or "Later". */
  label: string;
};

/** How many showings the guide lists, the playing one included. */
export const GUIDE_ROWS = 6;

/** Finds the showing playing at `now` (milliseconds since 1970). The list is in order and has no ended showings. */
export function tvWhere(showings: readonly TvShowing[], now: number): TvNow {
  const index = showings.findIndex((s) => now < s.endsAt);
  if (index < 0 || showings[index].startsAt > now) return { index: -1, offset: 0 };
  return { index, offset: (now - showings[index].startsAt) / 1000 };
}

/** The guide: the playing showing (or the next one when nothing is on), then the ones after it. */
export function guideRows(showings: readonly TvShowing[], now: number): GuideRow[] {
  const first = showings.findIndex((s) => now < s.endsAt);
  if (first < 0) return [];
  const playing = showings[first].startsAt <= now;
  return showings.slice(first, first + GUIDE_ROWS).map((showing, k) => ({
    showing,
    label: playing && k === 0 ? 'Now playing' : k === (playing ? 1 : 0) ? 'Up next' : 'Later',
  }));
}

/** A video's color pair, always the same for the same video. */
export function showColors(videoId: string): readonly [string, string] {
  let sum = 0;
  for (let k = 0; k < videoId.length; k++) sum = (sum * 31 + videoId.charCodeAt(k)) >>> 0;
  return bakeryTvShowColors[sum % bakeryTvShowColors.length];
}

/** A video's name without YouTube's long tail, like "Book of Genesis (Part 1)". */
export function shortTitle(title: string): string {
  return title.replace(/\s*Summary: A Complete Animated Overview/i, '').trim();
}

/** Seconds as minutes and seconds, like "7:22". */
export function mmss(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A moment as a clock time in the phone's style, like "3:05 PM". */
export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
