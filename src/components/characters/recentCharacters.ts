// The characters viewed recently while the app is open, newest first, for the chips at the top of a
// character's page. Kept in memory only: it starts empty each time the app opens.

import type { CharacterLookup } from '@/types/character';

/** How many recently viewed characters are kept. */
const KEEP = 8;

/** The recently viewed characters, newest first. */
let trail: CharacterLookup[] = [];

/** Notes that a character's page was opened, and returns the trail with them first. */
export function visitCharacter(lookup: CharacterLookup): CharacterLookup[] {
  trail = [lookup, ...trail.filter((l) => l !== lookup)].slice(0, KEEP);
  return trail;
}
