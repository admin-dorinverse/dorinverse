// The shape of someone the baker can chat with: Papa Dorin, or the Bible guest of the week.

/** Which character a chat is with. */
export type ChatCharacterId = 'papa-dorin' | 'peter';

/** One character the baker can chat with. */
export type ChatCharacter = {
  /** The character's id, sent with every message so the right one answers. */
  id: ChatCharacterId;
  /** The name shown at the top of the chat and in the text box's hint. */
  name: string;
  /** The first bubble, shown before the baker says anything. */
  greeting: string;
  /** The starter questions under the greeting. */
  starters: readonly string[];
  /** The character's picture, or null to show a round badge with their initial until their art is made. */
  picture: number | null;
};
