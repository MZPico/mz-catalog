// English is the source of truth: every other dictionary must provide the same
// keys (checked at build time in ./index.ts). Values may contain inline HTML —
// links have to sit inside the sentence because word order differs per language.
export const en = {
  meta: {
    siteName: 'Sharp MZ Software Catalog',
    homeTitle: 'Sharp MZ Software Catalog — MZ-700 / MZ-800',
    defaultDescription:
      'Software catalog and preservation library for Sharp MZ-700 and MZ-800 computers.',
  },
  langName: { en: 'English', cs: 'Čeština', de: 'Deutsch', ja: '日本語' },
  langSwitchLabel: 'Language',
  nav: { card: 'The Card', archive: 'Archive', titles: 'Featured', machines: 'Machines', about: 'About', github: 'GitHub' },
  footer: {
    blurb:
      'A preservation project for Sharp MZ series software. Files are offered for archival and emulation use.',
    rightsHtml: (aboutHref: string) =>
      `Rights holder? See <a href="${aboutHref}#takedown">takedown requests</a>. Machine-readable index: <a href="/manifest.json"><code>manifest.json</code></a>.`,
  },
  home: {
    h1: 'The pick of Sharp MZ software',
    introHtml: (cardHref: string) =>
      `The titles worth starting with on the Sharp MZ-700 and MZ-800, written up one by one — original <code>.mzf</code> tape images with screenshots, controls and the story behind them. Play any of them right in your browser, download for an emulator, or load over WiFi on a real machine with the <a href="${cardHref}">MZPico card</a>, an open Raspberry&nbsp;Pi&nbsp;Pico expansion for the MZ-800.`,
    searchPlaceholder: 'Search titles, publishers, descriptions…',
    allMachines: 'All machines',
    allGenres: 'All genres',
    filterByMachine: 'Filter by machine',
    filterByGenre: 'Filter by genre',
    noMatch: 'No titles match the selected filters.',
    noScreenshot: 'no screenshot',
    playAria: (title: string) => `Play ${title} in the browser`,
    archiveTeaser: 'Everything else preserved here is in the full archive — written up or not.',
  },
  archive: {
    h1: 'The full archive',
    lead:
      'Every title preserved here. The featured ones have written pages; the rest carry what the tape header itself says, plus screenshots where we have them. Corrections and additions are welcome.',
    filterName: 'Filter by name, publisher…',
    sort: 'Sort by',
    sortName: 'Name',
    sortPlays: 'Most played',
    sortRating: 'Best rated',
    sortYear: 'Year',
    withShots: 'With screenshot',
    curatedOnly: 'Featured only',
    curated: 'featured',
    showing: (shown: string | number, total: string | number) => `${shown} of ${total}`,
    none: 'No titles match the filters.',
    unknown: '—',
  },
  machines: {
    h1: 'Machines',
    lead: 'The Sharp MZ series home computers this catalog covers.',
    titlesCount: (n: number) => `${n} ${n === 1 ? 'title' : 'titles'}`,
    specs: 'Specifications',
    inCatalog: (n: number) => `${n} ${n === 1 ? 'title' : 'titles'} in the catalog`,
    none: 'None yet — contributions welcome.',
    overviewDescription: (name: string) => `${name} — machine overview and software catalog.`,
  },
  machineInfo: {
    'mz-700': {
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
      ] as [string, string][],
      softwareNote: 'MZ-700 titles also run on the MZ-800 in its MZ-700 compatibility mode.',
    },
    'mz-800': {
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
      ] as [string, string][],
      softwareNote:
        'MZ-800 software is split between native-mode titles and MZ-700-mode titles; each catalog entry records which mode it uses.',
    },
  },
  title: {
    play: '▶ Play in browser',
    playShort: '▶ Play',
    download: '⬇ Download .mzf',
    downloadShort: '⬇ .mzf',
    tapeAudio: '♪ Tape audio',
    aboutGame: 'About the game',
    controls: 'Controls',
    files: 'Files',
    techDetails: 'Technical details — tape header, addresses, checksums',
    th: {
      file: 'File',
      kind: 'Kind',
      tapeName: 'Tape name',
      type: 'Type',
      load: 'Load',
      exec: 'Exec',
      bodySize: 'Body size',
      fileSize: 'File size',
      crc: 'CRC-32',
    },
    kinds: { standard: 'Standard', turbo: 'Turbo loader', 'alt-dump': 'Alternative dump' },
    modeNative: 'MZ-800 native mode',
    mode700: 'MZ-700 compatibility mode',
    modeTitle: 'MZ-800 operating mode',
    languageTitle: 'Language',
    notCurated:
      'Nobody has written this entry up yet. What follows comes from the tape image itself; if you know the game, its year or its author, corrections are welcome.',
    plays: 'Plays',
    rating: 'Rating',
    rate: 'Rate this title',
    votes: (n: number) => `${n} ${n === 1 ? 'vote' : 'votes'}`,
    unrated: 'Not rated yet',
    rateThanks: 'Thanks!',
    starLabel: (n: number) => `${n} of 5`,
    screenshotAlt: (title: string, i: number) => `${title} screenshot ${i}`,
    summary: (title: string, machine: string, genres: string, year?: number) =>
      `${title} — ${machine} ${genres}${year ? ` (${year})` : ''}. Download the .mzf tape image.`,
  },
  tape: {
    hintHtml:
      "Turn any phone or laptop into a Sharp datacorder: connect the headphone output to the MZ's tape-in (read) jack, set volume to maximum, press PLAY here, and type <code>L</code> + CR (monitor) or the boot menu's <code>C</code> on the machine. Or download the WAV for later.",
    layout: 'Layout',
    layoutFast: 'fast (short pilot)',
    layoutAuthentic: 'authentic (with retry copies)',
    invert: 'invert polarity',
    play: '▶ Play tape audio',
    downloadWav: '⬇ Download .wav',
    generating: 'generating…',
    ready: (length: string) => `${length} tape — play at 100% volume into the MZ tape-in`,
    downloadFailed: (status: number) => `download failed (${status})`,
  },
  play: {
    headline: (title: string) => `${title} — play online`,
    pageDescription: (title: string) => `Run ${title} in the browser with the mz800emu emulator.`,
    back: '← back to the title page',
    start: (title: string) => `▶ Start ${title}`,
    startHint:
      "Loads the MZ-800 emulator (~7 MB) and runs the tape image. Sound needs a click — that's it.",
    tapToPlay: '▶ Tap to play',
    tapHint: 'Fullscreen, landscape, sound on.',
    enableSound: '🔊 Enable sound',
    withoutSound: '✕ Play without sound',
    fullscreen: '⛶ Fullscreen',
    fullscreenTitle: 'Fullscreen (F11, Esc to leave)',
    restart: '↻ Restart',
    restartTitle: 'Restart the game (F12)',
    touch: '🎮 Touch',
    touchTitle: 'Show / hide the touch controls (d-pad, FIRE = Space, RET = Enter)',
    sides: '⇄ Sides',
    sidesTitle: 'Swap sides: pad right, buttons left',
    mute: '🔇 Mute',
    unmute: '🔊 Unmute',
    muteTitle: 'Mute / unmute the emulator',
    keysTips: 'Keys & tips',
    tips: [
      'Click the screen to give it keyboard focus. Sharp specials: GRAPH = Caps Lock, ALPHA = <code>\\</code>, INST = Insert, DEL = Backspace.',
      'The emulator runs in kiosk mode: every key goes to the MZ except <kbd>F11</kbd> (zoom: fullscreen on/off, Esc also leaves it) and <kbd>F12</kbd> (restart the game) — same as the ⛶ Fullscreen and ↻ Restart buttons.',
      'Phones/tablets: 🎮 Touch shows an on-screen pad (cursor keys, diagonals included), FIRE (Space) and RET (Enter) — enough for most games. Turn the phone sideways and use ⛶ Fullscreen.',
      'Everything runs locally in your browser; nothing is uploaded.',
    ],
    creditHtml:
      'Emulation by <a href="https://github.com/michalhucik/mz800emu" rel="noopener">mz800emu</a> (GPL) compiled to WebAssembly — <a href="/play/emu/README.md">build notes &amp; source</a>.',
    pace: (pct: number) =>
      `⚠ Emulation is running at ${pct}% speed — your machine or browser is throttling it. Close other windows/apps, plug in the charger, or disable the browser's efficiency mode for this site.`,
    downloading: 'downloading tape image…',
    loadingEmulator: 'loading emulator…',
    fetchFailed: (file: string, status: number) => `could not fetch ${file} (${status})`,
    scriptFailed: 'failed to load the emulator script',
    aborted: (what: string) => `emulator aborted: ${what}`,
  },
  about: {
    title: 'About',
    h1: 'About this catalog',
    introHtml:
      'This site catalogs software for the Sharp MZ-700 and MZ-800 home computers: one page per title with metadata, screenshots and the original <code>.mzf</code> tape image. The goal is preservation — keeping decades-old cassette software available for emulators and real hardware.',
    cardHtml: (cardHref: string) =>
      `The same data feeds the <a href="${cardHref}">MZPico</a> storage card, which reads <a href="/manifest.json"><code>manifest.json</code></a> to browse and load titles directly on an MZ-800.`,
    contributingH2: 'Contributing',
    contributingHtml: (repo: string) =>
      `The catalog lives in the <a href="${repo}" rel="noopener">mz-catalog repository</a>. Each title is a folder containing <code>meta.yaml</code>, the MZF file(s) and screenshots. Additions and corrections are welcome as pull requests — the README describes the format, and continuous integration validates every entry against the schema.`,
    takedownH2: 'Takedown requests',
    takedownHtml: (repo: string) =>
      `Files are offered for archival and educational use. If you hold rights to a title listed here and want it removed or credited differently, please <a href="${repo}/issues/new" rel="noopener">open an issue</a> or contact the maintainers through the repository. Verified requests are handled promptly.`,
  },
  card: {
    title: 'The MZPico Card',
    description:
      'MZPico — an open-hardware Raspberry Pi Pico storage card for the Sharp MZ-800: instant MZF loading, floppy / Quick Disk / RAM disk emulation, I2S sound and WiFi cloud storage.',
    h1: 'The MZPico card',
    leadHtml: (machineHref: string) =>
      `An open-hardware storage system for the <a href="${machineHref}">Sharp MZ-800</a>, powered by a Raspberry&nbsp;Pi&nbsp;Pico. No cassette tapes, no original floppy or Quick Disk drives — a Pico, a small PCB, a few solder joints, and the machine loads anything in seconds.`,
    photoAlt: 'MZPico boards',
    photoCaption: 'The MZPico family — Frugal and Deluxe boards.',
    whatItDoesH2: 'What it does',
    features: [
      '<b>MZF program loader</b> — loads <code>.mzf</code> tape images straight into the MZ-800. Instant, no audio cassette involved.',
      '<b>Floppy disk emulator</b> — mounts <code>.dsk</code> images and emulates a floppy drive.',
      '<b>Quick Disk emulator</b> — <code>.mzq</code> images, or the on-the-fly mode where a plain directory behaves as a Quick Disk.',
      '<b>RAM disk emulator</b> — SRAM boot disk, paged RAM disk and PicoRD, with instant system boot via SRAM emulation.',
      '<b>Sound over I2S</b> <span class="meta">(Deluxe board)</span> — both MZ-800 sound sources rendered to an on-board I2S DAC: the SN76489 PSG with stereo panning and the 8253 beeper.',
      '<b>WiFi cloud storage</b> <span class="meta">(Pico&nbsp;W)</span> — the card browses <em>this catalog</em> over WiFi as a <code>cloud:/</code> device. Every title on this site, loadable on real hardware without touching a computer.',
      '<b>Highly configurable</b> — one firmware for all boards, an INI-style config file, user-defined I/O ports, multiple instances of any virtual device.',
    ],
    onMachineH2: 'On the machine',
    menuAlt: 'MZPico boot menu on the MZ-800',
    menuCaption: 'Customizable boot menu with favorite programs.',
    explorerAlt: 'MZPico file explorer on the MZ-800',
    explorerCaption: 'File explorer with directory trees and fast search.',
    boardsH2: 'Two boards',
    frugalAlt: 'MZPico Frugal board',
    frugalHtml: (href: string) =>
      `<b>Frugal board</b> — the simplest option: a Pico soldered directly to a very small PCB. Internal flash for storage, optional microSD socket, no level shifters — solder &amp; go. Works with the original Pico (2&nbsp;MB) and 16&nbsp;MB “purple” clones. <a href="${href}" rel="noopener">KiCad design →</a>`,
    deluxeAlt: 'MZPico Deluxe board inserted in an MZ-800',
    deluxeHtml: (href: string) =>
      `<b>Deluxe board</b> — the full-featured build: level shifters for guaranteed 5&nbsp;V safety, microSD slot, I2S sound card, fits the MZ-800 upper slot rails, and takes a Pico&nbsp;W for WiFi and cloud storage. <a href="${href}" rel="noopener">KiCad design →</a>`,
    startedH2: 'Getting started',
    steps: [
      'Build a board from the open KiCad designs (basic soldering skills are enough), or start with just a Pico on a Frugal PCB.',
      'Download the firmware <code>.uf2</code> for your board from the <a href="{releases}" rel="noopener">releases page</a>, hold <kbd>BOOTSEL</kbd>, and copy it onto the Pico\'s USB drive.',
      'Upload MZ-800 software over USB mass storage — or <a href="{catalog}">grab it from this catalog</a> — insert the card, switch the machine on. Done.',
    ],
    docsHtml: (gh: string) =>
      `Full documentation, configuration reference and build notes live in the <a href="${gh}/MZPico-firmware" rel="noopener">MZPico-firmware</a> repository. Hardware designs are working; firmware is actively developed. Boards are licensed <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noopener">CC&nbsp;BY-NC-SA&nbsp;4.0</a>, the firmware and this catalog are on <a href="${gh}" rel="noopener">GitHub</a>.`,
  },
};

// Widened on purpose: the other dictionaries must match the shape, not the
// exact strings. Key parity is enforced at build time in ./index.ts.
export type Ui = typeof en;
