// The workbench behind /tools/: what a file is, and what can be done with it.
//
// A tool is an action registered here, not a page. Each action says which kinds
// of file it accepts and what it does — open a panel, or just hand something
// back. Adding a tool later means adding a module that registers actions; the
// page itself does not change.

import { readMzf, type MzfFile } from './mzf';

export type Kind = 'mzf' | 'dsk' | 'mzq' | 'mzs' | 'wav' | 'tap' | 'bin';

export interface LoadedFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  kind: Kind;
  mzf?: MzfFile;                            // parsed when the kind is a tape
  catalog?: { slug: string; title: string } | null;   // null = looked up, not found
}

const starts = (bytes: Uint8Array, text: string): boolean =>
  text.split('').every((c, i) => bytes[i] === c.charCodeAt(0));

/** What did the visitor just drop? The content decides, the extension only helps. */
export function detect(name: string, bytes: Uint8Array): Kind {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (starts(bytes, 'EXTENDED CPC DSK File') || starts(bytes, 'MV - CPCEMU')) return 'dsk';
  if (starts(bytes, 'RIFF')) return 'wav';
  if (starts(bytes, 'PK')) return 'mzs';                    // snapshots are zip archives
  if (ext === 'mzq' || ext === 'qd') return 'mzq';
  if (ext === 'tap') return 'tap';
  if (ext === 'dsk' || ext === 'd88') return 'dsk';
  if (ext === 'mzs') return 'mzs';
  if (ext === 'wav') return 'wav';
  // A tape header is 128 bytes with a plausible type byte and a name that ends.
  if (bytes.length > 128 && bytes[0] <= 0x7f && [...bytes.subarray(1, 18)].includes(0x0d)) return 'mzf';
  return ext === 'mzf' || ext === 'mzt' || ext === 'm12' ? 'mzf' : 'bin';
}

export function load(name: string, bytes: Uint8Array): LoadedFile {
  const kind = detect(name, bytes);
  return {
    id: `${name}-${bytes.length}-${Math.random().toString(36).slice(2, 7)}`,
    name, bytes, kind,
    mzf: kind === 'mzf' ? readMzf(bytes) : undefined,
  };
}

export type Group = 'inspect' | 'convert' | 'use' | 'share';

export interface ActionContext {
  file: LoadedFile;
  /** Where a panel should draw itself; already emptied. */
  panel: HTMLElement;
  /** Short message to the visitor ("copied", "nothing to show"). */
  say: (message: string) => void;
}

export interface Action {
  id: string;
  group: Group;
  /** Which files it applies to; a function for anything finer. */
  accepts: Kind[] | ((file: LoadedFile) => boolean);
  /** Opens a panel (stays highlighted) or just does something and returns. */
  panel?: boolean;
  run: (ctx: ActionContext) => void | Promise<void>;
}

const actions: Action[] = [];

export const register = (...list: Action[]) => actions.push(...list);

export const actionsFor = (file: LoadedFile): Action[] =>
  actions.filter((a) => (typeof a.accepts === 'function' ? a.accepts(file) : a.accepts.includes(file.kind)));

export const actionById = (id: string): Action | undefined => actions.find((a) => a.id === id);

/** The catalog's own index, fetched once and only when a file is dropped in. */
let index: Promise<Map<string, { slug: string; title: string }>> | null = null;
export const catalogIndex = () => (index ??= fetch('/manifest.json')
  .then((r) => r.json())
  .then((m: { titles?: { slug: string; title: string; files?: { crc32: string }[] }[] }) => {
    const map = new Map<string, { slug: string; title: string }>();
    for (const t of m.titles ?? []) for (const f of t.files ?? []) map.set(f.crc32, { slug: t.slug, title: t.title });
    return map;
  })
  .catch(() => new Map<string, { slug: string; title: string }>()));

export function download(name: string, bytes: Uint8Array, type = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const formatSize = (n: number): string => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
