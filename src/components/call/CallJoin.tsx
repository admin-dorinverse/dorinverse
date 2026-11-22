// Joining the call, as in the call mockups' Joining screen: "YOU'RE INVITED" and the get-together's name, your
// initials avatar as you type your name, a mic check ("Say hi! We can hear you." with bars that move as you talk)
// and a Test sound button, who's already there, and Join or Join muted. The host starting a new call sees "YOUR
// GET-TOGETHER" and Start instead, with nobody there yet. In a phone's browser, a link opens the call in the app.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound, preloadSound } from '@/components/common/sounds';
import { whoIsHere } from '@/data/callSource';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { MicIcon } from './CallIcons';
import { CallAvatar } from './CallPerson';
import { OpenInApp } from './OpenInApp';
import { useMicLevel } from './useMicLevel';

/** The longest name, the same limit the call-pass function checks. */
const NAME_MAX = 24;

/** How many bars the mic check has. */
const BARS = 7;

/** Props for joining. */
type CallJoinProps = {
  /** The call's name, to see who's there; null when this person is starting a new call. */
  room: string | null;
  /** The get-together's name. */
  title: string;
  /** The line under it. */
  subtitle: string;
  /** True while the pass is on its way. */
  busy: boolean;
  /** What went wrong last time, or empty. */
  note: string;
  /** Joins with the typed name, muted or not. */
  onJoin: (name: string, muted: boolean) => void;
};

/** "Mom, Grandpa and Mia are here", or a line for an empty call. */
function hereLine(names: string[]): string {
  if (names.length === 0) return "No one's here yet. You'll be the first.";
  if (names.length === 1) return `${names[0]} is here`;
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are here`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more are here`;
}

/** The joining screen. */
export function CallJoin({ room, title, subtitle, busy, note, onJoin }: CallJoinProps) {
  const [name, setName] = useState('');
  const [here, setHere] = useState<string[] | null>(null);
  const mic = useMicLevel(BARS);
  // Room under the buttons for the phone's own bottom bar, so it never covers Start muted.
  const insets = useSafeAreaInsets();
  const ready = name.trim().length > 0 && !busy;

  // The bell (Test sound here, and Papa Dorin's bell on the call) loads now, so its first play isn't lost.
  useEffect(() => preloadSound('ding'), []);

  // Who's already on the call, asked once when the screen opens.
  useEffect(() => {
    if (!room) return;
    let gone = false;
    whoIsHere(room)
      .then((names) => !gone && setHere(names))
      .catch(() => !gone && setHere([]));
    return () => {
      gone = true;
    };
  }, [room]);

  /** Joins, after a tap sound. */
  const join = (muted: boolean) => {
    if (!ready) return;
    playSound('tap');
    onJoin(name.trim(), muted);
  };

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.top}>
        <Text style={styles.kicker}>{room ? 'YOU’RE INVITED' : 'YOUR GET-TOGETHER'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.center}>
        <CallAvatar name={name.trim() || '?'} size={112} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Your name (everyone will see it)</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={NAME_MAX}
          placeholder="Like Mom or Grandpa"
          placeholderTextColor={text.onDarkSoft}
          autoCapitalize="words"
          returnKeyType="go"
          onSubmitEditing={() => join(false)}
          style={styles.input}
        />
      </View>
      <View style={styles.mic}>
        <MicIcon color={text.goldNote} size={26} />
        <View style={styles.micWords}>
          <Text style={styles.micTitle}>{mic.failed ? 'Allow the microphone to talk' : 'Say hi! We can hear you.'}</Text>
          <View style={styles.meter} accessibilityElementsHidden>
            {Array.from({ length: BARS }, (_, i) => (
              <View key={i} style={[styles.meterBar, { height: 6 + ((i * 5) % 14) }, i < mic.lit && styles.meterOn]} />
            ))}
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => playSound('ding')} hitSlop={8} style={({ pressed }) => [styles.test, pressed && styles.testPressed]}>
          <Text style={styles.testText}>Test sound</Text>
        </Pressable>
      </View>
      {here && (
        <View style={styles.here}>
          {here.length > 0 && (
            <View style={styles.stack}>
              {here.slice(0, 3).map((n, i) => (
                <View key={`${n}-${i}`} style={[styles.stackItem, i > 0 && styles.overlap]}>
                  <CallAvatar name={n} size={34} />
                </View>
              ))}
            </View>
          )}
          <Text style={styles.hereText}>{hereLine(here)}</Text>
        </View>
      )}
      <View style={styles.space} />
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" disabled={!ready} onPress={() => join(false)} style={[styles.join, !ready && styles.off]}>
          {busy ? <ActivityIndicator color={call.ink} /> : <Text style={styles.joinText}>{room ? 'Join' : 'Start the call'}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!ready} onPress={() => join(true)} style={[styles.joinMuted, !ready && styles.off]}>
          <Text style={styles.joinMutedText}>{room ? 'Join muted' : 'Start muted'}</Text>
        </Pressable>
      </View>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
      {Platform.OS === 'web' && <Text style={styles.foot}>Joining in your browser. No account needed.</Text>}
      {room && <OpenInApp room={room} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: gutter + 4, paddingTop: 8, paddingBottom: 28, gap: 18, width: '100%', maxWidth: 480, alignSelf: 'center' },
  top: { alignItems: 'center', gap: 4 },
  kicker: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.4, color: call.kicker },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34, color: text.onDark, textAlign: 'center' },
  subtitle: { fontFamily: fonts.bold, fontSize: 14, color: text.onDarkSoft, textAlign: 'center' },
  center: { alignItems: 'center' },
  field: { gap: 8 },
  label: { fontFamily: fonts.extraBold, fontSize: 13.5, color: text.onDarkSoft },
  input: { height: 54, borderRadius: 18, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 16, fontFamily: fonts.bold, fontSize: 17, color: text.onDark },
  mic: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: call.glassFillSoft, paddingVertical: 12, paddingHorizontal: 14 },
  micWords: { flex: 1, gap: 6 },
  micTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 20 },
  meterBar: { width: 6, borderRadius: 3, backgroundColor: call.meterOff },
  meterOn: { backgroundColor: call.meterOn },
  test: { borderRadius: 999, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingVertical: 8, paddingHorizontal: 12 },
  testPressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  testText: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDark },
  here: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { flexDirection: 'row' },
  stackItem: { borderRadius: 19, borderWidth: 2, borderColor: call.page },
  overlap: { marginLeft: -8 },
  hereText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: text.onDarkSoft },
  space: { flex: 1, minHeight: 8 },
  buttons: { gap: 10 },
  join: { height: 58, borderRadius: 29, backgroundColor: call.talking, alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 0 ${call.joinShadow}` },
  joinText: { fontFamily: fonts.black, fontSize: 18, color: call.ink },
  joinMuted: { height: 50, borderRadius: 25, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, alignItems: 'center', justifyContent: 'center' },
  joinMutedText: { fontFamily: fonts.extraBold, fontSize: 15.5, color: text.onDark },
  off: { opacity: 0.5 },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.goldNote, textAlign: 'center' },
  foot: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft, textAlign: 'center' },
});
