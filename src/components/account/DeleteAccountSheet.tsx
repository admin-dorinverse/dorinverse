// The second step of deleting an account: a sheet that says plainly what goes away and that it can't be undone,
// with a red button to go ahead and a button to keep the account. The server's answer shows here if it fails.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { GlassSheet } from '@/components/common/GlassSheet';
import { deleteAccount } from '@/data/accountActions';
import { account } from '@/theme/accountColors';
import { text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';

/** Props for the delete sheet. */
type DeleteAccountSheetProps = {
  /** True while the sheet shows. */
  open: boolean;
  /** Closes the sheet, keeping the account. */
  onClose: () => void;
};

/** The "Delete your account?" sheet. */
export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  /** Deletes the account. On success the person is signed out and the sign-in page shows. */
  const remove = async () => {
    setNote('');
    setBusy(true);
    try {
      await deleteAccount();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  /** Closes the sheet unless the deleting is under way. */
  const close = () => {
    if (busy) return;
    setNote('');
    onClose();
  };

  return (
    <GlassSheet open={open} onClose={close} title="Delete your account?">
      <View style={styles.body}>
        <Text style={[textStyles.body, styles.words]}>
          This deletes your account, your username and everything saved with your account. It can’t be undone, and we can’t get it back for you.
        </Text>
        {note !== '' && <Text style={styles.note}>{note}</Text>}
        <AuthButton look="danger" label="Yes, delete my account" busy={busy} onPress={() => void remove()} />
        <AuthButton look="quiet" label="Keep my account" disabled={busy} onPress={close} />
      </View>
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingTop: 4 },
  words: { color: text.onDarkSoft },
  note: { fontFamily: fonts.bold, fontSize: 13.5, color: account.problem, textAlign: 'center' },
});
