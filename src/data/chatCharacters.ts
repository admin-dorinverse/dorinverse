// Who the baker can chat with, and what each one says first: Papa Dorin (always there) and the Bible guests who
// visit for a week at a time. How each one sounds lives in their notes on the server, never here.

import { PAPA_DORIN } from '@/components/common/cookieArt';
import type { ChatCharacter, ChatCharacterId } from '@/types/chat';

/** Every character, by id. Papa Dorin's greeting and starters are from the Constellations design. */
const CHARACTERS: Record<ChatCharacterId, ChatCharacter> = {
  'papa-dorin': {
    id: 'papa-dorin',
    name: 'Papa Dorin',
    greeting:
      'Well, look who walked into my bakery! Pull up a stool, baker. Ask me anything about the Bible: a person, a story, a verse that has you scratching your head. I will tell you what Scripture says, with the reference. Mm-hm.',
    starters: ['Why did Jonah run the other way?', 'Who was Deborah?', 'What is the Marriage Supper of the Lamb?', 'Tell me about David and Goliath.'],
    picture: PAPA_DORIN,
  },
  peter: {
    id: 'peter',
    name: 'Peter',
    greeting:
      "Peace to you, friend! Simon Peter here, a fisherman from Galilee. Papa Dorin saved me a stool in his bakery this week. Ask me about the boat, the water, the rooster, or the Lord who called me. I'll tell you what happened, with the reference.",
    starters: ['What was it like walking on water?', 'Why did you deny Jesus?', 'What did Jesus say to you by the fire?', 'What happened at Pentecost?'],
    picture: null,
  },
};

/** The character a chat link names, or Papa Dorin when it names no one we know. */
export function chatCharacter(id: string | undefined): ChatCharacter {
  return (id && CHARACTERS[id as ChatCharacterId]) || CHARACTERS['papa-dorin'];
}
