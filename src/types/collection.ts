// The shape of the things a person collects from their lessons: characters met and places visited.

/** A Bible character the person has met in a lesson. */
export type CollectedCharacter = {
  /** The character's name, like "Ehud". */
  name: string;
  /** Where the person met them, like "Judges 3". */
  reference: string;
  /** The letter or sign on their card's round badge. */
  initial: string;
  /** How often the Bible mentions them, like "9" or "35+". */
  mentions: string;
};

/** A Bible place the person has visited in a lesson. */
export type CollectedPlace = {
  /** The place's name, like "Jericho". */
  name: string;
  /** The book the person found it in, like "Joshua". */
  book: string;
  /** The emoji on its map pin. */
  emoji: string;
};

/** The collections on the Collections tab, each opened by its card's "See all". */
export type CollectionKind = 'verses' | 'characters' | 'places' | 'prophecy' | 'instructions' | 'prayers';
