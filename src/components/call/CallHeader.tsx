// The top of the call, as in the call mockups: the get-together's name, and under it a line like "6 here · 12:04"
// (how many people, and how long the call has gone). The clock ticks once a second. On the call screen it also
// has Settings and the Invite button at the right.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { InviteButton } from './InviteSheet';
import { SettingsButton } from './TapToTalkSettings';

/** Props for the call's top. */
type CallHeaderProps = {
  /** The get-together's name. */
  title: string;
  /** The line under it; when left out, it shows how many are here and the call's time. */
  line?: string;
  /** How many people are on the call. */
  count: number;
  /** The call's name; when given, Settings and the Invite button show at the right. */
  room?: string;
};

/** Minutes and seconds, like "12:04". */
function clockText(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The time since the page opened, redrawn once a second. */
function useCallClock(): string {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return clockText(now - start);
}

/** The call's name and its line, with Settings and Invite when `room` is given. */
export function CallHeader({ title, line, count, room }: CallHeaderProps) {
  const clock = useCallClock();
  return (
    <View style={styles.row}>
      <View style={styles.wrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.line}>{line ?? `${count} here · ${clock}`}</Text>
      </View>
      {room && (
        <>
          <SettingsButton />
          <InviteButton room={room} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
});
