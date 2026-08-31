// Legacy MZPico cloud API shim — emulates the retired Oracle VM's
// /list + /download contract for firmware already in the field, backed
// entirely by the static catalog on mzpico.com.
//
// Wire format (byte-compatible with the old nginx service; the firmware
// parses it with strstr, so key order matters and responses must stay
// well under its 16 KB buffer):
//   GET /list?path=/            -> {"path":"","folders":["games-700",...],"files":[]}
//   GET /list?path=/games-700   -> {"path":"games-700/","folders":[],"files":[{"name":"x.mzf","size":123},...]}
//   GET /list?path=/unknown     -> {"path":"unknown/","folders":[],"files":[]}
//   GET /download?path=/games-700/x.mzf -> raw MZF bytes
const DEFAULT_ORIGIN = 'https://mzpico.com';

async function legacyMap(origin) {
  const r = await fetch(`${origin}/legacy-api.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) throw new Error(`catalog fetch failed (${r.status})`);
  return r.json();
}

const json = (obj) =>
  new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    const origin = env?.CATALOG_ORIGIN ?? DEFAULT_ORIGIN;
    const url = new URL(req.url);
    const p = (url.searchParams.get('path') ?? '/').replace(/^\/+/, '').replace(/\/+$/, '');

    if (url.pathname === '/list') {
      const map = await legacyMap(origin);
      if (p === '') return json({ path: '', folders: Object.keys(map).sort(), files: [] });
      const files = (map[p] ?? []).map((f) => ({ name: f.name, size: f.size }));
      return json({ path: `${p}/`, folders: [], files });
    }

    if (url.pathname === '/download') {
      const m = p.match(/^([a-z0-9-]+)\/([^/]+)$/);
      const entry = m ? (await legacyMap(origin))[m[1]]?.find((f) => f.name === m[2]) : null;
      if (!entry) return new Response('not found', { status: 404 });
      const r = await fetch(`${origin}${entry.path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
      if (!r.ok) return new Response('upstream error', { status: 502 });
      const body = await r.arrayBuffer(); // buffered so Content-Length is exact
      return new Response(body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(body.byteLength),
          'Content-Disposition': `attachment; filename*=UTF-8''${entry.name}`,
        },
      });
    }

    return new Response('mzpico legacy API shim — see https://mzpico.com\n', { status: 404 });
  },
};
