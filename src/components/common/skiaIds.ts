// Gives Skia canvases fresh numbers on every JavaScript start. Import this once, first thing, in the root layout.
//
// Skia numbers its canvases from 1000 each time the JavaScript starts. A developer Reload starts the JavaScript
// again while the old canvases are still being torn down, so a new canvas can take an old one's number and then
// lose its drawing when the old one goes. Starting each run at a fresh block of numbers avoids that. Real launches
// always start clean, so this only matters while testing.

import { SkiaViewNativeId } from '@shopify/react-native-skia/src/views/SkiaViewNativeId';

/** Numbers set aside for one run. No run makes anywhere near this many canvases. */
const NUMBERS_PER_RUN = 100000;

/** How many runs can have their own block before numbers come around again (about three hours of reloading). */
const RUNS = 10000;

SkiaViewNativeId.current = 1000 + (Math.floor(Date.now() / 1000) % RUNS) * NUMBERS_PER_RUN;
