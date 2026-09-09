#!/usr/bin/env node
// Derive readable display titles for bootstrap-imported entries from the MZF
// tape header, which every dump carries and which is almost always better than
// the 8-character file name the legacy catalog was keyed by:
//
//     A-Higway  ->  Alien Highway        After2  ->  After the War 2
//
// Only touches entries that still carry the bootstrap marker comment and were
// never curated (no `web: true`). Run with --write to apply, otherwise it just
// prints the proposal.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readCatalog } from '../../scripts/lib/catalog.mjs';

const KEEP = new Set(['MZ', 'ZX', 'PC', 'TV', 'UFO', 'PCG', 'BASIC', 'CP/M', 'DOS', 'USA', 'BBG', 'FGI',
  'JOY', 'RAM', 'ROM', 'CPU', 'SN', 'AY', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII',
  '3D', '2D', 'OK', 'HD', 'FDD', 'QD', 'MB', 'KB', 'A4', 'S&N', 'D-DAY']);
const LOWER = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'or', 'vs']);
// Trailing markers the tape used to tell parts and variants apart. They carry
// real information (alien-8 is the code, alien-sc the title screen), so they
// are kept — just moved into brackets so the name reads as a name.
const MARKERS = new Set(['prog', 'program', 'scr', 'screen', 'data', 'main', 'code', 'c', 'm',
  'new', 'old', 'color', 'colour', 'cs', 'de', 'en', 'ja', 'joy', 'key', 'turbo']);

const titleCase = (name) => name
  .split(' ')
  .map((word, i) => {
    if (!word) return word;
    const bare = word.replace(/[^A-Za-z0-9/&-]/g, '');
    if (KEEP.has(bare.toUpperCase()) && bare.length <= 5) return word.toUpperCase();
    // Codes stay codes (MZ-800, V1.0C, 32K), but a shouted word that merely
    // sits next to a digit is still a word: 5-GEWINNT -> 5-Gewinnt.
    if (/\d/.test(word)) return word.replace(/[A-Za-z]{4,}/g, (run) =>
      run.charAt(0).toUpperCase() + run.slice(1).toLowerCase());
    const lower = word.toLowerCase();
    if (i > 0 && LOWER.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  })
  .join(' ');

export function displayTitle(headerName) {
  let name = (headerName ?? '').replace(/\s+/g, ' ').trim().replace(/%+$/, '').trim();
  if (name.length < 2 || !/[A-Za-z0-9]/.test(name)) return null;
  const markers = [];
  for (;;) {
    const m = /^(.*\S)\s+([A-Za-z]{1,7})$/.exec(name);
    if (!m || !MARKERS.has(m[2].toLowerCase())) break;
    markers.unshift(m[2].toLowerCase());
    name = m[1];
  }
  // Tape names are mostly shouted; title-case those, but leave a name the
  // author deliberately wrote in mixed case alone.
  const letters = name.replace(/[^A-Za-z]/g, '');
  const shouted = letters.length > 0 && (letters.replace(/[a-z]/g, '').length / letters.length) > 0.6;
  const base = shouted ? titleCase(name) : name;
  return markers.length ? `${base} (${markers.join(', ')})` : base;
}

const write = process.argv.includes('--write');
const rows = [];
for (const t of await readCatalog()) {
  if (t.meta.web) continue;
  const metaPath = path.join(t.dir, 'meta.yaml');
  const yaml = await readFile(metaPath, 'utf8');
  if (!yaml.includes('Bootstrap-imported')) continue;         // already curated by hand
  const next = displayTitle(t.files[0]?.header?.name);
  if (!next || next === t.meta.title) continue;
  rows.push({ slug: t.slug, from: t.meta.title, to: next });
  if (write) {
    await writeFile(metaPath, yaml.replace(/^title: .*$/m, `title: ${JSON.stringify(next)}`), 'utf8');
  }
}
for (const r of rows) console.log(`${r.slug.padEnd(14)} ${r.from.padEnd(22)} -> ${r.to}`);
console.log(`\n${rows.length} title(s) ${write ? 'rewritten' : 'to rewrite (run with --write)'}`);
