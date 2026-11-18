// The shape of a Bible place as the Places pages see it: which places the person has collected and where, each
// collected place's card as the phone saves it, and the in-memory library the pages read.

import type { VerseRef } from '@/types/bible';

/** A place card's database lookup, like "jericho_634". It is also the place page's address. */
export type PlaceLookup = string;

/** One place the person has collected, and the lesson passage where they found it. */
export type CollectedPlaceEntry = {
  /** The place card's database lookup. */
  lookup: PlaceLookup;
  /** Where the person found it, like "Joshua 6". */
  foundIn: string;
};

/** One key moment at a place: a short title, what happened, and where to read it. */
export type PlaceMoment = {
  /** The moment's title, like "The Walls Fall Down". */
  title: string;
  /** What happened, in a sentence or two. */
  text: string;
  /** Where to read it, like "Joshua 6:1-20". */
  passage: string;
};

/** Who made a place's photo and how it may be shared. Shown small under the photo, as its license asks. */
export type PhotoCredit = {
  /** Who made it, or the credit line its source asks for, like "Fullo88". */
  by: string;
  /** The license, like "CC-BY-SA-4.0" or "PD"; null when the source gives none. */
  license: string | null;
  /** The page about the photo, where its full credit and license are; null when there is none. */
  link: string | null;
};

/** A place's photo: the round grid thumbnail, the page-header size, and its credit. */
export type PlacePhoto = {
  /** Web address of the small square copy (about 160 px) for the round grid thumbnail. */
  small: string;
  /** Web address of the page-header copy (about 900 px wide). */
  header: string;
  /** Who made it and its license. */
  credit: PhotoCredit;
};

/** A character linked to a place: their card id and how many verses name both. Ids only, never names. */
export type PlaceCharacterLink = { id: string; verseCount: number };

/** A collected place's card, as the phone saves it. Downloaded once. */
export type PlaceCard = {
  /** The card's database lookup. */
  lookup: PlaceLookup;
  /** Its name, like "Jericho". */
  name: string;
  /** What sort of place it is, like "City" or "Water"; null when not known. */
  kind: string | null;
  /** What it is, in one sentence. */
  line: string;
  /** The database ids of the places this card stands for (one card can cover a few, like Jerusalem). */
  placeIds: string[];
  /** Its photo, or null to show the plain look. */
  photo: PlacePhoto | null;
  /** Its key moments, in story order. */
  moments: PlaceMoment[];
  /** The labels of every verse that names it, for "Find in scripture". */
  verseRefs: VerseRef[];
  /**
   * Every character linked to it, most verses first. The page names only the collected ones (from the Characters
   * library) and counts the rest.
   */
  characters: PlaceCharacterLink[];
};

/** A collected place on the pages: its card, where it was found, and that passage's book. */
export type FoundPlace = PlaceCard & {
  /** Where the person found it, like "Joshua 6". */
  foundIn: string;
  /** The book it was found in, like "Joshua", for the book filter. */
  book: string;
};

/** Everything the Places pages need, held in memory once loaded from the phone. */
export type PlaceLibrary = {
  /** Every collected place, newest first. */
  places: FoundPlace[];
  /** The same places by lookup. */
  byLookup: Readonly<Record<PlaceLookup, FoundPlace>>;
  /** The same places by database place id, for opening a place from a character's page. */
  byPlaceId: Readonly<Record<string, FoundPlace>>;
  /** The books places were found in, in Bible order. */
  books: string[];
};
