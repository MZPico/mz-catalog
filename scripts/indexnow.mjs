#!/usr/bin/env node
// Tell IndexNow (Bing, Yandex, Seznam, …) that pages changed, instead of
// waiting for the next crawl. Run after a production deploy:
//   node scripts/indexnow.mjs            # every URL in the live sitemap
//   node scripts/indexnow.mjs /titles/x/ # just these paths
// The key file must stay reachable at https://mzpico.com/<key>.txt.
const KEY = 'c16d3e80e5a8ac17ed85b47525b82edc';
const HOST = 'mzpico.com';
const SITE = `https://${HOST}`;

const args = process.argv.slice(2);
let urls;
if (args.length) {
  urls = args.map((a) => (a.startsWith('http') ? a : SITE + (a.startsWith('/') ? a : '/' + a)));
} else {
  const xml = await fetch(`${SITE}/sitemap.xml`).then((r) => {
    if (!r.ok) throw new Error(`sitemap.xml: HTTP ${r.status}`);
    return r.text();
  });
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
if (!urls.length) throw new Error('nothing to submit');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
// 200 = accepted, 202 = accepted but key still being validated.
console.log(`IndexNow: ${urls.length} URL(s) → HTTP ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
