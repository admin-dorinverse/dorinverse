// The shape of the cookies the Prophecy, Instructions and Prayers pages show: which cookies the person has
// collected, each collected cookie as the phone saves it, the outline of a prophecy link, and the in-memory library.

/** A cookie's database key, like "prayer:Judges 13:8" or "ten_commandments". */
export type CookieKey = string;

/** One of the Ten Commandments: its number, its exact words and where it is written. */
export type CommandmentLine = {
  /** Its number, 1 to 10. */
  position: number;
  /** Its exact Bible words. */
  text: string;
  /** Where it is written, like "Exodus 20:3". */
  reference: string;
};

/** The Ten Commandments pack: all ten, collected together. */
export type CommandmentsCookie = {
  /** What kind of cookie it is. */
  kind: 'ten_commandments';
  /** Its database key. */
  key: CookieKey;
  /** The ten commandments, in order. */
  lines: CommandmentLine[];
};

/** A New Testament command for believers. */
export type InstructionCookie = {
  /** What kind of cookie it is. */
  kind: 'instruction';
  /** Its database key. */
  key: CookieKey;
  /** The command in its exact Bible words. */
  words: string;
  /** Who said or wrote it, like "Jesus" or "Paul (quoting Proverbs)". */
  who: string;
  /** Where it is written, like "Romans 13:9". */
  reference: string;
  /** The reason the verse gives for it, or null when the verse gives none. */
  reason: string | null;
};

/** A prayer someone in the Bible prayed. */
export type PrayerCookie = {
  /** What kind of cookie it is. */
  kind: 'prayer';
  /** Its database key. */
  key: CookieKey;
  /** Who prayed, like "Manoah". */
  who: string;
  /** What happened right before the prayer. */
  whatJustHappened: string;
  /** One line from the prayer, in exact Bible words. */
  keyLine: string;
  /** Where the prayer runs, like "Genesis 24:12-14". */
  reference: string;
};

/** Which half of a prophecy link a cookie is: the promise, or a fulfillment. */
export type ProphecyHalfSide = 'promise' | 'fulfillment';

/** A collected half of a prophecy link, with its exact Bible words. */
export type ProphecyCookie = {
  /** What kind of cookie it is. */
  kind: 'prophecy';
  /** Its database key. */
  key: CookieKey;
  /** The number of the prophecy link it belongs to. */
  linkNo: number;
  /** Promise or fulfillment. */
  half: ProphecyHalfSide;
  /** Where it is written, like "Micah 5:2". */
  reference: string;
  /** The verses that make the link, in exact Bible words. */
  quote: string;
};

/** Any collected cookie these pages show. */
export type Cookie = CommandmentsCookie | InstructionCookie | PrayerCookie | ProphecyCookie;

/** One half of a prophecy link as its outline lists it: only its key, side and reference, never its words. */
export type LinkHalf = { key: CookieKey; half: ProphecyHalfSide; reference: string };

/**
 * A prophecy link the person holds at least one half of: its title and every half's reference. The phone saves
 * this so a missing half can show as "still to find"; a missing half's words are never on the phone.
 */
export type ProphecyLinkOutline = {
  /** The link's number. */
  linkNo: number;
  /** Its title, like "Born in Bethlehem". */
  title: string;
  /** Every half of the link: the promise and each fulfillment. */
  halves: LinkHalf[];
};

/** One spot on a prophecy card: a half the person holds, or one still to find (its reference only). */
export type HalfSlot = { kind: 'held'; cookie: ProphecyCookie } | { kind: 'missing'; half: LinkHalf };

/** A prophecy link on the page: its title, its promise and fulfillments, and whether it is joined. */
export type ProphecyCard = {
  /** The link's number, also the detail page's address. */
  linkNo: number;
  /** Its title. */
  title: string;
  /** The promise half. */
  promise: HalfSlot;
  /** The fulfillment halves (a link can have more than one). */
  fulfillments: HalfSlot[];
  /** True when the person holds the promise and at least one fulfillment. */
  joined: boolean;
};

/** Everything the three pages need, held in memory once loaded from the phone. */
export type CookieLibrary = {
  /** The Ten Commandments pack, or null when not collected. */
  commandments: CommandmentsCookie | null;
  /** Collected commands, newest first. */
  instructions: InstructionCookie[];
  /** The people who gave the collected commands, most commands first, for the filter chips. */
  givers: string[];
  /** Collected prayers, newest first. */
  prayers: PrayerCookie[];
  /** Prophecy links the person holds any half of, newest first. */
  prophecies: ProphecyCard[];
  /** The same links by number. */
  byLinkNo: Readonly<Record<number, ProphecyCard>>;
  /** How many links are joined. */
  joinedCount: number;
};
