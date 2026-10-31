// What the workbench remembers between visits.
//
// The files someone opened stay in this browser, so a reload does not throw
// away the tape they were halfway through reading. Same database as the saved
// positions of the player (one per site, two stores), nothing leaves the device.

const DB = 'mzpico';
/** Bumped together with site/src/lib/saves.ts — both open the same database. */
export const DB_VERSION = 3;
const STORE = 'files';

export interface StoredFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  ts: number;
}

/** Enough for a day's work, not enough to fill anybody's disk. */
const MAX_FILES = 12;
const MAX_BYTES = 16 * 1024 * 1024;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Newest first. Never throws: a private window simply has nothing to remember. */
export async function listFiles(): Promise<StoredFile[]> {
  try {
    const all = await tx<StoredFile[]>('readonly', (s) => s.getAll());
    return all.sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

export async function rememberFile(file: StoredFile): Promise<void> {
  if (file.bytes.length > MAX_BYTES) return;        // too big to be worth keeping
  try {
    await tx('readwrite', (s) => s.put(file));
    const all = await listFiles();
    for (const old of all.slice(MAX_FILES)) await forgetFile(old.id);
    navigator.storage?.persist?.().catch(() => {});
  } catch { /* storage blocked: the workbench still works, it just forgets */ }
}

export async function forgetFile(id: string): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* nothing to forget */ }
}

export async function forgetAll(): Promise<void> {
  try { await tx('readwrite', (s) => s.clear()); } catch { /* nothing to forget */ }
}
