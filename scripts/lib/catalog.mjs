// Shared helpers for reading the catalog (titles/**) — used by the
// validator, the manifest generator and the Astro content loader.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TITLES_DIR = path.join(ROOT, 'titles');
export const SCHEMA_PATH = path.join(ROOT, 'schema', 'meta.schema.json');

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const SCREENSHOT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

/** Public URL of a title's binary. */
export const fileUrl = (slug, name) => `/files/${slug}/${name}`;
/** Public URL of a title's screenshot. */
export const screenshotUrl = (slug, name) => `/screenshots/${slug}/${name}`;

// ---------------------------------------------------------------- CRC-32
// Standard CRC-32 (IEEE 802.3 / zlib), same polynomial the firmware uses.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

export function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export const crc32Hex = (buf) => crc32(buf).toString(16).padStart(8, '0');

// ------------------------------------------------------------ MZF header
// 128-byte tape header: attribute, 17-byte name (0x0D terminated),
// data size, load address, execution address, 104 bytes comment.
export const MZF_HEADER_SIZE = 128;

export const MZF_ATTRIBUTES = {
  0x01: 'Machine code (OBJ)',
  0x02: 'BASIC program (BTX)',
  0x03: 'BASIC data (BSD)',
  0x04: 'BASIC random-access data (BRD)',
  0x05: 'BASIC program (MZ-800 BASIC)',
};

export function parseMzfHeader(buf) {
  if (buf.length < MZF_HEADER_SIZE) return null;
  const attribute = buf[0];
  let name = '';
  for (let i = 1; i <= 17; i++) {
    const c = buf[i];
    if (c === 0x0d) break;
    name += c >= 0x20 && c < 0x7f ? String.fromCharCode(c) : '?';
  }
  return {
    attribute,
    attributeName: MZF_ATTRIBUTES[attribute] ?? `Unknown (0x${attribute.toString(16).padStart(2, '0')})`,
    name: name.trimEnd(),
    dataSize: buf.readUInt16LE(18),
    loadAddress: buf.readUInt16LE(20),
    execAddress: buf.readUInt16LE(22),
  };
}

// --------------------------------------------------------------- reading
/** Sorted list of title slugs (directory names under titles/). */
export async function listTitleSlugs() {
  const entries = await readdir(TITLES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

export async function listScreenshots(titleDir) {
  let entries;
  try {
    entries = await readdir(path.join(titleDir, 'screenshots'), { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && SCREENSHOT_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

export async function readMeta(titleDir) {
  const text = await readFile(path.join(titleDir, 'meta.yaml'), 'utf8');
  return YAML.parse(text);
}

/**
 * Read one title: meta.yaml plus derived data for every listed file
 * (size, CRC32, parsed MZF header) and the list of screenshots.
 * Assumes the title has passed `scripts/validate.mjs`.
 */
export async function readTitle(slug) {
  const dir = path.join(TITLES_DIR, slug);
  const meta = await readMeta(dir);
  const files = [];
  for (const f of meta.files ?? []) {
    const buf = await readFile(path.join(dir, f.path));
    files.push({ ...f, size: buf.length, crc32: crc32Hex(buf), header: parseMzfHeader(buf) });
  }
  const screenshots = await listScreenshots(dir);
  return { slug, dir, meta, files, screenshots };
}

/** Read the whole catalog, sorted by slug. */
export async function readCatalog() {
  const titles = [];
  for (const slug of await listTitleSlugs()) titles.push(await readTitle(slug));
  return titles;
}
