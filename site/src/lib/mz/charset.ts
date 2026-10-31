// Sharp MZ character codes, both of the ones people actually meet.
//
//  - "display": what sits in video memory at 0xD000 and what a screen dump
//    contains. Letters, digits and punctuation are scattered: 0x01-0x1A is
//    A-Z, 0x81-0x9A is a-z, 0x20-0x29 is 0-9.
//  - "file": the code tape names and BASIC text use, where printable ASCII
//    passes through and the lowercase letters sit above 0x80 (see mzf.ts).
//
// Both tables are the ones this project already uses elsewhere
// (tools/screenshots/auto-capture.py reads screens with the display table,
// scripts/lib/catalog.mjs reads tape names with the file one). They cover
// letters, digits and common punctuation — the graphics characters and the
// accented sets are not here; those need the full ROM tables, which live in
// the emulator under a different licence.

import { sharpCharToText } from './mzf';

export type Charset = 'display' | 'file';

const display = new Map<number, string>([[0x00, ' ']]);
for (let i = 0; i < 26; i++) {
  display.set(0x01 + i, String.fromCharCode(65 + i));   // A-Z
  display.set(0x81 + i, String.fromCharCode(97 + i));   // a-z
}
for (let i = 0; i < 10; i++) display.set(0x20 + i, String(i));
for (const [code, ch] of [
  [0x2a, '-'], [0x2b, '='], [0x2c, ';'], [0x2d, '/'], [0x2e, '.'], [0x2f, ','],
  [0x49, '?'], [0x4f, ':'], [0x55, '@'], [0x61, '!'], [0x62, '"'], [0x63, '#'],
  [0x64, '$'], [0x65, '%'], [0x66, '&'], [0x67, "'"], [0x68, '('], [0x69, ')'],
  [0x6a, '+'], [0x6b, '*'],
] as [number, string][]) display.set(code, ch);

const displayReverse = new Map<string, number>();
for (const [code, ch] of display) if (!displayReverse.has(ch)) displayReverse.set(ch, code);

/** Bytes to text. Anything with no equivalent here becomes `unknown`. */
export function decode(bytes: Uint8Array, set: Charset, unknown = '·'): string {
  let out = '';
  for (const b of bytes) {
    if (set === 'display') out += display.get(b) ?? unknown;
    else {
      const ch = sharpCharToText(b);
      out += ch === '?' && b !== 0x3f ? unknown : ch;
    }
  }
  return out;
}

/** Text to bytes. Characters the machine has no code for become a space. */
export function encode(text: string, set: Charset): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (set === 'display') out[i] = displayReverse.get(ch) ?? displayReverse.get(ch.toUpperCase()) ?? 0x00;
    else {
      const code = ch.charCodeAt(0);
      if (code >= 0x20 && code < 0x7f) out[i] = code;
      else {
        let found = 0x20;
        for (const [c, mapped] of [...Array(256).keys()].map((c) => [c, sharpCharToText(c)] as const)) {
          if (mapped === ch) { found = c; break; }
        }
        out[i] = found;
      }
    }
  }
  return out;
}

/** "41 42 43" / "414243" / "0x41,0x42" -> bytes. Anything else in the text is ignored. */
export function parseHex(text: string): Uint8Array {
  const cleaned = text.replace(/0x/gi, ' ').replace(/[^0-9a-f]/gi, '');
  const pairs = cleaned.match(/../g) ?? [];
  return new Uint8Array(pairs.map((p) => parseInt(p, 16)));
}

export const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

/** The classic 40-column screen dump: 25 rows of 40 display codes. */
export function screenText(bytes: Uint8Array, columns = 40): string[] {
  const rows: string[] = [];
  for (let i = 0; i + columns <= bytes.length; i += columns) rows.push(decode(bytes.subarray(i, i + columns), 'display', ' '));
  return rows;
}
