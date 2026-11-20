// The shape of Papa Dorin's Story: its chapters, and which picture each chapter shows.

/** Which picture a chapter shows above its words, as named in the Constellations design. */
export type StoryArtKind =
  | 'price'
  | 'batch'
  | 'cutters'
  | 'kids'
  | 'worn'
  | 'drawer'
  | 'junk'
  | 'friend'
  | 'light'
  | 'angel'
  | 'angel2'
  | 'feast'
  | 'new'
  | 'note'
  | 'planet'
  | 'word'
  | 'found';

/** One chapter of the story. */
export type StoryChapter = {
  /** The chapter's title, like "A Quarter in the Bin". */
  title: string;
  /** The picture above the words. */
  art: StoryArtKind;
  /** The chapter's paragraphs, in order. */
  paragraphs: readonly string[];
  /** Which paragraph is Papa Dorin's handwritten note, when the chapter has one. */
  noteIndex?: number;
};
