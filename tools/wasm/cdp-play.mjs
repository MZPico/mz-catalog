const [url, secs = '35', out = 'play.png'] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const consoleLines = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') consoleLines.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 140));
  if (m.method === 'Runtime.exceptionThrown') consoleLines.push('EXC ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 200)); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 2500));
console.log('isolated:', await ev('self.crossOriginIsolated'));
await ev("document.getElementById('play-start').click()");
const t0 = Date.now(); let last;
while (Date.now() - t0 < Number(secs) * 1000) {
  await new Promise(r => setTimeout(r, 2500));
  const st = await ev("document.getElementById('play-status').textContent");
  if (st !== last) { console.log(`t+${((Date.now()-t0)/1000).toFixed(0)}s status: "${st}"`); last = st; }
}
console.log('console:', consoleLines.slice(-8).join(' | '));
const shot = await send('Page.captureScreenshot', { format: 'png' });
(await import('node:fs')).writeFileSync(out, Buffer.from(shot.result.data, 'base64')); console.log('shot ->', out); ws.close(); process.exit(0);
