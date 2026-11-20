// Colors for Chat with Papa Dorin, taken from the Constellations design: his white bubbles, the baker's gold ones,
// the starter questions, and the gold send button that turns red to stop.

/** The chat's colors. */
export const chat = {
  /** Papa Dorin's bubble and its words. */
  dorinBubble: 'rgba(255,255,255,0.94)',
  dorinInk: '#2a1d14',
  /** The baker's bubble (a gold gradient), its words, and their round initial. */
  meBubble: ['#ffd27a', '#f2a93b'],
  meInk: '#3a2606',
  meBadge: ['#ffd27a', '#e08a3a'],
  /** The bouncing dots while he thinks. */
  dots: '#a0643a',
  /** A starter question's edge and fill. */
  starterEdge: 'rgba(255,200,90,0.5)',
  starterFill: 'rgba(255,255,255,0.08)',
  /** A note in the middle of the chat, like an error. */
  noteFill: 'rgba(255,255,255,0.1)',
  noteInk: 'rgba(255,255,255,0.85)',
  /** The text box's edge, fill and hint. */
  inputEdge: 'rgba(255,255,255,0.25)',
  inputFill: 'rgba(255,255,255,0.1)',
  inputHint: 'rgba(255,255,255,0.55)',
  /** The send button, its arrow, its glow, and its red while he's answering. */
  send: '#ffc65c',
  sendInk: '#1a1c45',
  sendGlow: 'rgba(255,200,90,0.5)',
  stop: '#ff7d7d',
  /** The glow around Papa Dorin beside his bubbles. */
  dorinGlow: 'rgba(255,200,90,0.4)',
  /** The "New chat" button's edge and fill. */
  newEdge: 'rgba(255,255,255,0.2)',
  newFill: 'rgba(255,255,255,0.1)',
} as const;
