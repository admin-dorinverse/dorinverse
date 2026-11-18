// Sample data for building the Places pages: which places the person has collected, oldest first, and where they
// found each one. Fake data for the UI only: the real list comes from the server, which is the only place that
// decides what has been collected. Lookups only; every card's words come from the database.

import type { CollectedPlaceEntry } from '@/types/place';

/** Collected places by place card lookup, with the lesson passage they were found in. Oldest first. */
export const sampleCollectedPlaces: CollectedPlaceEntry[] = [
  { lookup: 'jericho_634', foundIn: 'Joshua 6' },
  { lookup: 'moab_815', foundIn: 'Judges 3' },
  { lookup: 'gilgal_477', foundIn: 'Judges 3' },
  { lookup: 'seirah_1043', foundIn: 'Judges 3' },
  { lookup: 'jordan_653', foundIn: 'Judges 3' },
  { lookup: 'ramah_972', foundIn: 'Judges 4' },
  { lookup: 'kedesh-naphtali_679', foundIn: 'Judges 4' },
  { lookup: 'tabor_1129', foundIn: 'Judges 4' },
  { lookup: 'kishon_705', foundIn: 'Judges 4' },
  { lookup: 'bethlehem_219', foundIn: 'Ruth 1' },
];
