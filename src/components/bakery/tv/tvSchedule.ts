// Works out what the always-on Bakery TV channel plays at a moment, and the guide of what comes next, the way the
// Constellations design does: the program list plays back to back, over and over, from a fixed start.

import type { TvProgram } from '@/data/sample/bakeryTv';

/** What is on at a moment: which program, how far into it, and when it started. */
export type TvNow = {
  /** Where the program is in the list. */
  index: number;
  /** Seconds since the program started. */
  offset: number;
  /** When the program started (whole milliseconds since 1970), the same every second it plays. */
  startedAt: number;
};

/** One row of the guide. */
export type GuideRow = {
  /** The program. */
  program: TvProgram;
  /** When it starts (milliseconds since 1970). It also names the showing for its reminder. */
  startsAt: number;
  /** "Now playing", "Up next" or "Later". */
  label: string;
};

/** How many programs the guide lists, the playing one included. */
const GUIDE_ROWS = 6;

/** Finds the program playing at `now` (milliseconds since 1970) on a channel that started at `epoch`. */
export function tvWhere(programs: readonly TvProgram[], epoch: number, now: number): TvNow {
  const lapMs = programs.reduce((sum, p) => sum + p.seconds, 0) * 1000;
  let startedAt = epoch + Math.floor((now - epoch) / lapMs) * lapMs;
  for (let index = 0; index < programs.length; index++) {
    const endsAt = startedAt + programs[index].seconds * 1000;
    if (now < endsAt) return { index, offset: (now - startedAt) / 1000, startedAt };
    startedAt = endsAt;
  }
  return { index: 0, offset: 0, startedAt: now };
}

/** The guide: the playing program, then the next five, each with its start time. */
export function guideRows(programs: readonly TvProgram[], on: TvNow): GuideRow[] {
  let startsAt = on.startedAt;
  const rows: GuideRow[] = [];
  for (let k = 0; k < GUIDE_ROWS; k++) {
    const program = programs[(on.index + k) % programs.length];
    rows.push({ program, startsAt, label: k === 0 ? 'Now playing' : k === 1 ? 'Up next' : 'Later' });
    startsAt += program.seconds * 1000;
  }
  return rows;
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
