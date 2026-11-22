// The call's Settings: a round glass button with a gear in the call header, and the sheet it opens with the Tap
// to talk switch, for people who find holding Papa Dorin's picture hard. The asking screen's "Hard to hold?" line
// points here. The setting is saved on this device.

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { GlassSheet } from '@/components/common/GlassSheet';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { setTapToTalk, useTapToTalk } from './useTapToTalk';

/** The browser's switch has its own "on" knob color (teal unless told); this keeps it white like the phone's. */
const WEB_THUMB = (Platform.OS === 'web' ? { activeThumbColor: text.onDark } : {}) as object;

/** The round Settings button, which opens the call's settings. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => {
          playSound('tap');
          setOpen(true);
        }}
        style={styles.round}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={text.onDark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={3} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </Svg>
      </Pressable>
      <CallSettingsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Props for the settings sheet. */
type CallSettingsSheetProps = {
  /** True while it shows. */
  open: boolean;
  /** Closes it. */
  onClose: () => void;
};

/** The sheet with the Tap to talk switch. */
function CallSettingsSheet({ open, onClose }: CallSettingsSheetProps) {
  const tapToTalk = useTapToTalk();
  return (
    <GlassSheet open={open} onClose={onClose} title="Settings">
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: tapToTalk }} onPress={() => setTapToTalk(!tapToTalk)} style={styles.row}>
        <View style={styles.words}>
          <Text style={styles.name}>Tap to talk</Text>
          <Text style={styles.line}>
            {tapToTalk
              ? 'Tap Papa Dorin’s picture to start asking him, and tap Done when you’re finished.'
              : 'For anyone who finds holding hard: tap his picture once to start and once to finish.'}
          </Text>
        </View>
        <Switch
          value={tapToTalk}
          onValueChange={setTapToTalk}
          trackColor={{ false: call.meterOff, true: call.listening }}
          thumbColor={text.onDark}
          {...WEB_THUMB}
          accessibilityLabel="Tap to talk"
        />
      </Pressable>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, backgroundColor: call.glassFillSoft, paddingVertical: 14, paddingHorizontal: 16, marginTop: 6 },
  words: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.black, fontSize: 16.5, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: text.onDarkSoft },
});
