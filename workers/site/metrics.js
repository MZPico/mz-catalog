// The monitor: how many people come, from where, what they play — and how much
// of the traffic is robots, AI crawlers and MZPico cards.
//
//   POST /api/hit   {p, r, s}  one page view: path, referring host, campaign tag
//   POST /api/hit   {e}        one use of a feature (save, gamepad, …)
//   GET  /api/metrics?days=N   the daily totals, for /stats/ (X-Stats-Key header)
//   POST /api/metrics/report   send the weekly mail now (X-Stats-Key header)
//   POST /api/metrics/collect?day=YYYY-MM-DD   copy one past day of Cloudflare
//                              analytics now (backfill; Cloudflare keeps 8 days)
//
// Everything is stored as per-day totals in metrics_daily; nothing identifies a
// visitor. Visitors per day are counted through visit_log, a salted hash of
// address + browser + day that the daily cron deletes the next day. Browsers that
// send Do Not Track or Global Privacy Control are not counted at all, and neither
// is anything that says it is a robot.
//
// Cloudflare's own traffic analytics (robots, AI crawlers, card requests,
// downloads, errors) keep only 8 days on the free plan; the daily cron copies the
// previous day into metrics_daily so the history stays, and on Mondays mails a
// weekly summary.

import { EmailMessage } from 'cloudflare:email';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const nothing = () => new Response(null, { status: 204 });

/** Anything that announces itself as automated. Headless renderers (Googlebot's
 * among them) run our JavaScript, so the page's own "I am a browser" is not enough. */
export const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|google|inspectiontool|preview|facebookexternalhit|embedly|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|scrapy|phantom|puppeteer|playwright/i;
export const isBot = (request) => BOT_UA.test(request.headers.get('User-Agent') ?? '') || !request.headers.get('User-Agent');

const EVENTS = new Set(['save', 'load', 'continue', 'autosave', 'import', 'export', 'gamepad', 'touch', 'fullscreen', 'tape-audio']);
const today = () => new Date().toISOString().slice(0, 10);
const dayBefore = (day, n = 1) => new Date(Date.parse(day) - n * 86400000).toISOString().slice(0, 10);

/** '/cs/titles/flappy/' -> { lang: 'cs', page: '/titles/flappy/' }; null for anything we do not serve. */
function normalizePage(path) {
  if (typeof path !== 'string' || path.length > 120) return null;
  const m = path.match(/^\/(?:(cs|de|ja)\/)?(.*)$/);
  if (!m) return null;
  const rest = '/' + m[2].replace(/index\.html$/, '');
  const ok = /^\/(?:|archive\/|machines\/(?:mz-700|mz-800|mz-1500)\/|machines\/|card\/|about\/|privacy\/|(?:titles|play)\/[a-z0-9][a-z0-9-]{0,63}\/)$/.test(rest);
  return ok ? { lang: m[1] ?? 'en', page: rest } : null;
}

// Where a visit came from, as a class and a name: 'ai:chatgpt', 'search:google',
// 'social:facebook', 'site:sharpmz.net'. The host only — never the full URL.
const SOURCES = [
  ['ai', /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/, 'chatgpt'],
  ['ai', /(^|\.)perplexity\.ai$/, 'perplexity'],
  ['ai', /(^|\.)claude\.ai$/, 'claude'],
  ['ai', /^gemini\.google\.com$|^bard\.google\.com$/, 'gemini'],
  ['ai', /^copilot\.microsoft\.com$|(^|\.)copilot\.cloud\.microsoft$/, 'copilot'],
  ['ai', /(^|\.)(deepseek\.com|grok\.com|you\.com|phind\.com|meta\.ai|mistral\.ai|kimi\.com)$/, null],
  ['search', /(^|\.)google\.[a-z.]+$/, 'google'],
  ['search', /(^|\.)bing\.com$/, 'bing'],
  ['search', /(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  ['search', /(^|\.)seznam\.cz$/, 'seznam'],
  ['search', /(^|\.)(yandex\.[a-z.]+|ya\.ru)$/, 'yandex'],
  ['search', /(^|\.)(search\.brave\.com|ecosia\.org|startpage\.com|qwant\.com|kagi\.com|yahoo\.[a-z.]+|baidu\.com|naver\.com|yahoo\.co\.jp)$/, null],
  ['social', /(^|\.)(facebook\.com|fb\.com|messenger\.com)$/, 'facebook'],
  ['social', /(^|\.)reddit\.com$/, 'reddit'],
  ['social', /^news\.ycombinator\.com$/, 'hackernews'],
  ['social', /(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x'],
  ['social', /(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  ['social', /(^|\.)(instagram\.com|linkedin\.com|lnkd\.in|mastodon\.[a-z.]+|bsky\.app|threads\.net|discord\.com|t\.me|telegram\.org|vk\.com)$/, null],
];

function classifySource(host, tag) {
  if (typeof tag === 'string' && /^[a-z0-9._-]{1,32}$/i.test(tag)) return `tag:${tag.toLowerCase()}`;
  if (typeof host !== 'string' || !host) return 'direct';
  host = host.toLowerCase().replace(/:\d+$/, '');
  if (!/^[a-z0-9.-]{1,100}$/.test(host)) return 'other';
  if (host === 'mzpico.com' || host.endsWith('.mzpico.com')) return null; // moving around the site
  for (const [cls, re, name] of SOURCES) if (re.test(host)) return `${cls}:${name ?? host.replace(/^www\./, '')}`;
  // android-app://com.google.android.gm and the like arrive as hosts of their own
  return `site:${host.replace(/^www\./, '')}`;
}

const bump = (env, day, metric, key) =>
  env.STATS.prepare(
    `INSERT INTO metrics_daily (day, metric, key, value) VALUES (?, ?, ?, 1)
       ON CONFLICT (day, metric, key) DO UPDATE SET value = value + 1`,
  ).bind(day, metric, key);

const put = (env, day, metric, key, value) =>
  env.STATS.prepare(
    `INSERT INTO metrics_daily (day, metric, key, value) VALUES (?, ?, ?, ?)
       ON CONFLICT (day, metric, key) DO UPDATE SET value = excluded.value`,
  ).bind(day, metric, key, value);

/** POST /api/hit — never errors back at the page; a counter is not worth a console line. */
export async function hit(env, request, { sameOrigin, readBody, hash, withinBudget }) {
  if (!sameOrigin || isBot(request)) return nothing();
  if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return nothing();
  const body = await readBody(request);
  if (!body) return nothing();
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  // Its own hourly budget, so browsing never eats into the one for votes and plays.
  if (!(await withinBudget(await hash('hit', ip), 600))) return nothing();
  const day = today();

  if (typeof body.e === 'string') {
    if (EVENTS.has(body.e)) await bump(env, day, 'event', body.e).run();
    return nothing();
  }

  const where = normalizePage(body.p);
  if (!where) return nothing();
  const ua = request.headers.get('User-Agent') ?? '';
  const writes = [
    bump(env, day, 'page', where.page),
    bump(env, day, 'lang', where.lang),
    bump(env, day, 'country', (request.cf?.country ?? request.headers.get('CF-IPCountry') ?? 'XX').slice(0, 2)),
    bump(env, day, 'device', /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop'),
  ];
  const source = classifySource(body.r, body.s);
  if (source) writes.push(bump(env, day, 'source', source));
  await env.STATS.batch(writes);

  // One visitor per address + browser per day; the row is gone the next day.
  const visitor = await hash('visit', ip, ua, day);
  const first = await env.STATS.prepare('INSERT OR IGNORE INTO visit_log (day, visitor) VALUES (?, ?)').bind(day, visitor).run();
  if (first.meta?.changes) await bump(env, day, 'visitors', '').run();
  return nothing();
}

const authorised = (env, request) => {
  const key = request.headers.get('X-Stats-Key') ?? '';
  return !!env.STATS_KEY && key.length === env.STATS_KEY.length && timingSafeEqual(key, env.STATS_KEY);
};
const refused = () => new Response(JSON.stringify({ error: 'not authorised' }), { status: 401, headers: JSON_HEADERS });

/** POST /api/metrics/report — the Monday mail on demand, to check that it arrives. */
export async function reportNow(env, request) {
  if (!authorised(env, request)) return refused();
  if (!env.REPORT_MAIL || !env.REPORT_TO) return new Response(JSON.stringify({ error: 'REPORT_TO not set' }), { status: 409, headers: JSON_HEADERS });
  await weekly(env);
  return new Response(JSON.stringify({ sent: true }), { headers: JSON_HEADERS });
}

/** POST /api/metrics/collect?day= — the nightly Cloudflare copy for one past day, on demand. */
export async function collectNow(env, request, url) {
  if (!authorised(env, request)) return refused();
  const day = url.searchParams.get('day') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today()) {
    return new Response(JSON.stringify({ error: 'day must be a past YYYY-MM-DD' }), { status: 400, headers: JSON_HEADERS });
  }
  if (!env.CF_ANALYTICS_TOKEN || !env.ZONE_ID) {
    return new Response(JSON.stringify({ error: 'CF_ANALYTICS_TOKEN not set' }), { status: 409, headers: JSON_HEADERS });
  }
  try {
    await collectCloudflare(env, day);
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers: JSON_HEADERS });
  }
  const { results } = await env.STATS.prepare('SELECT metric, COUNT(*) AS keys, SUM(value) AS total FROM metrics_daily WHERE day = ? GROUP BY metric').bind(day).all();
  return new Response(JSON.stringify({ collected: day, metrics: results }), { headers: JSON_HEADERS });
}

/** GET /api/metrics — the dashboard's data. The key is a Worker secret; the page keeps it in the URL fragment. */
export async function metricsApi(env, request, url) {
  if (!authorised(env, request)) return refused();
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 400);
  const from = dayBefore(today(), days - 1);
  const [rows, totals] = await env.STATS.batch([
    env.STATS.prepare('SELECT day, metric, key, value FROM metrics_daily WHERE day >= ? ORDER BY day').bind(from),
    env.STATS.prepare(`SELECT (SELECT COALESCE(SUM(n), 0) FROM plays) AS plays,
                              (SELECT COUNT(*) FROM votes) AS votes,
                              (SELECT COUNT(*) FROM plays WHERE n > 0) AS titles_played`),
  ]);
  return new Response(JSON.stringify({
    from, to: today(), generated: new Date().toISOString(),
    rows: (rows.results ?? []).map((r) => [r.day, r.metric, r.key, r.value]),
    totals: totals.results?.[0] ?? {},
  }), { headers: JSON_HEADERS });
}

function timingSafeEqual(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- Daily copy of Cloudflare's analytics --------------------------------------

// Robots worth naming. The *-User agents fetch a page because a person asked an
// AI assistant about it right now — the clearest "AI knows us" signal there is.
const BOTS = [
  ['ai-live', /ChatGPT-User/i, 'ChatGPT (user asked)'],
  ['ai-live', /Claude-User/i, 'Claude (user asked)'],
  ['ai-live', /Perplexity-User/i, 'Perplexity (user asked)'],
  ['ai-live', /MistralAI-User/i, 'Mistral (user asked)'],
  ['ai-search', /OAI-SearchBot/i, 'OpenAI search'],
  ['ai-search', /Claude-SearchBot/i, 'Claude search'],
  ['ai-search', /PerplexityBot/i, 'Perplexity'],
  ['ai-train', /GPTBot/i, 'GPTBot (OpenAI)'],
  ['ai-train', /ClaudeBot|anthropic-ai/i, 'ClaudeBot (Anthropic)'],
  ['ai-train', /Google-Extended|GoogleOther/i, 'Google AI'],
  ['ai-train', /Applebot-Extended/i, 'Apple AI'],
  ['ai-train', /Amazonbot/i, 'Amazonbot'],
  ['ai-train', /meta-externalagent|FacebookBot/i, 'Meta AI'],
  ['ai-train', /Bytespider/i, 'Bytespider (ByteDance)'],
  ['ai-train', /CCBot/i, 'Common Crawl'],
  ['ai-train', /cohere-ai|Diffbot|ImagesiftBot|Timpibot/i, 'other AI'],
  ['search', /Googlebot|Google-InspectionTool|Storebot-Google|AdsBot-Google/i, 'Google'],
  ['search', /bingbot|BingPreview|msnbot/i, 'Bing'],
  ['search', /Applebot/i, 'Apple'],
  ['search', /YandexBot|YandexRenderResourcesBot/i, 'Yandex'],
  ['search', /SeznamBot/i, 'Seznam'],
  ['search', /DuckDuckBot|DuckAssistBot/i, 'DuckDuckGo'],
  ['search', /Baiduspider|PetalBot|Sogou|NaverBot|Yeti\//i, 'other search'],
  ['seo', /AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|BLEXBot|serpstatbot|SeekportBot/i, 'SEO tools'],
  ['social', /facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|WhatsApp|redditbot/i, 'link previews'],
];

async function graphql(env, query) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data.viewer.zones[0];
}

/** One UTC day of Cloudflare analytics into metrics_daily (idempotent: values are set, not added). */
async function collectCloudflare(env, day) {
  const zone = env.ZONE_ID;
  const win = `datetime_geq:"${day}T00:00:00Z", datetime_lt:"${dayBefore(day, -1)}T00:00:00Z"`;
  const site = env.SITE_HOST ?? 'mzpico.com';
  const z = await graphql(env, `{ viewer { zones(filter:{zoneTag:"${zone}"}) {
    total: httpRequests1dGroups(limit:1, filter:{date:"${day}"}) { sum { requests pageViews bytes } uniq { uniques } }
    agents: httpRequestsAdaptiveGroups(limit:1000, filter:{${win}, clientRequestHTTPHost:"${site}", edgeResponseContentTypeName:"html"}, orderBy:[count_DESC]) { count dimensions { userAgent } }
    card: httpRequestsAdaptiveGroups(limit:200, filter:{${win}, clientRequestHTTPHost:"api.mzpico.com"}, orderBy:[count_DESC]) { count dimensions { clientRequestPath } }
    files: httpRequestsAdaptiveGroups(limit:500, filter:{${win}, clientRequestHTTPHost:"${site}", clientRequestPath_like:"/files/%", userAgent_notlike:"%bot%"}, orderBy:[count_DESC]) { count dimensions { clientRequestPath } }
    errors: httpRequestsAdaptiveGroups(limit:1, filter:{${win}, clientRequestHTTPHost:"${site}", edgeResponseStatus_geq:500}) { count }
  } } }`);

  const writes = [];
  const t = z.total?.[0];
  if (t) {
    writes.push(put(env, day, 'cf', 'requests', t.sum.requests), put(env, day, 'cf', 'pageViews', t.sum.pageViews),
      put(env, day, 'cf', 'uniques', t.uniq.uniques), put(env, day, 'cf', 'MB', Math.round(t.sum.bytes / 1e6)));
  }
  const bots = new Map();
  let human = 0;
  for (const { count, dimensions: { userAgent: ua } } of z.agents ?? []) {
    const hitBot = BOTS.find(([, re]) => re.test(ua ?? ''));
    const key = hitBot ? `${hitBot[0]}|${hitBot[2]}` : BOT_UA.test(ua ?? '') || !ua ? 'other|unnamed robots' : null;
    if (key) bots.set(key, (bots.get(key) ?? 0) + count);
    else human += count;
  }
  for (const [key, n] of bots) writes.push(put(env, day, 'bot', key, n));
  writes.push(put(env, day, 'cf', 'browserPages', human));
  const card = { list: 0, download: 0, other: 0 };
  for (const { count, dimensions: { clientRequestPath: p } } of z.card ?? []) {
    card[p?.startsWith('/list') ? 'list' : p?.startsWith('/download') ? 'download' : 'other'] += count;
  }
  for (const [k, n] of Object.entries(card)) writes.push(put(env, day, 'card', k, n));
  const files = new Map();
  for (const { count, dimensions: { clientRequestPath: p } } of z.files ?? []) {
    const slug = p?.split('/')[2];
    if (slug) files.set(slug, (files.get(slug) ?? 0) + count);
  }
  for (const [slug, n] of files) writes.push(put(env, day, 'download', slug, n));
  writes.push(put(env, day, 'health', '5xx', z.errors?.[0]?.count ?? 0));
  for (let i = 0; i < writes.length; i += 50) await env.STATS.batch(writes.slice(i, i + 50));
}

/** Plays and votes of one day, from our own tables — before the play log is pruned. */
async function collectOwn(env, day) {
  const start = Date.parse(`${day}T00:00:00Z`) / 1000;
  const [plays, votes] = await env.STATS.batch([
    env.STATS.prepare('SELECT slug, COUNT(*) AS n FROM play_log WHERE day = ? GROUP BY slug').bind(day),
    env.STATS.prepare('SELECT COUNT(*) AS n FROM votes WHERE ts >= ? AND ts < ?').bind(start, start + 86400),
  ]);
  const writes = [];
  let total = 0;
  for (const { slug, n } of plays.results ?? []) { writes.push(put(env, day, 'play', slug, n)); total += n; }
  writes.push(put(env, day, 'plays', '', total), put(env, day, 'votes', '', votes.results?.[0]?.n ?? 0));
  for (let i = 0; i < writes.length; i += 50) await env.STATS.batch(writes.slice(i, i + 50));
}

/** The daily cron: yesterday's numbers in, then the short-lived rows out. */
export async function daily(env) {
  const yesterday = dayBefore(today());
  await collectOwn(env, yesterday);
  if (env.CF_ANALYTICS_TOKEN && env.ZONE_ID) {
    try { await collectCloudflare(env, yesterday); } catch (err) { console.error('cloudflare analytics:', String(err)); }
  }
  await env.STATS.prepare('DELETE FROM visit_log WHERE day < ?').bind(today()).run();
}

// ---- Weekly mail ------------------------------------------------------------

async function summary(env, from, to) {
  const { results } = await env.STATS.prepare(
    'SELECT metric, key, SUM(value) AS v FROM metrics_daily WHERE day >= ? AND day <= ? GROUP BY metric, key',
  ).bind(from, to).all();
  const get = (metric, key = '') => results.filter((r) => r.metric === metric && (key === null || r.key === key)).reduce((s, r) => s + r.v, 0);
  const top = (metric, n = 5, filter = () => true) => results.filter((r) => r.metric === metric && filter(r.key))
    .sort((a, b) => b.v - a.v).slice(0, n).map((r) => [r.key, r.v]);
  return { get, top, results };
}

export async function weekly(env) {
  if (!env.REPORT_MAIL || !env.REPORT_TO) return;
  const to = dayBefore(today());
  const from = dayBefore(to, 6);
  const now = await summary(env, from, to);
  const prev = await summary(env, dayBefore(from, 7), dayBefore(from));
  const delta = (a, b) => (b ? ` (${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)} %)` : '');
  const line = (label, metric, key = '') => {
    const a = now.get(metric, key), b = prev.get(metric, key);
    return `${label.padEnd(26)} ${String(a).padStart(7)}${delta(a, b)}`;
  };
  const list = (rows) => rows.length ? rows.map(([k, v]) => `  ${String(v).padStart(6)}  ${k}`).join('\n') : '  —';
  const aiVisits = now.results.filter((r) => r.metric === 'source' && r.key.startsWith('ai:')).reduce((s, r) => s + r.v, 0);
  const site = env.SITE_URL ?? 'https://mzpico.com';
  const text = [
    `mzpico.com, ${from} – ${to}`,
    '',
    line('Visitors', 'visitors'),
    line('Page views (people)', 'page', null),
    line('Plays', 'plays'),
    line('Ratings', 'votes'),
    line('Card listings', 'card', 'list'),
    line('Card downloads', 'card', 'download'),
    `${'Visits from AI assistants'.padEnd(26)} ${String(aiVisits).padStart(7)}`,
    '',
    'Where people came from:', list(now.top('source', 8)),
    '', 'Most visited pages:', list(now.top('page', 8)),
    '', 'Most played:', list(now.top('play', 8)),
    '', 'AI crawlers (pages fetched):', list(now.top('bot', 8, (k) => k.startsWith('ai-'))),
    '', 'Countries:', list(now.top('country', 6)),
    '', 'Features used:', list(now.top('event', 10)),
    '', `Dashboard: ${site}/stats/${env.STATS_KEY ? `#k=${env.STATS_KEY}` : ''}`,
  ].join('\n');

  const sender = `stats@${new URL(site).hostname.replace(/^staging\./, '')}`;
  const raw = [
    `From: MZPico stats <${sender}>`,
    `To: ${env.REPORT_TO}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(`mzpico.com weekly: ${now.get('visitors')} visitors, ${now.get('plays')} plays`)))}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@mzpico.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(text))).replace(/.{76}/g, '$&\r\n'),
  ].join('\r\n');
  await env.REPORT_MAIL.send(new EmailMessage(sender, env.REPORT_TO, raw));
}
