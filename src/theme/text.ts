// Fonts and text styles. Constellations uses Nunito for everything, with the heaviest weights for headings and buttons.
// The Bible reader adds a serif for verse words and the made-for-the-app Stardust font for covered words.

import { Platform, type TextStyle } from 'react-native';

/** Font names as they are loaded in the root layout. */
export const fonts = {
  /** Nunito SemiBold, for body text. */
  body: 'Nunito_600SemiBold',
  /** Nunito Bold. */
  bold: 'Nunito_700Bold',
  /** Nunito ExtraBold, for small labels. */
  extraBold: 'Nunito_800ExtraBold',
  /** Nunito Black, for headings, buttons and numbers. */
  black: 'Nunito_900Black',
  /** Stardust draws each letter as a smudge of dust: the reader's covered words (scripts/app/make-stardust-font.mjs). */
  stardust: 'Stardust',
} as const;

/** The serif the Bible reader uses for verse words, as in the design (Georgia on iPhones, the phone's serif elsewhere). */
export const readingFont = Platform.select({ ios: 'Georgia', default: 'serif' });

/** The reader's text size: where it starts, and how small or big the person can make it. */
export const readingSize = { start: 19, min: 15, max: 26 } as const;

/** Font files the root layout loads, keyed by the names above. */
export const fontFiles = {
  Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
  Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
  Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
  Nunito_900Black: require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'),
  Stardust: require('../../assets/fonts/Stardust.otf'),
} as const;

/** The Nunito Black file, for text drawn inside the sky canvas. */
export const skyLabelFont = fontFiles.Nunito_900Black;

/** Ready-made text styles. */
export const textStyles = {
  /** Number inside a HUD pill. */
  hudNumber: { fontFamily: fonts.black, fontSize: 16, letterSpacing: 0.2 },
  /** Label of the selected knob tab. */
  tabLabel: { fontFamily: fonts.black, fontSize: 13.5 },
  /** Title of a glass panel, like "Star Map". */
  panelTitle: { fontFamily: fonts.black, fontSize: 18, letterSpacing: 0.3 },
  /** Name under a pin on the Star Map. */
  mapPin: { fontFamily: fonts.black, fontSize: 11.5, letterSpacing: 0.2 },
  /** Big page title on a tab screen. */
  tabTitle: { fontFamily: fonts.black, fontSize: 32 },
  /** Small gold line above a tab title. */
  tabSubtitle: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 1 },
  /** Normal reading text on dark glass. */
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
} as const satisfies Record<string, TextStyle>;

/** Size of constellation names in the sky. */
export const constellationLabelSize = 26;
