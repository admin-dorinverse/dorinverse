// Where Google and Apple's browser sign-in comes back to the app (dorinverse://auth-callback?code=…). It finishes
// the sign-in, then opens the app; the root layout sends the person on to pick a username if they need one.
// Having this page means the link never lands on a "page not found". It shows whether or not someone is signed in.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { FormNote } from '@/components/sign-in/FormNote';
import { SignInShell } from '@/components/sign-in/SignInShell';
import { swapLinkCode } from '@/data/signInLinks';
import { text } from '@/theme/colors';

/** The sign-in return page. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [note, setNote] = useState('');

  // The link's code is swapped once, when the page opens (the browser tab may have swapped it already).
  useEffect(() => {
    let gone = false;
    swapLinkCode(params)
      .then(() => !gone && router.replace('/'))
      .catch((e: Error) => !gone && setNote(e.message));
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SignInShell kicker="SIGNING IN" title={note ? 'That didn’t work' : 'Signing you in'}>
      {note ? (
        <>
          <FormNote note={note} />
          <AuthButton label="Back to sign in" onPress={() => router.replace('/')} />
        </>
      ) : (
        <ActivityIndicator color={text.goldNote} accessibilityLabel="Signing you in" />
      )}
    </SignInShell>
  );
}
