// The peripherals, drawn the way the keyboard and the recorder are: the real
// machines from their photographs, in CSS, with the parts you would touch
// actually doing something.
//
//   MZ-1F19  the two-drive floppy unit - a cream tower with the SHARP badge
//            and two black bays; a bay takes a disk, its lever ejects it.
//            The controller drives four, so there are two of them, as a
//            machine with four drives really had.
//   MZ-1F11  the Quick Disk - cream case, crosshatched grille, BUSY lamp
//            bottom left, EJECT key down the right edge, the cartridge
//            sitting in the slot along the bottom.
//   MR1R18   the RAM disk card - a green board of DIP chips with a gold edge
//            connector. There is nothing to insert, so the card itself is the
//            switch: click it to plug it in or pull it out.
//
// Nothing here is a photograph: the catalog is Apache-2.0 and the pictures of
// these machines are not ours to ship, so they are drawn from them instead.

export type Slot = 'fdd0' | 'fdd1' | 'fdd2' | 'fdd3' | 'qd';
export type Device = 'fdc' | 'qdisk' | 'ramdisk';

export interface DeviceState {
  fdc: { connected: boolean; disks: [string, string, string, string] };   // '' for an empty bay
  qd: { connected: boolean; disk: string; writeProtected: boolean };
  ram: { plugged: boolean; size: string };
}

export interface DeviceHooks {
  state(): DeviceState;
  /** What could go in that slot, as id and name. */
  files(slot: Slot): { id: string; name: string }[];
  /** '' empties the slot. */
  pick(slot: Slot, id: string): void;
  plug(device: Device, on: boolean): void;
  strings: { insert: string; eject: string; empty: string; noImages: string; connected: string; plugged: string };
}

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** A disk label has room for about this much. */
const short = (name: string) => (name.length > 16 ? name.slice(0, 15) + '…' : name);

const unit = (first: number) => `
  <div class="dev dev-fdd" data-dev="fdc">
    <div class="fd-case">
      <div class="fd-top"><span class="fd-badge">SHARP</span><span class="fd-vents"></span></div>
      <div class="fd-bays">
        ${[first, first + 1].map((i) => `
          <div class="fd-bay" data-bay="${i}">
            <button type="button" class="fd-face" data-slot="fdd${i}">
              <span class="fd-slot"><span class="fd-disk"><span class="fd-label"></span></span></span>
              <span class="fd-lever"></span>
              <span class="fd-led"></span>
            </button>
            <span class="fd-no">${i}</span>
          </div>`).join('')}
      </div>
    </div>
    <p class="dev-cap"><b>MZ-1F19</b> <span class="dev-what"></span></p>
  </div>`;

const CASE = `
  ${unit(0)}
  ${unit(2)}

  <div class="dev dev-qd" data-dev="qdisk">
    <div class="qd-case">
      <span class="qd-made">MADE IN JAPAN</span>
      <button type="button" class="qd-grille" data-slot="qd">
        <span class="qd-cart"><span class="qd-shutter"></span><span class="qd-label"></span></span>
      </button>
      <span class="qd-busy"><i></i>BUSY</span>
      <button type="button" class="qd-eject" data-eject="qd"><span>EJECT</span></button>
    </div>
    <p class="dev-cap"><b>MZ-1F11</b> <span class="dev-what"></span></p>
  </div>

  <div class="dev dev-ram" data-dev="ramdisk">
    <button type="button" class="ram-card" data-plug="ramdisk">
      <span class="ram-edge"></span>
      <span class="ram-chips">${'<i></i>'.repeat(14)}</span>
      <span class="ram-silk">MR1R18 <b class="ram-size"></b></span>
    </button>
    <p class="dev-cap"><b>RAM disk</b> <span class="dev-what"></span></p>
  </div>`;

/** Draw the peripherals into `host`; returns the redraw the page ticks. */
export function devices(host: HTMLElement, hooks: DeviceHooks): () => void {
  host.innerHTML = CASE;

  const find = <T extends HTMLElement>(sel: string) => host.querySelector(sel) as T;
  const bays = [...host.querySelectorAll<HTMLElement>('.fd-bay')];

  const draw = () => {
    const s = hooks.state();
    bays.forEach((bay) => {
      const name = s.fdc.disks[Number(bay.dataset.bay)];
      bay.classList.toggle('loaded', !!name);
      bay.querySelector('.fd-label')!.textContent = short(name);
      bay.querySelector<HTMLElement>('.fd-face')!.title = name || hooks.strings.insert;
    });
    host.querySelectorAll<HTMLElement>('.dev-fdd').forEach((unit, i) => {
      unit.classList.toggle('off', !s.fdc.connected);
      unit.querySelector('.dev-what')!.textContent =
        s.fdc.disks.slice(i * 2, i * 2 + 2).filter(Boolean).join(', ') || hooks.strings.empty;
    });

    const qd = host.querySelector('.dev-qd')!;
    qd.classList.toggle('off', !s.qd.connected);
    qd.classList.toggle('loaded', !!s.qd.disk);
    qd.querySelector('.qd-label')!.textContent = short(s.qd.disk);
    find('.qd-grille').title = s.qd.disk || hooks.strings.insert;
    find('.dev-qd .dev-what').textContent = s.qd.disk || hooks.strings.empty;

    const ram = host.querySelector('.dev-ram')!;
    ram.classList.toggle('off', !s.ram.plugged);
    ram.querySelector('.ram-size')!.textContent = s.ram.size;
    find('.ram-card').title = hooks.strings.plugged;
    find('.dev-ram .dev-what').textContent = s.ram.plugged ? s.ram.size : hooks.strings.empty;
  };

  /** The little list that drops out of a slot when you click it. */
  const chooser = (anchor: HTMLElement, slot: Slot) => {
    host.querySelector('.dev-menu')?.remove();
    const choices = hooks.files(slot);
    const box = document.createElement('div');
    box.className = 'dev-menu';
    box.innerHTML = choices.length
      ? `<button type="button" data-id="">${esc(hooks.strings.empty)}</button>` +
        choices.map((f) => `<button type="button" data-id="${esc(f.id)}">${esc(f.name)}</button>`).join('')
      : `<p class="meta">${esc(hooks.strings.noImages)}</p>`;
    anchor.closest('.dev')!.append(box);
    for (const b of box.querySelectorAll<HTMLButtonElement>('button')) {
      b.addEventListener('click', () => { box.remove(); hooks.pick(slot, b.dataset.id!); draw(); });
    }
    // Anywhere else puts it away again.
    setTimeout(() => document.addEventListener('pointerdown', function away(e) {
      if (box.contains(e.target as Node)) return;
      box.remove(); document.removeEventListener('pointerdown', away);
    }), 0);
  };

  for (const el of host.querySelectorAll<HTMLElement>('[data-slot]')) {
    el.addEventListener('click', () => chooser(el, el.dataset.slot as Slot));
  }
  for (const el of host.querySelectorAll<HTMLElement>('[data-eject]')) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      el.classList.add('down');
      setTimeout(() => el.classList.remove('down'), 160);
      hooks.pick(el.dataset.eject as Slot, '');
      draw();
    });
  }
  for (const el of host.querySelectorAll<HTMLElement>('[data-plug]')) {
    el.addEventListener('click', () => {
      const device = el.dataset.plug as Device;
      hooks.plug(device, !(device === 'ramdisk' ? hooks.state().ram.plugged : hooks.state().qd.connected));
      draw();
    });
  }
  // The lever on a loaded bay throws the disk out instead of opening the list.
  for (const bay of bays) {
    bay.querySelector('.fd-lever')!.addEventListener('click', (e) => {
      if (!bay.classList.contains('loaded')) return;
      e.stopPropagation();
      hooks.pick(bay.querySelector<HTMLElement>('[data-slot]')!.dataset.slot as Slot, '');
      draw();
    });
  }

  draw();
  return draw;
}
