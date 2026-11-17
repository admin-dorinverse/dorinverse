// The streak flame's pictures as SVG text: each flame part on its own (so it can flicker on its own), and the
// flame's soft glow in each of its three color pairs. Built from the shapes in hudArt.ts.

import { FIRE } from './hudArt';

/** The flame's drawing box: 40 wide and 48 tall. */
const BOX = { width: 40, height: 48 } as const;

/** The glow's three color pairs it cycles through, [wide glow, tight glow]. */
export const FIRE_GLOWS = [
  ['rgba(120,200,255,0.55)', 'rgba(255,120,200,0.75)'],
  ['rgba(120,255,170,0.5)', 'rgba(255,200,90,0.8)'],
  ['rgba(255,110,140,0.55)', 'rgba(150,120,255,0.8)'],
] as const;

/** Makes the SVG viewBox that adds `pad` drawn points around the flame box when drawn at `scale`. */
export function fireViewBox(scale: number, pad: number): string {
  const p = pad / scale;
  return `${-p} ${-p} ${BOX.width + p * 2} ${BOX.height + p * 2}`;
}

/** A vertical gradient (bottom to top) as SVG, with the given id. */
function gradient(id: string, g: { colors: readonly string[]; positions: readonly number[] }): string {
  const stops = g.colors.map((c, i) => `<stop offset="${g.positions[i]}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="48" x2="0" y2="0">${stops}</linearGradient>`;
}

/** One SVG drawing around some flame shapes. */
function svg(viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

/** The flame parts, each a separate drawing so each can flicker on its own rhythm. */
export function fireParts(viewBox: string) {
  const rainbow = gradient('r', FIRE.rainbow);
  return {
    /** The two small side tongues, slightly see-through. */
    sides: svg(viewBox, `<defs>${rainbow}</defs><g opacity="0.85"><path d="${FIRE.left}" fill="url(#r)"/><path d="${FIRE.right}" fill="url(#r)"/></g>`),
    /** The main flame. */
    main: svg(viewBox, `<defs>${rainbow}</defs><path d="${FIRE.main}" fill="url(#r)"/>`),
    /** The inner flame, gold to pink to violet. */
    inner: svg(viewBox, `<defs>${gradient('i', FIRE.inside)}</defs><path d="${FIRE.inner}" fill="url(#i)"/>`),
    /** The bright spot at the flame's base. */
    base: svg(viewBox, '<path d="M16.4 40 a3.6 4.4 0 1 0 7.2 0 a3.6 4.4 0 1 0 -7.2 0 Z" fill="#fff8d0" opacity="0.95"/>'),
  };
}

/**
 * The flame's glow in one color pair: a wide soft glow and a tight one around the flame's outline, without the
 * flame itself. `scale` is the drawn size per flame unit, so the blur matches the design in screen points.
 */
export function fireGlow(viewBox: string, scale: number, pair: readonly [string, string]): string {
  const [wide, tight] = pair;
  const shapes = `<path d="${FIRE.left}"/><path d="${FIRE.right}"/><path d="${FIRE.main}"/>`;
  const filter =
    '<filter id="g" x="-60%" y="-60%" width="220%" height="220%">' +
    `<feFlood flood-color="${wide}" result="cw"/><feComposite in="cw" in2="SourceAlpha" operator="in" result="sw"/>` +
    `<feGaussianBlur in="sw" stdDeviation="${4.5 / scale}" result="gw"/>` +
    `<feFlood flood-color="${tight}" result="ct"/><feComposite in="ct" in2="SourceAlpha" operator="in" result="st"/>` +
    `<feGaussianBlur in="st" stdDeviation="${2 / scale}" result="gt"/>` +
    '<feMerge><feMergeNode in="gw"/><feMergeNode in="gt"/></feMerge></filter>';
  return svg(viewBox, `<defs>${filter}</defs><g filter="url(#g)" fill="#fff">${shapes}</g>`);
}
