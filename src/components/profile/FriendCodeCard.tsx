// The friend card that pops up over a dimmed Profile page when the QR button is tapped: the person's avatar on a soft
// panel, their username, "Dorinverse", and their QR code (the same web link as Share link, since phone cameras only
// open web links). Under it sit the gold Share link button and, on the phone, Save to Photos. Each person keeps one
// code for good.

import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { AuthButton } from '@/components/common/AuthButton';
import { GlassSurface } from '@/components/common/Glass';
import { PersonAvatar, avatarColorOf } from '@/components/common/PersonAvatar';
import { QrCode } from '@/components/common/QrCode';
import { SkyIcon } from '@/components/common/TabIcons';
import { playSound } from '@/components/common/sounds';
import { friendShareLink } from '@/data/friendLinks';
import { useMyFriendCode } from '@/data/queries/friends';
import { account } from '@/theme/accountColors';
import { glass, text } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { profile, profileSizes } from '@/theme/profileColors';
import { gutter, radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';
import { CAN_SAVE_CARD, saveFriendCard, type SavableCard } from './friendCardSave';
import { shareFriendLink } from './friendShare';

/** How the card comes in: a short rise and fade that slows to a stop, with no bounce. */
const CARD_IN = FadeInDown.duration(240).easing(Easing.out(Easing.cubic));

/** A short line under the card: all went well (like "Link copied"), or what went wrong. */
type CardNote = { kind: 'good' | 'problem'; words: string };

/** Waits until the screen has drawn twice, so the hidden ✕ is gone before the card's picture is taken. */
function afterNextDraw(): Promise<void> {
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
}

/** The square shown where the QR code goes until the code is known. It stays still. */
function QrWaiting() {
  return (
    <View style={styles.waiting} accessibilityLabel="Your code shows here once you’re online">
      <Text style={[textStyles.body, styles.waitingWords]}>Your code shows here once you’re online.</Text>
    </View>
  );
}

/** Props for the panel behind the avatar. */
type AvatarPanelProps = {
  /** The person's username, which picks the avatar and the panel's glow color. */
  username: string;
};

/** The soft panel with the big avatar, glowing in the avatar's own color, and two still gold sparkles. */
function AvatarPanel({ username }: AvatarPanelProps) {
  const backgroundImage = useMemo(() => {
    const glow = mixColor(avatarColorOf(username), profile.panelGlow);
    return `radial-gradient(ellipse at 50% 55%, ${glow}, rgba(0,0,0,0) 62%), linear-gradient(180deg, ${profile.panelTop}, ${profile.panelBottom})`;
  }, [username]);
  return (
    <View style={[styles.panel, { backgroundImage }]}>
      <View style={styles.sparkleLeft}>
        <SkyIcon color={text.goldNote} size={profileSizes.cardSparkle} />
      </View>
      <View style={styles.sparkleRight}>
        <SkyIcon color={text.goldNote} size={profileSizes.cardSparkle * 0.7} />
      </View>
      <PersonAvatar username={username} size={profileSizes.cardAvatar} />
    </View>
  );
}

/** Props for the friend card. */
type FriendCodeCardProps = {
  /** True while the card shows. */
  open: boolean;
  /** Closes the card. */
  onClose: () => void;
  /** The person's username, or empty while it is still unknown. */
  username: string;
};

/** The pop-up friend card with the QR code and Share link. Tapping outside, the ✕ or Android's back closes it. */
export function FriendCodeCard({ open, onClose, username }: FriendCodeCardProps) {
  const code = useMyFriendCode().data;
  const [note, setNote] = useState<CardNote | null>(null);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<SavableCard>(null);

  /** Closes the card and clears any note, so it opens fresh next time. */
  const close = () => {
    setNote(null);
    onClose();
  };

  /** Shares the friend link; in a browser with no share sheet it is copied instead. */
  const share = async () => {
    if (!code) return;
    setNote(null);
    try {
      const done = await shareFriendLink(friendShareLink(code));
      if (done === 'copied') setNote({ kind: 'good', words: 'Link copied. Paste it in a message to a friend.' });
    } catch (e) {
      setNote({ kind: 'problem', words: e instanceof Error ? e.message : 'Couldn’t share the link. Please try again.' });
    }
  };

  /** Saves the card to Photos, with the ✕ hidden so it isn't in the picture. Photos is asked for only now. */
  const save = async () => {
    if (!code || saving) return;
    setNote(null);
    setSaving(true);
    try {
      await afterNextDraw();
      const done = await saveFriendCard(cardRef);
      setNote(
        done === 'saved'
          ? { kind: 'good', words: 'Saved to Photos.' }
          : { kind: 'problem', words: 'To save your card, let Dorinverse add to your photos in your phone’s Settings.' },
      );
    } catch (e) {
      setNote({ kind: 'problem', words: e instanceof Error ? e.message : 'Couldn’t save to Photos. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.dim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        {open && (
          <Animated.View entering={CARD_IN} pointerEvents="box-none" style={styles.column}>
            <View ref={cardRef} collapsable={false}>
              <GlassSurface style={styles.card}>
                <AvatarPanel username={username} />
                <Text style={styles.name} numberOfLines={1}>
                  {username}
                </Text>
                <View style={styles.brand}>
                  <SkyIcon color={text.goldNote} size={profileSizes.cardSparkle} />
                  <Text style={styles.brandWord}>Dorinverse</Text>
                </View>
                {code ? (
                  <View style={styles.qrFrame} accessibilityRole="image" accessibilityLabel="Your friend code, as a QR code">
                    <QrCode value={friendShareLink(code)} size={profileSizes.qr} />
                  </View>
                ) : (
                  <QrWaiting />
                )}
                {!saving && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={() => {
                      playSound('tap');
                      close();
                    }}
                    hitSlop={8}
                    style={styles.close}
                  >
                    <Text style={styles.closeText}>✕</Text>
                  </Pressable>
                )}
              </GlassSurface>
            </View>
            {note && <Text style={[styles.note, { color: note.kind === 'good' ? account.good : account.problem }]}>{note.words}</Text>}
            <AuthButton label="Share link" disabled={!code} onPress={() => void share()} />
            {CAN_SAVE_CARD && <AuthButton label="Save to Photos" look="quiet" busy={saving} disabled={!code} onPress={() => void save()} />}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: gutter, backgroundColor: profile.cardDim },
  column: { width: '100%', maxWidth: profileSizes.cardWidth, gap: 14 },
  card: { borderRadius: radius.mapCard, padding: 16, paddingBottom: 18, alignItems: 'center', gap: 8, backgroundColor: profile.cardFill },
  panel: {
    width: '100%',
    height: profileSizes.cardPanel,
    borderRadius: profileSizes.cardPanelRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sparkleLeft: { position: 'absolute', left: 22, top: 20 },
  sparkleRight: { position: 'absolute', right: 30, bottom: 22 },
  name: { fontFamily: fonts.black, fontSize: 24, color: text.onDark, maxWidth: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4, marginBottom: 6 },
  brandWord: { fontFamily: fonts.black, fontSize: 15, letterSpacing: 0.4, color: text.goldNote },
  qrFrame: { borderRadius: profileSizes.qrRadius, overflow: 'hidden' },
  waiting: {
    width: profileSizes.qr,
    height: profileSizes.qr,
    borderRadius: profileSizes.qrRadius,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: profile.qrWaitingEdge,
    backgroundColor: profile.qrWaitingFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  waitingWords: { color: text.onDarkSoft, textAlign: 'center' },
  close: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: profileSizes.cardClose,
    height: profileSizes.cardClose,
    borderRadius: radius.pill,
    backgroundColor: glass.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  note: { fontFamily: fonts.bold, fontSize: 13.5, textAlign: 'center' },
});
