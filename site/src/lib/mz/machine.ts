// The machine the emulator should be, as the page sees it.
//
// mz800emu takes its hardware from an ini file: which drives exist, what is in
// them, whether there is a RAM disk, a Quick Disk, an MZPico card. The native
// build has menus for this and mounts live; our build has no bridge to those
// functions yet, so the page writes the ini and restarts the machine — under a
// second, and the settings survive because the page remembers them.
//
// Every value below is one the emulator accepts; the keyword lists come from
// its own configuration code (fdc.c, qdisk.c, ramdisk.c, memext.c, joy.c).

export interface Drive {
  /** id of a file in the workbench, or '' for an empty drive */
  file: string;
  readonly: boolean;
  /** cached = changes kept in memory until you save the image; discard = thrown away */
  storage: 'cached' | 'discard';
}

export interface Machine {
  program: string;              // an .mzf loaded straight into memory, or ''
  fdc: { connected: boolean; drives: [Drive, Drive, Drive, Drive] };
  qdisk: { connected: boolean; type: 'STANDARD' | 'VIRTUAL' | 'UNICARD'; file: string; writeProtected: boolean };
  ramdisk: {
    mr1r18: { plugged: boolean; type: 'SRAM' | 'ROM'; size: '64K' | '256K' | '512K' | '1M' | '16M' };
    pezikE8: boolean;
    pezik68: boolean;
  };
  memext: { connected: boolean; type: 'PEHU' | 'LUFTNER' };
  card: { connected: boolean; mzpicoMode: boolean; readonly: boolean };
  ide: { hdd0: string; hdd1: string };
  tape: { speed: 'SPEED_1/1' | 'SPEED_2/1' | 'SPEED_3/1' | 'SPEED_4/1'; inverted: boolean; boost: boolean };
  sound: { on: boolean; secondPsg: boolean };
  joy: { joy1: JoyType; joy2: JoyType };
}

export type JoyType = 'NONE' | 'NUM_KEYPAD' | 'JOYSTICK';

const emptyDrive = (): Drive => ({ file: '', readonly: false, storage: 'cached' });

export const defaults = (): Machine => ({
  program: '',
  fdc: { connected: true, drives: [emptyDrive(), emptyDrive(), emptyDrive(), emptyDrive()] },
  qdisk: { connected: false, type: 'STANDARD', file: '', writeProtected: false },
  ramdisk: { mr1r18: { plugged: true, type: 'SRAM', size: '1M' }, pezikE8: false, pezik68: false },
  memext: { connected: true, type: 'PEHU' },
  card: { connected: false, mzpicoMode: true, readonly: false },
  ide: { hdd0: '', hdd1: '' },
  tape: { speed: 'SPEED_1/1', inverted: false, boost: true },
  sound: { on: true, secondPsg: false },
  joy: { joy1: 'NONE', joy2: 'NONE' },
});

/** Machines worth starting from. */
export const presets: Record<string, () => Machine> = {
  plain: () => ({ ...defaults(), fdc: { connected: false, drives: [emptyDrive(), emptyDrive(), emptyDrive(), emptyDrive()] }, ramdisk: { ...defaults().ramdisk, mr1r18: { plugged: false, type: 'SRAM', size: '1M' } }, memext: { connected: false, type: 'PEHU' } }),
  floppy: () => defaults(),
  card: () => ({ ...defaults(), card: { connected: true, mzpicoMode: true, readonly: false }, qdisk: { connected: true, type: 'UNICARD', file: '', writeProtected: false } }),
  everything: () => ({
    ...defaults(),
    qdisk: { connected: true, type: 'STANDARD', file: '', writeProtected: false },
    card: { connected: true, mzpicoMode: true, readonly: false },
    ramdisk: { mr1r18: { plugged: true, type: 'SRAM', size: '16M' }, pezikE8: true, pezik68: true },
    sound: { on: true, secondPsg: true },
  }),
};

const bool = (value: boolean) => (value ? '1' : '0');
/** Where a mounted file lives inside the emulator's own filesystem. */
export const mediaPath = (id: string) => `/media/${id.replace(/[^A-Za-z0-9._-]/g, '_')}`;
const file = (id: string) => (id ? mediaPath(id) : '');

/** The ini the emulator reads at start. Only what we actually set. */
export function toIni(m: Machine): string {
  const volume = m.sound.on ? '0xffffffff' : '0x00000000';
  const lines = [
    '[FDC]',
    `connected = ${bool(m.fdc.connected)}`,
    ...m.fdc.drives.flatMap((d, i) => [
      `wd279x_fdd${i}_dskpath = ${file(d.file)}`,
      `wd279x_fdd${i}_readonly = ${bool(d.readonly)}`,
      `wd279x_fdd${i}_storage_mode = ${d.storage}`,
    ]),
    '',
    '[QDISK]',
    `mz1f11_connected = ${bool(m.qdisk.connected)}`,
    `mz1f11_type = ${m.qdisk.type}`,
    `mz1f11_std_filepath = ${m.qdisk.type === 'STANDARD' ? file(m.qdisk.file) : ''}`,
    `mz1f11_virtual_filepath = ${m.qdisk.type === 'VIRTUAL' ? file(m.qdisk.file) : ''}`,
    `mz1f11_write_protected = ${bool(m.qdisk.writeProtected)}`,
    '',
    '[RAMDISK]',
    `mr1r18_pluged = ${bool(m.ramdisk.mr1r18.plugged)}`,
    `mr1r18_type = ${m.ramdisk.mr1r18.type}`,
    `mr1r18_size = ${m.ramdisk.mr1r18.size}`,
    'mr1r18_filepath = /media/ramdisk.dat',
    `pezik_e8_pluged = ${bool(m.ramdisk.pezikE8)}`,
    `pezik_68_pluged = ${bool(m.ramdisk.pezik68)}`,
    '',
    '[MEMEXT]',
    `connected = ${bool(m.memext.connected)}`,
    `type = ${m.memext.type}`,
    'flash_filepath = /media/flash.dat',
    '',
    '[UNICARD]',
    `connected = ${bool(m.card.connected)}`,
    `mzpico_mode = ${bool(m.card.mzpicoMode)}`,
    `readonly = ${bool(m.card.readonly)}`,
    'sd_root = /media/sd',
    '',
    '[IDE8]',
    `hdd0_connected = ${bool(!!m.ide.hdd0)}`,
    `hdd0_filepath = ${file(m.ide.hdd0)}`,
    `hdd1_connected = ${bool(!!m.ide.hdd1)}`,
    `hdd1_filepath = ${file(m.ide.hdd1)}`,
    '',
    '[CMT]',
    `mz_cmtspeed = ${m.tape.speed}`,
    `cmt_polarity_inverted = ${bool(m.tape.inverted)}`,
    `cpu_boost = ${bool(m.tape.boost)}`,
    '',
    '[AUDIO]',
    ...['volume_8253', 'volume_psg0', 'volume_psg1', 'volume_psg2', 'volume_psg3'].map((k) => `${k} = ${volume}`),
    '',
    '[HWCOMPAT]',
    `allow_psg1 = ${bool(m.sound.secondPsg)}`,
    '',
    '[JOY]',
    `joy1_type = ${m.joy.joy1}`,
    `joy2_type = ${m.joy.joy2}`,
    '',
  ];
  return lines.join('\n');
}

/** Which workbench files this machine needs mounted, by id. */
export function mediaOf(m: Machine): string[] {
  return [m.program, ...m.fdc.drives.map((d) => d.file), m.qdisk.file, m.ide.hdd0, m.ide.hdd1].filter(Boolean);
}

/** The emulator's command line: a program is injected, everything else just boots. */
export const argsOf = (m: Machine): string[] => [
  '--no-first-run-windows', '--no-save-ini', '--kiosk', '--config', '/mz800emu.ini',
  // The program runs at once, and is what the ROM's own tape load finds too.
  ...(m.program ? ['--run-mzf', mediaPath(m.program), '--cmthack-autofile', mediaPath(m.program)] : []),
];
