// Bakery TV, opened from the bakery: one channel that is always on, playing the BibleProject videos on the
// schedule the server writes. The TV plays what is on now from the right second, and the guide under it lists the
// next videos with their times and "Remind me" buttons. The video stops when the page is hidden or the app closes.

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TvGuideRow } from '@/components/bakery/tv/TvGuideRow';
import { TvPlayer } from '@/components/bakery/tv/TvPlayer';
import { TvScreen } from '@/components/bakery/tv/TvScreen';
import { clockTime, guideRows, shortTitle, showColors, tvWhere } from '@/components/bakery/tv/tvSchedule';
import { usePageShowing } from '@/components/bakery/tv/usePageShowing';
import { useSecondTick } from '@/components/bakery/tv/useSecondTick';
import { DrillHeader } from '@/components/common/DrillHeader';
import { useTvShowings } from '@/data/queries/tv';
import { bakeryTvShowColors } from '@/theme/bakeryTvColors';
import { reader } from '@/theme/colors';
import { gutter } from '@/theme/spacing';

/** The Bakery TV page. */
export default function BakeryTvPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useSecondTick();
  const pageShowing = usePageShowing();
  const { data: showings, isFetching, isError } = useTvShowings(now);
  const on = tvWhere(showings, now);
  const current = on.index >= 0 ? showings[on.index] : null;
  // The video can end up to a minute before its slot does; the gap shows what comes next.
  const playing = current != null && on.offset < current.program.seconds;
  // The guide changes only when a showing ends, not every second.
  const firstLeft = showings.findIndex((s) => now < s.endsAt);
  const rows = useMemo(() => guideRows(showings, now), [showings, firstLeft]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reminders only show on screen for now; they are not saved or sent.
  const [reminders, setReminders] = useState<ReadonlySet<string>>(() => new Set());

  /** Turns the reminder for one showing on or off. */
  const toggleReminder = useCallback((showingId: string) => {
    setReminders((old) => {
      const next = new Set(old);
      if (next.has(showingId)) next.delete(showingId);
      else next.add(showingId);
      return next;
    });
  }, []);

  const next = rows.find((r) => r.showing.startsAt > now)?.showing;
  const card = next
    ? { colors: showColors(next.program.videoId), title: shortTitle(next.program.title), line: `Up next at ${clockTime(next.startsAt)}` }
    : { colors: bakeryTvShowColors[0], title: 'Bakery TV', line: isFetching ? 'Tuning in…' : isError ? 'Can’t reach Bakery TV right now' : 'Nothing on right now' };

  return (
    <View style={styles.page}>
      <DrillHeader title="Bakery TV" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        <TvScreen
          player={playing && pageShowing ? <TvPlayer key={current.id} videoId={current.program.videoId} startAt={on.offset} /> : undefined}
          {...card}
        />
        <View style={styles.guide}>
          {rows.map((row) => (
            <TvGuideRow
              key={row.showing.id}
              row={row}
              playing={row.showing.id === current?.id}
              reminded={reminders.has(row.showing.id)}
              onRemind={toggleReminder}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  body: { paddingHorizontal: gutter, paddingTop: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  guide: { marginTop: 16, gap: 8 },
});
