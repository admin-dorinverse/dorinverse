// The second step of removing a friend: a sheet that says plainly what happens, with a red button to go ahead and
// a button to stay friends. The server's answer shows here if it fails.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { GlassSheet } from '@/components/common/GlassSheet';
import { removeFriend } from '@/data/queries/friends';
import { text } from '@/theme/colors';
import { friendPage } from '@/theme/friendPageColors';
import { fonts, textStyles } from '@/theme/text';

/** Props for the remove friend sheet. */
type RemoveFriendSheetProps = {
  /** True while the sheet shows. */
  open: boolean;
  /** The friend's account id. */
  friendId: string;
  /** The friend's username, for the sheet's words. */
  username: string;
  /** Closes the sheet; they stay friends. */
  onClose: () => void;
  /** Runs once the server has removed the friend. */
  onRemoved: () => void;
};

/** The "Remove this friend?" sheet. */
export function RemoveFriendSheet({ open, friendId, username, onClose, onRemoved }: RemoveFriendSheetProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  /** Removes the friend on both sides, then lets the page go back. */
  const remove = async () => {
    setNote('');
    setBusy(true);
    try {
      await removeFriend(friendId);
      setBusy(false);
      onRemoved();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  /** Closes the sheet unless the removing is under way. */
  const close = () => {
    if (busy) return;
    setNote('');
    onClose();
  };

  return (
    <GlassSheet open={open} onClose={close} title={`Remove ${username}?`}>
      <View style={styles.body}>
        <Text style={[textStyles.body, styles.words]}>
          You won’t be friends anymore, on either side, and you won’t see each other’s universe. You can add each other again later with a friend code.
        </Text>
        {note !== '' && <Text style={styles.note}>{note}</Text>}
        <AuthButton look="danger" label="Yes, remove friend" busy={busy} onPress={() => void remove()} />
        <AuthButton look="quiet" label="Stay friends" disabled={busy} onPress={close} />
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingTop: 4 },
  words: { color: text.onDarkSoft },
  note: { fontFamily: fonts.bold, fontSize: 13.5, color: friendPage.problem, textAlign: 'center' },
});
