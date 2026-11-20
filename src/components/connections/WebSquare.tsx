// One person's square card inside a small web (a person's page or a link's page), as in the owner's artifact: a cream
// card with a colored edge, the name filling its width, and the tag under it. Someone not collected yet is pale.

import { Defs, G, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';
import { wrapName, type WebNode } from './webModel';

/** The gradient both card faces use; put `<SquareFills />` once inside each small web's drawing. */
export function SquareFills() {
  return (
    <Defs>
      <LinearGradient id="sqfill" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.15" stopColor={webPage.cardTop} />
        <Stop offset="1" stopColor={webPage.cardBottom} />
      </LinearGradient>
      <LinearGradient id="sqlocked" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.15" stopColor={webPage.lockedTop} />
        <Stop offset="1" stopColor={webPage.lockedBottom} />
      </LinearGradient>
    </Defs>
  );
}

/** Props for a square. */
type WebSquareProps = {
  /** The person. */
  node: WebNode;
  /** The card's middle and size. */
  x: number;
  y: number;
  size: number;
  /** The edge's color and width: a link's color for the people around someone, brown for the person in the middle. */
  ring: string;
  ringWidth: number;
  /** Opens the person; left out for someone not collected yet. */
  onPress?: () => void;
};

/** One square card. */
export function WebSquare({ node, x, y, size: s, ring, ringWidth, onPress }: WebSquareProps) {
  const open = node.character !== undefined;
  const lines = wrapName(node.name, 9);
  const tags = node.tag ? wrapName(node.tag, 14) : [];
  // The name fills the card's width, as in the artifact; a tag sits under it, smaller.
  const fs = Math.min(s * 0.26, (s - 10) / (Math.max(...lines.map((t) => t.length)) * 0.56));
  const tfs = tags.length ? Math.min(fs * 0.62, (s - 8) / (Math.max(...tags.map((t) => t.length)) * 0.52)) : 0;
  const total = lines.length * fs * 1.08 + tags.length * tfs * 1.1;
  let ty = y - total / 2 + fs * 0.82;
  const ink = open ? webPage.cardInk : webPage.lockedInk;
  const words = [
    ...lines.map((t) => ({ t, size: fs, step: 1.08, font: fonts.extraBold })),
    ...tags.map((t) => ({ t, size: tfs, step: 1.1, font: fonts.body })),
  ].map((w, i) => {
    const el = (
      <SvgText key={i} x={x} y={ty} fontSize={w.size} fontFamily={w.font} fill={ink} textAnchor="middle">
        {w.t}
      </SvgText>
    );
    ty += w.size * w.step;
    return el;
  });
  return (
    <G onPress={onPress}>
      {open && <Rect x={x - s / 2} y={y - s / 2 + s * 0.07} width={s} height={s} rx={s * 0.14} fill={webPage.cardShadow} />}
      <Rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * 0.14} fill={open ? 'url(#sqfill)' : 'url(#sqlocked)'} stroke={open ? ring : webPage.lockedEdge} strokeWidth={ringWidth} />
      {words}
    </G>
  );
}
