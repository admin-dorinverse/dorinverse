// Place card images (owner, 2026-11-15): for each place on the approved list, a photo from OpenBible.info's open
// geocoding data (github.com/openbibleinfo/Bible-Geocoding-Data, CC BY 4.0), which picks Wikimedia Commons photos
// and records each one's author, credit link and license.
//   your place (public.place.lookup) -> the fork's geo/bible-places.geojson (Theographic link -> OpenBible link)
//   -> OpenBible ancient place -> its best modern association's thumbnail -> the Wikimedia photo
// Downloads an 800-pixel copy to data/place-images/<lookup>.jpg and writes data/place-images/images.json with the
// credit and license for each (most licenses need the credit shown in the app). Free: no AI model.
//   node scripts/dough-maker/run/place-images.mjs [--dry]   (--dry: match only, download nothing)
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './events.mjs';
import { agg } from '../lib.mjs';

const DATA = path.join(OUTPUT, '..', 'data');
const DIR = path.join(DATA, 'place-images');
const CACHE = path.join(OUTPUT, '..', 'run', '.cache', 'openbible');
const SRC = {
  geo: 'https://raw.githubusercontent.com/admin-dorinverse/theographic-bible-metadata/master/geo/bible-places.geojson',
  ancient: 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/ancient.jsonl',
  image: 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/image.jsonl',
};
const UA = { 'User-Agent': 'DorinverseLessonMaker/1.0 (place images from OpenBible.info open data)' };
// licenses that only ask for a credit (or nothing); not GFDL: it needs its whole text shipped with the app
const OK_LICENSE = /^(CC-BY-[\d.]+|CC-BY-SA-[\d.]+|CC0|CC-Zero|PD|public domain|attribution|sentinel|FAL)$/i;
const WIDTH = 960;   // Wikimedia only serves standard thumbnail widths (800 gives 400 Bad Request; 960 works)

async function cached(name, url) {
  const f = path.join(CACHE, name);
  if (!fs.existsSync(f)) { fs.mkdirSync(CACHE, { recursive: true }); const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url}: ${r.status}`); fs.writeFileSync(f, await r.text()); }
  return fs.readFileSync(f, 'utf8');
}

export async function match() {
  const geo = JSON.parse(await cached('bible-places.geojson', SRC.geo));
  const ancient = new Map((await cached('ancient.jsonl', SRC.ancient)).trim().split('\n').map((l) => JSON.parse(l)).map((a) => [a.id, a]));
  const images = new Map((await cached('image.jsonl', SRC.image)).trim().split('\n').map((l) => JSON.parse(l)).map((i) => [i.id, i]));
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
    // every OpenBible place it links to; the best-scored photo among them
    let best = null;
    for (const a of lookups.flatMap((l) => obOf.get(l) ?? [])) {
      const anc = ancient.get(a); if (!anc) continue;
      let extra = anc.extra; try { extra = typeof extra === 'string' ? JSON.parse(extra) : extra; } catch { extra = {}; }
      for (const as of extra?.associations ?? []) {
        const img = as.thumbnail?.image_id && images.get(as.thumbnail.image_id);
        if (img && OK_LICENSE.test(String(img.license ?? '')) && (!best || (as.score ?? 0) > best.score)) best = { score: as.score ?? 0, img, description: as.thumbnail.description, ob: a };
      }
    }
    out.push({ name: p.name, lookup: lookups[0] ?? null, place_ids: p.ids, image: best ? {
      openbible_place: best.ob, image_id: best.img.id, author: best.img.author, credit: best.img.credit, credit_url: best.img.credit_url,
      license: best.img.license, license_ok: OK_LICENSE.test(String(best.img.license ?? '')),
      description: String(best.description ?? '').replace(/<[^>]+>/g, ''),
      url: best.img.thumbnail_url_pattern ? best.img.thumbnail_url_pattern.replace('####', String(WIDTH)) : best.img.file_url } : null });
  }
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const out = await match();
  const has = out.filter((p) => p.image), ok = has.filter((p) => p.image.license_ok);
  const lic = {}; for (const p of has) lic[p.image.license] = (lic[p.image.license] ?? 0) + 1;
  console.log(`places: ${out.length} | with an OpenBible photo: ${has.length} | license fine: ${ok.length}`);
  console.log('licenses:', JSON.stringify(lic));
  console.log('no photo:', out.filter((p) => !p.image).map((p) => p.name).slice(0, 40).join(', '));
  if (!process.argv.includes('--dry')) {
    fs.mkdirSync(DIR, { recursive: true });
    let got = 0, failed = [];
    for (const p of ok) {
      const f = path.join(DIR, `${p.lookup}.jpg`);
      if (!fs.existsSync(f)) {
        // slowly, and when Wikimedia says too many (429), wait and try again
        let ok = false, last = '';
        for (let t = 0; t < 5 && !ok; t++) {
          try {
            const r = await fetch(p.image.url, { headers: UA });
            if (r.status === 429) { last = '429'; await new Promise((res) => setTimeout(res, 15_000 * (t + 1))); continue; }
            if (!r.ok || !/^image\//.test(r.headers.get('content-type') ?? '')) throw new Error(`${r.status} ${r.headers.get('content-type')}`);
            fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); ok = true;
          } catch (e) { last = e.message; break; }
        }
        await new Promise((res) => setTimeout(res, 1500));
        if (!ok) { failed.push(`${p.name}: ${last}`); continue; }
      }
      p.image.file = `${p.lookup}.jpg`; got++;
    }
    fs.writeFileSync(path.join(DIR, 'images.json'), JSON.stringify({ made: new Date().toISOString(), source: 'OpenBible.info Bible Geocoding Data (CC BY 4.0), photos from Wikimedia Commons; show each credit as its license asks', places: out }, null, 1) + '\n');
    console.log(`downloaded: ${got} | failed: ${failed.length}`, failed.slice(0, 5).join('; '));
  }
}
