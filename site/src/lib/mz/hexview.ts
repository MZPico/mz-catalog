// A hex view that can hold a whole tape in it.
//
// A 44 KB body is 2 800 lines; building them all as DOM costs more than it is
// worth, so only the lines in view are rendered and the scrollbar is given its
// height by a spacer. The character column uses the Sharp codes, not ASCII,
// because that is what makes text inside a machine-code file readable.

import { decode, type Charset } from './charset';

/** How the character column reads a byte:
 *  - 'glyph1' / 'glyph2': the glyph the character generator draws for that code,
 *    from the MZ Display font — every code has one, graphics included;
 *  - 'file' / 'display': letters and digits as text, for copying out;
 *  - 'ascii': what a plain byte viewer would show. */
export type CharColumn = Charset | 'ascii' | 'glyph1' | 'glyph2';

/** Set 1 lives at U+E000, set 2 at U+E100 (see tools/mzfont/build-display-font.py). */
export const glyphChar = (byte: number, set: 1 | 2 = 1): string => String.fromCharCode((set === 1 ? 0xe000 : 0xe100) + byte);

export interface HexViewOptions {
  bytes: Uint8Array;
  /** Memory address of byte 0, when the addresses should read as the machine sees them. */
  base?: number | null;
  charset?: CharColumn;
  /** Rows kept above and below the visible window, so scrolling does not flicker. */
  overscan?: number;
}

const BYTES_PER_ROW = 16;

const asciiColumn = (part: Uint8Array): string =>
  [...part].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·')).join('');

export class HexView {
  private readonly scroller: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly rows: HTMLElement;
  private bytes: Uint8Array;
  private base: number | null;
  private charset: CharColumn;
  private rowHeight = 18;
  private readonly overscan: number;

  constructor(private readonly host: HTMLElement, opts: HexViewOptions) {
    this.bytes = opts.bytes;
    this.base = opts.base ?? null;
    this.charset = opts.charset ?? 'glyph1';
    this.overscan = opts.overscan ?? 8;
    host.classList.add('hexview');
    host.innerHTML = '<div class="hv-scroll"><div class="hv-spacer"><pre class="hv-rows mono"></pre></div></div>';
    this.scroller = host.querySelector('.hv-scroll')!;
    this.spacer = host.querySelector('.hv-spacer')!;
    this.rows = host.querySelector('.hv-rows')!;
    this.scroller.addEventListener('scroll', () => this.paint());
    this.measure();
    this.layout();
  }

  /** One rendered line tells us the row height the stylesheet actually gives us. */
  private measure() {
    this.rows.innerHTML = '<span class="hv-chars mzglyph">0000  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ················</span>';
    const height = this.rows.getBoundingClientRect().height;
    if (height > 4) this.rowHeight = height;
  }

  private get rowCount() { return Math.ceil(this.bytes.length / BYTES_PER_ROW); }

  private layout() {
    this.spacer.style.height = `${this.rowCount * this.rowHeight}px`;
    this.paint();
  }

  private static escape(text: string): string {
    return text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  }

  private chars(part: Uint8Array): { text: string; glyphs: boolean } {
    if (this.charset === 'glyph1' || this.charset === 'glyph2') {
      const set = this.charset === 'glyph1' ? 1 : 2;
      return { text: [...part].map((b) => glyphChar(b, set)).join(''), glyphs: true };
    }
    if (this.charset === 'ascii') return { text: asciiColumn(part), glyphs: false };
    return { text: decode(part, this.charset, '·'), glyphs: false };
  }

  private line(row: number): string {
    const offset = row * BYTES_PER_ROW;
    const part = this.bytes.subarray(offset, offset + BYTES_PER_ROW);
    const address = (this.base === null ? offset : this.base + offset) & 0xffffff;
    const addr = address.toString(16).toUpperCase().padStart(this.base === null ? 4 : 4, '0');
    const hex = [...part].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ').padEnd(BYTES_PER_ROW * 3 - 1);
    const { text, glyphs } = this.chars(part);
    return `<span class="hv-addr">${addr}</span>  <span class="hv-hex">${hex}</span>  ` +
      `<span class="hv-chars${glyphs ? ' mzglyph' : ''}">${HexView.escape(text)}</span>`;
  }

  private paint() {
    const viewRows = Math.ceil(this.scroller.clientHeight / this.rowHeight);
    const first = Math.max(0, Math.floor(this.scroller.scrollTop / this.rowHeight) - this.overscan);
    const last = Math.min(this.rowCount, first + viewRows + this.overscan * 2);
    const lines: string[] = [];
    for (let row = first; row < last; row++) lines.push(this.line(row));
    this.rows.style.transform = `translateY(${first * this.rowHeight}px)`;
    this.rows.innerHTML = lines.join('\n');
  }

  setCharset(charset: CharColumn) { this.charset = charset; this.paint(); }

  setBase(base: number | null) { this.base = base; this.paint(); }

  /** Scroll so that this offset (or memory address, when a base is set) is on screen. */
  goTo(address: number) {
    const offset = this.base === null ? address : address - this.base;
    const row = Math.floor(Math.max(0, Math.min(offset, this.bytes.length - 1)) / BYTES_PER_ROW);
    this.scroller.scrollTop = Math.max(0, row * this.rowHeight - this.scroller.clientHeight / 2);
  }
}

export const hexView = (host: HTMLElement, opts: HexViewOptions) => new HexView(host, opts);
