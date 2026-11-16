// Place card images (owner, 2026-11-15): for each place on the approved list, a picture from OpenBible.info's open
// geocoding data (github.com/openbibleinfo/Bible-Geocoding-Data, CC BY 4.0), which picks Wikimedia Commons photos
// (and, where it has none, Copernicus Sentinel-2 satellite views) and records each one's author, credit link and license.
//   your place (public.place.lookup) -> the fork's geo/bible-places.geojson (Theographic link -> OpenBible link)
//   -> OpenBible ancient place -> its own photo, its modern sites' photos and their extra ("alternate") photos
// A real photo always beats a satellite view. Downloads a 960-pixel copy to data/place-images/<lookup>.jpg (or the
// original when Wikimedia has no 960 copy, or OpenBible's 512-pixel copy from its thumbnails.zip) and writes
// data/place-images/images.json with the credit and license for each (most licenses need the credit shown in the
// app). A place with no usable picture gets "image": null and the app shows its default. Free: no AI model.
//   node scripts/dough-maker/run/place-images.mjs [--dry]   (--dry: match only, download nothing)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { OUTPUT } from './events.mjs';
import { agg } from '../lib.mjs';

const DATA = path.join(OUTPUT, '..', 'data');
const DIR = path.join(DATA, 'place-images');
const CACHE = path.join(OUTPUT, '..', 'run', '.cache', 'openbible');
const SRC = {
  geo: 'https://raw.githubusercontent.com/admin-dorinverse/theographic-bible-metadata/master/geo/bible-places.geojson',
  ancient: 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/ancient.jsonl',
  modern: 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/modern.jsonl',
  image: 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/image.jsonl',
  zip: 'https://a.openbible.info/geo/thumbnails.zip',
};
const UA = { 'User-Agent': 'DorinverseLessonMaker/1.0 (place images from OpenBible.info open data)' };
// licenses that only ask for a credit (or nothing); not GFDL: it needs its whole text shipped with the app
const OK_LICENSE = /^(CC-BY-[\d.]+|CC-BY-SA-[\d.]+|CC0|CC-Zero|PD|public domain|attribution|sentinel|FAL)$/i;
const WIDTH = 960;   // Wikimedia only serves standard thumbnail widths (800 gives 400 Bad Request; 960 works)
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function cached(name, url) {
  const f = path.join(CACHE, name);
  if (!fs.existsSync(f)) { fs.mkdirSync(CACHE, { recursive: true }); const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url}: ${r.status}`); fs.writeFileSync(f, await r.text()); }
  return fs.readFileSync(f, 'utf8');
}
const lines = (t) => t.trim().split('\n').map((l) => JSON.parse(l));

export async function match() {
  const geo = JSON.parse(await cached('bible-places.geojson', SRC.geo));
  const ancient = new Map(lines(await cached('ancient.jsonl', SRC.ancient)).map((a) => [a.id, a]));
  const modern = new Map(lines(await cached('modern.jsonl', SRC.modern)).map((m) => [m.id, m]));
  const images = new Map(lines(await cached('image.jsonl', SRC.image)).map((i) => [i.id, i]));
  // Theographic lookup -> OpenBible ancient ids, from the fork's links
  const obOf = new Map();
  for (const f of geo.features) {
    const links = (f.links ?? []).map((l) => l.identifier);
    const theo = links.map((u) => /theographic\.netlify\.app\/place\/([^/]+)\//.exec(u)?.[1]).filter(Boolean);
    const ob = links.map((u) => /openbible\.info\/geo\/ancient\/(a[0-9a-f]+)/.exec(u)?.[1]).filter(Boolean);
    for (const t of theo) obOf.set(t, [...new Set([...(obOf.get(t) ?? []), ...ob])]);
  }
  const list = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'sample', 'places-shortlist.json'), 'utf8')).shortlist;
  const rows = agg(`select id, lookup, name from public.place where id in (${[...new Set(list.flatMap((p) => p.ids))].map((i) => `'${i}'`).join(',')})`);
  const out = [];
  for (const p of list) {
    const lookups = rows.filter((r) => p.ids.includes(r.id)).map((r) => r.lookup);
    // every picture OpenBible gives the places it links to, in OpenBible's order (its readme: the place's own
    // thumbnail first, then each modern site's by score), extra ("alternate") photos after those; a photo marked
    // low quality after the rest; a satellite view only when there is no photo with a usable license
    const cands = [];
    const add = (th, rank, ob) => {
      const img = th?.image_id && images.get(th.image_id);
      if (!img || !OK_LICENSE.test(String(img.license ?? ''))) return;
      const satellite = img.role === 'satellite' || /sentinel/i.test(String(img.license));
      cands.push({ img, ob, satellite, rank: (satellite ? 0 : 1e7) + rank - (th.quality === 'low' ? 5e6 : 0),
        description: th.description ?? Object.values(img.descriptions ?? {})[0], file: th.file ?? Object.values(img.thumbnails ?? {})[0]?.file ?? null });
    };
    for (const a of lookups.flatMap((l) => obOf.get(l) ?? [])) {
      const anc = ancient.get(a); if (!anc) continue;
      add(anc.media?.thumbnail, 3e6, a);
      let extra = anc.extra; try { extra = typeof extra === 'string' ? JSON.parse(extra) : extra; } catch { extra = {}; }
      for (const as of extra?.associations ?? []) {
        const score = Math.min(as.score ?? 0, 999_999);
        add(as.thumbnail, 2e6 + score, a);
        const m = modern.get(as.modern_id);
        add(m?.media?.thumbnail, 2e6 + score, a);
        for (const alt of m?.media?.alternate ?? []) add(alt, 1e6 + score, a);
      }
    }
    const best = cands.sort((x, y) => y.rank - x.rank)[0];
    out.push({ name: p.name, lookup: lookups[0] ?? null, place_ids: p.ids, image: best ? {
      openbible_place: best.ob, image_id: best.img.id, satellite: best.satellite, author: best.img.author, credit: best.img.credit, credit_url: best.img.credit_url,
      license: best.img.license, description: String(best.description ?? '').replace(/<[^>]+>/g, ''),
      url: best.img.thumbnail_url_pattern ? best.img.thumbnail_url_pattern.replace('####', String(WIDTH)) : null,
      file_url: best.img.file_url ?? null, zip_file: best.file } : null });
  }
  return out;
}

// one picture: Wikimedia's 960-pixel copy; if it has none (photo smaller than 960), the original; then
// OpenBible's own 512-pixel copy from thumbnails.zip (the only copy of a satellite view)
async function download(im) {
  let last = 'no address';
  for (const u of im.satellite ? [] : [im.url, im.file_url].filter(Boolean)) {
    let next = false;
    for (let t = 0; t < 5 && !next; t++) {
      try {
        const r = await fetch(u, { headers: UA });
        if (r.status === 429) { last = '429'; await wait(15_000 * (t + 1)); continue; }
        if (!r.ok || !/^image\//.test(r.headers.get('content-type') ?? '')) { last = String(r.status); next = true; continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        await wait(1500);
        return { buf, from: u === im.url ? 'wikimedia-960' : 'wikimedia-original' };
      } catch (e) { last = e.message; next = true; }
    }
    await wait(1500);
  }
  if (im.zip_file) {
    const zip = path.join(CACHE, 'thumbnails.zip');
    if (!fs.existsSync(zip)) { const r = await fetch(SRC.zip, { headers: UA }); if (!r.ok) throw new Error(`thumbnails.zip: ${r.status}`); fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer())); }
    try { const buf = execFileSync('unzip', ['-p', zip, im.zip_file], { maxBuffer: 1 << 26 }); if (buf.length) return { buf, from: 'openbible-512' }; last = `${im.zip_file} not in zip`; } catch (e) { last = e.message; }
  }
  throw new Error(last);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const out = await match();
  const has = out.filter((p) => p.image), sat = has.filter((p) => p.image.satellite);
  const lic = {}; for (const p of has) lic[p.image.license] = (lic[p.image.license] ?? 0) + 1;
  console.log(`places: ${out.length} | with a picture: ${has.length} (photos ${has.length - sat.length}, satellite ${sat.length})`);
  console.log('licenses:', JSON.stringify(lic));
  console.log('no picture:', out.filter((p) => !p.image).map((p) => p.name).join(', '));
  if (!process.argv.includes('--dry')) {
    fs.mkdirSync(DIR, { recursive: true });
    const JS = path.join(DIR, 'images.json');
    const before = new Map((fs.existsSync(JS) ? JSON.parse(fs.readFileSync(JS, 'utf8')).places : []).filter((p) => p.image?.file).map((p) => [p.lookup, p.image]));
    let got = 0; const failed = [];
    for (const p of has) {
      const f = path.join(DIR, `${p.lookup}.jpg`);
      const old = before.get(p.lookup);
      // keep a picture already downloaded for the same image; otherwise get the new choice
      if (fs.existsSync(f) && old?.image_id === p.image.image_id) p.image.from = old.from ?? 'wikimedia-960';
      else {
        if (fs.existsSync(f)) fs.unlinkSync(f);
        try { const r = await download(p.image); fs.writeFileSync(f, r.buf); p.image.from = r.from; }
        catch (e) { failed.push(`${p.name}: ${e.message}`); continue; }
      }
      p.image.file = `${p.lookup}.jpg`; got++;
    }
    for (const p of out) if (p.image && !p.image.file) p.image = null;   // no file, no image: the app shows its default
    const keep = new Set(out.filter((p) => p.image).map((p) => p.image.file));
    for (const f of fs.readdirSync(DIR)) if (f.endsWith('.jpg') && !keep.has(f)) fs.unlinkSync(path.join(DIR, f));
    fs.writeFileSync(JS, JSON.stringify({ made: new Date().toISOString(), source: 'OpenBible.info Bible Geocoding Data (CC BY 4.0); photos from Wikimedia Commons, satellite views from Copernicus Sentinel-2 data via OpenBible.info; show each credit as its license asks', places: out }, null, 1) + '\n');
    console.log(`have a picture: ${got} | failed: ${failed.length}`, failed.join('; '));
  }
}
