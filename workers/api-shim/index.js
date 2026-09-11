// Legacy MZPico cloud API shim — emulates the retired Oracle VM's
// /list + /download contract for firmware already in the field, backed
// entirely by the static catalog on mzpico.com.
//
// Wire format (byte-compatible with the old nginx service; the firmware
// parses it with strstr, so key order matters and responses must stay
// well under its 16 KB buffer):
//   GET /list?path=/          -> {"path":"","folders":["featured","mz-700",...],"files":[]}
//   GET /list?path=/mz-700    -> {"path":"mz-700/","folders":[],"files":[{"name":"Alien_Highway.mzf","size":123},...]}
//   GET /list?path=/unknown   -> {"path":"unknown/","folders":[],"files":[]}
//   GET /download?path=/mz-700/Alien_Highway.mzf -> MZF bytes in HTTP chunked framing (see below)
//
// The folders and names are built from the catalog metadata by
// scripts/lib/device-tree.mjs; this Worker just serves whatever tree
// legacy-api.json holds.
//
// Usage is counted into the site's statistics database (metrics_daily, see
// workers/site/metrics.js) after the response has gone out, so a slow or
// failing count can never hold up a card: folders listed, titles downloaded,
// paths that do not exist, countries, and cards per day through a salted hash
// of the address kept for that day only (visit_log, cleared by the site's cron).
// Anything that is not /list or /download is a scanner and only counted as such.
import { netUpgrade } from '../site/net.js';

const DEFAULT_ORIGIN = 'https://mzpico.com';

const UPSERT = `INSERT INTO metrics_daily (day, metric, key, value) VALUES (?, ?, ?, 1)
  ON CONFLICT (day, metric, key) DO UPDATE SET value = value + 1`;

async function sha(...parts) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join(' ')));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Count one request; `rows` are [metric, key] pairs. Never throws, never delays the response. */
function tally(env, ctx, req, rows, { device = true } = {}) {
  if (!env?.STATS || !ctx) return;
  const day = new Date().toISOString().slice(0, 10);
  ctx.waitUntil((async () => {
    const stmts = rows.map(([metric, key]) => env.STATS.prepare(UPSERT).bind(day, metric, String(key).slice(0, 100)));
    if (device) {
      const id = await sha(env.STATS_SALT ?? 'unsalted', 'card', req.headers.get('CF-Connecting-IP') ?? '', day);
      stmts.push(env.STATS.prepare('INSERT OR IGNORE INTO visit_log (day, visitor) VALUES (?, ?)').bind(day, `card:${id}`));
    }
    const results = await env.STATS.batch(stmts);
    if (device && results.at(-1)?.meta?.changes) await env.STATS.prepare(UPSERT).bind(day, 'card-devices', '').run();
  })().catch(() => {}));
}

async function legacyMap(origin) {
  const r = await fetch(`${origin}/legacy-api.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) throw new Error(`catalog fetch failed (${r.status})`);
  return r.json();
}

const json = (obj) =>
  new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env, ctx) {
    const origin = env?.CATALOG_ORIGIN ?? DEFAULT_ORIGIN;
    if (new URL(req.url).pathname === '/net') return netUpgrade(req, env);   // multiplayer relay (see wrangler.jsonc)
    const url = new URL(req.url);
    const p = (url.searchParams.get('path') ?? '/').replace(/^\/+/, '').replace(/\/+$/, '');
    const country = req.cf?.country ?? 'XX';

    if (url.pathname === '/list') {
      const map = await legacyMap(origin);
      if (p === '') {
        tally(env, ctx, req, [['card-list', '/'], ['card-country', country]]);
        return json({ path: '', folders: Object.keys(map).sort(), files: [] });
      }
      tally(env, ctx, req, [[map[p] ? 'card-list' : 'card-miss', map[p] ? p : `list ${p}`], ['card-country', country]]);
      const files = (map[p] ?? []).map((f) => ({ name: f.name, size: f.size }));
      return json({ path: `${p}/`, folders: [], files });
    }

    if (url.pathname === '/download') {
      const m = p.match(/^([a-z0-9-]+)\/([^/]+)$/);
      const entry = m ? (await legacyMap(origin))[m[1]]?.find((f) => f.name === m[2]) : null;
      if (!entry) {
        tally(env, ctx, req, [['card-miss', `download ${p}`], ['card-country', country]]);
        return new Response('not found', { status: 404 });
      }
      // entry.path is /files/<slug>/<file>: count by title, so the dashboard can link it.
      tally(env, ctx, req, [['card-dl', entry.path.split('/')[2] ?? entry.name], ['card-country', country]]);
      const r = await fetch(`${origin}${entry.path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
      if (!r.ok) return new Response('upstream error', { status: 502 });
      const file = new Uint8Array(await r.arrayBuffer());
      // The firmware's download parser (cloud_download_fn) expects an HTTP/1.1
      // *chunked* body - the old nginx service always chunked /download - and
      // reads hex size lines itself. Frame the file as one chunk ourselves and
      // send it with an exact Content-Length, so Cloudflare never adds a second
      // transfer-coding layer regardless of the client's HTTP version.
      const enc = new TextEncoder();
      const head = enc.encode(`${file.byteLength.toString(16)}\r\n`);
      const tail = enc.encode('\r\n0\r\n\r\n');
      const body = new Uint8Array(head.byteLength + file.byteLength + tail.byteLength);
      body.set(head, 0);
      body.set(file, head.byteLength);
      body.set(tail, head.byteLength + file.byteLength);
      return new Response(body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(body.byteLength),
          'Connection': 'close',
          'Cache-Control': 'no-transform',
          'Content-Disposition': `attachment; filename*=UTF-8''${entry.name}`,
        },
      });
    }

    tally(env, ctx, req, [['card-scan', '']], { device: false });
    return new Response('mzpico legacy API shim — see https://mzpico.com\n', { status: 404 });
  },
};
