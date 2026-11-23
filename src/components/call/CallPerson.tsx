// People on the call, as in the call mockups: a round avatar with their initials in their own color, a gold ring
// and a sound-bars badge while they talk, a crossed-out mic badge while muted, and their name underneath. The grid
// uses the big size; the rows on the asking and answering screens use the small one. Tapping someone signed in
// on the app opens their friend page (see friendTap.ts).

import { useIsMuted, useIsSpeaking } from './livekit';
import { Track, type Participant } from 'livekit-client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { MicIcon } from './CallIcons';
import { useFriendTap } from './friendTap';

/** Up to two letters from a name: "Aunt Lisa" is "AL", "Mia" is "MI". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

/** The same color for the same name every time, so the joining screen's avatar matches the one on the call. */
export function colorOf(name: string): string {
  let sum = 0;
  for (const ch of name.trim().toLowerCase()) sum = (sum + ch.charCodeAt(0)) % call.avatars.length;
  return call.avatars[sum];
}

/** Props for a round avatar. */
type CallAvatarProps = {
  /** The name its initials come from. */
  name: string;
  /** Width and height. */
  size: number;
  /** True while they talk: gold ring and sound bars. */
  talking?: boolean;
  /** True while muted: the crossed-out mic badge. */
  muted?: boolean;
};

/** A round avatar with initials and its badges. */
export function CallAvatar({ name, size, talking = false, muted = false }: CallAvatarProps) {
  const badge = Math.round(size / 3);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorOf(name) }, talking && styles.talking]}>
      <Text style={[styles.initials, { fontSize: size / 3 }]}>{initialsOf(name)}</Text>
      {talking ? (
        <View style={[styles.badge, styles.talkBadge, { width: badge, height: badge, borderRadius: badge / 2 }]} accessibilityLabel="Talking">
          <View style={[styles.bar, { height: badge * 0.28 }]} />
          <View style={[styles.bar, { height: badge * 0.5 }]} />
          <View style={[styles.bar, { height: badge * 0.36 }]} />
        </View>
      ) : (
        muted && (
          <View style={[styles.badge, styles.mutedBadge, { width: badge, height: badge, borderRadius: badge / 2 }]} accessibilityLabel="Muted">
            <MicIcon color={text.onDark} size={badge * 0.55} off />
          </View>
        )
      )}
    </View>
  );
}

/** Props for one person on the call. */
type CallPersonProps = {
  /** The person. */
  person: Participant;
  /** What shows under their avatar instead of their name, like "You". */
  label?: string;
  /** A small gold note under the name, like "HOST" or "TALKING". */
  tag?: string;
  /** Avatar size: 84 in the grid, smaller in rows. */
  size?: number;
};

/** One person's avatar and name, lit up while they talk. Tapping a signed-in person opens their friend page. */
export function CallPerson({ person, label, tag, size = 84 }: CallPersonProps) {
  const talking = useIsSpeaking(person);
  const muted = useIsMuted({ participant: person, source: Track.Source.Microphone });
  const name = person.name || 'Guest';
  const small = size < 60;
  const openFriend = useFriendTap(person);
  return (
    <Pressable
      disabled={!openFriend}
      onPress={openFriend ?? undefined}
      accessibilityRole={openFriend ? 'button' : undefined}
      accessibilityLabel={openFriend ? `Open ${name}'s friend page` : undefined}
      style={[styles.cell, small ? styles.smallCell : styles.gridCell]}
    >
      <CallAvatar name={name} size={size} talking={talking} muted={muted} />
      <Text style={[styles.name, small && styles.smallName]} numberOfLines={1}>
        {label ?? name}
      </Text>
      {!small && (tag || talking) && <Text style={styles.tag}>{talking ? 'TALKING' : tag}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center' },
  gridCell: { width: '33.33%', gap: 8, paddingVertical: 9 },
  smallCell: { width: 56, gap: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  talking: { borderWidth: 3, borderColor: call.talking, boxShadow: `0 0 22px 6px ${call.talkingGlow}`, transform: [{ scale: 1.06 }] },
  initials: { fontFamily: fonts.black, color: call.ink },
  badge: { position: 'absolute', right: -4, bottom: -2, borderWidth: 2, borderColor: call.page, alignItems: 'center', justifyContent: 'center' },
  talkBadge: { flexDirection: 'row', gap: 2, backgroundColor: call.talking },
  mutedBadge: { backgroundColor: call.mutedBadge },
  bar: { width: 3, borderRadius: 2, backgroundColor: call.ink },
  name: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark, maxWidth: '92%' },
  smallName: { fontSize: 11.5, maxWidth: 56 },
  tag: { marginTop: -7, fontFamily: fonts.extraBold, fontSize: 10.5, letterSpacing: 0.8, color: text.goldNote },
});
