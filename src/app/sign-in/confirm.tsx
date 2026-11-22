// The Check your email page, after making an account (or signing in before confirming): type the 6-digit code we
// emailed and the account is confirmed and signed in, then the root layout asks for a username. "Send a new code"
// waits 60 seconds between emails.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { CodeField } from '@/components/sign-in/CodeField';
import { FormNote } from '@/components/sign-in/FormNote';
import { ResendCode } from '@/components/sign-in/ResendCode';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { confirmEmail, resendEmailCode } from '@/data/accountActions';
import { text } from '@/theme/colors';
import { textStyles } from '@/theme/text';

/** The Check your email page. */
export default function ConfirmEmailPage() {
  const router = useRouter();
  const email = useLocalSearchParams<{ email?: string }>().email ?? '';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [good, setGood] = useState('');
  // A code was just sent when this page opened, so the 60-second wait starts now.
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [resending, setResending] = useState(false);

  /** Checks the code; on success the person is signed in and moves on by themselves. */
  const confirm = async (typed: string) => {
    setNote('');
    setGood('');
    setBusy(true);
    try {
      await confirmEmail(email, typed);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  /** Emails a new code. */
  const resend = async () => {
    setNote('');
    setGood('');
    setResending(true);
    try {
      await resendEmailCode(email);
      setSentAt(Date.now());
      setCode('');
      setGood('A new code is on its way.');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SignInShell kicker="CHECK YOUR EMAIL" title="Type your code" subtitle={`We sent a 6-digit code to ${email}.`} onBack={() => router.back()}>
      <CodeField value={code} onChange={setCode} onComplete={(c) => void confirm(c)} note="It can take a minute to arrive. Check your spam folder too." />
      <FormNote note={note} />
      <FormNote good note={good} />
      <AuthButton label="Confirm my email" busy={busy} disabled={code.length < 6} onPress={() => void confirm(code)} />
      <ResendCode sentAt={sentAt} busy={resending} onResend={() => void resend()} />
      <Text style={[textStyles.body, styles.hint]}>Already have an account with this email? Go back and sign in, or reset your password.</Text>
    </SignInShell>
  );
}

const styles = StyleSheet.create({
  hint: { color: text.onDarkSoft, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
