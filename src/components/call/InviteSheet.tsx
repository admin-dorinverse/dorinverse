// The call header's Invite button, as in the call mockups (a glass pill with a plus, top right), and the sheet it
// opens: the call's link, a Share button (the phone's or browser's share sheet) and, in the browser, Copy link
// with a short "Copied" note. Anyone on the call can invite.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GlassSheet } from '@/components/common/GlassSheet';
import { playSound } from '@/components/common/sounds';
import { inviteLink } from '@/data/callLinks';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { CAN_COPY, canShare, copyInvite, shareInvite } from './inviteShare';

/** How long "Copied" shows after copying. */
const COPIED_MS = 2000;

/** Props for the Invite button. */
type InviteButtonProps = {
  /** The call's name, for its link. */
  room: string;
};

/** The Invite pill, which opens the invite sheet. */
export function InviteButton({ room }: InviteButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Invite people"
        onPress={() => {
          playSound('tap');
          setOpen(true);
        }}
        style={styles.pill}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={text.onDark} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
        <Text style={styles.pillText}>Invite</Text>
      </Pressable>
      <InviteSheet open={open} link={inviteLink(room)} onClose={() => setOpen(false)} />
    </>
  );
}

/** Props for the invite sheet. */
type InviteSheetProps = {
  /** True while it shows. */
  open: boolean;
  /** The link to send. */
  link: string;
  /** Closes it. */
  onClose: () => void;
};

/** The sheet with the link and the ways to send it. */
function InviteSheet({ open, link, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const sharing = canShare();

  // "Copied" fades back to "Copy link" after a moment.
  useEffect(() => {
    if (!copied) return;
    const back = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(back);
  }, [copied]);

  /** Opens the share sheet straight from the tap (Safari only allows it then). */
  const share = () => {
    setNote('');
    shareInvite(link).catch(() => setNote('Sharing didn’t open. Copy the link instead.'));
  };

  /** Copies the link and says so. */
  const copy = () => {
    setNote('');
    void copyInvite(link).then((ok) => (ok ? setCopied(true) : setNote('Couldn’t copy. Hold the link above to copy it.')));
  };

  return (
    <GlassSheet open={open} onClose={onClose} title="Invite people">
      <Text style={styles.line}>Send this link. They can join from any phone or computer, no account needed.</Text>
      <View style={styles.linkBox}>
        <Text style={styles.link} selectable numberOfLines={2}>
          {link}
        </Text>
      </View>
      <View style={styles.buttons}>
        {sharing && (
          <Pressable accessibilityRole="button" onPress={share} style={styles.share}>
            <Text style={styles.shareText}>Share link</Text>
          </Pressable>
        )}
        {CAN_COPY && (
          <Pressable accessibilityRole="button" onPress={copy} style={[styles.copy, !sharing && styles.copyMain]}>
            <Text style={[styles.copyText, !sharing && styles.shareText]}>{copied ? 'Copied ✓' : 'Copy link'}</Text>
          </Pressable>
        )}
      </View>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  pill: { height: 40, borderRadius: 20, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: text.onDarkSoft, marginBottom: 14 },
  linkBox: { borderRadius: 16, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFillSoft, paddingVertical: 12, paddingHorizontal: 14 },
  link: { fontFamily: fonts.bold, fontSize: 13.5, color: text.goldNote },
  buttons: { gap: 10, marginTop: 16 },
  share: { height: 54, borderRadius: 27, backgroundColor: call.talking, alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 0 ${call.joinShadow}` },
  shareText: { fontFamily: fonts.black, fontSize: 17, color: call.ink },
  copy: { height: 50, borderRadius: 25, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, alignItems: 'center', justifyContent: 'center' },
  copyMain: { height: 54, borderRadius: 27, borderWidth: 0, backgroundColor: call.talking, boxShadow: `0 4px 0 ${call.joinShadow}` },
  copyText: { fontFamily: fonts.extraBold, fontSize: 15.5, color: text.onDark },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.goldNote, textAlign: 'center', marginTop: 10 },
});
