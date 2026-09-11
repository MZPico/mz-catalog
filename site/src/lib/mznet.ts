// MZPico NET bridge for the browser emulator (BomberNet/docs/net-protocol.md).
//
// The WASM build of mz800emu identifies as an MZPico and serves the NET
// vendor commands from ring buffers; this module owns the WebSocket to the
// relay and pumps JSON lines both ways through the exported queue functions:
//   Module._mz_wasm_net_enabled()   1 when the build has the extension
//   Module._mz_wasm_net_link(1|0)   tell the device the relay is (un)reachable
//   Module.ccall('mz_wasm_net_push', null, ['string'], [line])   relay -> device
//   Module.ccall('mz_wasm_net_pop', 'string', [], [])            device -> relay ('' = none)
// The game never sees the socket: it talks to the device on ports 50h/51h.
//
// The relay is a Durable Object per room, so the socket URL must name the room:
// /net?game=G&create=1 or /net?game=G&code=ABCD. The socket is therefore opened
// on the game's first outbound line (its create or join) and closed when the
// game leaves; the first message on the socket is that same line.

export interface NetState {
  linked: boolean;
  code: string;      // room code once the game created or joined a room
  slot: number;      // -1 = none / spectator
  members: number;
  running: boolean;
  desync: boolean;
  dropped: boolean;
}

type Emu = {
  _mz_wasm_net_enabled?: () => number;
  _mz_wasm_net_link?: (linked: number) => void;
  ccall: (name: string, ret: string | null, argTypes: string[], args: unknown[]) => unknown;
};

const emu = () => (window as unknown as { Module?: Emu }).Module;

/** Connect the emulator's NET device to the relay at relayBase (e.g. wss://host/net). */
export function attachNet(relayBase: string, onState?: (s: NetState) => void): () => void {
  (window as unknown as { __mzNetAttach?: number }).__mzNetAttach = ((window as unknown as { __mzNetAttach?: number }).__mzNetAttach ?? 0) + 1;
  const state: NetState = { linked: false, code: '', slot: -1, members: 0, running: false, desync: false, dropped: false };
  const emit = () => onState?.({ ...state });
  let ws: WebSocket | null = null;
  let pump = 0;
  let stopped = false;
  let pendingFirst: string | null = null;   // the create/join line that opens the socket

  const m = emu();
  if (!m || !m._mz_wasm_net_enabled) return () => {};
  // The runtime is up before the emulator has read its configuration; wait for
  // the device to report the extension (a few seconds at most) before linking.
  let linkTimer = 0, tries = 0;
  const tryLink = () => {
    if (stopped) return;
    if (m._mz_wasm_net_enabled?.()) {
      // "linked" = the relay is reachable; the device reports READY and the game can create/join
      m._mz_wasm_net_link?.(1); state.linked = true; emit();
    } else if (++tries < 40) {
      linkTimer = window.setTimeout(tryLink, 250);
    }
  };
  tryLink();

  const urlFor = (line: string): string | null => {
    try {
      const j = JSON.parse(line);
      const game = Number(j.game ?? 0);
      if (j.op === 'create') return `${relayBase}?game=${game}&create=1`;
      if (j.op === 'join') return `${relayBase}?game=${game}&code=${encodeURIComponent(String(j.code ?? ''))}`;
    } catch { /* not json */ }
    return null;
  };

  const open = (url: string, first: string) => {
    if (stopped) return;
    pendingFirst = first;
    ws = new WebSocket(url);
    ws.onopen = () => { if (pendingFirst) { ws?.send(pendingFirst); pendingFirst = null; } emit(); };
    ws.onmessage = (ev) => {
      const line = String(ev.data);
      m.ccall('mz_wasm_net_push', null, ['string'], [line]);
      try {
        const j = JSON.parse(line);
        if (j.op === 'room') { state.code = j.code ?? ''; state.slot = j.slot ?? -1; state.running = false; state.desync = state.dropped = false; }
        else if (j.op === 'members') state.members = j.count ?? 0;
        else if (j.op === 'start') state.running = true;
        else if (j.op === 'desync') state.desync = true;
        else if (j.op === 'dropped') state.dropped = true;
        emit();
      } catch { /* not for us */ }
    };
    ws.onclose = () => {
      ws = null;
      if (pendingFirst) {                    // could not even reach the relay
        pendingFirst = null;
        m.ccall('mz_wasm_net_push', null, ['string'], ['{"op":"error","code":9,"text":"relay unreachable"}']);
      } else if (state.code) {
        m.ccall('mz_wasm_net_push', null, ['string'], ['{"op":"dropped","slot":-1,"reason":"socket closed"}']);
      }
      state.code = ''; state.running = false; emit();
    };
    ws.onerror = () => ws?.close();
  };

  // device -> relay: a few lines per frame at most; 20 ms keeps input delay low
  pump = window.setInterval(() => {
    for (let i = 0; i < 32; i++) {
      const line = m.ccall('mz_wasm_net_pop', 'string', [], []) as string;
      if (!line) break;
      if (!ws) {
        const url = urlFor(line);
        if (url) open(url, line);            // create/join opens the room's socket
        continue;                            // anything else without a socket is dropped
      }
      if (ws.readyState === WebSocket.OPEN) ws.send(line);
      else if (ws.readyState === WebSocket.CONNECTING && pendingFirst === null) pendingFirst = line;
      if (line.includes('"leave"')) { ws.close(); ws = null; }
    }
  }, 20);

  return () => { stopped = true; clearTimeout(linkTimer); clearInterval(pump); ws?.close(); m._mz_wasm_net_link?.(0); };
}
