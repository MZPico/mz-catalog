// The panels the workbench can open, and the actions that open them.
// Everything here is about tape files so far; a floppy module will register
// its own actions the same way.

import { hex, MZF_HEADER_SIZE, problems, type MzfFile } from './mzf';
import { decode, encode, parseHex, toHex, type Charset } from './charset';
import { hexView, glyphChar, type CharColumn } from './hexview';
import { download, formatSize, register, type ActionContext, type LoadedFile } from './workbench';

type Strings = Record<string, string>;
let ui: Strings = {};
export const setStrings = (strings: Strings) => { ui = strings; };

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const bytesHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const row = (label: string, value: string, raw = '') =>
  `<tr><td>${esc(label)}</td><td class="mono">${esc(value)}</td><td class="mono raw">${esc(raw)}</td></tr>`;

function headerPanel({ file, panel }: ActionContext) {
  const m = file.mzf!;
  const h = m.header;
  const notes = problems(m);
  panel.innerHTML = `
    <table class="rank fields"><tbody>
      ${h ? row(ui.attributeByte, `${h.attribute.toString(16).toUpperCase().padStart(2, '0')} — ${h.attributeName}`) +
            row(ui.name, h.name || '—', bytesHex(m.bytes.subarray(1, 18))) +
            row(ui.load, hex(h.loadAddress), bytesHex(m.bytes.subarray(20, 22))) +
            row(ui.exec, hex(h.execAddress), bytesHex(m.bytes.subarray(22, 24))) +
            row(ui.bodySize, `${h.dataSize} B (${formatSize(h.dataSize)})`, bytesHex(m.bytes.subarray(18, 20))) : ''}
      ${row(ui.fileSize, `${m.size} B (${formatSize(m.size)})`)}
      ${row(ui.crc, m.crc32)}
      ${row(ui.bodyCrc, m.bodyCrc32)}
    </tbody></table>
    ${notes.length ? `<ul class="notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${h ? `<details class="rest"><summary>${esc(ui.rest)}</summary>
        <p class="meta">${esc(ui.restNote)}</p>
        <p class="mzglyph rest-text">${esc([...h.comment].map((b) => glyphChar(b)).join(''))}</p>
        <div class="rest-hex"></div></details>` : ''}`;
  if (h) hexView(panel.querySelector<HTMLElement>('.rest-hex')!, { bytes: h.comment, base: 24, charset: 'glyph1' });
}

/** The bytes of any file, with the machine's own characters beside them. */
function bytesPanel({ file, panel }: ActionContext) {
  const tape = file.mzf;
  const whole = file.bytes;
  const base = tape?.header?.loadAddress ?? null;
  panel.innerHTML = `
    <div class="hv-toolbar">
      ${tape ? `<label>${esc(ui.part)}
        <select class="part">
          <option value="body">${esc(ui.partBody)}</option>
          <option value="file">${esc(ui.partWhole)}</option>
        </select></label>` : ''}
      <label>${esc(ui.chars)}
        <select class="charset">
          <option value="glyph1">${esc(ui.setGlyph1)}</option>
          <option value="glyph2">${esc(ui.setGlyph2)}</option>
          <option value="file">${esc(ui.setFile)}</option>
          <option value="display">${esc(ui.setDisplay)}</option>
          <option value="ascii">${esc(ui.setAscii)}</option>
        </select>
      </label>
      <label>${esc(ui.addresses)}
        <select class="addrmode">
          ${base === null ? '' : `<option value="memory">${esc(ui.addrMemory)}</option>`}
          <option value="offset">${esc(ui.addrOffset)}</option>
        </select>
      </label>
      <label>${esc(ui.goto)} <input class="goto mono" size="6" placeholder="1200" /></label>
    </div>
    <div class="body-hex"></div>`;

  const host = panel.querySelector<HTMLElement>('.body-hex')!;
  let bytes = tape ? whole.subarray(MZF_HEADER_SIZE) : whole;
  let view = hexView(host, { bytes, base, charset: 'glyph1' });
  const charset = panel.querySelector<HTMLSelectElement>('.charset')!;
  const addr = panel.querySelector<HTMLSelectElement>('.addrmode')!;
  const rebuild = () => {
    const whole_ = panel.querySelector<HTMLSelectElement>('.part')?.value === 'file';
    bytes = tape && !whole_ ? whole.subarray(MZF_HEADER_SIZE) : whole;
    view = hexView(host, { bytes, base: addr.value === 'memory' && !whole_ ? base : null, charset: charset.value as CharColumn });
  };
  panel.querySelector<HTMLSelectElement>('.part')?.addEventListener('change', rebuild);
  charset.addEventListener('change', () => view.setCharset(charset.value as CharColumn));
  addr.addEventListener('change', () => view.setBase(addr.value === 'memory' ? base : null));
  panel.querySelector<HTMLInputElement>('.goto')!.addEventListener('change', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value.replace(/^[$#]|0x/i, ''), 16);
    if (!Number.isNaN(value)) view.goTo(value);
  });
}

const slugOf = (file: LoadedFile): string => {
  const name = (file.mzf?.header?.name || file.name.replace(/\.[^.]+$/, '')).trim();
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'untitled';
};

function skeletonPanel({ file, panel }: ActionContext) {
  const m = file.mzf as MzfFile | undefined;
  const slug = slugOf(file);
  const name = (m?.header?.name || file.name.replace(/\.[^.]+$/, '')).trim();
  const text = `# titles/${slug}/meta.yaml\ntitle: "${name}"\nmachine: mz-800\nmode: native\ngenre: [game]\nfiles:\n  - path: ${slug}.mzf\n    kind: standard\nsource: "Tape image, CRC-32 ${m?.crc32 ?? ''}."\n`;
  panel.innerHTML = `<p class="meta">${esc(ui.skeletonNote)}</p><pre class="mono skeleton">${esc(text)}</pre>`;
}

/** Characters: the one tool that needs no file. */
export function charactersPanel(panel: HTMLElement) {
  panel.innerHTML = `
    <div class="tool-row">
      <label>${esc(ui.codeSet)}
        <select class="set">
          <option value="display">${esc(ui.setDisplay)}</option>
          <option value="file">${esc(ui.setFile)}</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" class="screen" /> ${esc(ui.screen)}</label>
    </div>
    <div class="tool-grid">
      <label class="field"><span>${esc(ui.text)}</span><textarea class="text" rows="6" spellcheck="false">HELLO MZ-800</textarea></label>
      <label class="field"><span>${esc(ui.codes)}</span><textarea class="codes mono" rows="6" spellcheck="false"></textarea></label>
    </div>
    <pre class="screen-out mzglyph" hidden></pre>
    <p class="meta">${esc(ui.unknownChar)}</p>`;
  const text = panel.querySelector<HTMLTextAreaElement>('.text')!;
  const codes = panel.querySelector<HTMLTextAreaElement>('.codes')!;
  const set = panel.querySelector<HTMLSelectElement>('.set')!;
  const screen = panel.querySelector<HTMLInputElement>('.screen')!;
  const out = panel.querySelector<HTMLPreElement>('.screen-out')!;
  const paint = (bytes: Uint8Array) => {
    out.hidden = !screen.checked;
    if (!screen.checked) return;
    const rows: string[] = [];
    for (let i = 0; i < Math.max(bytes.length, 1); i += 40) rows.push([...bytes.subarray(i, i + 40)].map((b) => glyphChar(b)).join(''));
    out.textContent = rows.join('\n') || ' ';
  };
  const fromText = () => { const b = encode(text.value, set.value as Charset); codes.value = toHex(b); paint(b); };
  const fromCodes = () => { const b = parseHex(codes.value); text.value = decode(b, set.value as Charset); paint(b); };
  text.addEventListener('input', fromText);
  codes.addEventListener('input', fromCodes);
  set.addEventListener('change', fromText);
  screen.addEventListener('change', () => paint(parseHex(codes.value)));
  fromText();
}

register(
  { id: 'header', group: 'inspect', accepts: ['mzf'], panel: true, run: headerPanel },
  { id: 'bytes', group: 'inspect', accepts: () => true, panel: true, run: bytesPanel },
  { id: 'skeleton', group: 'share', accepts: ['mzf'], panel: true, run: skeletonPanel },
  {
    id: 'download-body', group: 'share', accepts: (f) => !!f.mzf && f.bytes.length > MZF_HEADER_SIZE,
    run: ({ file }) => download(`${slugOf(file)}.bin`, file.bytes.subarray(MZF_HEADER_SIZE)),
  },
  {
    id: 'copy-crc', group: 'share', accepts: ['mzf'],
    run: ({ file, say }) => { navigator.clipboard?.writeText(file.mzf!.crc32).then(() => say(ui.copied)).catch(() => {}); },
  },
  {
    id: 'download', group: 'share', accepts: () => true,
    run: ({ file }) => download(file.name, file.bytes),
  },
);
