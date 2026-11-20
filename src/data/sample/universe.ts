// Sample data for building screens: where the player's own things float in the sky, as in Constellations.
// Fake data for the UI only.

/** One of the player's things in the sky, with its spot and its map dot color. */
export type UniverseSpot = {
  /** Short id. */
  id: 'planet' | 'armor';
  /** Name on the Star Map. */
  name: string;
  /** Emoji on the Star Map pin. */
  emoji: string;
  /** Sky position across. */
  x: number;
  /** Sky position down. */
  y: number;
  /** Color of its dot on the small map. */
  dot: string;
  /** Glow color of its pin on the Star Map. */
  pin: string;
};

/** The player's Home Planet and Armor. */
export const sampleUniverseSpots: readonly UniverseSpot[] = [
  { id: 'planet', name: 'Home Planet', emoji: '🪐', x: -640, y: 470, dot: '#ffcf7a', pin: '#ffcf7a' },
  { id: 'armor', name: 'Armor', emoji: '🛡️', x: 720, y: -520, dot: '#e8eefa', pin: '#dfe5f0' },
];
