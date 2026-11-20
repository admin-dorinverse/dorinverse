// Cuts the Armor of God into its 1,558 glass shards (one per playable passage), once, so the phone never has to.
// A straight port of buildShards() in the Constellations design (design/constellations/index.html): each piece is
// filled with points, shards are grown around evenly spread seeds (Voronoi cells), colored by the piece's gold, red,
// steel or leather parts, and ranked from the piece's heart outward (the order they are earned in).
// It uses CanvasKit, the same drawing engine as the app's Skia, so the pixel tests match the browser's.
//
//   node scripts/app/make-armor-shards.mjs     # writes assets/data/armor-shards.json
import fs from 'node:fs';
import path from 'node:path';
import CanvasKitInit from 'canvaskit-wasm';
import { ARMOR_PIECES } from '../../src/components/sky/armorShapes.ts';

const ROOT = path.join(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'data', 'armor-shards.json');
const CK = await CanvasKitInit({ locateFile: (f) => path.join(ROOT, 'node_modules', 'canvaskit-wasm', 'bin', f) });

/** How many shards the whole armor has: one per playable passage. */
const SHARD_TOTAL = 1558;
/** The shard colors, in the order the app numbers them. */
const COLORS = ['silver', 'steel', 'gold', 'red', 'leather', 'dark'];

/** The design's seeded random numbers, so the shards come out the same every time. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(20261115);
const S2 = 2;
const fillPaint = new CK.Paint();
fillPaint.setColor(CK.BLACK);
fillPaint.setAntiAlias(true);

// The points inside each piece, two per pixel across.
const info = ARMOR_PIECES.map((p) => {
  const [x0, y0, w, h] = p.box;
  const W = Math.ceil(w * S2);
  const H = Math.ceil(h * S2);
  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  canvas.scale(S2, S2);
  canvas.translate(-x0, -y0);
  for (const d of p.sil) canvas.drawPath(CK.Path.MakeFromSVGString(d), fillPaint);
  const im = canvas.readPixels(0, 0, { width: W, height: H, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB });
  const px = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (im[(j * W + i) * 4 + 3] > 127) px.push(x0 + (i + 0.5) / S2, y0 + (j + 0.5) / S2);
  surface.delete();
  return { p, px, area: px.length / 2 / (S2 * S2), box: [x0, y0, w, h] };
});

// Shards per piece, by area, so every shard is about the same size.
const tot = info.reduce((a, b) => a + b.area, 0);
let given = 0;
info.forEach((o) => {
  o.raw = (SHARD_TOTAL * o.area) / tot;
  o.n = Math.floor(o.raw);
  given += o.n;
});
info.slice().sort((a, b) => b.raw - b.n - (a.raw - a.n)).slice(0, SHARD_TOTAL - given).forEach((o) => o.n++);

/** True when a point is inside a path, or within half `width` of its line when `width` is given. */
function inside(d, width, x, y) {
  let p = CK.Path.MakeFromSVGString(d);
  if (width) p = p.makeStroked({ width, cap: CK.StrokeCap.Round });
  return p.contains(x, y);
}

const out = [];
info.forEach((o) => {
  const P = o.px;
  const np = P.length / 2;
  const n = o.n;
  const sp = Math.sqrt(o.area / n);
  let sites = [];
  for (let i = 0; i < n; i++) {
    const q = Math.floor(R() * np);
    sites.push([P[q * 2] + (R() - 0.5) * 0.3, P[q * 2 + 1] + (R() - 0.5) * 0.3]);
  }
  const g = sp * 1.5;
  const [bx, by] = o.box;
  const GW = Math.ceil(o.box[2] / g) + 2;
  const GH = Math.ceil(o.box[3] / g) + 2;
  const Q = [];
  for (let q = 0; q < np; q += 2) Q.push(P[q * 2], P[q * 2 + 1]);
  const nq = Q.length / 2;
  // Spread the seeds evenly (Lloyd's method), as the design does, 8 rounds.
  for (let it = 0; it < 8; it++) {
    const gr = Array.from({ length: GW * GH }, () => []);
    sites.forEach((s, k) => {
      const gi = Math.min(GW - 1, Math.max(0, Math.floor((s[0] - bx) / g)));
      const gj = Math.min(GH - 1, Math.max(0, Math.floor((s[1] - by) / g)));
      gr[gi * GH + gj].push(k);
    });
    const sx = new Float64Array(n), sy = new Float64Array(n), c = new Uint32Array(n);
    for (let q = 0; q < nq; q++) {
      const x = Q[q * 2], y = Q[q * 2 + 1], gi = Math.floor((x - bx) / g), gj = Math.floor((y - by) / g);
      let best = -1, bd = 1e9;
      for (let a = gi - 1; a <= gi + 1; a++) {
        if (a < 0 || a >= GW) continue;
        for (let b = gj - 1; b <= gj + 1; b++) {
          if (b < 0 || b >= GH) continue;
          for (const k of gr[a * GH + b]) {
            const dx = sites[k][0] - x, dy = sites[k][1] - y, d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = k; }
          }
        }
      }
      if (best >= 0) { sx[best] += x; sy[best] += y; c[best]++; }
    }
    sites = sites.map((s, k) => (c[k] ? [sx[k] / c[k], sy[k] / c[k]] : s));
  }
  // Each shard: a box around its seed, cut by the line halfway to every nearby seed.
  sites.forEach((s, k) => {
    const h = sp * 2.2;
    let poly = [[s[0] - h, s[1] - h], [s[0] + h, s[1] - h], [s[0] + h, s[1] + h], [s[0] - h, s[1] + h]];
    sites.forEach((t, m) => {
      if (m === k) return;
      const dx = t[0] - s[0], dy = t[1] - s[1];
      if (dx * dx + dy * dy > (sp * 4) ** 2) return;
      const mx = (s[0] + t[0]) / 2, my = (s[1] + t[1]) / 2, f = ([x, y]) => (x - mx) * dx + (y - my) * dy, cut = [];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], C = poly[(i + 1) % poly.length], fa = f(A), fc = f(C);
        if (fa <= 0) cut.push(A);
        if (fa < 0 !== fc < 0 && fa !== fc) {
          const u = fa / (fa - fc);
          cut.push([A[0] + (C[0] - A[0]) * u, A[1] + (C[1] - A[1]) * u]);
        }
      }
      poly = cut;
    });
    let col = 'silver';
    for (const [cName, d, w] of o.p.regions) if (inside(d, w, s[0], s[1])) col = cName;
    out.push({ piece: ARMOR_PIECES.indexOf(o.p), poly, cx: s[0], cy: s[1], lt: R(), col });
  });
});

// The order shards are earned in each piece: outward from the piece's heart, with a little noise.
ARMOR_PIECES.forEach((_, pi) => {
  const ids = out.map((sh, i) => (sh.piece === pi ? i : -1)).filter((i) => i >= 0);
  const mx = ids.reduce((a, i) => a + out[i].cx, 0) / ids.length;
  const my = ids.reduce((a, i) => a + out[i].cy, 0) / ids.length;
  const sc = Math.sqrt(ids.length) * 0.45;
  ids.forEach((i) => (out[i].ord = Math.hypot(out[i].cx - mx, (out[i].cy - my) * 0.85) + R() * sc));
  ids.sort((a, b) => out[a].ord - out[b].ord).forEach((i, r) => {
    out[i].rank = r;
    out[i].of = ids.length;
  });
});

// Saved compactly: [piece, color, lightness, rank, shards in its piece, x1, y1, x2, y2, …].
const rows = out.map((sh) => [sh.piece, COLORS.indexOf(sh.col), Math.round(sh.lt * 1000) / 1000, sh.rank, sh.of, ...sh.poly.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ colors: COLORS, shards: rows }));
console.log(`Wrote ${rows.length} shards (${Math.round(fs.statSync(OUT).size / 1024)} KB) to ${path.relative(ROOT, OUT)}`);
