#!/usr/bin/env node
// Find dumps of the same program hiding under different names.
//
// The tape header lies about a lot (name, padding, sometimes the declared
// length), so nothing here trusts it. Each file is reduced to its program
// bytes — header off, trailing padding off — and compared two ways:
//
//   1. exact:  same bytes after that normalisation
//   2. near:   content-defined chunking (a rolling hash picks the boundaries,
//              so inserting or removing bytes shifts only the chunks around the
//              edit) and Jaccard similarity over the chunk hashes
//
// Usage: node tools/catalog/find-duplicates.mjs [minSimilarity]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readCatalog } from '../../scripts/lib/catalog.mjs';

const MIN = Number(process.argv[2] ?? 0.55);

/** Program bytes: no 128-byte header, no trailing padding of one repeated byte. */
function body(buf, header) {
  const declared = header?.dataSize ?? 0;
  const available = buf.length - 128;
  // A few headers under-declare wildly (2 KB claimed, 27 KB present). Trusting
  // them would compare two unrelated games by their first 2 KB of loader.
  const trust = declared > 0 && declared <= available && available <= declared * 1.5;
  const end = trust ? 128 + declared : buf.length;
  let last = end - 1;
  const pad = buf[last];
  if (pad === 0x00 || pad === 0xff) {
    while (last > 128 && buf[last - 1] === pad) last--;
  }
  return buf.subarray(128, Math.max(last + 1, 129));
}

/** Chunk boundaries chosen by content, so an edit does not reshuffle the rest. */
function chunkHashes(buf, mask = 0x3ff) {
  const out = new Set();
  let h = 0;
  let start = 0;
  for (let i = 0; i < buf.length; i++) {
    h = ((h << 1) + buf[i]) & 0xffff;
    if ((h & mask) === 0 || i - start >= 4096) {
      if (i - start >= 64) out.add(createHash('sha1').update(buf.subarray(start, i + 1)).digest('base64').slice(0, 12));
      start = i + 1;
    }
  }
  if (buf.length - start >= 64) out.add(createHash('sha1').update(buf.subarray(start)).digest('base64').slice(0, 12));
  return out;
}

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const x of a) if (b.has(x)) hits++;
  return hits / (a.size + b.size - hits);
};

const items = [];
for (const t of await readCatalog()) {
  for (const f of t.files) {
    const buf = readFileSync(path.join(t.dir, f.path));
    const prog = body(buf, f.header);
    items.push({
      slug: t.slug,
      title: t.meta.title,
      web: !!t.meta.web,
      shots: t.screenshots.length,
      file: f.path,
      name: f.header?.name ?? '',
      bytes: prog.length,
      sha: createHash('sha1').update(prog).digest('hex'),
      chunks: chunkHashes(prog),
      folder: /folder ([a-z0-9-]+)/.exec(t.meta.source ?? '')?.[1] ?? '-',
    });
  }
}

const label = (x) => `${x.slug}${x.web ? '*' : ''}`.padEnd(18) +
  `${JSON.stringify(x.name).padEnd(20)} ${String(x.bytes).padStart(6)}B shots=${x.shots} ${x.folder}`;

const exact = new Map();
for (const it of items) (exact.get(it.sha) ?? exact.set(it.sha, []).get(it.sha)).push(it);
const exactGroups = [...exact.values()].filter((g) => g.length > 1);

console.log(`${items.length} files\n`);
console.log(`== identical program bytes: ${exactGroups.length} group(s)`);
for (const g of exactGroups) {
  console.log('  ' + g.map((x) => x.slug + (x.web ? '*' : '')).join('  ==  '));
  for (const x of g) console.log('      ' + label(x));
}

const seen = new Set(exactGroups.flatMap((g) => g.map((x) => x.slug)));
const near = [];
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    const a = items[i];
    const b = items[j];
    if (a.sha === b.sha) continue;
    if (Math.min(a.bytes, b.bytes) / Math.max(a.bytes, b.bytes) < 0.5) continue;
    const s = jaccard(a.chunks, b.chunks);
    if (s >= MIN) near.push({ a, b, s });
  }
}
near.sort((x, y) => y.s - x.s);
console.log(`\n== near-identical (>= ${(MIN * 100).toFixed(0)}% of content chunks shared): ${near.length} pair(s)`);
for (const { a, b, s } of near) {
  const flag = seen.has(a.slug) || seen.has(b.slug) ? ' (also in an exact group)' : '';
  console.log(`  ${(s * 100).toFixed(0)}%${flag}`);
  console.log('      ' + label(a));
  console.log('      ' + label(b));
}
