// The new account page: Google and Apple (when switched on), or an email and a password of at least 8 characters.
// We then email a 6-digit code to confirm the email (the next page), and after that the app asks for a username.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { AuthButton } from '@/components/common/AuthButton';
import { AuthField, type AuthFieldBox } from '@/components/sign-in/AuthField';
import { FormNote } from '@/components/sign-in/FormNote';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { SocialButtons } from '@/components/sign-in/SocialButtons';
import { createAccount } from '@/data/accountActions';
import { PASSWORD_MIN } from '@/data/signInOptions';

/** The new account page. */
export default function CreateAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const passwordBox = useRef<AuthFieldBox>(null);
  const [password, setPassword] = useState('');
  // The password typed a second time, so a typo can't lock the person out of their new account.
  const [again, setAgain] = useState('');
  const againBox = useRef<AuthFieldBox>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  /** Makes the account with the typed email and password, once both password boxes match. */
  const create = async () => {
    if (password !== again) {
      setNote('The two passwords don’t match. Type them again.');
      return;
    }
    setNote('');
    setBusy(true);
    try {
      if ((await createAccount(email, password)) === 'confirm') {
        setBusy(false);
        router.push({ pathname: '/sign-in/confirm', params: { email: email.trim() } });
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <SignInShell
      kicker="JOIN DORINVERSE"
      title="Make an account"
      subtitle="Your lessons and collections stay with your account, on any phone."
      onBack={() => router.back()}
    >
      <SocialButtons onNote={setNote} />
      <AuthField label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" onSubmit={() => passwordBox.current?.focus()} />
      <AuthField
        label="Password"
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
        onSubmit={() => void create()}
      />
      <FormNote note={note} />
      <AuthButton label="Make my account" busy={busy} onPress={() => void create()} />
    </SignInShell>
  );
}
