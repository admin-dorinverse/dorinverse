// One covered word in the reader: a pill of cookie crumbs as wide as the hidden word would be, sitting in the
// line like a real word. The crumb picture comes from the design's own crumb pattern (assets/images/crumbs@3x.webp, drawn at 3x so it stays sharp).

import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { reader } from '@/theme/colors';

/** The crumb pattern, tiled across each pill. */
const CRUMBS = require('../../../assets/images/crumbs.webp');

/** About how wide one letter of the reading font is, as a share of the text size. */
const LETTER_WIDTH = 0.5;

/** Three slightly different pill shapes, so a row of covered words looks hand-crumbled, as in the design. */
const SHAPES = [
  { borderTopLeftRadius: 5, borderTopRightRadius: 7, borderBottomRightRadius: 4, borderBottomLeftRadius: 6 },
  { borderTopLeftRadius: 7, borderTopRightRadius: 4, borderBottomRightRadius: 6, borderBottomLeftRadius: 5 },
  { borderTopLeftRadius: 6, borderTopRightRadius: 5, borderBottomRightRadius: 7, borderBottomLeftRadius: 4 },
] as const;

/** Props for a covered word. */
type CoveredWordProps = {
  /** How many letters the hidden word has. */
  letters: number;
  /** The reader's text size. */
  fontSize: number;
  /** The word's place in its verse, which picks its shape and where the pattern starts. */
  index: number;
};

/** A crumb-covered word. */
export const CoveredWord = memo(function CoveredWord({ letters, fontSize, index }: CoveredWordProps) {
  const width = Math.max(6, letters * fontSize * LETTER_WIDTH);
  const height = Math.round(fontSize * 1.05);
  const shift = (index % 3) * 4;
  return (
    <View style={[styles.pill, SHAPES[index % 3], { width, height, marginBottom: -Math.round(fontSize * 0.22) }]}>
      <Image source={CRUMBS} resizeMode="repeat" style={[styles.crumbs, { left: -shift, top: -shift }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  pill: { overflow: 'hidden', boxShadow: `0 1px 0 ${reader.crumbShadow}` },
  crumbs: { position: 'absolute', width: 320, height: 60 },
});
