// Starting the emulator inside a page of ours.
//
// The same build the player uses, with no interface of its own (--kiosk): the
// machine is whatever the ini says, and the page drives everything around it.
// Loaded only when somebody actually opens the emulator, because it is 3.7 MB.

export interface BootOptions {
  canvas: HTMLCanvasElement;
  version: string;                          // cache-busting stamp of the build
  args: string[];
  /** Written into the emulator's filesystem before it starts. */
  files: { path: string; bytes: Uint8Array }[];
  /** Directories to create (the card's SD folder, for instance). */
  dirs?: string[];
  audioFrames?: string;
  onStatus?: (text: string) => void;
}

/** What the build lets the page change while the machine runs (patch 0030). */
export const MEDIA = { fddMount: 1, qdMount: 2, qdProtect: 3, reset: 4, tape: 5, runMzf: 6 } as const;

type Emu = {
  canvas: HTMLCanvasElement;
  FS: { writeFile(path: string, data: Uint8Array | string): void; readFile(path: string): Uint8Array; mkdir(path: string): void; analyzePath(path: string): { exists: boolean } };
  SDL3?: { audioContext?: AudioContext; audio_playback?: { scriptProcessorNode?: AudioNode } };
  _mz_wasm_restart?: () => number;
  _mz_wasm_total_screens?: () => number;
  _mz_wasm_media_status?: () => number;
  ccall?: (name: string, ret: string | null, argTypes: string[], args: unknown[]) => unknown;
};

const win = () => window as unknown as { Module?: Emu; __mzEmuLoaded?: boolean };

/** Boot, or reboot with a different machine. The wasm loads once per page. */
export async function boot(opts: BootOptions): Promise<void> {
  const { canvas, version, args, files, dirs = [], audioFrames = '1024', onStatus = () => {} } = opts;
  if (win().__mzEmuLoaded) {
    // The runtime cannot be told to start again from scratch, so a different
    // machine means a fresh page context: the caller reloads the frame.
    throw new Error('already running');
  }
  onStatus('loading');
  win().Module = {
    canvas,
    arguments: args,
    preRun: [() => {
      const M = win().Module as unknown as Emu & { ENV?: Record<string, string> };
      (globalThis as unknown as { ENV: Record<string, string> }).ENV.SDL_AUDIO_DEVICE_SAMPLE_FRAMES = audioFrames;
      for (const dir of ['/media', ...dirs]) {
        try { if (!M.FS.analyzePath(dir).exists) M.FS.mkdir(dir); } catch { /* already there */ }
      }
      for (const f of files) M.FS.writeFile(f.path, f.bytes);
    }],
    locateFile: (p: string) => `/play/emu/${p}?v=${version}`,
    print: () => {},
    printErr: (m: string) => { if (/error|fail/i.test(m)) console.warn('[mz800emu]', m); },
    setStatus: (m: string) => onStatus(m),
    onRuntimeInitialized: () => { onStatus(''); canvas.focus(); },
    onAbort: (what: unknown) => onStatus(`stopped: ${what}`),
  } as unknown as Emu;
  win().__mzEmuLoaded = true;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/play/emu/mz800emu.js?v=${version}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('the emulator did not load'));
    document.body.appendChild(script);
  });
}

export const running = (): boolean => !!win().__mzEmuLoaded;

/** Reset the machine and run the program again, without reloading the page. */
export const restart = (): boolean => !!win().Module?._mz_wasm_restart?.() === false;

export const frames = (): number => win().Module?._mz_wasm_total_screens?.() ?? 0;

/** The emulation is paced by the audio clock; sound must be resumed by a gesture. */
export const wake = () => win().Module?.SDL3?.audioContext?.resume?.().catch(() => {});

/** Read a file back out of the machine — a disk image it has written to, say. */
export function readBack(path: string): Uint8Array | null {
  try { return win().Module?.FS.readFile(path) ?? null; } catch { return null; }
}

let muteGain: GainNode | null = null;
export function setMuted(on: boolean): void {
  try {
    const sdl = win().Module?.SDL3;
    const node = sdl?.audio_playback?.scriptProcessorNode;
    if (!sdl?.audioContext || !node) return;
    if (!muteGain) {
      muteGain = sdl.audioContext.createGain();
      node.disconnect();
      node.connect(muteGain);
      muteGain.connect(sdl.audioContext.destination);
    }
    muteGain.gain.value = on ? 0 : 1;
  } catch { /* audio not up yet */ }
}

/** Mount, eject or reset while the machine runs; resolves when it has happened. */
export async function media(op: number, arg = 0, path = ''): Promise<boolean> {
  const M = win().Module;
  if (!M?.ccall || !M._mz_wasm_media_status) return false;
  if (M.ccall('mz_wasm_media_request', 'number', ['number', 'number', 'string'], [op, arg, path]) !== 0) return false;
  const until = performance.now() + 4000;
  while (performance.now() < until) {
    const status = M._mz_wasm_media_status();
    if (status !== 1) return status === 2;
    await new Promise((r) => setTimeout(r, 15));
  }
  return false;
}

export const mountFloppy = (drive: number, path: string) => media(MEDIA.fddMount, drive, path);
export const ejectFloppy = (drive: number) => media(MEDIA.fddMount, drive, '');
export const mountQd = (path: string) => media(MEDIA.qdMount, 0, path);
export const protectQd = (on: boolean) => media(MEDIA.qdProtect, on ? 1 : 0, '');
/** The MZF the ROM's own tape load reads; '' leaves the deck empty. */
export const setTape = (path: string) => media(MEDIA.tape, 0, path);
/** Reset into an MZF and run it, the way the machine starts with --run-mzf. */
export const runMzf = (path: string) => media(MEDIA.runMzf, 0, path);
/** Reset the machine; `rerun` starts the --run-mzf program again. */
export const reset = (rerun = false) => media(MEDIA.reset, rerun ? 1 : 0, '');

/** What is in a drive right now. */
export function floppyIn(drive: number): string {
  const M = win().Module;
  return (M?.ccall?.('mz_wasm_fdd_path', 'string', ['number'], [drive]) as string) ?? '';
}

/** Put a file into the machine's filesystem (a disk image, say). */
export function writeFile(path: string, bytes: Uint8Array): boolean {
  try { win().Module?.FS.writeFile(path, bytes); return true; } catch { return false; }
}
