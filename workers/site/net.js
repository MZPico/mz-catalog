// MZPico NET relay as a Durable Object: one instance per room, WebSocket
// hibernation API, alarm for idle expiry. Protocol: BomberNet/docs/net-protocol.md
// (JSON frames: create/join/ready/input/hash/msg/leave; room/members/start/
// input/desync/msg/dropped/error). The reference implementation is the Python
// relay in the BomberNet repo; this is the production one behind /net.
//
// Connection URL carries the room, because a socket must reach its Durable
// Object at upgrade time:
//   /net?game=<id>&create=1        the Worker picks a free 4-letter code
//   /net?game=<id>&code=<ABCD>     join (or spectate a full/running room)
// The first message must be the matching {"op":"create"} / {"op":"join"}.
//   &bin=1                         input lines as binary messages, both ways
//                                  (the serial-bus machines, e.g. the Atari's
//                                  FujiNet): to the relay [frame lo, frame hi,
//                                  data...], from it [slot, frame lo, frame hi,
//                                  data...]; every other message stays JSON
//
//   &pf=<machine>                  which machine this is, when the client says
//                                  (the machine ids of the title's ports); else
//                                  the connection's own signs are read, see platformOf
//
// Free-plan budget: incoming WebSocket messages count 20:1, outgoing are free;
// a 4-player room at 17 inputs/s per member is ~3.5 requests/s.
//
// Usage goes into metrics_daily as plain totals, at the events of a game and never
// per input; no room code, address or anything else that tells people apart:
//   net-rooms created|joined|started   each room once, how far it got
//   net-games, net-seconds, net-seat-seconds   per game id
//   net-seats 1..4, net-platform <machine>     per game started, per seat
//   net-ends, net-problem, net-spectators      how they ended, what went wrong

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_TTL_MS = 10 * 60 * 1000;   // idle rooms only; a room with no sockets is dropped at once
const HISTORY = 256;
const E_BUILD = 6, E_ROOM = 7, E_NOROOM = 8, E_PARAM = 10;

export function roomCode() {
  const a = new Uint8Array(4);
  crypto.getRandomValues(a);
  return [...a].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

const PLATFORMS = new Set(['browser', 'mz-800', 'zx-spectrum-48k', 'element-zx-128k', 'amstrad-cpc', 'atari-xl', 'c64', 'amiga', 'atari-st', 'pc-dos']);

/** The machine behind a connection. Today only the kinds can be told apart without
 * the client saying: every machine on the shared C client sends the same User-Agent. */
export function platformOf(request, url) {
  const said = url.searchParams.get('pf');
  if (PLATFORMS.has(said)) return said;
  const ua = request.headers.get('User-Agent') ?? '';
  if (/^MZPico/.test(ua)) return 'mz-800';
  if (/^BomberNet/.test(ua)) return 'retro';
  // In a browser, the game compiled for the web asks for binary lines and the emulated MZ-800 does not.
  if (/^Mozilla/.test(ua)) return url.searchParams.get('bin') === '1' ? 'browser' : 'mz-800-emulator';
  return 'other';
}

const COUNT = `INSERT INTO metrics_daily (day, metric, key, value) VALUES (?, ?, ?, ?)
  ON CONFLICT (day, metric, key) DO UPDATE SET value = value + excluded.value`;

const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch { /* closing */ } };

export class NetRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = undefined;              // loaded from storage on first use
    this.inputs = new Map();            // frame -> { slot: hex }   (memory only)
    this.hashes = new Map();            // frame -> { slot: hash }
  }

  async load() {
    if (this.room === undefined) this.room = (await this.ctx.storage.get('room')) ?? null;
    return this.room;
  }

  async save() {
    await this.ctx.storage.put('room', this.room);
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  sockets() { return this.ctx.getWebSockets(); }

  /** Add to the statistics: [metric, key, n]. A count is never worth breaking a game for. */
  async tally(...rows) {
    if (!this.env.STATS) return;
    const day = new Date().toISOString().slice(0, 10);
    try {
      await this.env.STATS.batch(rows.map(([metric, key, n = 1]) => this.env.STATS.prepare(COUNT).bind(day, metric, String(key), n)));
    } catch (err) { console.error('net stats:', String(err)); }
  }

  /** The running game is over: count how long it lasted and how it ended. */
  async endGame(how) {
    const seconds = Math.round((Date.now() - (this.room.startedAt ?? Date.now())) / 1000);
    const game = this.room.game, seats = this.room.seats ?? 0;
    this.room.running = false;
    await this.save();
    await this.tally(['net-seconds', game, seconds], ['net-seat-seconds', game, seconds * seats], ['net-ends', how]);
  }

  members() {
    const out = new Map();
    for (const ws of this.sockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.slot >= 0) out.set(a.slot, { ws, ...a });
    }
    return out;
  }

  broadcast(obj, exclude) {
    const data = JSON.stringify(obj);
    let blob = null;                       // the input line for bin=1 sockets
    if (obj.op === 'input') {
      const hex = obj.data.match(/../g) ?? [];
      blob = new Uint8Array([obj.slot, obj.frame & 0xFF, (obj.frame >> 8) & 0xFF, ...hex.map((h) => parseInt(h, 16))]);
    }
    for (const ws of this.sockets()) {
      if (ws === exclude) continue;
      const a = ws.deserializeAttachment();
      if (!a || a.slot === -2) continue;   // not yet created/joined
      try { ws.send(blob && a.bin ? blob : data); } catch { /* closing */ }
    }
  }

  readyMask() {
    let m = 0;
    for (const [slot, a] of this.members()) if (a.ready) m |= 1 << slot;
    return m;
  }

  async fetch(request) {
    const url = new URL(request.url);
    await this.load();
    if (url.pathname === '/exists') return new Response(this.room ? '1' : '0');
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const game = Number(url.searchParams.get('game') ?? 0);
    const create = url.searchParams.get('create') === '1';
    const code = (url.searchParams.get('code') ?? '').toUpperCase();
    const bin = url.searchParams.get('bin') === '1';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // slot -2 = handshake pending (create or join must come first)
    server.serializeAttachment({ slot: -2, ready: false, create, game, code, bin, platform: platformOf(request, url) });
    if (!create && !this.room) {
      send(server, { op: 'error', code: E_ROOM, text: 'room unknown' });
      server.close(1000, 'room unknown');
      await this.tally(['net-problem', 'unknown room code']);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    let msg;
    const a = ws.deserializeAttachment();
    if (typeof raw !== 'string' && a && a.bin) {   // a binary input line: [frame lo, frame hi, data...]
      const b = new Uint8Array(raw);
      if (b.length < 2) return send(ws, { op: 'error', code: E_PARAM, text: 'bad input' });
      msg = { op: 'input', frame: b[0] | (b[1] << 8), data: [...b.subarray(2)].map((x) => x.toString(16).padStart(2, '0')).join('') };
    } else {
      try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return send(ws, { op: 'error', code: E_PARAM, text: 'bad json' }); }
    }
    await this.load();
    const op = msg.op;

    if (a.slot === -2) {
      if (op === 'create' && a.create) {
        if (this.room) return send(ws, { op: 'error', code: E_PARAM, text: 'room exists' });
        const slots = Number(msg.slots ?? 4), bytes = Number(msg.bytes ?? 1);
        if (!(slots >= 1 && slots <= 4 && bytes >= 1 && bytes <= 4)) return send(ws, { op: 'error', code: E_PARAM, text: 'slots 1..4, bytes 1..4' });
        this.room = { game: a.game, code: a.code, build: Number(msg.build ?? 0), slots, bytes, settings: String(msg.settings ?? ''), running: false, seed: 0 };
        await this.save();
        ws.serializeAttachment({ ...a, slot: 0, ready: false });
        send(ws, { op: 'room', code: a.code, slot: 0, slots, bytes, settings: this.room.settings });
        this.broadcast({ op: 'members', count: 1, ready: 0 });
        await this.tally(['net-rooms', 'created']);
        return;
      }
      if (op === 'join' && !a.create) {
        if (!this.room) return send(ws, { op: 'error', code: E_ROOM, text: 'room unknown' });
        if (Number(msg.build ?? 0) !== this.room.build) {
          send(ws, { op: 'error', code: E_BUILD, text: 'build mismatch' });
          return this.tally(['net-problem', 'version mismatch']);
        }
        const members = this.members();
        if (members.size >= this.room.slots || this.room.running) {
          ws.serializeAttachment({ ...a, slot: -1, ready: false });   // spectator
          send(ws, { op: 'room', code: a.code, slot: -1, slots: this.room.slots, bytes: this.room.bytes, settings: this.room.settings, spectator: true });
          return this.tally(['net-spectators', this.room.game]);
        }
        let slot = 0;
        while (members.has(slot)) slot++;
        ws.serializeAttachment({ ...a, slot, ready: false });
        const firstGuest = !this.room.joined;
        this.room.joined = true;
        await this.save();
        send(ws, { op: 'room', code: a.code, slot, slots: this.room.slots, bytes: this.room.bytes, settings: this.room.settings });
        this.broadcast({ op: 'members', count: this.members().size, ready: this.readyMask() });
        if (firstGuest) await this.tally(['net-rooms', 'joined']);
        return;
      }
      return send(ws, { op: 'error', code: E_NOROOM, text: a.create ? 'send create first' : 'send join first' });
    }

    if (!this.room) return send(ws, { op: 'error', code: E_NOROOM, text: 'not in a room' });

    switch (op) {
      case 'ready': {
        if (a.slot < 0) return send(ws, { op: 'error', code: E_PARAM, text: 'spectator' });
        ws.serializeAttachment({ ...a, ready: !!(msg.ready ?? 1) });
        await this.save();
        const members = this.members();
        this.broadcast({ op: 'members', count: members.size, ready: this.readyMask() });
        // every member present is ready: the game decides when the room is full
        // (BomberNet's host readies last, once every seat is taken)
        if (!this.room.running && [...members.values()].every((m) => m.ready)) {
          this.room.running = true;
          this.room.seed = 1 + Math.floor(Math.random() * 0xFFFE);
          const firstGame = !this.room.started;
          Object.assign(this.room, { started: true, startedAt: Date.now(), seats: members.size, desynced: false });
          this.inputs.clear(); this.hashes.clear();
          await this.save();
          // mask: the slots taking part (a frame is complete when they all sent input)
          let mask = 0; for (const slot of members.keys()) mask |= 1 << slot;
          this.broadcast({ op: 'start', seed: this.room.seed, frame: 0, mask });
          await this.tally(
            ['net-games', this.room.game], ['net-seats', members.size],
            ...[...members.values()].map((m) => ['net-platform', m.platform ?? 'other']),
            ...(firstGame ? [['net-rooms', 'started']] : []),
          );
        }
        return;
      }
      case 'input': {
        if (a.slot < 0 || !this.room.running) return send(ws, { op: 'error', code: E_NOROOM, text: 'not running' });
        const frame = Number(msg.frame ?? -1), data = String(msg.data ?? '');
        if (frame < 0 || data.length !== 2 * this.room.bytes) return send(ws, { op: 'error', code: E_PARAM, text: 'bad input' });
        const f = this.inputs.get(frame) ?? {};
        f[a.slot] = data; this.inputs.set(frame, f);
        this.trim(this.inputs, frame);
        this.broadcast({ op: 'input', frame, slot: a.slot, data }, ws);
        await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
        return;
      }
      case 'hash': {
        if (a.slot < 0) return;
        const frame = Number(msg.frame ?? -1), h = Number(msg.hash ?? 0) & 0xFFFF;
        const hs = this.hashes.get(frame) ?? {};
        hs[a.slot] = h; this.hashes.set(frame, hs);
        this.trim(this.hashes, frame);
        if (new Set(Object.values(hs)).size > 1) {
          this.broadcast({ op: 'desync', frame });
          // It can repeat on every frame after: one game counts once.
          if (!this.room.desynced) { this.room.desynced = true; await this.save(); await this.tally(['net-problem', 'desync']); }
        }
        return;
      }
      case 'msg': {
        const to = Number(msg.to ?? -1), data = String(msg.data ?? '');
        if (data.length > 64) return send(ws, { op: 'error', code: E_PARAM, text: 'msg too long' });
        const out = { op: 'msg', from: a.slot, data };
        if (to < 0) this.broadcast(out, ws);
        else { const m = this.members().get(to); if (m) send(m.ws, out); }
        return;
      }
      case 'leave':
        ws.close(1000, 'leave');
        return;
      case 'ping':
        return send(ws, { op: 'pong', t: msg.t });
      default:
        return send(ws, { op: 'error', code: E_PARAM, text: 'unknown op' });
    }
  }

  trim(map, frame) {
    if (map.size > HISTORY * 2) for (const k of map.keys()) if (k < frame - HISTORY) map.delete(k);
  }

  // 1000, 1001 and 1005 are a client closing on purpose; the rest is a connection lost.
  async webSocketClose(ws, code) { await this.gone(ws, [1000, 1001, 1005].includes(code)); }
  async webSocketError(ws) { await this.gone(ws, false); }

  async gone(ws, clean) {
    const a = ws.deserializeAttachment();
    await this.load();
    if (a && a.slot >= 0 && this.room) {
      this.broadcast({ op: 'dropped', slot: a.slot }, ws);
      if (this.room.running) await this.endGame(clean ? 'left' : 'connection lost');
    }
    if (this.sockets().filter((s) => s !== ws).length === 0) await this.destroy();
  }

  async alarm() {
    await this.load();
    if (this.room?.running) await this.endGame('timed out');
    this.broadcast({ op: 'dropped', slot: -1, reason: 'timeout' });
    for (const ws of this.sockets()) { try { ws.close(1000, 'timeout'); } catch { /* */ } }
    await this.destroy();
  }

  async destroy() {
    this.room = null;
    this.inputs.clear(); this.hashes.clear();
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
  }
}

/** Front-Worker handler for /net: pick a free code on create, then hand the upgrade to the room. */
export async function netUpgrade(request, env) {
  const url = new URL(request.url);
  if (!env.NET_ROOM) return new Response('relay not bound', { status: 503 });
  if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
  const game = Number(url.searchParams.get('game') ?? 0);
  let code = (url.searchParams.get('code') ?? '').toUpperCase();
  const create = url.searchParams.get('create') === '1';
  if (!Number.isInteger(game) || game < 0 || game > 0xFFFF) return new Response('bad game', { status: 400 });
  if (create) {
    for (let i = 0; i < 8; i++) {
      code = roomCode();
      const id = env.NET_ROOM.idFromName(`${game}:${code}`);
      const r = await env.NET_ROOM.get(id).fetch('https://room/exists');
      if ((await r.text()) === '0') break;
      code = '';
    }
    if (!code) return new Response('no free room code', { status: 503 });
  } else if (!/^[A-Z]{4}$/.test(code)) {
    return new Response('bad code', { status: 400 });
  }
  const id = env.NET_ROOM.idFromName(`${game}:${code}`);
  const target = new URL(request.url);
  target.searchParams.set('code', code);
  return env.NET_ROOM.get(id).fetch(new Request(target.toString(), request));
}
