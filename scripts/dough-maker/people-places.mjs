// Prints the People and Places lines for a range, ready to paste into an ingredients
// entry after its Range changes.
//
//   node scripts/dough-maker/people-places.mjs "Romans 1:1–17; Romans 16"
import { loadReference, expand, formatRefs, peoplePlaces } from './lib.mjs';

const text = process.argv.slice(2).join(' ');
if (!text) {
  console.error('usage: people-places.mjs "<reference>"');
  process.exit(1);
}
const ref = loadReference();
const verses = expand(ref, text);
const { people, places } = peoplePlaces(ref, verses);
const names = (list) => list.map((x) => x.name).join(', ') || '—';
console.log(`${formatRefs(ref, verses)} (${verses.length} verses)`);
console.log(`- **People (${people.length}):** ${names(people)}`);
console.log(`- **Places (${places.length}):** ${names(places)}`);
