// Character image prompts: one CSV row per card, for the person making the cookie images.
//
//   node scripts/dough-maker/character-art/csv.mjs
//
// Reads the per-character looks in looks/*.json (only the parts that change), fills the fixed
// template, checks the prompt rules and writes character-image-prompts.csv beside this file.
// Step 1 makes the character from its prompt; step 2 turns that image into the cookie.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOUGH = path.dirname(HERE);
const roster = JSON.parse(fs.readFileSync(path.join(DOUGH, 'roster.json'), 'utf8'));
const looks = new Map();
for (const f of fs.readdirSync(path.join(HERE, 'looks')).filter((f) => f.endsWith('.json')).sort())
  for (const l of JSON.parse(fs.readFileSync(path.join(HERE, 'looks', f), 'utf8'))) {
    if (looks.has(l.lookup)) throw new Error(`${l.lookup} is in more than one looks file`);
    looks.set(l.lookup, l);
  }

const BACKGROUND = 'Solid flat bright chroma-key green background (#00FF00), no shadows, no scenery.';
const STYLE = 'Stylized 3D cartoon character, warm dark-brown outline around the silhouette, soft warm lighting, warm earthy colors with bright accents, family-friendly and respectful.';
const COOKIE = 'Turn this character into a decorated sugar cookie. Keep the same pose, face, body proportions, clothing and colors. Clean stylized cartoon illustration with crisp line work, smooth icing with a soft subtle shine, outlined in piped dark-brown icing, with a thin golden-brown baked cookie border around the entire silhouette. Rich bold colors, soft warm lighting, family-friendly and respectful. Entire cookie fully visible, with empty space on all sides, centered. ' + BACKGROUND;
const DONE = new Set(['moses_2108', 'esther_1343']);   // made while the style was tested
const NO_IMAGE = 'No image — do not create.';

const pronoun = { man: 'his', boy: 'his', woman: 'her', girl: 'her' };
const characterPrompt = (l) => [
  `Full body 3/4 view of ${l.subject}, ${l.description}.`,
  `Realistic human proportions for ${pronoun[l.sex]} age, ${l.build}.`,
  l.clothing, l.pose, l.detail, STYLE,
  `Entire body${l.object ? ` and entire ${l.object}` : ''} fully visible, with empty space on all sides, centered.`,
  BACKGROUND,
].filter(Boolean).join(' ');

// Words that read as another colour, and green anywhere but the background
const BANNED = /\b(olive|ash|ashen|mint|sage|wheat|lime|emerald|jade|teal|turquoise|cyan|aqua|seaweed|leaf|leaves|halo|label|sign|inscription|text)\b/i;
const errors = [];
const rows = [];
for (const p of roster) {
  const card = JSON.parse(fs.readFileSync(path.join(DOUGH, 'cards', `${p.lookup}.json`), 'utf8'));
  const character = card.name_tag ? `${card.name} (${card.name_tag})` : card.name;
  const l = looks.get(p.lookup);
  if (!l) { errors.push(`${p.lookup}: no look`); continue; }
  if (l.skip) { rows.push([character, p.lookup, NO_IMAGE, NO_IMAGE, 'Skip']); continue; }
  for (const k of ['subject', 'description', 'build', 'clothing', 'pose'])
    if (!l[k]?.trim()) errors.push(`${p.lookup}: ${k} missing`);
  if (!pronoun[l.sex]) errors.push(`${p.lookup}: sex "${l.sex}"`);
  const prompt = characterPrompt(l);
  const bad = prompt.match(BANNED);
  if (bad) errors.push(`${p.lookup}: "${bad[0]}"`);
  if (/green/i.test(prompt.replace(BACKGROUND, ''))) errors.push(`${p.lookup}: green on the character`);
  rows.push([character, p.lookup, prompt, COOKIE, DONE.has(p.lookup) ? 'Yes' : '']);
}
for (const k of looks.keys()) if (!roster.some((p) => p.lookup === k)) errors.push(`${k}: not on the roster`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [['Character', 'Save as', 'Character prompt (step 1)', 'Cookie prompt (step 2)', 'Done'], ...rows]
  .map((r) => r.map(cell).join(',')).join('\r\n');
fs.writeFileSync(path.join(HERE, 'character-image-prompts.csv'), '﻿' + csv + '\r\n');   // BOM: Excel reads UTF-8
console.log(`${rows.length} rows written`);
