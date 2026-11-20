// The Character Connections web shared by its pages (the web, a person, a link), and the link filter they all follow,
// as in the owner's artifact. The web is built once for each collection and filter, then reused by every page.

import { useMemo, useSyncExternalStore } from 'react';
import { useCharacterLibrary } from '@/data/queries/characters';
import type { MetCharacter } from '@/types/character';
import { LINK_TYPES, buildWeb, type Web } from './webModel';

/** The kinds of link shown now. Every page reads the same set. */
let shown: ReadonlySet<string> = new Set(LINK_TYPES);

/** Pages listening for filter changes. */
const listeners = new Set<() => void>();

/** Changes which kinds of link are shown, on every page. */
export function setShownLinks(next: ReadonlySet<string>): void {
  shown = next;
  listeners.forEach((l) => l());
}

/** The kinds of link shown now. The page redraws when the filter changes. */
export function useShownLinks(): ReadonlySet<string> {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => shown,
  );
}

/** The last web built, and what it was built from, so pages share it instead of building it again. */
let made: { from: readonly MetCharacter[]; shown: ReadonlySet<string>; web: Web } | null = null;

/** The web for a collection and filter: the one already built when it matches, or a new one. */
function webFor(characters: readonly MetCharacter[], filter: ReadonlySet<string>): Web {
  if (!made || made.from !== characters || made.shown !== filter) made = { from: characters, shown: filter, web: buildWeb(characters, filter) };
  return made.web;
}

/** The web for the person's collection and the current filter, or undefined while the collection loads. */
export function useWeb(): { web: Web | undefined; failed: boolean; retry: () => void } {
  const library = useCharacterLibrary();
  const filter = useShownLinks();
  const characters = library.data?.characters;
  const web = useMemo(() => (characters ? webFor(characters, filter) : undefined), [characters, filter]);
  return { web, failed: library.isError && !library.data, retry: () => void library.refetch() };
}
