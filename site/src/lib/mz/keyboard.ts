// The MZ-800 keyboard, drawn under the screen.
//
// Layout and host-key mapping are the emulator's own (mz800emu
// src/ui/vkbd/ui_vkbd.c): rows 1-4 are 15.5 keys wide, F1-F5/INST/DEL are
// half-height, CR and CTRL are 1.75 keys, the space bar runs from X to the
// slash. Keys the PC keyboard has nowhere sensible sit on function keys in
// the emulator (@ = F6, \ = F7, ? = F8, £ = F9), and those are exactly the
// ones this keyboard is for.
//
// A key press is a synthetic KeyboardEvent on the canvas, the way the touch
// controls on the play page do it: SDL reads `code`, so that is what has to
// be right.

type Key = { label: string; code: string; w?: number; sticky?: boolean; sub?: string };
type Row = (Key | { gap: number })[];

const k = (label: string, code: string, w?: number, sub?: string): Key => ({ label, code, w, sub });
const letters = (text: string): Key[] => [...text].map((c) => k(c, 'Key' + c));
const digits = (): Key[] => [...'1234567890'].map((c) => k(c, 'Digit' + c));

const ROWS: Row[] = [
  [k('F1', 'F1', 1.5), k('F2', 'F2', 1.5), k('F3', 'F3', 1.5), k('F4', 'F4', 1.5), k('F5', 'F5', 1.5),
    { gap: 5 }, k('INST', 'Insert', 1.5), k('DEL', 'Delete', 1.5)],
  [k('GRAPH', 'CapsLock'), ...digits(), k('−', 'Minus'), k('↑', 'Equal'), k('\\', 'F7'), k('BREAK', 'Escape', 1.5)],
  [k('TAB', 'Tab', 1.5), ...letters('QWERTYUIOP'), k('@', 'F6'), k('[', 'BracketLeft'), k('£', 'F9'), k('BLANK', 'Backquote')],
  [{ label: 'CTRL', code: 'ControlLeft', w: 1.75, sticky: true }, ...letters('ASDFGHJKL'),
    k(';', 'Semicolon'), k(':', 'Quote'), k(']', 'BracketRight'), k('CR', 'Enter', 1.75)],
  [{ label: 'SHIFT', code: 'ShiftLeft', w: 1.25, sticky: true }, k('ALPHA', 'Backslash'), ...letters('ZXCVBNM'),
    k(',', 'Comma'), k('.', 'Period'), k('/', 'Slash'), k('?', 'F8'),
    { label: 'SHIFT', code: 'ShiftRight', w: 2.25, sticky: true }],
  [{ gap: 3.25 }, k('', 'Space', 9)],
];

const CURSORS: Row[] = [
  [{ gap: 1 }, k('▲', 'ArrowUp'), { gap: 1 }],
  [k('◀', 'ArrowLeft'), { gap: 1 }, k('▶', 'ArrowRight')],
  [{ gap: 1 }, k('▼', 'ArrowDown'), { gap: 1 }],
];

/** The legacy keyCode, for anything that still reads it. */
function keyCode(code: string): number {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
  if (/^Digit\d$/.test(code)) return 48 + Number(code[5]);
  if (/^F\d+$/.test(code)) return 111 + Number(code.slice(1));
  return ({
    Space: 32, Enter: 13, Tab: 9, Escape: 27, Insert: 45, Delete: 46, CapsLock: 20,
    ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17, Backslash: 220, Backquote: 192,
    Minus: 189, Equal: 187, Comma: 188, Period: 190, Slash: 191, Semicolon: 186, Quote: 222,
    BracketLeft: 219, BracketRight: 221,
    ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  } as Record<string, number>)[code] ?? 0;
}

const keyName = (code: string): string =>
  /^Key[A-Z]$/.test(code) ? code[3].toLowerCase() : /^Digit\d$/.test(code) ? code[5] : code.replace(/^(Shift|Control)(Left|Right)$/, '$1');

/**
 * Draw the keyboard into `host`; its keys go to `canvas` as key events.
 * SHIFT and CTRL latch — press once to hold, again to let go — because a
 * mouse has only one finger.
 */
export function keyboard(host: HTMLElement, canvas: HTMLElement): void {
  const held = new Set<string>();

  const send = (type: 'keydown' | 'keyup', code: string) => {
    canvas.dispatchEvent(new KeyboardEvent(type, {
      code, key: keyName(code), keyCode: keyCode(code), which: keyCode(code), bubbles: true, cancelable: true,
      shiftKey: held.has('ShiftLeft') || held.has('ShiftRight'), ctrlKey: held.has('ControlLeft'),
    }));
  };

  const button = (key: Key): HTMLButtonElement => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'kb-key' + (key.label.length > 2 ? ' wide-label' : '');
    el.textContent = key.label;
    el.style.setProperty('--w', String(key.w ?? 1));
    el.setAttribute('aria-label', key.label || 'Space');
    if (key.sticky) {
      el.addEventListener('click', () => {
        const on = !held.has(key.code);
        if (on) { held.add(key.code); send('keydown', key.code); } else { held.delete(key.code); send('keyup', key.code); }
        el.classList.toggle('held', on);
      });
    } else {
      const down = (e: Event) => { e.preventDefault(); el.classList.add('down'); send('keydown', key.code); };
      const up = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); send('keyup', key.code); };
      el.addEventListener('pointerdown', down);
      for (const type of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(type, up);
    }
    return el;
  };

  const block = (rows: Row[], cls: string): HTMLElement => {
    const box = document.createElement('div');
    box.className = cls;
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'kb-row';
      for (const key of row) {
        if ('gap' in key) {
          const space = document.createElement('span');
          space.className = 'kb-gap';
          space.style.setProperty('--w', String(key.gap));
          line.append(space);
        } else line.append(button(key));
      }
      box.append(line);
    }
    return box;
  };

  host.innerHTML = '';
  host.append(block(ROWS, 'kb-main'), block(CURSORS, 'kb-cursors'));
}
