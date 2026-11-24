// One row of the Bakery TV guide: a strip in the video's color, its start time, its name with "Now playing",
// "Up next" or "Later" and its length, and, for videos still to come, a "Remind me" button.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { bakeryTv, bakeryTvSize } from '@/theme/bakeryTvColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { clockTime, mmss, shortTitle, showColors, type GuideRow } from './tvSchedule';

/** Props for a guide row. */
type TvGuideRowProps = {
  /** The showing and its label. */
  row: GuideRow;
  /** True for the video playing now: it glows and has no button. */
  playing: boolean;
  /** True when a reminder is set for this showing. */
  reminded: boolean;
  /** Turns the reminder for this showing on or off. */
  onRemind: (showingId: string) => void;
};

/** A guide row. */
export const TvGuideRow = memo(function TvGuideRow({ row, playing, reminded, onRemind }: TvGuideRowProps) {
  const { showing, label } = row;
  const { program } = showing;
  const title = shortTitle(program.title);
  return (
    <View style={[styles.row, playing && styles.now]}>
      <View style={[styles.swatch, { backgroundColor: showColors(program.videoId)[1] }]} />
      <Text style={styles.time}>{clockTime(showing.startsAt)}</Text>
      <View style={styles.name}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.note}>
          {label} · {mmss(program.seconds)}
        </Text>
      </View>
      {!playing && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: reminded }}
          accessibilityLabel={`Remind me about ${title}`}
          onPress={() => {
            playSound('tap');
            onRemind(showing.id);
          }}
          style={[styles.remind, reminded && styles.remindSet]}
        >
          <Text style={[styles.remindText, reminded && styles.remindSetText]}>{reminded ? '✓ Set' : '🔔 Remind me'}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: bakeryTv.rowEdge,
    backgroundColor: bakeryTv.rowFill,
  },
  now: { borderColor: bakeryTv.nowEdge, boxShadow: bakeryTv.nowGlow },
  swatch: { width: bakeryTvSize.swatch.width, height: bakeryTvSize.swatch.height, borderRadius: 5 },
  time: { width: bakeryTvSize.timeWidth, fontFamily: fonts.extraBold, fontSize: 13, color: bakeryTv.time },
  name: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.black, fontSize: 15, color: bakeryTv.screenText },
  note: { fontFamily: fonts.bold, fontSize: 12.5, color: bakeryTv.note },
  remind: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: bakeryTv.remindEdge,
    backgroundColor: bakeryTv.remindFill,
  },
  remindSet: { backgroundColor: bakeryTv.accent, borderColor: bakeryTv.accent },
  remindText: { fontFamily: fonts.extraBold, fontSize: 12.5, color: bakeryTv.screenText },
  remindSetText: { color: bakeryTv.remindSetText },
});
