// The shape of a Bible character as the Characters pages see it: who the person has collected and where,
// each collected character's card as the phone saves it, and the in-memory library the pages read.

import type { VerseRef } from '@/types/bible';

/** A character's database lookup, like "ehud_1039". It is also the character page's address. */
export type CharacterLookup = string;

/** One character the person has collected, and the lesson passage where they were met. */
export type CollectedEntry = {
  /** The character's database lookup. */
  lookup: CharacterLookup;
  /** Where the person met them, like "Judges 3". */
  metIn: string;
};

/** One key moment on a card: a short title, what happened, and where to read it. */
export type KeyMoment = {
  /** The moment's title, like "Kills King Eglon". */
  title: string;
  /** What happened, in two or three sentences. */
  description: string;
  /** Where to read it, like "Judges 3:15–22". */
  passage: string;
  /** The name of the place it happened, when the card gives one. */
  place?: string;
};

/** A place on a card, and how many of the character's verses also name it (0 when only a key moment gives it). */
export type CharacterPlace = { name: string; verseCount: number };

/** A link from one collected character to another: its kind (like "enemies") and one sentence saying why. */
export type CharacterLink = {
  /** The other character's id. */
  otherId: string;
  /** The kind of link, one of the keys in LINK_LABELS. */
  type: string;
  /** One plain sentence about what happened between them. */
  why: string;
};

/** A collected character's card, as the phone saves it. Downloaded once. */
export type CharacterCard = {
  /** The character's database id. */
  id: string;
  /** The character's database lookup. */
  lookup: CharacterLookup;
  /** Their name, like "Ehud". */
  name: string;
  /** Shown with the name when others share it, like "son of Jacob"; null when not needed. */
  nameTag: string | null;
  /** Other names the Bible uses for them. */
  alsoKnownAs: string[];
  /** Who they were, in a few sentences. */
  summary: string;
  /** Their key moments, in story order. */
  keyMoments: KeyMoment[];
  /** How many verses name them. */
  verseCount: number;
  /** Places in their story, most often named first. */
  places: CharacterPlace[];
  /** The labels of every verse that names them, for "Find in scripture". */
  verseRefs: VerseRef[];
  /** Links to other collected characters only. */
  links: CharacterLink[];
  /**
   * The ids of linked characters not collected yet: only counted, never named on screen. When one of them is
   * collected, its links move into `links`.
   */
  hiddenIds: string[];
};

/** A collected character on the pages: their card, where they were met, and that passage's book. */
export type MetCharacter = CharacterCard & {
  /** Where the person met them, like "Judges 3". */
  metIn: string;
  /** The book they were met in, like "Judges", for the book filter. */
  book: string;
};

/** Everything the Characters pages need, held in memory once loaded from the phone. */
export type CharacterLibrary = {
  /** Every collected character, newest first. */
  characters: MetCharacter[];
  /** The same characters by lookup. */
  byLookup: Readonly<Record<CharacterLookup, MetCharacter>>;
  /** The same characters by id, for following links. */
  byId: Readonly<Record<string, MetCharacter>>;
  /** The books characters were met in, in Bible order. */
  books: string[];
};
