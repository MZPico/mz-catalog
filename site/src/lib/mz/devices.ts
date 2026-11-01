// The peripherals, drawn the way the keyboard and the recorder are: the real
// hardware from its photographs, in CSS, with the parts you would touch doing
// what they do. Every setting the machine has lives on its device - there is
// no second list of controls anywhere.
//
//   floppy   the two-drive MZ-1F19 unit: cream tower, SHARP badge, two black
//            bays. The controller drives four, so it stands twice, bays A-D,
//            as one device. A bay takes a disk and holds that disk's options;
//            the lever throws it out; the rocker on the first tower is the
//            controller.
//   MZ-1F11  the Quick Disk: grille, BUSY lamp, EJECT key down the right
//            edge. The grille takes a cartridge, and with it write protection
//            and whether the drive is the real one or the card pretending.
//   MR1R18   the RAM disk card, a green board of DIP chips - and beside it the
//            two smaller Pezik boards. A card is its own switch: click it to
//            plug it in; the size label on the big one opens its choices.
//   memext   the memory extension, another board, with the maker on its label.
//   MZPico   the card itself: green board, purple Pico, SD slot.
//   IDE8     two hard disks, each taking an image.
//   joy      two joysticks, each of whatever kind, or none.
//   sound    the speaker, and the second PSG beside it.
//
// Nothing here is a photograph: the catalog is Apache-2.0 and the pictures of
// these machines are not ours to ship, so they are drawn from them instead.

import type { Machine } from './machine';
import { popup, type Item } from './menu';

export const DEVICE_IDS = ['fdc', 'qdisk', 'ramdisk', 'memext', 'card', 'ide', 'joy', 'sound'] as const;
export type DeviceId = (typeof DEVICE_IDS)[number];

export interface DeviceHooks {
  machine(): Machine;
  /** Workbench files of these kinds, as id and name. */
  files(kinds: string[]): { id: string; name: string }[];
  /** Change one setting, by its path in the machine. */
  set(path: string, value: unknown): void;
  /** A floppy the machine wrote to, back into the file list. */
  take(drive: number): void;
  /** Which devices are on show. */
  shown(): Set<DeviceId>;
  strings: Record<string, string>;
}

/** A disk label has room for about this much. */
const short = (name: string) => (name.length > 16 ? name.slice(0, 15) + '…' : name);
const chips = (n: number) => '<i></i>'.repeat(n);

const tower = (first: number) => `
  <div class="fd-case">
    <div class="fd-top"><span class="fd-badge">SHARP</span><span class="fd-vents"></span>
      ${first === 0 ? '<button type="button" class="dev-power" data-toggle="fdc.connected"><i></i></button>' : ''}</div>
    <div class="fd-bays">
      ${[first, first + 1].map((i) => `
        <div class="fd-bay" data-bay="${i}">
          <button type="button" class="fd-face" data-slot="fdd${i}">
            <span class="fd-slot"><span class="fd-disk"><span class="fd-label"></span></span></span>
            <span class="fd-lever"></span>
            <span class="fd-led"></span>
          </button>
          <span class="fd-no">${'ABCD'[i]}</span>
        </div>`).join('')}
    </div>
  </div>`;

const CASE = `
  <div class="dev dev-fdd wide" data-dev="fdc">
    <div class="fd-towers">${tower(0)}${tower(2)}</div>
    <p class="dev-cap"><b>Floppy</b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-ram wide" data-dev="ramdisk">
    <button type="button" class="ram-card" data-toggle="ramdisk.mr1r18.plugged">
      <span class="ram-edge"></span>
      <span class="ram-chips">${chips(14)}</span>
      <span class="ram-silk">MR1R18 <b class="ram-size" data-menu="ram"></b></span>
    </button>
    <div class="ram-peziks">
      <button type="button" class="ram-card small" data-toggle="ramdisk.pezikE8">
        <span class="ram-edge"></span><span class="ram-chips">${chips(4)}</span><span class="ram-silk">PEZIK E8</span>
      </button>
      <button type="button" class="ram-card small" data-toggle="ramdisk.pezik68">
        <span class="ram-edge"></span><span class="ram-chips">${chips(4)}</span><span class="ram-silk">PEZIK 68</span>
      </button>
    </div>
    <p class="dev-cap"><b>RAM disk</b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-qd" data-dev="qdisk">
    <div class="qd-case">
      <span class="qd-made">MADE IN JAPAN</span>
      <button type="button" class="qd-grille" data-slot="qd">
        <span class="qd-cart"><span class="qd-shutter"></span><span class="qd-label"></span></span>
      </button>
      <span class="qd-busy"><i></i>BUSY</span>
      <button type="button" class="dev-power" data-toggle="qdisk.connected"><i></i></button>
      <button type="button" class="qd-eject" data-eject="qdisk.file"><span>EJECT</span></button>
    </div>
    <p class="dev-cap"><b>MZ-1F11</b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-pico" data-dev="card">
    <button type="button" class="ram-card pico" data-toggle="card.connected">
      <span class="ram-edge"></span>
      <span class="pico-module"><i class="pico-usb"></i><i class="pico-chip"></i><i class="pico-chip small"></i></span>
      <span class="pico-sd"></span>
      <span class="ram-silk pico-silk">MZPico <b data-menu="card">⚙</b></span>
    </button>
    <p class="dev-cap"><b>MZPico</b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-mem" data-dev="memext">
    <button type="button" class="ram-card mem" data-toggle="memext.connected">
      <span class="ram-edge"></span>
      <span class="ram-chips">${chips(8)}</span>
      <span class="mem-flash"></span>
      <span class="ram-silk"><b class="mem-type" data-menu="memext"></b></span>
    </button>
    <p class="dev-cap"><b class="cap-memext"></b> <span class="dev-what"></span></p>
  </div>


  <div class="dev dev-hdd" data-dev="ide">
    <div class="pair">
      ${[0, 1].map((i) => `
        <button type="button" class="hdd" data-hdd="${i}">
          <span class="hdd-lid"><span class="hdd-label"></span></span><i class="hdd-led"></i>
        </button>`).join('')}
    </div>
    <p class="dev-cap"><b class="cap-hdd"></b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-joy" data-dev="joy">
    <div class="pair">
      ${['joy1', 'joy2'].map((j, i) => `
        <button type="button" class="joy" data-joy="${j}">
          <span class="joy-stick"><i></i></span>
          <span class="joy-base"><b></b><em>${i + 1}</em></span>
        </button>`).join('')}
    </div>
    <p class="dev-cap"><b class="cap-joy"></b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-snd" data-dev="sound">
    <div class="pair">
      <button type="button" class="snd-speaker" data-toggle="sound.on"><span class="snd-grille"></span></button>
      <button type="button" class="snd-chip" data-toggle="sound.secondPsg"><span>PSG<br>2</span></button>
    </div>
    <p class="dev-cap"><b class="cap-sound"></b> <span class="dev-what"></span></p>
  </div>`;

/** Walk a dotted path into the machine. */
const get = (m: Machine, path: string): unknown =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], m);

/** Draw the peripherals into `host`; returns the redraw the page calls after a change. */
export function devices(host: HTMLElement, hooks: DeviceHooks): () => void {
  host.innerHTML = CASE;
  const ui = hooks.strings;
  const find = <T extends HTMLElement>(sel: string) => host.querySelector(sel) as T;
  const all = (sel: string) => [...host.querySelectorAll<HTMLElement>(sel)];
  const joyName = (t: string) => (t === 'NONE' ? ui.joyNone : t === 'NUM_KEYPAD' ? ui.joyKeypad : ui.joyStick);
  const nameOf = (id: string, kinds: string[]) => hooks.files(kinds).find((f) => f.id === id)?.name ?? '';

  find('.cap-memext').textContent = ui.memext;
  find('.cap-hdd').textContent = ui.hdd;
  find('.cap-joy').textContent = ui.joysticks;
  find('.cap-sound').textContent = ui.soundOn;
  for (const b of all('.dev-power')) b.title = ui.connected;

  const draw = () => {
    const m = hooks.machine();
    const shown = hooks.shown();
    for (const dev of all('.dev')) dev.hidden = !shown.has(dev.dataset.dev as DeviceId);

    // the floppy units
    for (const bay of all('.fd-bay')) {
      const name = nameOf(m.fdc.drives[Number(bay.dataset.bay)].file, ['dsk']);
      bay.classList.toggle('loaded', !!name);
      bay.querySelector('.fd-label')!.textContent = short(name);
      bay.querySelector<HTMLElement>('.fd-face')!.title = name || ui.insert;
    }
    find('.dev-fdd').classList.toggle('off', !m.fdc.connected);
    find('.dev-fdd .dev-what').textContent =
      m.fdc.drives.map((d) => nameOf(d.file, ['dsk'])).filter(Boolean).join(', ') || ui.none;
    for (const p of all('[data-toggle]')) p.classList.toggle('on', !!get(m, p.dataset.toggle!));

    // the quick disk
    const qd = find('.dev-qd');
    const qdName = nameOf(m.qdisk.file, ['mzq', 'bin']);
    qd.classList.toggle('off', !m.qdisk.connected);
    qd.classList.toggle('loaded', !!qdName);
    find('.qd-label').textContent = short(qdName);
    find('.qd-grille').title = qdName || ui.insert;
    find('.dev-qd .dev-what').textContent = (qdName || ui.none) + (m.qdisk.type === 'UNICARD' ? ` · ${ui.viaCard}` : '');

    // the ram cards
    const r = m.ramdisk;
    find('.dev-ram').classList.toggle('off', !r.mr1r18.plugged && !r.pezikE8 && !r.pezik68);
    find('.ram-size').textContent = `${r.mr1r18.size} ${r.mr1r18.type}`;
    find('.dev-ram .dev-what').textContent =
      [r.mr1r18.plugged && `${r.mr1r18.size} ${r.mr1r18.type}`, r.pezikE8 && 'Pezik E8', r.pezik68 && 'Pezik 68'].filter(Boolean).join(', ') || ui.none;

    find('.dev-mem').classList.toggle('off', !m.memext.connected);
    find('.mem-type').textContent = m.memext.type === 'PEHU' ? 'PEHU' : 'LUFTNER';
    find('.dev-mem .dev-what').textContent = m.memext.connected ? (m.memext.type === 'PEHU' ? 'PEHU' : 'Luftner') : ui.none;

    find('.dev-pico').classList.toggle('off', !m.card.connected);
    find('.dev-pico .dev-what').textContent = m.card.connected
      ? [m.card.mzpicoMode ? 'MZPico' : 'Unicard', m.card.readonly && ui.readonly].filter(Boolean).join(' · ') : ui.none;

    // hard disks, joysticks, sound
    const hdds = [m.ide.hdd0, m.ide.hdd1].map((id) => nameOf(id, ['bin']));
    all('.hdd').forEach((h, i) => {
      h.classList.toggle('off', !hdds[i]);
      h.querySelector('.hdd-label')!.textContent = short(hdds[i]) || `HDD ${i}`;
      h.title = hdds[i] || ui.insert;
    });
    find('.dev-hdd').classList.toggle('off', !hdds[0] && !hdds[1]);
    find('.dev-hdd .dev-what').textContent = hdds.filter(Boolean).join(', ') || ui.none;

    all('.joy').forEach((j) => {
      const type = m.joy[j.dataset.joy as 'joy1' | 'joy2'];
      j.classList.toggle('off', type === 'NONE');
      j.title = joyName(type);
    });
    find('.dev-joy').classList.toggle('off', m.joy.joy1 === 'NONE' && m.joy.joy2 === 'NONE');
    find('.dev-joy .dev-what').textContent = [m.joy.joy1, m.joy.joy2].filter((t) => t !== 'NONE').map(joyName).join(', ') || ui.joyNone;

    find('.dev-snd').classList.toggle('off', !m.sound.on);
    find('.snd-chip').classList.toggle('off', !m.sound.secondPsg);
    find('.snd-chip').title = ui.secondPsg;
    find('.dev-snd .dev-what').textContent = m.sound.on ? (m.sound.secondPsg ? '2 × PSG' : 'PSG') : ui.none;
  };

  // ---- the lists each clickable part opens
  const fileItems = (path: string, kinds: string[]): Item[] => {
    const current = get(hooks.machine(), path) as string;
    const choices = hooks.files(kinds);
    if (!choices.length) return [{ note: ui.noImages }];
    return [
      { radio: ui.none, on: !current, pick: () => hooks.set(path, '') },
      ...choices.map((f) => ({ radio: f.name, on: f.id === current, pick: () => hooks.set(path, f.id) })),
    ];
  };
  const check = (path: string, label: string): Item =>
    ({ check: label, on: !!get(hooks.machine(), path), pick: () => hooks.set(path, !get(hooks.machine(), path)) });
  const radio = (path: string, value: string, label: string): Item =>
    ({ radio: label, on: get(hooks.machine(), path) === value, pick: () => hooks.set(path, value) });

  const menus: Record<string, () => Item[]> = {
    ram: () => [
      ...(['64K', '256K', '512K', '1M', '16M'] as const).map((v) => radio('ramdisk.mr1r18.size', v, v)),
      'sep', radio('ramdisk.mr1r18.type', 'SRAM', 'SRAM'), radio('ramdisk.mr1r18.type', 'ROM', 'ROM'),
    ],
    memext: () => [radio('memext.type', 'PEHU', 'PEHU'), radio('memext.type', 'LUFTNER', 'Luftner')],
    card: () => [check('card.mzpicoMode', ui.mzpicoMode), check('card.readonly', ui.readonly)],
    qd: () => {
      const m = hooks.machine();
      return [
        ...fileItems('qdisk.file', ['mzq', 'bin']), 'sep',
        check('qdisk.writeProtected', ui.writeProtected), 'sep',
        radio('qdisk.type', 'STANDARD', 'MZ-1F11'), radio('qdisk.type', 'UNICARD', ui.viaCard),
        ...(m.qdisk.file ? ['sep' as const, { action: ui.eject, pick: () => hooks.set('qdisk.file', '') }] : []),
      ];
    },
  };
  const bayMenu = (i: number) => (): Item[] => {
    const d = hooks.machine().fdc.drives[i];
    return [
      ...fileItems(`fdc.drives.${i}.file`, ['dsk']), 'sep',
      check(`fdc.drives.${i}.readonly`, ui.readonly),
      { check: ui.keepWrites, on: d.storage === 'cached', pick: () => hooks.set(`fdc.drives.${i}.storage`, d.storage === 'cached' ? 'discard' : 'cached') },
      ...(d.file ? ['sep' as const, { action: ui.takeImage, pick: () => hooks.take(i) }, { action: ui.eject, pick: () => hooks.set(`fdc.drives.${i}.file`, '') }] : []),
    ];
  };
  const hddMenu = (i: number) => () => fileItems(`ide.hdd${i}`, ['bin']);
  const joyMenu = (j: string) => () => (['NONE', 'NUM_KEYPAD', 'JOYSTICK'] as const).map((t) => radio(`joy.${j}`, t, joyName(t)));

  const open = (el: HTMLElement, build: () => Item[]) => popup(el, () => { const items = build(); draw(); return items; });

  // ---- wiring
  for (const el of all('[data-slot]')) {
    const slot = el.dataset.slot!;
    el.addEventListener('click', () => open(el, slot === 'qd' ? menus.qd : bayMenu(Number(slot.slice(3)))));
  }
  for (const el of all('[data-menu]')) {
    el.addEventListener('click', (e) => { e.stopPropagation(); open(el, menus[el.dataset.menu!]); });
  }
  for (const el of all('[data-hdd]')) el.addEventListener('click', () => open(el, hddMenu(Number(el.dataset.hdd))));
  for (const el of all('[data-joy]')) el.addEventListener('click', () => open(el, joyMenu(el.dataset.joy!)));
  for (const el of all('[data-toggle]')) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.set(el.dataset.toggle!, !get(hooks.machine(), el.dataset.toggle!));
      draw();
    });
  }
  for (const el of all('[data-eject]')) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      el.classList.add('down');
      setTimeout(() => el.classList.remove('down'), 160);
      hooks.set(el.dataset.eject!, '');
      draw();
    });
  }
  // The lever on a loaded bay throws the disk out instead of opening the list.
  for (const bay of all('.fd-bay')) {
    bay.querySelector('.fd-lever')!.addEventListener('click', (e) => {
      if (!bay.classList.contains('loaded')) return;
      e.stopPropagation();
      hooks.set(`fdc.drives.${bay.dataset.bay}.file`, '');
      draw();
    });
  }

  draw();
  return draw;
}
