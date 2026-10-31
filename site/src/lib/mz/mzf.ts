// The MZF tape image, read in the browser.
//
// A tape file is a 128-byte header followed by the body: attribute, a name of
// up to 17 characters ending in 0x0D, the body size, where it loads and where
// it starts, and a comment field the tools of the day used as they pleased.
// The same shape is parsed in scripts/lib/catalog.mjs for the build; this is
// its counterpart for the pages, with no node dependency.

export const MZF_HEADER_SIZE = 128;

export const MZF_ATTRIBUTES: Record<number, string> = {
  0x01: 'Machine code (OBJ)',
  0x02: 'BASIC program (BTX)',
  0x03: 'BASIC data (BSD)',
  0x04: 'BASIC random-access data (BRD)',
  0x05: 'BASIC program (MZ-800 BASIC)',
};

export interface MzfHeader {
  attribute: number;
  attributeName: string;
  name: string;
  dataSize: number;      // body size the header declares
  loadAddress: number;
  execAddress: number;
  comment: Uint8Array;   // the remaining header bytes, as they are
}

export interface MzfFile {
  header: MzfHeader | null;
  size: number;          // the whole file
  bodySize: number;      // what is actually there after the header
  crc32: string;         // of the whole file, as the catalog records it
  bodyCrc32: string;     // of the body alone: two dumps of one tape often differ only in the header
  trailing: number;      // bytes beyond what the header declares (padding, or something else)
  bytes: Uint8Array;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export const crc32Hex = (bytes: Uint8Array): string => crc32(bytes).toString(16).padStart(8, '0');

/** Tape names are in the Sharp character code: the printable ASCII range matches,
 * lowercase letters sit scattered above 0x80, and the rest are graphics characters
 * with no equivalent here. Table shared with scripts/lib/catalog.mjs. */
const SHARP_CHARS = new Map<number, string>([
  [0xa1, 'a'], [0x9a, 'b'], [0x9f, 'c'], [0x9c, 'd'], [0x92, 'e'], [0xaa, 'f'],
  [0x97, 'g'], [0x98, 'h'], [0xa6, 'i'], [0xaf, 'j'], [0xa9, 'k'], [0xb8, 'l'],
  [0xb3, 'm'], [0xb0, 'n'], [0xb7, 'o'], [0x9e, 'p'], [0xa0, 'q'], [0x9d, 'r'],
  [0xa4, 's'], [0x96, 't'], [0xa5, 'u'], [0xab, 'v'], [0xa3, 'w'], [0x9b, 'x'],
  [0xbd, 'y'], [0xa2, 'z'], [0x94, '~'],
]);

export const sharpCharToText = (c: number): string =>
  c >= 0x20 && c < 0x7f ? String.fromCharCode(c) : SHARP_CHARS.get(c) ?? '?';

export function parseHeader(bytes: Uint8Array): MzfHeader | null {
  if (bytes.length < MZF_HEADER_SIZE) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const attribute = bytes[0];
  let name = '';
  for (let i = 1; i <= 17; i++) {
    if (bytes[i] === 0x0d) break;
    name += sharpCharToText(bytes[i]);
  }
  return {
    attribute,
    attributeName: MZF_ATTRIBUTES[attribute] ?? `Unknown (0x${attribute.toString(16).padStart(2, '0')})`,
    name: name.trimEnd(),
    dataSize: view.getUint16(18, true),
    loadAddress: view.getUint16(20, true),
    execAddress: view.getUint16(22, true),
    comment: bytes.slice(24, MZF_HEADER_SIZE),
  };
}

export function readMzf(bytes: Uint8Array): MzfFile {
  const header = parseHeader(bytes);
  const body = bytes.subarray(MZF_HEADER_SIZE);
  return {
    header,
    size: bytes.length,
    bodySize: body.length,
    crc32: crc32Hex(bytes),
    bodyCrc32: crc32Hex(body),
    trailing: header ? bytes.length - (MZF_HEADER_SIZE + header.dataSize) : 0,
    bytes,
  };
}

export const hex = (n: number, digits = 4): string => '$' + n.toString(16).toUpperCase().padStart(digits, '0');

/** What is obviously wrong with this file, in plain words. */
export function problems(file: MzfFile): string[] {
  const out: string[] = [];
  const h = file.header;
  if (!h) return ['Shorter than a 128-byte tape header — this is not an MZF file.'];
  if (!(h.attribute in MZF_ATTRIBUTES)) out.push(`Unusual type byte ${hex(h.attribute, 2)}; a tape normally carries 01–05.`);
  if (!h.name) out.push('The name field is empty.');
  if (file.trailing < 0) out.push(`The header declares ${h.dataSize} bytes of body, but only ${file.bodySize} are here — the file is truncated.`);
  else if (file.trailing > 0) {
    const padded = file.size % 128 === 0 || file.size % 512 === 0;
    out.push(file.trailing < 512 && padded
      ? `${file.trailing} bytes past the declared end, and the file is padded to a block boundary — harmless, the old tools did that.`
      : `${file.trailing} bytes past the declared end of the body.`);
  }
  // Worth pointing out, not an error: a loader that moves code about leaves the
  // start address outside the block that arrives from tape. Hlípa does exactly that.
  if (h.execAddress < h.loadAddress || h.execAddress > h.loadAddress + h.dataSize) {
    out.push(`The start address ${hex(h.execAddress)} lies outside the block that loads here (${hex(h.loadAddress)}–${hex(h.loadAddress + h.dataSize)}) — usual when a loader moves the code.`);
  }
  return out;
}
