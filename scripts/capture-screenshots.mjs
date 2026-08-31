#!/usr/bin/env node
// Batch screenshot capture via mz800emu v2 headless MCP (JSONL) backend.
//
// For every title that has no screenshots/ folder yet, spawns
//   mz800emu --mcp-pipe --headless --no-first-run-windows --run-mzf <file>
// waits for the program to boot, then asks the emulator to save a PNG
// of its framebuffer to titles/<slug>/screenshots/01-auto.png.
//
// Captures are "loading/title screen at N seconds" quality — meant as a
// first pass; curated gameplay shots can replace them later.
//
// Usage: node scripts/capture-screenshots.mjs [--emu <path>] [--wait <sec>]
//        [--limit <n>] [--only <slug>[,slug...]] [--force]
import { spawn, execFile } from 'node:child_process';
import { mkdir, stat, rm, rename, readFile } from 'node:fs/promises';
import path from 'node:path';
import { TITLES_DIR, readCatalog } from './lib/catalog.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : dflt;
};
const EMU = arg('--emu', '/home/matyamar/src/mz800emu/build/build-mz800emu/mz800emu');
const WAIT_S = Number(arg('--wait', '12'));
const LIMIT = Number(arg('--limit', 'Infinity'));
const ONLY = arg('--only', '')?.split(',').filter(Boolean);
const FORCE = process.argv.includes('--force');
const JOBS = Number(arg('--jobs', '4'));
const DISCONNECT_ROM = process.argv.includes('--disconnect-rom'); // ZX-conversion style: jump with ROM unmapped (all-RAM)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureOne(title) {
  const mzf = path.join(title.dir, title.files[0].path);
  const outDir = path.join(title.dir, 'screenshots');
  const outFile = path.join(outDir, '01-auto.png');
  const outFile2 = path.join(outDir, '02-auto.png');
  await mkdir(outDir, { recursive: true });

  const emu = spawn(EMU, ['--mcp-pipe'], {
    stdio: ['pipe', 'pipe', 'ignore'],
    cwd: path.dirname(EMU),
  });
  let reqId = 0;
  const pending = new Map();
  let buffer = '';
  emu.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
      let msg; try { msg = JSON.parse(line); } catch { continue; } // skip banners
      if (msg.req_id !== undefined && pending.has(msg.req_id)) {
        pending.get(msg.req_id)(msg); pending.delete(msg.req_id);
      }
    }
  });
  const request = (cmd, data, timeoutMs = 10000) => new Promise((resolve, reject) => {
    const id = ++reqId;
    pending.set(id, resolve);
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`timeout: ${cmd}`)); }, timeoutMs);
    emu.stdin.write(JSON.stringify({ req_id: id, cmd, ...(data ? { data } : {}) }) + '\n');
    const orig = pending.get(id); pending.set(id, (m) => { clearTimeout(t); orig(m); });
  });
  const exited = new Promise((r) => emu.on('exit', r));
  // Snapshot repeatedly until two consecutive frames (2s apart) are identical —
  // i.e. the screen is fully drawn. Animated screens never settle; capMs bounds the wait.
  const stableShot = async (file, initialMs, capMs) => {
    await sleep(initialMs);
    let prev = null;
    const t0 = Date.now();
    for (;;) {
      await requestRetry('screenshot_save_to_file', { path: file, format: 'png' });
      const cur = await readFile(file);
      if (prev && cur.equals(prev)) return;
      prev = cur;
      if (Date.now() - t0 > capMs) return;
      await sleep(2000);
    }
  };
  // dbgapi submissions fail while a previous command is still in flight — retry with backoff
  const requestRetry = async (cmd, data, tries = 8) => {
    for (let i = 1; ; i++) {
      const resp = await request(cmd, data);
      if (resp.success) return resp;
      if (i >= tries) throw new Error(`${cmd}: ${resp.error}`);
      await sleep(300);
    }
  };

  try {
    await sleep(1500); // let the emulator initialize its JSONL loop
    // Authentic ROM-monitor LOAD handover: instant CMT-hack load, then jump to
    // the EXEC address with ROM still mapped (as the real monitor does).
    // Debug-side pokes (set_register) require the CPU paused.
    const load = await requestRetry('media_load_mzf', { path: mzf });
    await requestRetry('pause');
    if (DISCONNECT_ROM) for (const port of [0xe0, 0xe1]) await requestRetry('io_write', { port, value: 0 });
    await requestRetry('set_register', { reg: 'PC', value: load.data?.exec_addr ?? title.files[0].header.execAddress });
    await requestRetry('run');
    await stableShot(outFile, WAIT_S * 1000, 30000); // wait for the screen to settle (cap for animated screens)
    // Try to start gameplay: SPACE + CR + joystick FIRE1 are the usual triggers.
    try {
      await requestRetry('input_send_keys', { text: ' \r', encoding: 'ascii', frame_per_key: 4 }, 3);
      await requestRetry('input_send_joystick', { port: 0, state: 0x10, frames: 6 }, 3);
    } catch { /* input may not land while the program ignores the keyboard */ }
    let two = true;
    try {
      await stableShot(outFile2, 8000, 16000);
    } catch { two = false; }
    await postProcess(outFile);
    if (two) {
      await postProcess(outFile2);
      const [a, b] = await Promise.all([readFile(outFile), readFile(outFile2)]);
      if (a.equals(b)) { await rm(outFile2); two = false; } // no change = no gameplay shot
    }
    const size = (await stat(outFile)).size;
    return { ok: true, size, two };
  } finally {
    emu.stdin.end(); emu.kill('SIGTERM');
    await Promise.race([exited, sleep(3000)]);
    emu.kill('SIGKILL');
    // remove empty screenshots dir if capture failed
    try { const s = await stat(path.join(outDir, '01-auto.png')).catch(() => null); if (!s) await rm(outDir, { recursive: true }); } catch {}
  }
}

// Crop the raw 928x288 PAL framebuffer to the 704x232 visible area (canvas +
// border) and double line height for a sane aspect ratio. No-op if ffmpeg is absent.
let hasFfmpeg = true;
async function postProcess(file) {
  if (!hasFfmpeg) return;
  const tmp = file + '.tmp.png';
  try {
    await new Promise((res, rej) => execFile('ffmpeg',
      ['-y', '-loglevel', 'error', '-i', file, '-vf', 'crop=704:232:112:28,scale=704:464:flags=neighbor', tmp],
      (e) => (e ? rej(e) : res())));
    await rename(tmp, file);
  } catch (err) {
    if (err.code === 'ENOENT') { hasFfmpeg = false; await rm(tmp, { force: true }); return; }
    throw err;
  }
}

const catalog = await readCatalog();
let todo = catalog.filter((t) => (FORCE || t.screenshots.length === 0) && (!ONLY?.length || ONLY.includes(t.slug)));
todo = todo.slice(0, LIMIT);
console.log(`Capturing ${todo.length} title(s) with ${EMU} (wait ${WAIT_S}s each)`);
let ok = 0, failed = 0, idx = 0;
async function worker() {
  while (idx < todo.length) {
    const t = todo[idx++];
    try {
      const r = await captureOne(t);
      ok++; console.log(`  ${t.slug} ok${r.two ? ' +gameplay' : ''} (${r.size} bytes) [${ok + failed}/${todo.length}]`);
    } catch (err) {
      failed++; console.log(`  ${t.slug} FAILED: ${err.message} [${ok + failed}/${todo.length}]`);
    }
  }
}
await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));
console.log(`${ok} captured, ${failed} failed`);
process.exit(failed && !ok ? 1 : 0);
