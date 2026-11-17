// The rocket's picture as SVG text, copied from the Constellations rocket (60 wide, 124 tall): the body in one
// drawing and the flame in another, so the flame can flicker and grow on its own.

/** The rocket's drawing box. */
export const ROCKET_BOX = { width: 60, height: 124 } as const;

/** The point the flame scales from, as fractions of the box: the nozzle. */
export const FLAME_ORIGIN = '50% 80.6%';

/** The rocket's porthole: center and radius in the box, for the avatar that comes later. */
export const PORTHOLE = { x: 30, y: 42, radius: 7.6 } as const;

/** Wraps SVG shapes in a drawing the size of the rocket box. */
function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ROCKET_BOX.width} ${ROCKET_BOX.height}">${body}</svg>`;
}

/** The flame: a warm gradient tongue with a cream center. */
export const FLAME_SVG = svg(
  '<defs><radialGradient id="fl" cx=".5" cy=".1" r=".9"><stop offset="0" stop-color="#fff6c8"/><stop offset=".35" stop-color="#ffd25a"/><stop offset=".75" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient></defs>' +
    '<path d="M19 86 C17 100 24 112 30 124 C36 112 43 100 41 86 Z" fill="url(#fl)"/>' +
    '<path d="M24 86 C23 96 27 104 30 112 C33 104 37 96 36 86 Z" fill="#fffbe6" opacity=".9"/>',
);

/** The rocket body in the classic cream and red: fins, nozzle, body, nose cone, band, rivets, porthole and shine. */
export const BODY_SVG = svg(
  '<defs>' +
    '<linearGradient id="rkb" x1="0" x2="1"><stop offset="0" stop-color="#e9dcc0"/><stop offset=".45" stop-color="#fffaf0"/><stop offset="1" stop-color="#d8c49c"/></linearGradient>' +
    '<linearGradient id="rkn" x1="0" x2="1"><stop offset="0" stop-color="#b8432f"/><stop offset=".5" stop-color="#e5624a"/><stop offset="1" stop-color="#9b3424"/></linearGradient>' +
    '<radialGradient id="rkw" cx=".35" cy=".35"><stop offset="0" stop-color="#d8f4ff"/><stop offset=".6" stop-color="#5fb8e8"/><stop offset="1" stop-color="#1f5d8a"/></radialGradient>' +
    '<linearGradient id="rkf"><stop offset="0" stop-color="#6b3f22"/><stop offset="1" stop-color="#a0643a"/></linearGradient>' +
    '</defs>' +
    '<path d="M13 60 L1 90 L4 93 L15 84 Z" fill="url(#rkf)" stroke="#4a2c17" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M47 60 L59 90 L56 93 L45 84 Z" fill="url(#rkf)" stroke="#4a2c17" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<rect x="20" y="78" width="20" height="9" rx="3" fill="#7d6a5a" stroke="#4a2c17" stroke-width="1.4"/>' +
    '<path d="M30 3 C45 17 50 42 47 82 L13 82 C10 42 15 17 30 3 Z" fill="url(#rkb)" stroke="#4a2c17" stroke-width="1.6"/>' +
    '<path d="M30 3 C38 10 42 18 44 25 L16 25 C18 18 22 10 30 3 Z" fill="url(#rkn)" stroke="#4a2c17" stroke-width="1.4"/>' +
    '<path d="M13.6 62 L46.4 62 L46.8 70 L13.2 70 Z" fill="url(#rkn)" stroke="#4a2c17" stroke-width="1.2"/>' +
    '<circle cx="20" cy="66" r="1.5" fill="#fffaf0"/><circle cx="30" cy="66" r="1.5" fill="#fffaf0"/><circle cx="40" cy="66" r="1.5" fill="#fffaf0"/>' +
    '<circle cx="30" cy="42" r="10.5" fill="#d9a441" stroke="#4a2c17" stroke-width="1.4"/><circle cx="30" cy="42" r="7.6" fill="url(#rkw)"/>' +
    '<path d="M24.5 37.5 q3-3 6.5-2.8" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M30 70 L30 82" stroke="#4a2c17" stroke-width="1.2" opacity=".5"/>' +
    '<path d="M19 30 C18 45 18 58 19 60" stroke="#fff" stroke-width="2" opacity=".55" fill="none" stroke-linecap="round"/>',
);
