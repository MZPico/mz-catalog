// The MZ-821's built-in data recorder, drawn under the screen.
//
// The real one sits to the right of the keyboard: a cream door with a tinted
// window, the cassette turning behind it, and underneath a recessed slot with
// five taupe keys - STOP/EJECT, RECORD, PLAY, REWIND, FFWD, left to right -
// each with its name and symbol printed on the case above it. There is no
// pause key, so there is none here.
//
// What a key can do is what the emulator's deck offers: REWIND winds back to
// the start (where STOP leaves the tape), and FFWD has nothing behind it, so
// it is drawn dead rather than pretending. The door is where the tape goes
// in: click it for the tapes you have and how the deck should play them.

import { popup, type Item } from './menu';

export type DeckKey = 'stop' | 'rec' | 'play' | 'rew' | 'ff';

export interface DeckHooks {
  /** A key was pressed; the panel redraws itself from `state()` afterwards. */
  press(key: DeckKey): void | Promise<void>;
  /** 0 empty, 1 stopped, 2 playing, 3 paused, 4 recording. */
  state(): number;
  /** How far in, in seconds. */
  at(): number;
  /** What is in the deck, if anything. */
  tape(): string;
  /** The list behind the door: tapes to put in, and how they are read. */
  settings?: () => Item[];
  /** Wording that belongs to the visitor's language. */
  strings: { empty: string; noFf: string; insert: string };
}

const KEYS: { id: DeckKey; name: string; symbol: string }[] = [
  { id: 'stop', name: 'STOP/EJECT', symbol: '■' },
  { id: 'rec', name: 'RECORD', symbol: '●' },
  { id: 'play', name: 'PLAY', symbol: '▶' },
  { id: 'rew', name: 'REWIND', symbol: '◀◀' },
  { id: 'ff', name: 'FFWD', symbol: '▶▶' },
];

/** Which keys stay down in each deck state. */
const DOWN: Record<number, DeckKey[]> = { 0: [], 1: [], 2: ['play'], 3: ['play'], 4: ['rec', 'play'] };

const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Draw the recorder into `host` and keep it in step with the deck. */
export function recorder(host: HTMLElement, hooks: DeckHooks): () => void {
  host.innerHTML = `
    <div class="cmt-deck">
      <button type="button" class="cmt-door" title="${hooks.strings.insert}">
        <div class="cmt-window">
          <div class="cmt-cassette">
            <span class="cmt-label"></span>
            <span class="cmt-reels"><span class="cmt-hub"></span><span class="cmt-tape"></span><span class="cmt-hub"></span></span>
          </div>
        </div>
      </button>
      <div class="cmt-keys">${KEYS.map((key) => `
        <button type="button" class="cmt-key" data-key="${key.id}" aria-label="${key.name}" title="${key.name}">
          <span class="cmt-cap"></span>
          <span class="cmt-sym">${key.symbol}</span>
        </button>`).join('')}</div>
    </div>`;

  const label = host.querySelector('.cmt-label') as HTMLElement;
  const cassette = host.querySelector('.cmt-cassette') as HTMLElement;

  const draw = () => {
    const state = hooks.state();
    const down = DOWN[state] ?? [];
    for (const key of host.querySelectorAll<HTMLButtonElement>('.cmt-key')) {
      key.classList.toggle('down', down.includes(key.dataset.key as DeckKey));
    }
    cassette.classList.toggle('in', state > 0);
    cassette.classList.toggle('running', state === 2 || state === 4);
    host.classList.toggle('recording', state === 4);
    label.textContent = state ? `${hooks.tape()}  ${clock(hooks.at())}` : hooks.strings.empty;
  };

  for (const key of host.querySelectorAll<HTMLButtonElement>('.cmt-key')) {
    const id = key.dataset.key as DeckKey;
    if (id === 'ff') { key.classList.add('dead'); key.title = `${key.title} — ${hooks.strings.noFf}`; continue; }
    key.addEventListener('click', async () => { await hooks.press(id); draw(); });
  }

  if (hooks.settings) {
    const door = host.querySelector('.cmt-door') as HTMLElement;
    door.addEventListener('click', () => popup(door, () => { const items = hooks.settings!(); draw(); return items; }));
  }

  draw();
  return draw;
}
