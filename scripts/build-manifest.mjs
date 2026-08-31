#!/usr/bin/env node
// Emit manifest.json — the machine-readable catalog consumed by MZPico
// firmware (and the transitional CF Worker shim).
//
// FORMAT IS A CONTRACT. Any change to the shape below is a breaking
// change for devices in the field: bump MANIFEST_FORMAT, update the
// README section "manifest.json", and keep the old shape servable if
// firmware that reads it is still out there.
//
// Usage: node scripts/build-manifest.mjs [--out <file>]   (default: stdout)
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog, fileUrl } from './lib/catalog.mjs';

export const MANIFEST_FORMAT = 1;

// Exact key sets of format 1 — guards against accidental drift.
const TOP_KEYS = ['format', 'generated', 'titleCount', 'fileCount', 'titles'];
const TITLE_KEYS = ['slug', 'title', 'machine', 'mode', 'year', 'files'];
const FILE_KEYS = ['path', 'name', 'kind', 'size', 'crc32'];

/** Build the manifest object from a catalog produced by readCatalog(). */
export function buildManifest(catalog, { now = new Date() } = {}) {
  const titles = catalog.map((t) => ({
    slug: t.slug,
    title: t.meta.title,
    machine: t.meta.machine,
    ...(t.meta.mode ? { mode: t.meta.mode } : {}),
    ...(t.meta.year ? { year: t.meta.year } : {}),
    files: t.files.map((f) => ({
      path: fileUrl(t.slug, f.path),      // absolute path on the catalog origin
      name: f.header?.name ?? '',         // file name from the MZF header
      kind: f.kind,
      size: f.size,                        // bytes, including the 128-byte header
      crc32: f.crc32,                      // CRC-32 of the whole file, 8 lowercase hex digits
    })),
  }));
  const manifest = {
    format: MANIFEST_FORMAT,
    generated: now.toISOString(),
    titleCount: titles.length,
    fileCount: titles.reduce((n, t) => n + t.files.length, 0),
    titles,
  };
  assertShape(manifest);
  return manifest;
}

function assertShape(m) {
  const check = (obj, allowed, where) => {
    const bad = Object.keys(obj).filter((k) => !allowed.includes(k));
    if (bad.length) throw new Error(`manifest ${where} has keys outside format ${MANIFEST_FORMAT}: ${bad.join(', ')} — bump MANIFEST_FORMAT`);
  };
  check(m, TOP_KEYS, 'root');
  for (const t of m.titles) {
    check(t, TITLE_KEYS, `title ${t.slug}`);
    for (const f of t.files) check(f, FILE_KEYS, `file ${f.path}`);
  }
}

export const serializeManifest = (m) => JSON.stringify(m, null, 2) + '\n';

// --- CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outIdx = process.argv.indexOf('--out');
  const out = outIdx !== -1 ? process.argv[outIdx + 1] : null;
  const json = serializeManifest(buildManifest(await readCatalog()));
  if (out) {
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, json);
    console.log(`wrote ${out}`);
  } else {
    process.stdout.write(json);
  }
}
