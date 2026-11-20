// Draws the Character Connections web, as in the owner's artifact: colored link lines (some dashed), cream square
// cards with a gap ring so lines break around them, each line ending in a dot on the card's edge, and a round
// handle on each line's middle. People not collected yet are pale and their lines faint. It is drawn once into a
// picture; panning and zooming only move that picture.

import { PaintStyle, Skia, StrokeCap, TileMode, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import { linkColors, webPage } from '@/theme/characterWebColors';
import { LINK_STYLES, linkEnds, type Web, type WebLink, type WebNode } from './webModel';

/** A line's base width, the gap ring's width around a card, and the size of a line's middle handle. */
const LINE_WIDTH = 2.6;
const RING = 6;
const KNOB = 8;

/** The two fonts names are drawn in: bold for the name, regular for the tag. Both are made at this size. */
export const WEB_FONT_SIZE = 20;

/** A card's corner rounding, as a share of its size. */
const CORNER = 0.14;

/** How strongly a line shows when one of its people is not collected yet. */
const LOCKED_LINE = 0.25;

/** Makes a stroke paint for a link. */
function linkPaint(l: WebLink): ReturnType<typeof Skia.Paint> {
  const style = LINK_STYLES[l.type];
  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setColor(Skia.Color(linkColors[l.type]));
  paint.setStrokeWidth(LINE_WIDTH * (style.width ?? 1));
  if (style.dash) paint.setPathEffect(Skia.PathEffect.MakeDash([...style.dash], 0));
  if (l.why === undefined) paint.setAlphaf(LOCKED_LINE);
  return paint;
}

/** Draws text lines centered on `x`, scaled from the fonts' size to `size`, starting at baseline `y`. Returns the next baseline. */
function drawLines(canvas: SkCanvas, lines: readonly string[], x: number, y: number, size: number, step: number, font: SkFont, paint: ReturnType<typeof Skia.Paint>): number {
  const k = size / WEB_FONT_SIZE;
  for (const t of lines) {
    const w = font.measureText(t).width * k;
    canvas.save();
    canvas.translate(x - w / 2, y);
    canvas.scale(k, k);
    canvas.drawText(t, 0, 0, paint, font);
    canvas.restore();
    y += size * step;
  }
  return y;
}

/** Draws one card: its soft shadow, cream face, brown edge, and name. A card not collected yet is pale, with no shadow. */
function drawCard(canvas: SkCanvas, n: WebNode, bold: SkFont, regular: SkFont): void {
  const s = n.size;
  const x = n.x - s / 2;
  const y = n.y - s / 2;
  const open = n.character !== undefined;
  if (open) {
    const shadow = Skia.Paint();
    shadow.setColor(Skia.Color(webPage.cardShadow));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y + s * 0.07, s, s), s * CORNER, s * CORNER), shadow);
  }
  const face = Skia.Paint();
  const top = open ? webPage.cardTop : webPage.lockedTop;
  const bottom = open ? webPage.cardBottom : webPage.lockedBottom;
  face.setShader(Skia.Shader.MakeLinearGradient({ x, y }, { x: x + s, y: y + s }, [Skia.Color(top), Skia.Color(bottom)], [0.15, 1], TileMode.Clamp));
  const box = Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * CORNER, s * CORNER);
  canvas.drawRRect(box, face);
  const edge = Skia.Paint();
  edge.setStyle(PaintStyle.Stroke);
  edge.setStrokeWidth(2.2);
  edge.setColor(Skia.Color(open ? webPage.cardEdge : webPage.lockedEdge));
  canvas.drawRRect(box, edge);
  // The name fills the card's width, as in the artifact; a tag sits under it, smaller.
  const longest = Math.max(...n.lines.map((t) => t.length));
  const fs = Math.min(s * 0.27, (s - 10) / (longest * 0.56));
  const tagLongest = n.tagLines.length ? Math.max(...n.tagLines.map((t) => t.length)) : 0;
  const tfs = tagLongest ? Math.min(fs * 0.62, (s - 8) / (tagLongest * 0.52)) : 0;
  const total = n.lines.length * fs * 1.08 + n.tagLines.length * tfs * 1.1;
  const ink = Skia.Paint();
  ink.setColor(Skia.Color(open ? webPage.cardInk : webPage.lockedInk));
  const next = drawLines(canvas, n.lines, n.x, n.y - total / 2 + fs * 0.82, fs, 1.08, bold, ink);
  drawLines(canvas, n.tagLines, n.x, next - fs * 0.08 + tfs * 0.1, tfs, 1.1, regular, ink);
}

/** Draws the whole web. */
export function drawWeb(canvas: SkCanvas, web: Web, bold: SkFont, regular: SkFont): void {
  const page = Skia.Paint();
  page.setColor(Skia.Color(webPage.background));
  // Lines under everything.
  for (const l of web.links) {
    const [x1, y1, x2, y2] = linkEnds(l);
    canvas.drawLine(x1, y1, x2, y2, linkPaint(l));
  }
  // A gap ring around each card, so lines passing underneath visibly break around it.
  for (const n of web.nodes) {
    const s = n.size;
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(n.x - s / 2 - RING, n.y - s / 2 - RING, s + RING * 2, s + RING * 2), s * CORNER + RING, s * CORNER + RING), page);
  }
  for (const n of web.nodes) drawCard(canvas, n, bold, regular);
  // A line that belongs to a card runs through its gap ring and ends in a dot on the card's edge.
  for (const l of web.links) {
    const [x1, y1, x2, y2] = linkEnds(l);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const paint = linkPaint(l);
    paint.setPathEffect(null);
    const dot = Skia.Paint();
    dot.setColor(Skia.Color(linkColors[l.type]));
    if (l.why === undefined) dot.setAlphaf(LOCKED_LINE);
    for (const [n, cx, cy, dx, dy] of [[l.a, x1, y1, ux, uy], [l.b, x2, y2, -ux, -uy]] as const) {
      const t = n.size / 2 / Math.max(Math.abs(dx), Math.abs(dy), 0.001);
      const ex = cx + dx * t;
      const ey = cy + dy * t;
      canvas.drawLine(ex, ey, ex + dx * (RING + 2), ey + dy * (RING + 2), paint);
      canvas.drawCircle(ex, ey, Math.min(n.size * 0.09, 3.5), dot);
    }
  }
  // A round handle on each line's middle, on top of everything.
  for (const l of web.links) {
    const [x1, y1, x2, y2] = linkEnds(l);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const ring = Skia.Paint();
    ring.setStyle(PaintStyle.Stroke);
    ring.setStrokeWidth(3);
    ring.setColor(Skia.Color(linkColors[l.type]));
    const dot = Skia.Paint();
    dot.setColor(Skia.Color(linkColors[l.type]));
    if (l.why === undefined) {
      ring.setAlphaf(LOCKED_LINE);
      dot.setAlphaf(LOCKED_LINE);
    }
    canvas.drawCircle(mx, my, KNOB, page);
    canvas.drawCircle(mx, my, KNOB, ring);
    canvas.drawCircle(mx, my, KNOB * 0.38, dot);
  }
}
