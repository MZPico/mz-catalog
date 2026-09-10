// Saved positions ("continue where I left off"), kept in this browser only.
//
// One slot per title and tape file, in IndexedDB. A slot holds the emulator's
// own snapshot (.mzs, the same file the desktop mz800emu reads and writes),
// the screen picture found inside it, and enough to tell whether it still fits
// the emulator and tape it is loaded into. Nothing here leaves the device.

export interface SaveRecord {
  key: string;            // `${slug}/${file}`
  slug: string;
  file: string;
  ts: number;             // ms since epoch
  emu: string;            // emulator build that made it
  tape: string;           // fingerprint of the tape image it was played from
  mzs: Uint8Array;
  thumb?: string;         // data: URL of the screen at save time
}

const DB = 'mzpico';
const STORE = 'saves';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Version 2: a database of that name without the store (opened by something
    // else first) gets it on upgrade instead of failing every transaction.
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
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

export const saveKey = (slug: string, file: string) => `${slug}/${file}`;

/** Never throws: private windows and blocked storage simply have no saves. */
export async function getSave(slug: string, file: string): Promise<SaveRecord | null> {
  try {
    return (await tx<SaveRecord | undefined>('readonly', (s) => s.get(saveKey(slug, file)))) ?? null;
  } catch {
    return null;
  }
}

/** Every slot of one title (any tape file), newest first. */
export async function savesFor(slug: string): Promise<SaveRecord[]> {
  try {
    const all = await tx<SaveRecord[]>('readonly', (s) => s.getAll());
    return all.filter((r) => r.slug === slug).sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

export async function putSave(rec: SaveRecord): Promise<void> {
  await tx('readwrite', (s) => s.put(rec));
  // Ask the browser not to evict the site's storage under pressure. Safari may
  // still drop it after a week without a visit; the page says so.
  navigator.storage?.persist?.().catch(() => {});
}

export async function deleteSave(slug: string, file: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(saveKey(slug, file)));
  } catch { /* nothing to delete */ }
}

/** Short fingerprint of a tape image: a saved machine only fits the tape it ran. */
export async function tapeFingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** "3 hours ago" in the page's language. */
export function ago(ts: number, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const s = Math.round((ts - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 30], ['month', 12]];
  let v = s;
  for (const [unit, n] of steps) {
    if (Math.abs(v) < n) return rtf.format(unit === 'second' ? Math.min(v, -1) : v, unit);
    v = Math.round(v / n);
  }
  return rtf.format(v, 'year');
}

/**
 * The screen picture a .mzs carries (`screenshot.png`), as a data: URL.
 * A .mzs is a ZIP written by minizip-ng (ZIP64 entries, data descriptors), so
 * the sizes are read from the central directory, not the local headers.
 */
export async function thumbFromMzs(zip: Uint8Array): Promise<string | undefined> {
  try {
    const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    let eocd = -1;
    for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
      if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return undefined;
    let p = v.getUint32(eocd + 16, true);
    const entries = v.getUint16(eocd + 10, true);
    for (let n = 0; n < entries && v.getUint32(p, true) === 0x02014b50; n++) {
      const method = v.getUint16(p + 10, true);
      let comp = v.getUint32(p + 20, true);
      let size = v.getUint32(p + 24, true);
      const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
      let local = v.getUint32(p + 42, true);
      const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen));
      // ZIP64 extra field: only the values that overflowed are present, in this order.
      for (let e = p + 46 + nameLen; e < p + 46 + nameLen + extraLen; ) {
        const id = v.getUint16(e, true), len = v.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          const big = () => { const x = Number(v.getBigUint64(q, true)); q += 8; return x; };
          if (size === 0xffffffff) size = big();
          if (comp === 0xffffffff) comp = big();
          if (local === 0xffffffff) local = big();
        }
        e += 4 + len;
      }
      if (name === 'screenshot.png') {
        const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const raw = zip.slice(start, start + comp);
        let png: Uint8Array;
        if (method === 0) png = raw;
        else if (method === 8 && typeof DecompressionStream === 'function') {
          const out = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          png = new Uint8Array(await new Response(out).arrayBuffer());
        } else return undefined;
        if (png.length !== size) return undefined;
        let bin = '';
        for (let i = 0; i < png.length; i += 0x8000) bin += String.fromCharCode(...png.subarray(i, i + 0x8000));
        return `data:image/png;base64,${btoa(bin)}`;
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
  } catch { /* no picture, no harm */ }
  return undefined;
}
