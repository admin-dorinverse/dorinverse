// The pick-a-username page, shown once after signing in for the first time: the name everyone sees on family
// calls. It checks the name with the server while the person types; the server decides what's allowed. While
// the app is still finding out whether the account already has a name, it says so instead.

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { AuthField } from '@/components/sign-in/AuthField';
import { FormNote } from '@/components/sign-in/FormNote';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { useUsernameCheck, VERDICT_LINES } from '@/components/sign-in/useUsernameCheck';
import { lookUpUsername, useAccount } from '@/data/account';
import { chooseUsername, signOut } from '@/data/accountActions';
import { USERNAME_MAX, USERNAME_RULES } from '@/data/signInOptions';
import { text } from '@/theme/colors';
import { textStyles } from '@/theme/text';

/** The pick-a-username page. */
export default function PickUsernamePage() {
  const { username, lookupFailed } = useAccount();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const check = useUsernameCheck(name);

  /** Saves the username; on success the root layout opens the app. */
  const save = async () => {
    setNote('');
    setBusy(true);
    try {
      const verdict = await chooseUsername(name.trim());
      if (verdict !== 'ok') setNote(VERDICT_LINES[verdict]);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Still finding out whether this account already has a username.
  if (username === undefined) {
    return (
      <SignInShell kicker="ALMOST THERE" title="Getting your account ready">
        {lookupFailed ? (
          <>
            <FormNote note="Can’t reach Dorinverse right now. Check your internet and try again." />
            <AuthButton label="Try again" onPress={() => void lookUpUsername()} />
            <AuthButton look="link" label="Sign out" onPress={() => void signOut()} />
          </>
        ) : (
          <ActivityIndicator color={text.goldNote} accessibilityLabel="Getting your account ready" />
        )}
      </SignInShell>
    );
  }

  const line = check.kind === 'verdict' ? VERDICT_LINES[check.verdict] : check.kind === 'offline' ? check.line : check.kind === 'checking' ? 'Checking…' : '';
  const tone = check.kind === 'verdict' ? (check.verdict === 'ok' ? 'good' : 'problem') : 'plain';
  return (
    <SignInShell kicker="ONE LAST STEP" title="Pick a username" subtitle="It’s the name everyone sees on family calls.">
      <AuthField
        label="Username"
        kind="username"
        value={name}
        onChange={setName}
        placeholder="Like bread_baker"
        maxLength={USERNAME_MAX}
        note={line}
        noteTone={tone}
        returnKeyType="done"
        onSubmit={() => void save()}
      />
      <Text style={[textStyles.body, styles.rules]}>{USERNAME_RULES}</Text>
      <FormNote note={note} />
      <AuthButton label="Save my username" busy={busy} disabled={check.kind === 'idle' || (check.kind === 'verdict' && check.verdict !== 'ok')} onPress={() => void save()} />
      <AuthButton look="link" label="Sign out" onPress={() => void signOut()} />
    </SignInShell>
  );
}

const styles = StyleSheet.create({
  rules: { color: text.onDarkSoft, fontSize: 13.5, lineHeight: 19 },
});
