// Sharp MZ tape-audio synthesis: MZF -> pulse stream -> WAV / Web Audio.
//
// Encoding reference: mz800emu src/libs/mztape (GPL project by Michal Hučík) —
// pulse widths, block sequences and checksum semantics were taken from there.
//   bit 1 = long pulse, bit 0 = short pulse (high phase then low phase)
//   data byte = 8 bits MSB-first + 1 long stop pulse
//   checksum  = 16-bit count of set bits, written big-endian (2 bytes)
//
// Works in the browser and in Node (no dependencies).

/** Pulse widths in seconds: [longHigh, longLow, shortHigh, shortLow]. */
export const PULSESETS = {
  'mz-700': { long: [0.000464, 0.000494], short: [0.000240, 0.000264] }, // MZ-700/80K/80A
  'mz-800': { long: [0.000470, 0.000494], short: [0.000240, 0.000278] }, // MZ-800/1500
};
export const pulsesetFor = (machine) => (machine === 'mz-700' ? PULSESETS['mz-700'] : PULSESETS['mz-800']);

/** Parse an MZF: 128-byte header + declared body (ignores storage padding). */
export function parseMzf(bytes) {
  if (bytes.length < 128) throw new Error('not an MZF: shorter than the 128-byte header');
  const dataSize = bytes[18] | (bytes[19] << 8);
  const header = bytes.subarray(0, 128);
  const body = bytes.subarray(128, Math.min(128 + dataSize, bytes.length));
  let name = '';
  for (let i = 1; i <= 17; i++) {
    if (bytes[i] === 0x0d) break;
    name += bytes[i] >= 0x20 && bytes[i] < 0x7f ? String.fromCharCode(bytes[i]) : '?';
  }
  return { header, body, dataSize, name: name.trim() };
}

const countBits = (arr) => { let n = 0; for (const b of arr) { let x = b; while (x) { n += x & 1; x >>= 1; } } return n; };

/**
 * Build the tape as a pulse sequence. Each entry: true = long, false = short.
 * layout: 'short'    — LGAP 6400 · LTM · 2L · HDR · CHKH · 2L · SGAP · STM · 2L · FILE · CHKF · 2L
 * layout: 'authentic'— LGAP 22000 pilot and header+file each written twice (ROM retry copies)
 */
export function buildPulses(mzf, { layout = 'short' } = {}) {
  const pulses = [];
  const L = (n = 1) => { for (let i = 0; i < n; i++) pulses.push(true); };
  const S = (n = 1) => { for (let i = 0; i < n; i++) pulses.push(false); };
  const data = (arr) => {
    for (const byte of arr) {
      for (let bit = 7; bit >= 0; bit--) pulses.push(!!((byte >> bit) & 1));
      pulses.push(true); // stop pulse
    }
  };
  const chk = (arr) => {
    const c = countBits(arr) & 0xffff;
    data([(c >> 8) & 0xff, c & 0xff]); // big-endian on tape
  };

  const hdrOnce = () => { data(mzf.header); chk(mzf.header); L(2); };
  const fileOnce = () => { data(mzf.body); chk(mzf.body); L(2); };

  if (layout === 'authentic') {
    S(22000); L(40); S(40); L(2);        // LGAP, LTM, 2L
    hdrOnce(); S(256); hdrOnce();        // HDR + copy
    S(11000); L(20); S(20); L(2);        // SGAP, STM, 2L
    fileOnce(); S(256); fileOnce();      // FILE + copy
  } else {
    S(6400); L(40); S(40); L(2);
    hdrOnce();
    S(11000); L(20); S(20); L(2);
    fileOnce();
  }
  return pulses;
}

/** Total duration in seconds for a pulse sequence. */
export function tapeSeconds(pulses, pulseset) {
  const lt = pulseset.long[0] + pulseset.long[1];
  const st = pulseset.short[0] + pulseset.short[1];
  let longs = 0;
  for (const p of pulses) if (p) longs++;
  return longs * lt + (pulses.length - longs) * st;
}

/**
 * Render pulses to 8-bit unsigned mono PCM samples.
 * Sample boundaries come from cumulative time, so rounding never drifts.
 */
export function renderSamples(pulses, pulseset, { rate = 44100, invert = false, leadSeconds = 0.5 } = {}) {
  const total = tapeSeconds(pulses, pulseset) + 2 * leadSeconds;
  const samples = new Uint8Array(Math.ceil(total * rate));
  const MID = 0x80;
  const HI = invert ? 0x24 : 0xdc;
  const LO = invert ? 0xdc : 0x24;
  samples.fill(MID);
  let t = leadSeconds;
  for (const p of pulses) {
    const w = p ? pulseset.long : pulseset.short;
    const a = Math.round(t * rate);
    const b = Math.round((t + w[0]) * rate);
    const c = Math.round((t + w[0] + w[1]) * rate);
    samples.fill(HI, a, b);
    samples.fill(LO, b, c);
    t += w[0] + w[1];
  }
  return { samples, rate, seconds: total };
}

/** Wrap 8-bit PCM in a WAV container (returns Uint8Array). */
export function wavBytes({ samples, rate }) {
  const out = new Uint8Array(44 + samples.length);
  const dv = new DataView(out.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + samples.length, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);            // PCM
  dv.setUint16(22, 1, true);            // mono
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate, true);         // byte rate (8-bit mono)
  dv.setUint16(32, 1, true);            // block align
  dv.setUint16(34, 8, true);            // bits per sample
  str(36, 'data'); dv.setUint32(40, samples.length, true);
  out.set(samples, 44);
  return out;
}

/** One-call convenience: MZF bytes -> { wav, seconds, name }. */
export function mzfToWav(bytes, { machine = 'mz-800', layout = 'short', invert = false, rate = 44100 } = {}) {
  const mzf = parseMzf(bytes);
  const pulseset = pulsesetFor(machine);
  const pulses = buildPulses(mzf, { layout });
  const rendered = renderSamples(pulses, pulseset, { rate, invert });
  return { wav: wavBytes(rendered), seconds: rendered.seconds, name: mzf.name, rendered };
}
