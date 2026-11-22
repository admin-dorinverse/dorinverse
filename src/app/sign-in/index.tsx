// The sign-in page, shown on first open before the Sky: Google and Apple (when switched on), or email and
// password, with links to reset a forgotten password and to make a new account. Once signed in, people stay
// signed in, and the root layout moves them on by itself.

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { AuthButton } from '@/components/common/AuthButton';
import { AuthField, type AuthFieldBox } from '@/components/sign-in/AuthField';
import { FormNote } from '@/components/sign-in/FormNote';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { SocialButtons } from '@/components/sign-in/SocialButtons';
import { signInWithEmail } from '@/data/accountActions';

/** The sign-in page. */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const passwordBox = useRef<AuthFieldBox>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  /** Signs in with the typed email and password. */
  const signIn = async () => {
    setNote('');
    setBusy(true);
    try {
      // An account whose email isn't confirmed yet goes to the code page; a new code is already on its way.
      if ((await signInWithEmail(email, password)) === 'confirm') {
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
      kicker="WELCOME TO DORINVERSE"
      title="Sign in"
      subtitle="Sign in to keep your lessons and collections with you."
      footer={<AuthButton look="quiet" label="New here? Make an account" onPress={() => router.push('/sign-in/create')} />}
    >
      <SocialButtons onNote={setNote} />
      <AuthField label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" onSubmit={() => passwordBox.current?.focus()} />
      <AuthField label="Password" kind="password" inputRef={passwordBox} value={password} onChange={setPassword} returnKeyType="go" onSubmit={() => void signIn()} />
      <FormNote note={note} />
      <AuthButton label="Sign in" busy={busy} onPress={() => void signIn()} />
      <AuthButton look="link" label="Forgot your password?" onPress={() => router.push({ pathname: '/sign-in/forgot', params: { email } })} />
    </SignInShell>
  );
}
