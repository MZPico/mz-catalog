// The MZ-821's built-in data recorder, drawn under the screen.
//
// The real thing (the MZ-800 with the recorder fitted) is a cream panel with a
// tinted cassette window and a row of six piano keys in front of it, their
// names printed on the case above them: REC, PLAY, REW, FF, STOP/EJECT and
// PAUSE. The keys latch - PLAY stays down while the tape runs and STOP pops it
// up again - so they do that here too.
//
// What each key can actually do is what the emulator's deck offers: REW winds
// back to the start (where STOP leaves the tape), and FF has nothing behind
// it, so it is drawn dead rather than pretending.

export type DeckKey = 'rec' | 'play' | 'rew' | 'ff' | 'stop' | 'pause';

export interface DeckHooks {
  /** A key was pressed; the panel redraws itself from `state()` afterwards. */
  press(key: DeckKey): void | Promise<void>;
  /** 0 empty, 1 stopped, 2 playing, 3 paused, 4 recording. */
  state(): number;
  /** How far in, in seconds. */
  at(): number;
  /** What is in the deck, if anything. */
  tape(): string;
  /** Wording that belongs to the visitor's language. */
  strings: { empty: string; noFf: string };
}

const KEYS: { id: DeckKey; label: string }[] = [
  { id: 'rec', label: 'REC' },
  { id: 'play', label: 'PLAY' },
  { id: 'rew', label: 'REW' },
  { id: 'ff', label: 'FF' },
  { id: 'stop', label: 'STOP\nEJECT' },
  { id: 'pause', label: 'PAUSE' },
];

/** Which keys are held down in each deck state. */
const DOWN: Record<number, DeckKey[]> = { 0: [], 1: [], 2: ['play'], 3: ['play', 'pause'], 4: ['rec', 'play'] };

const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Draw the recorder into `host` and keep it in step with the deck. */
export function recorder(host: HTMLElement, hooks: DeckHooks): () => void {
  host.innerHTML = `
    <div class="cmt-well">
      <div class="cmt-window">
        <div class="cmt-cassette">
          <span class="cmt-hub"></span>
          <span class="cmt-label"></span>
          <span class="cmt-hub"></span>
        </div>
      </div>
      <div class="cmt-counter"><span class="cmt-time">0:00</span></div>
    </div>
    <div class="cmt-keys">${KEYS.map((key) => `
      <button type="button" class="cmt-key" data-key="${key.id}" aria-label="${key.label.replace('\n', ' ')}">
        <span class="cmt-cap"></span><span class="cmt-name">${key.label}</span>
      </button>`).join('')}</div>`;

  const label = host.querySelector('.cmt-label') as HTMLElement;
  const cassette = host.querySelector('.cmt-cassette') as HTMLElement;
  const time = host.querySelector('.cmt-time') as HTMLElement;

  const draw = () => {
    const state = hooks.state();
    const down = DOWN[state] ?? [];
    for (const key of host.querySelectorAll<HTMLButtonElement>('.cmt-key')) {
      key.classList.toggle('down', down.includes(key.dataset.key as DeckKey));
    }
    cassette.classList.toggle('in', state > 0);
    cassette.classList.toggle('running', state === 2 || state === 4);
    host.classList.toggle('recording', state === 4);
    label.textContent = state ? hooks.tape() : hooks.strings.empty;
    time.textContent = clock(hooks.at());
  };

  for (const key of host.querySelectorAll<HTMLButtonElement>('.cmt-key')) {
    const id = key.dataset.key as DeckKey;
    if (id === 'ff') { key.classList.add('dead'); key.title = hooks.strings.noFf; continue; }
    key.addEventListener('click', async () => { await hooks.press(id); draw(); });
  }

  draw();
  return draw;
}
