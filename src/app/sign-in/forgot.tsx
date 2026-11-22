// The forgotten password page: type your email and we send a 6-digit code, then type the code and a new password
// to go straight into the app, signed in. "Send a new code" waits 60 seconds between emails.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AuthButton } from '@/components/common/AuthButton';
import { AuthField, type AuthFieldBox } from '@/components/sign-in/AuthField';
import { CODE_LENGTH, CodeField } from '@/components/sign-in/CodeField';
import { FormNote } from '@/components/sign-in/FormNote';
import { ResendCode } from '@/components/sign-in/ResendCode';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { leaveReset, resetWithCode, sendResetCode } from '@/data/accountActions';
import { PASSWORD_MIN } from '@/data/signInOptions';

/** The forgotten password page. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState(useLocalSearchParams<{ email?: string }>().email ?? '');
  // When the code was sent; null while the person is still typing their email.
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const passwordBox = useRef<AuthFieldBox>(null);
  // The new password typed a second time, so a typo can't lock the person out.
  const [again, setAgain] = useState('');
  const againBox = useRef<AuthFieldBox>(null);
  // True once the code worked but the new password was refused, so a retry only saves the password.
  const [codeUsed, setCodeUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');

  // Leaving part way through lets the person into the app, still signed in with their old password.
  useEffect(() => leaveReset, []);

  /** Emails a code (the first one, or a new one). */
  const send = async () => {
    setNote('');
    setSending(true);
    try {
      await sendResetCode(email);
      setSentAt(Date.now());
      setCode('');
      setCodeUsed(false);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /** Saves the new password with the code; on success the app opens. */
  const save = async (typedCode = code) => {
    if (password !== again) {
      setNote('The two passwords don’t match. Type them again.');
      return;
    }
    setNote('');
    setBusy(true);
    try {
      await resetWithCode(email, typedCode, password, codeUsed);
      router.replace('/');
    } catch (e) {
      if ((e as { codeWorked?: boolean }).codeWorked) setCodeUsed(true);
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  /** With all six digits in: saves at once if both password boxes are filled in, or moves on to the password box. */
  const codeDone = (typed: string) => {
    if (password.length >= PASSWORD_MIN && again.length > 0) void save(typed);
    else passwordBox.current?.focus();
  };

  if (sentAt === null) {
    return (
      <SignInShell kicker="FORGOT YOUR PASSWORD?" title="Reset it by email" subtitle="We’ll email you a 6-digit code to choose a new password." onBack={() => router.back()}>
        <AuthField label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" returnKeyType="send" onSubmit={() => void send()} />
        <FormNote note={note} />
        <AuthButton label="Send the code" busy={sending} onPress={() => void send()} />
      </SignInShell>
    );
  }
  return (
    <SignInShell kicker="CHECK YOUR EMAIL" title="Choose a new password" subtitle={`We sent a 6-digit code to ${email.trim()}.`} onBack={() => setSentAt(null)}>
      <CodeField value={code} onChange={setCode} onComplete={codeDone} note="It can take a minute to arrive. Check your spam folder too." />
      <AuthField
        label="New password"
        kind="newPassword"
        inputRef={passwordBox}
        value={password}
        onChange={setPassword}
        note={`At least ${PASSWORD_MIN} characters.`}
        returnKeyType="next"
        onSubmit={() => againBox.current?.focus()}
      />
      <AuthField
        label="Type it again"
        kind="newPassword"
        inputRef={againBox}
        value={again}
        onChange={setAgain}
        returnKeyType="go"
        onSubmit={() => void save()}
      />
      <FormNote note={note} />
      <AuthButton label="Save my new password" busy={busy} disabled={code.length < CODE_LENGTH && !codeUsed} onPress={() => void save()} />
      <ResendCode sentAt={sentAt} busy={sending} onResend={() => void send()} />
    </SignInShell>
  );
}
