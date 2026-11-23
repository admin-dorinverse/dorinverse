// Colors for people's avatars and the friends pages (Profile, a friend's page, their universe, Notifications), in
// the Constellations look. Avatars use the same colors as on a voice call, so a person looks the same everywhere.

import { call } from './callColors';

/** The friends pages' colors. */
export const friends = {
  /** The avatars' colors, picked by username so each person keeps theirs. */
  avatars: call.avatars,
  /** Dark letters on the bright avatar colors. */
  avatarInk: call.ink,
  /** The thin white ring around an avatar, so it stands out on the sky. */
  avatarRing: 'rgba(255,255,255,0.75)',
  /** The little dot on the bell when something new came in. */
  newDot: '#ff7d9c',
  /** The dot's dark edge, so it shows on the bright bell. */
  newDotEdge: '#1a1c45',
} as const;
