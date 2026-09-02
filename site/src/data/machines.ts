// Concise machine overviews for /machines/<id>/ pages.
export interface Machine {
  id: 'mz-700' | 'mz-800' | 'mz-1500';
  name: string;
  years: string;
  intro: string;
  specs: [string, string][];
  softwareNote: string;
}

export const machines: Machine[] = [
  {
    id: 'mz-700',
    name: 'Sharp MZ-700',
    years: '1982',
    intro:
      'Successor to the MZ-80K line and one of the most popular Sharp home computers in Europe. ' +
      'A "clean machine": it boots into a monitor ROM and loads its BASIC (or any other system) from cassette. ' +
      'The display is character-based — games achieve remarkable pseudo-graphics using the rich built-in character set.',
    specs: [
      ['CPU', 'Z80A @ 3.5 MHz'],
      ['RAM', '64 KB'],
      ['Display', '40×25 text, 8 colours per cell (foreground/background), no bitmap mode'],
      ['Sound', 'Single-channel beeper driven by an 8253 timer'],
      ['Storage', 'Cassette (1200 baud); MZ-721/731 models have a built-in recorder'],
      ['Variants', 'MZ-711 (base), MZ-721 (tape recorder), MZ-731 (tape + colour plotter)'],
    ],
    softwareNote:
      'MZ-700 titles also run on the MZ-800 in its MZ-700 compatibility mode.',
  },
  {
    id: 'mz-800',
    name: 'Sharp MZ-800',
    years: '1984',
    intro:
      'The European follow-up to the MZ-700 adds true bitmap graphics and a programmable sound generator ' +
      'while keeping an MZ-700 compatibility mode. It was especially popular in Czechoslovakia and Germany, ' +
      'with a lively scene converting ZX Spectrum titles to it. The MZPico storage card targets this machine.',
    specs: [
      ['CPU', 'Z80A @ 3.5 MHz'],
      ['RAM', '64 KB'],
      ['VRAM', '16 KB, expandable to 32 KB'],
      ['Display', '320×200 in 4 colours or 640×200 in 2 (16-colour palette); 16 / 4 colours with the VRAM expansion'],
      ['Sound', 'SN76489 PSG — 3 tone channels + noise'],
      ['Modes', 'Native MZ-800 mode and MZ-700 compatibility mode (selected at boot)'],
      ['Storage', 'Cassette (MZ-821 built-in); optional Quick Disk, floppy interface'],
    ],
    softwareNote:
      'MZ-800 software is split between native-mode titles and MZ-700-mode titles; each catalog entry records which mode it uses.',
  },
];
