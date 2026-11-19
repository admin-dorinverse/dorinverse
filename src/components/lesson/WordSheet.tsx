// The meaning of a tapped word or saying on a card, in the player's cream sheet, with where the meaning comes from.

import type { CardIdiom, CardWord } from '@/types/lesson';
import { CreamSheet } from './CreamSheet';
import type { MarkTap } from './MarkedText';

/** Props for the meaning sheet. */
type WordSheetProps = {
  /** The card the word or saying is on. */
  card: { words: readonly CardWord[]; idioms: readonly CardIdiom[] };
  /** What was tapped, or null when the sheet is closed. */
  tap: MarkTap | null;
  /** Closes the sheet. */
  onClose: () => void;
};

/** A word's or saying's meaning. */
export function WordSheet({ card, tap, onClose }: WordSheetProps) {
  const word = tap?.kind === 'word' ? card.words[tap.index] : undefined;
  const idiom = tap?.kind === 'idiom' ? card.idioms[tap.index] : undefined;
  const sources = word?.sources ?? idiom?.sources ?? [];
  return (
    <CreamSheet
      open={!!(word || idiom)}
      onClose={onClose}
      kind={word ? 'Word on the path' : 'Saying on the path'}
      title={word ? word.word.charAt(0).toUpperCase() + word.word.slice(1) : (idiom?.phrase ?? '')}
      body={word?.meaning ?? idiom?.meaning ?? null}
      note={sources.length ? `Sources: ${sources.join(', ')}` : null}
      button="Got it"
    />
  );
}
