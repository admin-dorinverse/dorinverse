// The friend code page in a browser, where a texted friend link opens first. It only offers to open the code in the
// Dorinverse app; it asks the server nothing and needs no account. The phone app uses [code].tsx instead.

import { useLocalSearchParams } from 'expo-router';
import { FriendWebInvite } from '@/components/friend/FriendWebInvite';

/** The web friend link page. */
export default function FriendCodeWebPage() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  return <FriendWebInvite code={code} />;
}
