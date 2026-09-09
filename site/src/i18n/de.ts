import type { Ui } from './en';

export const de: Ui = {
  meta: {
    siteName: 'Sharp-MZ-Softwarekatalog',
    homeTitle: 'Sharp-MZ-Softwarekatalog — MZ-700 / MZ-800',
    defaultDescription:
      'Softwarekatalog und Archiv für die Heimcomputer Sharp MZ-700 und MZ-800.',
  },
  langName: { en: 'English', cs: 'Čeština', de: 'Deutsch', ja: '日本語' },
  langSwitchLabel: 'Sprache',
  nav: { card: 'Die Karte', archive: 'Archiv', titles: 'Titel', machines: 'Computer', about: 'Über', github: 'GitHub' },
  footer: {
    blurb:
      'Ein Archivprojekt für Software der Sharp-MZ-Reihe. Die Dateien dienen der Archivierung und Emulation.',
    rightsHtml: (aboutHref: string) =>
      `Rechteinhaber? Siehe <a href="${aboutHref}#takedown">Löschanfragen</a>. Maschinenlesbarer Index: <a href="/manifest.json"><code>manifest.json</code></a>.`,
  },
  home: {
    h1: 'Sharp-MZ-Softwarekatalog',
    introHtml: (cardHref: string) =>
      `Bewahrte Software für Sharp MZ-700 und MZ-800 — originale <code>.mzf</code>-Kassettenabbilder mit Screenshots und Metadaten. Jeden Titel direkt im Browser spielen, für einen Emulator herunterladen oder per WLAN mit der <a href="${cardHref}">MZPico-Karte</a> auf echte Hardware laden, einer offenen Raspberry&nbsp;Pi&nbsp;Pico-Erweiterung für den MZ-800.`,
    searchPlaceholder: 'Titel, Herausgeber, Beschreibungen durchsuchen…',
    allMachines: 'Alle Computer',
    allGenres: 'Alle Genres',
    filterByMachine: 'Nach Computer filtern',
    filterByGenre: 'Nach Genre filtern',
    noMatch: 'Keine Titel passen zu den gewählten Filtern.',
    noScreenshot: 'kein Screenshot',
    playAria: (title: string) => `${title} im Browser spielen`,
    archiveTeaser: (n: number) => `Dazu ${n} weitere Titel im vollständigen Archiv — alles Bewahrte, kuratiert oder nicht.`,
  },
  archive: {
    h1: 'Das vollständige Archiv',
    lead: (n: number) =>
      `Alle ${n} hier bewahrten Titel, kuratiert oder nicht. Die vorgestellten haben geschriebene Seiten; beim Rest steht, was der Kassettenkopf selbst sagt, dazu Screenshots, soweit vorhanden. Korrekturen und Ergänzungen sind willkommen.`,
    filterName: 'Nach Name, Herausgeber filtern…',
    sort: 'Sortieren nach',
    sortName: 'Name',
    sortPlays: 'Meistgespielt',
    sortRating: 'Bestbewertet',
    sortYear: 'Jahr',
    withShots: 'Mit Screenshot',
    curatedOnly: 'Nur kuratierte',
    curated: 'kuratiert',
    showing: (shown: string | number, total: string | number) => `${shown} von ${total}`,
    none: 'Kein Titel passt zu den Filtern.',
    unknown: '—',
  },
  machines: {
    h1: 'Computer',
    lead: 'Die Heimcomputer der Sharp-MZ-Reihe, die dieser Katalog abdeckt.',
    titlesCount: (n: number) => `${n} Titel`,
    specs: 'Technische Daten',
    inCatalog: (n: number) => `${n} Titel im Katalog`,
    none: 'Noch keine — Beiträge willkommen.',
    overviewDescription: (name: string) => `${name} — Überblick zum Computer und Softwarekatalog.`,
  },
  machineInfo: {
    'mz-700': {
      intro:
        'Nachfolger der MZ-80K-Reihe und einer der beliebtesten Sharp-Heimcomputer in Europa. ' +
        'Eine „saubere Maschine“: Sie startet in ein Monitor-ROM und lädt ihr BASIC (oder ein beliebiges anderes System) von Kassette. ' +
        'Die Anzeige ist zeichenbasiert — Spiele erzeugen mit dem reichhaltigen eingebauten Zeichensatz erstaunliche Pseudografik.',
      specs: [
        ['Prozessor', 'Z80A @ 3,5 MHz'],
        ['Speicher', '64 KB'],
        ['Anzeige', '40×25 Text, 8 Farben je Zeichen (Vorder-/Hintergrund), kein Bitmap-Modus'],
        ['Ton', 'einkanaliger Piepser, getrieben von einem 8253-Timer'],
        ['Speichermedium', 'Kassette (1200 Baud); die Modelle MZ-721/731 haben einen eingebauten Rekorder'],
        ['Varianten', 'MZ-711 (Basis), MZ-721 (mit Rekorder), MZ-731 (Rekorder + Farbplotter)'],
      ] as [string, string][],
      softwareNote: 'MZ-700-Titel laufen auch auf dem MZ-800 in dessen MZ-700-Kompatibilitätsmodus.',
    },
    'mz-800': {
      intro:
        'Der europäische Nachfolger des MZ-700 bringt echte Bitmap-Grafik und einen programmierbaren Soundgenerator ' +
        'und behält dabei einen MZ-700-Kompatibilitätsmodus. Besonders beliebt war er in der Tschechoslowakei und in Deutschland, ' +
        'mit einer lebendigen Szene, die ZX-Spectrum-Titel auf ihn umsetzte. Die Speicherkarte MZPico ist für diesen Rechner gedacht.',
      specs: [
        ['Prozessor', 'Z80A @ 3,5 MHz'],
        ['Speicher', '64 KB'],
        ['Bildspeicher', '16 KB, erweiterbar auf 32 KB'],
        ['Anzeige', '320×200 in 4 Farben oder 640×200 in 2 (Palette mit 16 Farben); mit Speichererweiterung 16 / 4 Farben'],
        ['Ton', 'PSG SN76489 — 3 Tonkanäle + Rauschen'],
        ['Modi', 'nativer MZ-800-Modus und MZ-700-Kompatibilitätsmodus (beim Start gewählt)'],
        ['Speichermedium', 'Kassette (beim MZ-821 eingebaut); optional Quick Disk oder Diskettencontroller'],
      ] as [string, string][],
      softwareNote:
        'MZ-800-Software teilt sich in Titel im nativen Modus und im MZ-700-Modus; jeder Katalogeintrag hält fest, welchen er nutzt.',
    },
  },
  title: {
    play: '▶ Im Browser spielen',
    playShort: '▶ Spielen',
    download: '⬇ .mzf herunterladen',
    downloadShort: '⬇ .mzf',
    tapeAudio: '♪ Kassettenton',
    aboutGame: 'Über das Spiel',
    controls: 'Steuerung',
    files: 'Dateien',
    techDetails: 'Technische Details — Kassettenkopf, Adressen, Prüfsummen',
    th: {
      file: 'Datei',
      kind: 'Art',
      tapeName: 'Name auf Kassette',
      type: 'Typ',
      load: 'Laden',
      exec: 'Start',
      bodySize: 'Datenlänge',
      fileSize: 'Dateigröße',
      crc: 'CRC-32',
    },
    kinds: { standard: 'Standard', turbo: 'Turbo-Lader', 'alt-dump': 'Alternativer Dump' },
    modeNative: 'nativer MZ-800-Modus',
    mode700: 'MZ-700-Kompatibilitätsmodus',
    modeTitle: 'MZ-800-Betriebsmodus',
    languageTitle: 'Sprache',
    notCurated:
      'Diesen Eintrag hat noch niemand ausformuliert. Was folgt, stammt aus dem Kassettenabbild selbst; wer das Spiel, sein Jahr oder seinen Autor kennt, möge sich melden.',
    plays: 'Starts',
    rating: 'Bewertung',
    rate: 'Bewerten',
    votes: (n: number) => `${n} ${n === 1 ? 'Stimme' : 'Stimmen'}`,
    unrated: 'Noch nicht bewertet',
    rateThanks: 'Danke!',
    starLabel: (n: number) => `${n} von 5`,
    screenshotAlt: (title: string, i: number) => `${title} — Screenshot ${i}`,
    summary: (title: string, machine: string, genres: string, year?: number) =>
      `${title} — ${machine} ${genres}${year ? ` (${year})` : ''}. Das .mzf-Kassettenabbild herunterladen.`,
  },
  tape: {
    hintHtml:
      'Machen Sie aus Handy oder Notebook einen Sharp-Datenrekorder: Kopfhörerausgang mit der Kassetteneingangsbuchse (read) des MZ verbinden, Lautstärke auf Maximum, hier auf Wiedergabe drücken und am Rechner <code>L</code> + CR (Monitor) oder <code>C</code> im Startmenü eingeben. Oder das WAV für später herunterladen.',
    layout: 'Format',
    layoutFast: 'schnell (kurzer Vorspann)',
    layoutAuthentic: 'originalgetreu (mit Wiederholungskopien)',
    invert: 'Polarität umkehren',
    play: '▶ Kassettenton abspielen',
    downloadWav: '⬇ .wav herunterladen',
    generating: 'wird erzeugt…',
    ready: (length: string) =>
      `Kassette ${length} — mit 100 % Lautstärke in den Kassetteneingang des MZ abspielen`,
    downloadFailed: (status: number) => `Download fehlgeschlagen (${status})`,
  },
  play: {
    headline: (title: string) => `${title} — online spielen`,
    pageDescription: (title: string) => `${title} im Browser mit dem Emulator mz800emu ausführen.`,
    back: '← zurück zur Titelseite',
    start: (title: string) => `▶ ${title} starten`,
    startHint:
      'Lädt den MZ-800-Emulator (~7 MB) und startet das Kassettenabbild. Für Ton genügt ein Klick — das war es.',
    tapToPlay: '▶ Zum Spielen tippen',
    tapHint: 'Vollbild, Querformat, Ton an.',
    enableSound: '🔊 Ton einschalten',
    withoutSound: '✕ Ohne Ton spielen',
    fullscreen: '⛶ Vollbild',
    fullscreenTitle: 'Vollbild (F11, Esc zum Verlassen)',
    restart: '↻ Neustart',
    restartTitle: 'Spiel neu starten (F12)',
    touch: '🎮 Touch',
    touchTitle: 'Touch-Steuerung ein-/ausblenden (Steuerkreuz, FIRE = Leertaste, RET = Enter)',
    sides: '⇄ Seiten',
    sidesTitle: 'Seiten tauschen: Steuerkreuz rechts, Tasten links',
    mute: '🔇 Stumm',
    unmute: '🔊 Ton an',
    muteTitle: 'Emulator stumm schalten / Ton einschalten',
    keysTips: 'Tasten & Tipps',
    tips: [
      'Klicken Sie auf den Bildschirm, um ihm die Tastatur zu geben. Sharp-Sondertasten: GRAPH = Feststelltaste, ALPHA = <code>\\</code>, INST = Einfg, DEL = Rücktaste.',
      'Der Emulator läuft im Kiosk-Modus: alle Tasten gehen an den MZ, außer <kbd>F11</kbd> (Vollbild an/aus, Esc verlässt es ebenfalls) und <kbd>F12</kbd> (Spiel neu starten) — dasselbe tun die Schaltflächen ⛶ Vollbild und ↻ Neustart.',
      'Handy und Tablet: 🎮 Touch zeigt ein Steuerkreuz auf dem Bildschirm (Cursortasten samt Diagonalen), FIRE (Leertaste) und RET (Enter) — für die meisten Spiele genug. Handy quer drehen und ⛶ Vollbild nutzen.',
      'Alles läuft lokal in Ihrem Browser; nichts wird hochgeladen.',
    ],
    creditHtml:
      'Emulation durch <a href="https://github.com/michalhucik/mz800emu" rel="noopener">mz800emu</a> (GPL), nach WebAssembly übersetzt — <a href="/play/emu/README.md">Build-Hinweise &amp; Quelltext</a>.',
    pace: (pct: number) =>
      `⚠ Die Emulation läuft mit ${pct} % Geschwindigkeit — Ihr Rechner oder Browser bremst sie aus. Schließen Sie andere Fenster und Apps, schließen Sie das Netzteil an, oder deaktivieren Sie den Energiesparmodus des Browsers für diese Seite.`,
    downloading: 'Kassettenabbild wird geladen…',
    loadingEmulator: 'Emulator wird geladen…',
    fetchFailed: (file: string, status: number) => `${file} konnte nicht geladen werden (${status})`,
    scriptFailed: 'Das Emulator-Skript konnte nicht geladen werden',
    aborted: (what: string) => `Emulator abgebrochen: ${what}`,
  },
  about: {
    title: 'Über',
    h1: 'Über diesen Katalog',
    introHtml:
      'Diese Seite katalogisiert Software für die Heimcomputer Sharp MZ-700 und MZ-800: eine Seite je Titel, mit Metadaten, Screenshots und dem originalen <code>.mzf</code>-Kassettenabbild. Ziel ist die Bewahrung — jahrzehntealte Kassettensoftware für Emulatoren und echte Hardware verfügbar zu halten.',
    cardHtml: (cardHref: string) =>
      `Dieselben Daten versorgen auch die Speicherkarte <a href="${cardHref}">MZPico</a>, die über <a href="/manifest.json"><code>manifest.json</code></a> den Katalog durchsucht und Titel direkt auf einem MZ-800 lädt.`,
    contributingH2: 'Mitmachen',
    contributingHtml: (repo: string) =>
      `Der Katalog liegt im <a href="${repo}" rel="noopener">Repository mz-catalog</a>. Jeder Titel ist ein Ordner mit <code>meta.yaml</code>, den MZF-Dateien und Screenshots. Ergänzungen und Korrekturen sind als Pull Request willkommen — die README beschreibt das Format, und die Continuous Integration prüft jeden Eintrag gegen das Schema.`,
    takedownH2: 'Löschanfragen',
    takedownHtml: (repo: string) =>
      `Die Dateien werden zu Archiv- und Bildungszwecken angeboten. Wenn Sie Rechte an einem hier gelisteten Titel halten und dessen Entfernung oder eine andere Nennung wünschen, <a href="${repo}/issues/new" rel="noopener">eröffnen Sie bitte ein Issue</a> oder wenden Sie sich über das Repository an die Betreuer. Geprüfte Anfragen werden zügig bearbeitet.`,
  },
  card: {
    title: 'Die MZPico-Karte',
    description:
      'MZPico — eine quelloffene Speicherkarte auf Basis des Raspberry Pi Pico für den Sharp MZ-800: sofortiges MZF-Laden, Emulation von Diskette, Quick Disk und RAM-Disks, I2S-Ton und Cloud-Speicher über WLAN.',
    h1: 'Die MZPico-Karte',
    leadHtml: (machineHref: string) =>
      `Ein quelloffenes Speichersystem für den <a href="${machineHref}">Sharp MZ-800</a>, angetrieben von einem Raspberry&nbsp;Pi&nbsp;Pico. Keine Kassetten, kein originales Disketten- oder Quick-Disk-Laufwerk — ein Pico, eine kleine Platine, ein paar Lötstellen, und der Rechner lädt alles in Sekunden.`,
    photoAlt: 'MZPico-Platinen',
    photoCaption: 'Die MZPico-Familie — Frugal- und Deluxe-Platine.',
    whatItDoesH2: 'Was sie kann',
    features: [
      '<b>MZF-Programmlader</b> — schickt <code>.mzf</code>-Kassettenabbilder direkt in den MZ-800. Sofort, ganz ohne Tonkassette.',
      '<b>Diskettenemulation</b> — bindet <code>.dsk</code>-Abbilder ein und verhält sich wie ein Diskettenlaufwerk.',
      '<b>Quick-Disk-Emulation</b> — <code>.mzq</code>-Abbilder oder der Modus, in dem sich ein gewöhnliches Verzeichnis wie eine Quick Disk verhält.',
      '<b>RAM-Disk-Emulation</b> — SRAM-Boot-Disk, ausgelagerte RAM-Disk und PicoRD, samt sofortigem Systemstart über SRAM-Emulation.',
      '<b>Ton über I2S</b> <span class="meta">(Deluxe-Platine)</span> — beide Klangquellen des MZ-800 landen im I2S-Wandler auf der Platine: der PSG SN76489 mit Stereo-Panorama und der 8253-Piepser.',
      '<b>Cloud-Speicher über WLAN</b> <span class="meta">(Pico&nbsp;W)</span> — die Karte durchsucht <em>diesen Katalog</em> über WLAN als Gerät <code>cloud:/</code>. Jeder Titel dieser Seite lässt sich ohne PC auf echte Hardware laden.',
      '<b>Weitgehend konfigurierbar</b> — eine Firmware für alle Platinen, eine Konfigurationsdatei im INI-Stil, frei wählbare I/O-Ports, mehrere Instanzen jedes virtuellen Geräts.',
    ],
    onMachineH2: 'Am Rechner',
    menuAlt: 'MZPico-Startmenü auf dem MZ-800',
    menuCaption: 'Anpassbares Startmenü mit Lieblingsprogrammen.',
    explorerAlt: 'MZPico-Dateimanager auf dem MZ-800',
    explorerCaption: 'Dateimanager mit Verzeichnisbaum und schneller Suche.',
    boardsH2: 'Zwei Platinen',
    frugalAlt: 'MZPico-Frugal-Platine',
    frugalHtml: (href: string) =>
      `<b>Frugal-Platine</b> — die einfachste Variante: ein Pico direkt auf eine winzige Platine gelötet. Interner Flash als Speicher, optionaler microSD-Steckplatz, keine Pegelwandler — löten und los. Funktioniert mit dem originalen Pico (2&nbsp;MB) und mit 16-MB-„Purple“-Klonen. <a href="${href}" rel="noopener">KiCad-Entwurf →</a>`,
    deluxeAlt: 'MZPico-Deluxe-Platine im MZ-800',
    deluxeHtml: (href: string) =>
      `<b>Deluxe-Platine</b> — die Vollausstattung: Pegelwandler für sichere 5&nbsp;V, microSD-Steckplatz, I2S-Soundteil, passt in die oberen Steckplatzschienen des MZ-800 und nimmt einen Pico&nbsp;W für WLAN und Cloud-Speicher auf. <a href="${href}" rel="noopener">KiCad-Entwurf →</a>`,
    startedH2: 'Erste Schritte',
    steps: [
      'Bauen Sie eine Platine nach den offenen KiCad-Entwürfen (Grundkenntnisse im Löten genügen), oder fangen Sie einfach mit einem Pico auf der Frugal-Platine an.',
      'Laden Sie die Firmware <code>.uf2</code> für Ihre Platine von der <a href="{releases}" rel="noopener">Releases-Seite</a>, halten Sie <kbd>BOOTSEL</kbd> gedrückt und kopieren Sie die Datei auf das USB-Laufwerk des Pico.',
      'Spielen Sie MZ-800-Software per USB-Massenspeicher auf — oder <a href="{catalog}">holen Sie sie aus diesem Katalog</a> —, stecken Sie die Karte ein und schalten Sie den Rechner ein. Fertig.',
    ],
    docsHtml: (gh: string) =>
      `Die vollständige Dokumentation, die Konfigurationsreferenz und Bauhinweise liegen im Repository <a href="${gh}/MZPico-firmware" rel="noopener">MZPico-firmware</a>. Die Hardware-Entwürfe funktionieren, die Firmware wird aktiv weiterentwickelt. Die Platinen stehen unter <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noopener">CC&nbsp;BY-NC-SA&nbsp;4.0</a>, Firmware und dieser Katalog liegen auf <a href="${gh}" rel="noopener">GitHub</a>.`,
  },
};
