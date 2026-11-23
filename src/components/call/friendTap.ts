// Tapping someone on a voice call opens their friend page. The call server puts a signed-in person's friend code
// on the end of their call identity ("guest-1a2b3c4d-AbCdEf1234"), and nobody can change their own identity on a
// call, so nobody can wear someone else's code.

import { useRouter, type Href } from 'expo-router';
import type { Participant } from 'livekit-client';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { useAccount } from '@/data/account';
import { GUEST_PREFIX, HOST_PREFIX } from '@/types/call';

/** A call identity with a friend code on the end: "host-" or "guest-", 8 letters and digits, "-", then the code. */
const WITH_CODE = new RegExp(`^(?:${HOST_PREFIX}|${GUEST_PREFIX})[0-9a-f]{8}-([A-Za-z0-9]{10})$`);

/** The friend code in someone's call identity; null for guests without an account, Papa Dorin and yourself. */
export function friendCodeOf(person: Participant): string | null {
  if (person.isLocal) return null;
  return WITH_CODE.exec(person.identity)?.[1] ?? null;
}

/**
 * How to open a person's friend page from the call, or null when they can't be tapped. Only the app, signed in
 * with a username, can open friend pages, so the browser join page and signed-out guests get null for everyone.
 */
export function useFriendTap(person: Participant): (() => void) | null {
  const router = useRouter();
  const { step } = useAccount();
  const code = Platform.OS === 'web' || step !== 'ready' ? null : friendCodeOf(person);
  const open = useCallback(() => {
    if (!code) return;
    playSound('tap');
    router.push(`/friend/${code}` as Href);
  }, [code, router]);
  return code ? open : null;
}
