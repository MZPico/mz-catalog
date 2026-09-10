// The folder tree the MZPico card browses as cloud:/ (served by the
// api.mzpico.com shim from legacy-api.json).
//
// Everything here is shaped by what the card's firmware can take, so the
// build refuses to produce anything it cannot:
//
//   - the path goes into the request URL unescaped, so names are limited to
//     A-Z a-z 0-9 . _ -  (a space or an & would break the request)
//   - a name of 32 characters or more is silently dropped by the parser
//   - a listing holds at most 256 entries, ".." included (SORT_MAX)
//   - a listing's JSON must fit a 16 KB receive buffer
//   - a download larger than CLOUD_FILE_MAX never finishes loading
//
// (MZPico-firmware src/cloud_fs.cpp and src/mz_devices/unicard.{hpp,cpp})

export const LIMITS = {
  nameChars: 31,
  entries: 255,
  listingBytes: 15 * 1024, // the buffer is 16 KB; keep a margin
  fileBytes: 0xbe00 + 128 + 256,
};

const NAME_RE = /^[A-Za-z0-9._-]+$/;
const TOOL_GENRES = new Set(['utility', 'system', 'graphics', 'music', 'education', 'demo', 'other']);

/** Which top-level folder a title lives in, decided by its metadata. */
export function folderOf(meta) {
  const genres = meta.genre ?? [];
  if (genres.includes('language')) return 'languages';
  if (genres.length && genres.every((g) => TOOL_GENRES.has(g))) return 'tools';
  if (meta.machine === 'mz-800') return meta.port === 'zx-spectrum' ? 'mz-800-zx' : 'mz-800';
  return meta.machine; // mz-700 (and mz-1500, should one ever arrive)
}

/** A readable file name the firmware can carry: "Alien_Highway.mzf". */
export function deviceName(title, ext) {
  let s = title
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // Hlípa -> Hlipa; the MZ has no accents anyway
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');
  const room = LIMITS.nameChars - ext.length - 1;
  s = s.slice(0, room).replace(/[_.-]+$/, '');
  return `${s || 'untitled'}.${ext}`;
}

function withSuffix(name, n) {
  const dot = name.lastIndexOf('.');
  const base = name.slice(0, dot);
  const ext = name.slice(dot);
  const tag = `_${n}`;
  return base.slice(0, LIMITS.nameChars - ext.length - tag.length) + tag + ext;
}

/** Build the tree: { tree: { folder: [{ name, size, path }] }, skipped: [...] }. */
export function buildDeviceTree(titles) {
  const tree = {};
  const skipped = [];
  const add = (folder, entry) => {
    const list = (tree[folder] ??= []);
    let name = entry.name;
    for (let n = 2; list.some((e) => e.name.toLowerCase() === name.toLowerCase()); n++) {
      name = withSuffix(entry.name, n);
    }
    list.push({ ...entry, name });
  };

  for (const t of titles) {
    const folder = folderOf(t.meta);
    for (const f of t.files) {
      const url = `/files/${t.slug}/${f.path}`;
      if (f.size > LIMITS.fileBytes) {
        skipped.push(`${t.slug}/${f.path} (${f.size} bytes, the card loads at most ${LIMITS.fileBytes})`);
        continue;
      }
      const ext = (f.path.split('.').pop() || 'mzf').toLowerCase();
      const label = t.files.length > 1 ? `${t.meta.title} ${f.path.replace(/\.[^.]+$/, '')}` : t.meta.title;
      const entry = { name: deviceName(label, ext), size: f.size, path: url };
      add(folder, entry);
      if (t.meta.web) add('featured', entry);
    }
  }
  for (const list of Object.values(tree)) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }
  return { tree, skipped };
}

/** What the shim will send for one folder — measured, not guessed. */
export const listingJson = (folder, list) =>
  JSON.stringify({ path: `${folder}/`, folders: [], files: list.map((f) => ({ name: f.name, size: f.size })) });

/** Every problem the card would hit, as messages; empty when the tree is safe. */
export function checkDeviceTree(tree) {
  const problems = [];
  for (const [folder, list] of Object.entries(tree)) {
    if (!NAME_RE.test(folder) || folder.length > LIMITS.nameChars) problems.push(`folder name "${folder}"`);
    if (list.length > LIMITS.entries) problems.push(`${folder}: ${list.length} entries (the card shows at most ${LIMITS.entries})`);
    const bytes = Buffer.byteLength(listingJson(folder, list));
    if (bytes > LIMITS.listingBytes) problems.push(`${folder}: listing is ${bytes} bytes (limit ${LIMITS.listingBytes})`);
    for (const f of list) {
      if (!NAME_RE.test(f.name) || f.name.length > LIMITS.nameChars) problems.push(`${folder}/${f.name}: name the firmware cannot carry`);
    }
  }
  return problems;
}
