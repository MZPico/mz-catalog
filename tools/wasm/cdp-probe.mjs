// Drive a headful Chromium via CDP: load URL, poll the page's #log for N seconds, screenshot.
// usage: node cdp-probe.mjs <url> <seconds> <out.png>
const [url, secs = '30', out = 'probe.png'] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
let page = list.find(t => t.type === 'page');
if (!page) page = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url });
const t0 = Date.now(); let last = '';
while (Date.now() - t0 < Number(secs) * 1000) {
  await new Promise(r => setTimeout(r, 2000));
  const txt = await evalJs("document.getElementById('log')?.textContent ?? ''");
  const lines = (txt || '').trim().split('\n');
  if (txt !== last) { console.log(`t+${((Date.now() - t0) / 1000).toFixed(0)}s: ${lines.length} log lines; last: ${lines.at(-1)?.slice(0, 110)}`); last = txt; }
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
(await import('node:fs')).writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('screenshot ->', out); ws.close(); process.exit(0);
