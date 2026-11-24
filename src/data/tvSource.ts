// Downloads Bakery TV's next showings from the database: the schedule (tv_schedule) with each slot's video
// (tv_program). The server builds the schedule; the phone only reads it.

import { database } from '@/data/database';
import type { TvShowing } from '@/types/tv';

/** How many showings one download takes: about seven hours of TV. */
const SHOWINGS_PER_DOWNLOAD = 50;

/** One schedule row as the database sends it. The video is null when the read rules hide it (a retired video). */
type ScheduleRow = {
  id: string;
  start_at: string;
  end_at: string;
  tv_program: { youtube_video_id: string; title: string; duration_seconds: number | null } | null;
};

/** The showing playing now and the ones after it, in order. Showings whose video is hidden are left out. */
export async function downloadTvShowings(): Promise<TvShowing[]> {
  const { data, error } = await database
    .from('tv_schedule')
    .select('id, start_at, end_at, tv_program(youtube_video_id, title, duration_seconds)')
    .gt('end_at', new Date().toISOString())
    .order('start_at')
    .limit(SHOWINGS_PER_DOWNLOAD)
    .overrideTypes<ScheduleRow[], { merge: false }>();
  if (error) throw error;
  return data.flatMap((row) => {
    const p = row.tv_program;
    if (!p || !p.duration_seconds) return [];
    return [
      {
        id: row.id,
        program: { videoId: p.youtube_video_id, title: p.title, seconds: p.duration_seconds },
        startsAt: Date.parse(row.start_at),
        endsAt: Date.parse(row.end_at),
      },
    ];
  });
}
