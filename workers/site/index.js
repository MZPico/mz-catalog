// The site is static; this Worker sits in front of it only to answer /api/*.
//
//   GET  /api/stats                     aggregate for every title (archive list)
//   GET  /api/stats?slug=x&voter=y      one title, including that voter's own rating
//   POST /api/rate  {slug, value, voter}
//   POST /api/play  {slug}
//
// There are no accounts and no cookies. A visitor is a random id kept in their
// own localStorage, salted and hashed here so the database never holds it (nor
// the IP it arrived from) in the clear.
//
// That id is the client's to invent, so it decides nothing on its own: writes
// must come from our own pages, every address has an hourly budget, a title
// takes at most VOTES_PER_IP votes from one network, and play counts are keyed
// on the network alone.
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ALL_TTL = 60;
// A household or a small office shares one address, so a single vote per
// network would silence the second person in the room. Three is enough for
// that and far too few to move an average on purpose.
const VOTES_PER_IP = 3;
// Ceiling on writes from one address per hour, so nobody can hammer the
// database even while staying under the per-title cap.
const WRITES_PER_HOUR = 60;

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { ...JSON_HEADERS, ...init.headers } });
const bad = (message, status = 400) => json({ error: message }, { status });

async function hash(...parts) {
  const data = new TextEncoder().encode(parts.join(' '));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Stable pseudonym for one visitor: their own id plus the network they came from. */
const voterKey = (env, request, voter) =>
  hash(env.STATS_SALT ?? 'unsalted', voter ?? '', request.headers.get('CF-Connecting-IP') ?? '');

/** Stable pseudonym for the network alone — the part a client cannot invent. */
const ipKey = (env, request) =>
  hash(env.STATS_SALT ?? 'unsalted', 'ip', request.headers.get('CF-Connecting-IP') ?? '');

/** Writes are only accepted from our own pages, which rules out naive scripts. */
function sameOrigin(request, url) {
  const origin = request.headers.get('Origin') ?? request.headers.get('Referer');
  if (!origin) return false;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

/** Count this write against the address's hourly budget. */
async function withinBudget(env, ip) {
  const hour = Math.floor(Date.now() / 3600000);
  const row = await env.STATS.prepare(
    `INSERT INTO throttle (ip, hour, n) VALUES (?, ?, 1)
       ON CONFLICT (ip, hour) DO UPDATE SET n = n + 1
       RETURNING n`,
  ).bind(ip, hour).first();
  return (row?.n ?? 0) <= WRITES_PER_HOUR;
}

async function readBody(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

async function statsForAll(env, ctx, request) {
  // The archive asks for this on every load; a minute of caching is plenty.
  const cache = caches.default;
  const key = new Request(new URL('/api/stats', request.url), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;

  const [plays, votes] = await env.STATS.batch([
    env.STATS.prepare('SELECT slug, n FROM plays'),
    env.STATS.prepare('SELECT slug, COUNT(*) AS votes, AVG(value) AS avg FROM votes GROUP BY slug'),
  ]);
  const titles = {};
  for (const row of plays.results ?? []) titles[row.slug] = { plays: row.n, votes: 0, avg: 0 };
  for (const row of votes.results ?? []) {
    titles[row.slug] = { plays: titles[row.slug]?.plays ?? 0, votes: row.votes, avg: Number(row.avg) };
  }
  const res = json({ titles }, { headers: { 'Cache-Control': `public, max-age=${ALL_TTL}` } });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

async function statsForOne(env, request, slug, voter) {
  const key = voter ? await voterKey(env, request, voter) : '';
  const [plays, votes, mine] = await env.STATS.batch([
    env.STATS.prepare('SELECT n FROM plays WHERE slug = ?').bind(slug),
    env.STATS.prepare('SELECT COUNT(*) AS votes, AVG(value) AS avg FROM votes WHERE slug = ?').bind(slug),
    env.STATS.prepare('SELECT value FROM votes WHERE slug = ? AND voter = ?').bind(slug, key),
  ]);
  const agg = votes.results?.[0] ?? { votes: 0, avg: 0 };
  return json({
    slug,
    plays: plays.results?.[0]?.n ?? 0,
    votes: agg.votes ?? 0,
    avg: agg.votes ? Number(agg.avg) : 0,
    mine: mine.results?.[0]?.value ?? 0,
  });
}

async function rate(env, request, url) {
  if (!sameOrigin(request, url)) return bad('not accepted from here', 403);
  const body = await readBody(request);
  const slug = body?.slug;
  const value = Number(body?.value);
  if (!SLUG_RE.test(slug ?? '')) return bad('bad slug');
  if (!Number.isInteger(value) || value < 1 || value > 5) return bad('value must be 1..5');

  const ip = await ipKey(env, request);
  if (!(await withinBudget(env, ip))) return bad('too many requests', 429);

  const key = await voterKey(env, request, body.voter);
  // Changing your own vote is always fine; casting a new one is what the
  // per-network cap counts.
  const mine = await env.STATS.prepare('SELECT 1 FROM votes WHERE slug = ? AND voter = ?')
    .bind(slug, key).first();
  if (!mine) {
    const used = await env.STATS.prepare('SELECT COUNT(*) AS n FROM votes WHERE slug = ? AND ip = ?')
      .bind(slug, ip).first();
    if ((used?.n ?? 0) >= VOTES_PER_IP) return bad('already rated from this network', 429);
  }

  await env.STATS.prepare(
    `INSERT INTO votes (slug, voter, ip, value, ts) VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT (slug, voter) DO UPDATE SET value = excluded.value, ts = excluded.ts`,
  ).bind(slug, key, ip, value).run();
  return statsForOne(env, request, slug, body.voter);
}

async function play(env, request, url) {
  if (!sameOrigin(request, url)) return bad('not accepted from here', 403);
  const body = await readBody(request);
  const slug = body?.slug;
  if (!SLUG_RE.test(slug ?? '')) return bad('bad slug');
  const ip = await ipKey(env, request);
  if (!(await withinBudget(env, ip))) return bad('too many requests', 429);
  const day = new Date().toISOString().slice(0, 10);
  // One network bumps a title's counter once a day: enough to rank by, and not
  // something a cleared localStorage can repeat.
  const first = await env.STATS.prepare(
    'INSERT OR IGNORE INTO play_log (slug, ip, day) VALUES (?, ?, ?)',
  ).bind(slug, ip, day).run();
  if (first.meta?.changes) {
    await env.STATS.prepare(
      `INSERT INTO plays (slug, n) VALUES (?, 1)
         ON CONFLICT (slug) DO UPDATE SET n = n + 1`,
    ).bind(slug).run();
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.STATS) return json({ error: 'stats database not bound' }, { status: 503 });

    try {
      if (request.method === 'GET' && url.pathname === '/api/stats') {
        const slug = url.searchParams.get('slug');
        if (!slug) return statsForAll(env, ctx, request);
        if (!SLUG_RE.test(slug)) return bad('bad slug');
        return statsForOne(env, request, slug, url.searchParams.get('voter'));
      }
      if (request.method === 'POST' && url.pathname === '/api/rate') return rate(env, request, url);
      if (request.method === 'POST' && url.pathname === '/api/play') return play(env, request, url);
      return bad('not found', 404);
    } catch (err) {
      return json({ error: String(err) }, { status: 500 });
    }
  },
};
