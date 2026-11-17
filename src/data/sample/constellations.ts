// Sample data for building screens: the six constellations, placed and colored as in the Constellations design.
// This is fake data for the UI only. The real list will come from the database.

import type { Constellation } from '@/types/constellation';
import { constellationShapes } from './constellationShapes';

/** The six constellations in the shared sky. */
export const sampleConstellations: readonly Constellation[] = [
  { id: 'letters', name: 'Letters', color: '#8fd8ff', x: -1950, y: -1150, bigStar: 3, shape: constellationShapes.dove },
  { id: 'stories', name: 'Stories', color: '#ffb45e', x: 1750, y: -1500, bigStar: 0, shape: constellationShapes.gingerbread },
  { id: 'sermons', name: 'Sermons', color: '#ffe066', x: 2550, y: 380, bigStar: 0, shape: constellationShapes.bell },
  { id: 'parables', name: 'Parables', color: '#7dffb4', x: -2500, y: 880, bigStar: 2, shape: constellationShapes.flower },
  { id: 'prophecies', name: 'Prophecies', color: '#c39bff', x: 520, y: 2050, bigStar: 0, shape: constellationShapes.star },
  { id: 'poems', name: 'Poems & Wisdom', color: '#ff7d9c', x: -520, y: -2400, bigStar: 4, shape: constellationShapes.heart },
];
