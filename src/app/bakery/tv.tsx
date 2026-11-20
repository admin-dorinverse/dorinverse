// Bakery TV, opened from the bakery: one channel that is always on. The TV shows what is playing now in the
// program's colors, and the guide under it lists the next programs with their times and "Remind me" buttons.
// The picture updates once a second while the page shows. The programs are sample data for now.

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TvGuideRow } from '@/components/bakery/tv/TvGuideRow';
import { TvScreen } from '@/components/bakery/tv/TvScreen';
import { guideRows, tvWhere } from '@/components/bakery/tv/tvSchedule';
import { useSecondTick } from '@/components/bakery/tv/useSecondTick';
import { DrillHeader } from '@/components/common/DrillHeader';
import { SAMPLE_TV_EPOCH, sampleTvPrograms } from '@/data/sample/bakeryTv';
import { reader } from '@/theme/colors';
import { gutter } from '@/theme/spacing';

/** The Bakery TV page. */
export default function BakeryTvPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useSecondTick();
  const on = tvWhere(sampleTvPrograms, SAMPLE_TV_EPOCH, now);
  // The guide changes only when a new program starts, not every second.
  const rows = useMemo(() => guideRows(sampleTvPrograms, { index: on.index, offset: 0, startedAt: on.startedAt }), [on.index, on.startedAt]);
  // Reminders only show on screen for now; they are not saved or sent.
  const [reminders, setReminders] = useState<ReadonlySet<number>>(() => new Set());

  /** Turns the reminder for one showing on or off. */
  const toggleReminder = useCallback((startsAt: number) => {
    setReminders((old) => {
      const next = new Set(old);
      if (next.has(startsAt)) next.delete(startsAt);
      else next.add(startsAt);
      return next;
    });
  }, []);

  return (
    <View style={styles.page}>
      <DrillHeader title="Bakery TV" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        <TvScreen program={sampleTvPrograms[on.index]} offset={on.offset} />
        <View style={styles.guide}>
          {rows.map((row, k) => (
            <TvGuideRow key={row.startsAt} row={row} playing={k === 0} reminded={reminders.has(row.startsAt)} onRemind={toggleReminder} />
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
