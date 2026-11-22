// What every shown screen on the call gets (the verse, a lesson together, trivia): what's showing, whether this
// person is the host and how the host changes it, everyone on the call, and Papa Dorin.

import type { Participant } from 'livekit-client';
import type { CallShow } from '@/types/call';
import type { PapaDorin } from './usePapaDorin';

/** The inputs of a shown screen, for the state `S` it shows. */
export type ShowProps<S> = {
  /** What the host is showing. */
  show: S;
  /** The call's title, like "Mom's get-together". */
  title: string;
  /** True for the host, who moves things along. */
  isHost: boolean;
  /** The host shows something else (back to the call screen is { kind: 'lobby' }). */
  setShow: (next: CallShow) => void;
  /** Everyone on the call except Papa Dorin. */
  people: Participant[];
  /** The identity of the person holding this phone. */
  me: string;
  /** Papa Dorin: what he's doing, his words, and hold to ask. */
  dorin: PapaDorin;
  /** Host: ends the get-together for everyone (does nothing for guests). */
  onEndCall: () => void;
};
