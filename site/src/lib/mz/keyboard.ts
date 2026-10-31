// The MZ-800 keyboard, drawn under the screen.
//
// Layout, legends and the host key each cap sends are the machine's own, read
// off the emulator's virtual keyboard (mz800emu src/ui/vkbd/ui_vkbd.c and its
// cap pictures): rows 1-4 are 15.5 keys wide, F1-F5 and INST/DEL are
// half-height with half a key of air below them, CTRL and CR are 1.75 keys,
// TAB, BREAK, INST, DEL and the cursors 1.5, and the space bar runs from X to
// the slash. The cursor cross stands to the right of the rows, 1.2 keys past
// CR, with INST and DEL above it in the function-key row - so the whole board
// is 19.7 keys wide. Character caps carry two legends - the shifted symbol
// above the plain one - and are pale; the command caps are the darker grey of
// the real machine.
//
// Keys a PC keyboard has nowhere sensible sit on function keys in the
// emulator (@ = F6, \ = F7, ? = F8, £ = F9), which is half the reason this
// keyboard exists. A press is a synthetic KeyboardEvent on the canvas, the way
// the touch controls on the play page do it: SDL reads `code`, so that is what
// has to be right.

type Key = { label: string; code: string; w?: number; top?: string; dark?: boolean; sticky?: boolean };
type Row = (Key | { gap: number })[];

const k = (label: string, code: string, top?: string): Key => ({ label, code, top });
const cmd = (label: string, code: string, w: number, sticky = false): Key => ({ label, code, w, dark: true, sticky });
const letters = (text: string): Key[] => [...text].map((c) => ({ label: c, code: 'Key' + c }));
/** 1 to 0 with the symbol each one types under SHIFT. */
const digits = (): Key[] => [...'1234567890'].map((c, i) => k(c, 'Digit' + c, '!"#$%&\'()π'[i]));

const ROWS: Row[] = [
  [cmd('F1', 'F1', 1.5), cmd('F2', 'F2', 1.5), cmd('F3', 'F3', 1.5), cmd('F4', 'F4', 1.5), cmd('F5', 'F5', 1.5),
    { gap: 9.2 }, cmd('INST', 'Insert', 1.5), cmd('DEL', 'Delete', 1.5)],
  [cmd('GRAPH', 'CapsLock', 1), ...digits(), k('−', 'Minus', '='), k('↑', 'Equal', '~'), k('\\', 'F7', '|'),
    cmd('BREAK\nESC', 'Escape', 1.5)],
  [cmd('TAB', 'Tab', 1.5), ...letters('QWERTYUIOP'), k('@', 'F6', '`'), k('[', 'BracketLeft', '{'), k('↓', 'F9', '£'),
    cmd('', 'Backquote', 1), { gap: 1.95 }, cmd('↑', 'ArrowUp', 1.5)],
  [cmd('CTRL', 'ControlLeft', 1.75, true), ...letters('ASDFGHJKL'),
    k(';', 'Semicolon', '+'), k(':', 'Quote', '*'), k(')', 'BracketRight', '}'), cmd('CR', 'Enter', 1.75),
    { gap: 1.2 }, cmd('←', 'ArrowLeft', 1.5), cmd('→', 'ArrowRight', 1.5)],
  [cmd('SHIFT', 'ShiftLeft', 1.25, true), cmd('ALPHA', 'Backslash', 1), ...letters('ZXCVBNM'),
    k(',', 'Comma', '<'), k('.', 'Period', '>'), k('/', 'Slash', '←'), k('?', 'F8', '→'),
    cmd('SHIFT', 'ShiftRight', 2.25, true), { gap: 1.95 }, cmd('↓', 'ArrowDown', 1.5)],
  [{ gap: 3.25 }, { label: '', code: 'Space', w: 9 }],
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
    el.className = 'kb-key' + (key.dark ? ' kb-cmd' : '') + (key.label.length > 2 ? ' kb-word' : '');
    if (key.top) el.insertAdjacentHTML('beforeend', `<span class="kb-top"></span>`);
    el.insertAdjacentHTML('beforeend', `<span class="kb-face"></span>`);
    if (key.top) el.firstElementChild!.textContent = key.top;
    el.lastElementChild!.textContent = key.label;
    el.style.setProperty('--w', String(key.w ?? 1));
    el.setAttribute('aria-label', key.label.replace('\n', ' ') || (key.code === 'Space' ? 'Space' : key.code));
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
  host.append(block(ROWS, 'kb-main'));
}
