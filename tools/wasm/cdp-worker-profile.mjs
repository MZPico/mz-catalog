// Navigate, then CPU-profile every dedicated worker (pthreads) for N seconds and print hot functions.
const [url, secs = '10'] = process.argv.slice(2);
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const sessions = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Target.attachedToTarget') sessions.set(m.params.sessionId, m.params.targetInfo); };
const send = (method, params = {}, sessionId) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 12000));
console.log('log lines:', String(await ev("document.getElementById('log').textContent")).split('\n').length, '| workers:', sessions.size);
for (const [sid, info] of sessions) {
  await send('Profiler.enable', {}, sid); await send('Profiler.setSamplingInterval', { interval: 1000 }, sid); await send('Profiler.start', {}, sid);
}
await new Promise(r => setTimeout(r, Number(secs) * 1000));
for (const [sid, info] of sessions) {
  const r = await send('Profiler.stop', {}, sid); const p = r.result?.profile; if (!p) continue;
  const byId = new Map(p.nodes.map(n => [n.id, n])); const counts = {}; for (const s of p.samples) counts[s] = (counts[s] || 0) + 1;
  const self = new Map(); for (const [nid, c] of Object.entries(counts)) { const n = byId.get(Number(nid)); const k = n.callFrame.functionName || '(anon)'; self.set(k, (self.get(k) || 0) + c); }
  const total = p.samples.length; const idle = counts[p.nodes.find(n => n.callFrame.functionName === '(idle)')?.id] || 0;
  console.log(`\n--- worker ${info.url.split('/').pop()} sid=${sid.slice(0,6)}: ${total} samples, idle ${(100*idle/total).toFixed(0)}%`);
  [...self.entries()].filter(([k]) => k !== '(idle)').sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, c]) => console.log(`${(100 * c / total).toFixed(1).padStart(5)}%  ${k.slice(0, 90)}`));
}
ws.close(); process.exit(0);
