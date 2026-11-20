// The Characters pages' data for pages. One in-memory library, loaded from the phone when the app starts and
// topped up with only the missing cards; after that, the grid, a character's page and "Find in scripture" read
// memory and never wait on a download.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { initialOf, makeCharacterLibrary } from '@/data/characterLibrary';
import { syncCharacters, type SaveCharacters, type SavedCharacters } from '@/data/characterSync';
import { useBibleLibrary } from '@/data/queries/bible';
import { queryClient } from '@/data/queries/client';
import { readSavedCharacters, saveCharacters } from '@/data/storage/characterStore';
import type { CharacterLibrary, CharacterLookup, MetCharacter } from '@/types/character';
import type { CollectedCharacter } from '@/types/collection';
import type { VerseRef } from '@/types/bible';

export { filterCharacters, initialOf, LINK_LABELS, linkRows, sortCharacters, type CharacterOrder, type LinkRow } from '@/data/characterLibrary';

/** The library's place in the query cache. */
const CHARACTERS_KEY = ['characters', 'library'] as const;

/**
 * Loads the library. What the phone holds is shown right away; then the collected list is checked and only
 * missing cards are downloaded. When nothing is missing, no download happens.
 */
async function loadCharacters(): Promise<CharacterLibrary> {
  const started = Date.now();
  const saved = await readSavedCharacters();
  held = saved;
  if (saved.list && !queryClient.getQueryData(CHARACTERS_KEY)) {
    queryClient.setQueryData(CHARACTERS_KEY, makeCharacterLibrary(saved.list, saved.cards));
  }
  const result = await syncCharacters(saved, keepCharacters);
  if (__DEV__) console.log(`[characters] library ready in ${Date.now() - started} ms; downloaded ${result.downloaded} cards`);
  const shown = queryClient.getQueryData<CharacterLibrary>(CHARACTERS_KEY);
  return !result.changed && shown ? shown : result.library;
}

/** What the phone holds, kept in memory after the first load so a refresh never reads the whole store again. */
let held: SavedCharacters | null = null;

/** Saves on the phone, and keeps the in-memory copy of what the phone holds the same. */
const keepCharacters: SaveCharacters = async (list, changed) => {
  await saveCharacters(list, changed);
  if (held) held = { list: [...list], cards: { ...held.cards, ...Object.fromEntries(changed.map((c) => [c.lookup, c])) } };
};

/** Picks up characters newly collected in a lesson without a restart, downloading only their cards in one round. */
export async function refreshCharacters(): Promise<void> {
  if (!held) {
    await queryClient.refetchQueries({ queryKey: CHARACTERS_KEY });
    return;
  }
  const result = await syncCharacters(held, keepCharacters);
  if (__DEV__) console.log(`[characters] refreshed; downloaded ${result.downloaded} cards`);
  if (result.changed) queryClient.setQueryData(CHARACTERS_KEY, result.library);
}

/** The library query's settings, shared by the start-up load and the pages. Kept for as long as the app runs. */
const charactersQuery = { queryKey: CHARACTERS_KEY, queryFn: loadCharacters, staleTime: Infinity, gcTime: Infinity } as const;

/** Starts loading the library in the background. The root layout calls this once when the app starts. */
export function startCharactersLoad(): void {
  void queryClient.prefetchQuery(charactersQuery);
}

/** The in-memory library of collected characters. */
export function useCharacterLibrary() {
  return useQuery(charactersQuery);
}

/** One collected character by lookup, or undefined until loaded (or when not collected). */
export function useCharacter(lookup: CharacterLookup | undefined): MetCharacter | undefined {
  const library = useCharacterLibrary().data;
  return lookup ? library?.byLookup[lookup] : undefined;
}

/** The labels of the verses that name a character, as a set, for "Find in scripture". */
export function useCharacterVerseRefs(lookup: CharacterLookup | undefined): ReadonlySet<VerseRef> | undefined {
  const character = useCharacter(lookup);
  return useMemo(() => (character ? new Set(character.verseRefs) : undefined), [character]);
}

/** How many of the verses that name a character the person has revealed, or undefined until both libraries are loaded. */
export function useRevealedVerseCount(character: MetCharacter | undefined): number | undefined {
  const bible = useBibleLibrary().data;
  return useMemo(() => (bible && character ? character.verseRefs.filter((ref) => bible.refs.has(ref)).length : undefined), [bible, character]);
}

/** No characters yet, used by the Collections card until the library is loaded. */
const NO_FAN: readonly CollectedCharacter[] = [];

/** The collected characters as the Collections card's fan shows them, oldest first. */
export function useFanCharacters(): readonly CollectedCharacter[] {
  const library = useCharacterLibrary().data;
  return useMemo(
    () =>
      library
        ? library.characters
            .slice(0, 3)
            .reverse()
            .map((c) => ({ name: c.name, reference: c.metIn, initial: initialOf(c.name), mentions: String(c.verseCount) }))
        : NO_FAN,
    [library],
  );
}
