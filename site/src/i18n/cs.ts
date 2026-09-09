import type { Ui } from './en';

export const cs: Ui = {
  meta: {
    siteName: 'Katalog softwaru pro Sharp MZ',
    homeTitle: 'Katalog softwaru pro Sharp MZ — MZ-700 / MZ-800',
    defaultDescription:
      'Katalog a archiv softwaru pro počítače Sharp MZ-700 a MZ-800.',
  },
  langName: { en: 'English', cs: 'Čeština', de: 'Deutsch', ja: '日本語' },
  langSwitchLabel: 'Jazyk',
  nav: { card: 'Karta', archive: 'Archiv', titles: 'Pecky', machines: 'Počítače', about: 'O projektu', github: 'GitHub' },
  footer: {
    blurb:
      'Archivační projekt pro software řady Sharp MZ. Soubory slouží k archivaci a emulaci.',
    rightsHtml: (aboutHref: string) =>
      `Držíte k něčemu práva? Podívejte se na <a href="${aboutHref}#takedown">žádosti o stažení</a>. Strojově čitelný index: <a href="/manifest.json"><code>manifest.json</code></a>.`,
  },
  home: {
    h1: 'Pecky pro Sharp MZ',
    introHtml: (cardHref: string) =>
      `Tituly, kterými má smysl na Sharpu MZ-700 a MZ-800 začít, sepsané jeden po druhém — původní páskové obrazy <code>.mzf</code> se snímky obrazovky, ovládáním a příběhem, který k nim patří. Každý si můžete zahrát rovnou v prohlížeči, stáhnout do emulátoru, nebo ho přes WiFi nahrát do skutečného počítače pomocí <a href="${cardHref}">karty MZPico</a>, otevřeného rozšíření pro MZ-800 postaveného na Raspberry&nbsp;Pi&nbsp;Pico.`,
    allMachines: 'Všechny počítače',
    allGenres: 'Všechny žánry',
    filterByMachine: 'Filtrovat podle počítače',
    filterByGenre: 'Filtrovat podle žánru',
    noMatch: 'Zvolenému filtru neodpovídá žádný titul.',
    noScreenshot: 'bez snímku',
    playAria: (title: string) => `Spustit ${title} v prohlížeči`,
    archiveTeaser: 'Všechno ostatní, co tu máme uložené, je v archivu — popsané i nepopsané.',
  },
  archive: {
    h1: 'Celý archiv',
    lead:
      'Všechny tituly, které tu máme uložené. Pecky mají psané stránky; u zbytku je to, co říká hlavička kazety, plus screenshoty, kde je máme. Opravy a doplnění vítáme.',
    filterName: 'Filtrovat podle názvu, vydavatele…',
    sort: 'Řadit podle',
    sortName: 'Názvu',
    sortPlays: 'Nejhranější',
    sortRating: 'Nejlépe hodnocené',
    sortYear: 'Roku',
    filterZx: 'ZX port',
    filterHint: 'Klikáním se přepíná: vše → jen tyhle → bez nich',
    curated: 'featured',
    showing: (shown: string | number, total: string | number) => `${shown} z ${total}`,
    none: 'Filtrům neodpovídá žádný titul.',
    unknown: '—',
  },
  machines: {
    h1: 'Počítače',
    lead: 'Domácí počítače řady Sharp MZ, kterým se katalog věnuje.',
    titlesCount: (n: number) => `${n} ${n === 1 ? 'titul' : n >= 2 && n <= 4 ? 'tituly' : 'titulů'}`,
    specs: 'Technické parametry',
    inCatalog: (n: number) =>
      `${n} ${n === 1 ? 'titul' : n >= 2 && n <= 4 ? 'tituly' : 'titulů'} v katalogu`,
    none: 'Zatím žádný — příspěvky vítány.',
    overviewDescription: (name: string) => `${name} — přehled počítače a katalog softwaru.`,
  },
  machineInfo: {
    'mz-700': {
      intro:
        'Nástupce řady MZ-80K a jeden z nejrozšířenějších domácích počítačů Sharp v Evropě. ' +
        '„Čistý stroj“: nabootuje do monitoru v ROM a BASIC (nebo jakýkoli jiný systém) si nahraje z kazety. ' +
        'Obraz je znakový — hry z bohaté vestavěné znakové sady vytvářejí pozoruhodnou pseudografiku.',
      specs: [
        ['Procesor', 'Z80A @ 3,5 MHz'],
        ['Paměť', '64 kB'],
        ['Obraz', 'text 40×25, 8 barev na znak (popředí/pozadí), bez bitmapového režimu'],
        ['Zvuk', 'jednokanálový pípák řízený časovačem 8253'],
        ['Záznam', 'kazeta (1200 Bd); modely MZ-721/731 mají magnetofon vestavěný'],
        ['Varianty', 'MZ-711 (základ), MZ-721 (s magnetofonem), MZ-731 (magnetofon + barevný plotter)'],
      ] as [string, string][],
      softwareNote: 'Tituly pro MZ-700 běží i na MZ-800 v jeho kompatibilním režimu MZ-700.',
    },
    'mz-800': {
      intro:
        'Evropský nástupce MZ-700 přidává skutečnou bitmapovou grafiku a programovatelný zvukový generátor, ' +
        'a přitom si ponechává kompatibilní režim MZ-700. Obzvlášť populární byl v Československu a Německu, ' +
        'kde vznikla živá scéna převádějící na něj tituly ze ZX Spectra. Úložná karta MZPico míří právě na tento stroj.',
      specs: [
        ['Procesor', 'Z80A @ 3,5 MHz'],
        ['Paměť', '64 kB'],
        ['Videopaměť', '16 kB, rozšiřitelná na 32 kB'],
        ['Obraz', '320×200 ve 4 barvách nebo 640×200 ve 2 (paleta 16 barev); s rozšířenou videopamětí 16 / 4 barvy'],
        ['Zvuk', 'PSG SN76489 — 3 tónové kanály + šum'],
        ['Režimy', 'nativní režim MZ-800 a kompatibilní režim MZ-700 (volí se při startu)'],
        ['Záznam', 'kazeta (u MZ-821 vestavěná); volitelně Quick Disk nebo disketový řadič'],
      ] as [string, string][],
      softwareNote:
        'Software pro MZ-800 se dělí na tituly v nativním režimu a v režimu MZ-700; u každého záznamu v katalogu je uvedeno, který používá.',
    },
  },
  title: {
    play: '▶ Hrát v prohlížeči',
    playShort: '▶ Hrát',
    download: '⬇ Stáhnout .mzf',
    downloadShort: '⬇ .mzf',
    tapeAudio: '♪ Zvuk pásky',
    aboutGame: 'O hře',
    controls: 'Ovládání',
    files: 'Soubory',
    techDetails: 'Technické detaily — hlavička pásky, adresy, kontrolní součty',
    th: {
      file: 'Soubor',
      kind: 'Druh',
      tapeName: 'Název na pásce',
      type: 'Typ',
      load: 'Nahrát',
      exec: 'Start',
      bodySize: 'Velikost těla',
      fileSize: 'Velikost souboru',
      crc: 'CRC-32',
    },
    kinds: { standard: 'Standardní', turbo: 'Turbo nahrávání', 'alt-dump': 'Alternativní dump' },
    modeNative: 'nativní režim MZ-800',
    mode700: 'kompatibilní režim MZ-700',
    modeTitle: 'Provozní režim MZ-800',
    portZx: 'ZX port',
    portTitle: 'Konverze ze ZX Spectra',
    languageTitle: 'Jazyk',
    notCurated:
      'Tenhle záznam zatím nikdo nesepsal. Co je níž, pochází přímo z obrazu kazety; jestli tu hru znáš, víš rok nebo autora, ozvi se.',
    plays: 'Spuštění',
    rating: 'Hodnocení',
    rate: 'Ohodnotit',
    votes: (n: number) => `${n} ${n === 1 ? 'hlas' : n < 5 ? 'hlasy' : 'hlasů'}`,
    unrated: 'Zatím bez hodnocení',
    rateThanks: 'Díky!',
    starLabel: (n: number) => `${n} z 5`,
    screenshotAlt: (title: string, i: number) => `${title} — snímek obrazovky ${i}`,
    summary: (title: string, machine: string, genres: string, year?: number) =>
      `${title} — ${machine} ${genres}${year ? ` (${year})` : ''}. Ke stažení jako páskový obraz .mzf.`,
  },
  tape: {
    hintHtml:
      'Z telefonu nebo notebooku uděláte datovou magnetofonovou jednotku: propojte sluchátkový výstup se vstupem pásky (read) na MZ, dejte hlasitost na maximum, spusťte přehrávání a na počítači napište <code>L</code> + CR (monitor) nebo <code>C</code> v zaváděcí nabídce. Nebo si stáhněte WAV na později.',
    layout: 'Formát',
    layoutFast: 'rychlý (krátká pilotní část)',
    layoutAuthentic: 'věrný (včetně opakovaných kopií)',
    invert: 'obrátit polaritu',
    play: '▶ Přehrát zvuk pásky',
    downloadWav: '⬇ Stáhnout .wav',
    generating: 'generuji…',
    ready: (length: string) => `páska ${length} — přehrávejte na 100 % hlasitosti do vstupu pásky na MZ`,
    downloadFailed: (status: number) => `stažení selhalo (${status})`,
  },
  play: {
    headline: (title: string) => `${title} — hrát online`,
    pageDescription: (title: string) => `Spusťte ${title} v prohlížeči pomocí emulátoru mz800emu.`,
    back: '← zpět na stránku titulu',
    start: (title: string) => `▶ Spustit ${title}`,
    startHint:
      'Načte emulátor MZ-800 (~7 MB) a spustí páskový obraz. Zvuk se zapne kliknutím — a to je vše.',
    tapToPlay: '▶ Ťukněte pro hru',
    tapHint: 'Celá obrazovka, na šířku, se zvukem.',
    enableSound: '🔊 Zapnout zvuk',
    withoutSound: '✕ Hrát bez zvuku',
    fullscreen: '⛶ Celá obrazovka',
    fullscreenTitle: 'Celá obrazovka (F11, Esc pro návrat)',
    restart: '↻ Restart',
    restartTitle: 'Spustit hru znovu (F12)',
    touch: '🎮 Dotyk',
    touchTitle: 'Zobrazit / skrýt dotykové ovládání (kříž, FIRE = mezerník, RET = Enter)',
    sides: '⇄ Strany',
    sidesTitle: 'Prohodit strany: kříž vpravo, tlačítka vlevo',
    mute: '🔇 Ztlumit',
    unmute: '🔊 Zapnout zvuk',
    muteTitle: 'Ztlumit / zapnout zvuk emulátoru',
    keysTips: 'Klávesy a tipy',
    tips: [
      'Kliknutím na obrazovku jí předáte klávesnici. Speciální klávesy Sharpu: GRAPH = Caps Lock, ALPHA = <code>\\</code>, INST = Insert, DEL = Backspace.',
      'Emulátor běží v režimu kiosku: všechny klávesy jdou do MZ kromě <kbd>F11</kbd> (zvětšení: celá obrazovka, Esc ji také opustí) a <kbd>F12</kbd> (restart hry) — totéž dělají tlačítka ⛶ Celá obrazovka a ↻ Restart.',
      'Telefon a tablet: tlačítko 🎮 Dotyk zobrazí kříž (kurzorové šipky včetně diagonál), FIRE (mezerník) a RET (Enter) — pro většinu her to stačí. Otočte telefon na šířku a použijte ⛶ Celou obrazovku.',
      'Vše běží lokálně ve vašem prohlížeči, nic se nikam neodesílá.',
    ],
    creditHtml:
      'Emulaci obstarává <a href="https://github.com/michalhucik/mz800emu" rel="noopener">mz800emu</a> (GPL) přeložený do WebAssembly — <a href="/play/emu/README.md">poznámky k sestavení a zdrojové kódy</a>.',
    pace: (pct: number) =>
      `⚠ Emulace běží na ${pct} % rychlosti — počítač nebo prohlížeč ji brzdí. Zavřete ostatní okna a aplikace, připojte nabíječku, nebo pro tento web vypněte úsporný režim prohlížeče.`,
    downloading: 'stahuji páskový obraz…',
    loadingEmulator: 'načítám emulátor…',
    fetchFailed: (file: string, status: number) => `nepodařilo se stáhnout ${file} (${status})`,
    scriptFailed: 'nepodařilo se načíst skript emulátoru',
    aborted: (what: string) => `emulátor skončil chybou: ${what}`,
  },
  about: {
    title: 'O projektu',
    h1: 'O tomto katalogu',
    introHtml:
      'Tento web katalogizuje software pro domácí počítače Sharp MZ-700 a MZ-800: každý titul má vlastní stránku s popisem, snímky obrazovky a původním páskovým obrazem <code>.mzf</code>. Cílem je archivace — udržet desítky let starý kazetový software dostupný pro emulátory i skutečný hardware.',
    cardHtml: (cardHref: string) =>
      `Stejná data používá i úložná karta <a href="${cardHref}">MZPico</a>, která přes <a href="/manifest.json"><code>manifest.json</code></a> prochází katalog a nahrává tituly rovnou do MZ-800.`,
    contributingH2: 'Jak přispět',
    contributingHtml: (repo: string) =>
      `Katalog žije v <a href="${repo}" rel="noopener">repozitáři mz-catalog</a>. Každý titul je adresář s <code>meta.yaml</code>, soubory MZF a snímky obrazovky. Doplnění i opravy vítám jako pull requesty — formát popisuje README a každý záznam kontroluje proti schématu průběžná integrace.`,
    takedownH2: 'Žádosti o stažení',
    takedownHtml: (repo: string) =>
      `Soubory jsou nabízeny pro archivační a vzdělávací účely. Pokud držíte práva k některému zde uvedenému titulu a přejete si jeho odstranění nebo jiné uvedení autorství, <a href="${repo}/issues/new" rel="noopener">založte prosím issue</a> nebo kontaktujte správce přes repozitář. Ověřené žádosti řeším bez odkladu.`,
  },
  card: {
    title: 'Karta MZPico',
    description:
      'MZPico — otevřená úložná karta pro Sharp MZ-800 postavená na Raspberry Pi Pico: okamžité nahrávání MZF, emulace disketové a Quick Disk mechaniky i RAM disků, zvuk přes I2S a cloudové úložiště přes WiFi.',
    h1: 'Karta MZPico',
    leadHtml: (machineHref: string) =>
      `Otevřený úložný systém pro <a href="${machineHref}">Sharp MZ-800</a> postavený na Raspberry&nbsp;Pi&nbsp;Pico. Žádné kazety, žádná původní disketová ani Quick Disk mechanika — stačí Pico, malá destička, pár spájených pinů a počítač nahraje cokoli během vteřin.`,
    photoAlt: 'Desky MZPico',
    photoCaption: 'Rodina MZPico — desky Frugal a Deluxe.',
    whatItDoesH2: 'Co karta umí',
    features: [
      '<b>Nahrávání programů MZF</b> — pošle páskové obrazy <code>.mzf</code> přímo do MZ-800. Okamžitě, bez zvukové kazety.',
      '<b>Emulace disketové mechaniky</b> — připojí obrazy <code>.dsk</code> a tváří se jako disketová jednotka.',
      '<b>Emulace Quick Disku</b> — obrazy <code>.mzq</code>, nebo režim, ve kterém se jako Quick Disk chová obyčejný adresář.',
      '<b>Emulace RAM disků</b> — SRAM boot disk, stránkovaný RAM disk a PicoRD, včetně okamžitého startu systému přes emulaci SRAM.',
      '<b>Zvuk přes I2S</b> <span class="meta">(deska Deluxe)</span> — oba zvukové zdroje MZ-800 míří do I2S převodníku na desce: PSG SN76489 se stereo panoramou i pípák 8253.',
      '<b>Cloudové úložiště přes WiFi</b> <span class="meta">(Pico&nbsp;W)</span> — karta prochází <em>tento katalog</em> přes WiFi jako zařízení <code>cloud:/</code>. Každý titul z tohoto webu nahrajete do skutečného počítače bez použití PC.',
      '<b>Široké možnosti nastavení</b> — jeden firmware pro všechny desky, konfigurační soubor ve stylu INI, vlastní I/O porty, více instancí libovolného virtuálního zařízení.',
    ],
    onMachineH2: 'Na počítači',
    menuAlt: 'Zaváděcí nabídka MZPico na MZ-800',
    menuCaption: 'Upravitelná zaváděcí nabídka s oblíbenými programy.',
    explorerAlt: 'Správce souborů MZPico na MZ-800',
    explorerCaption: 'Správce souborů se stromem adresářů a rychlým hledáním.',
    boardsH2: 'Dvě desky',
    frugalAlt: 'Deska MZPico Frugal',
    frugalHtml: (href: string) =>
      `<b>Deska Frugal</b> — nejjednodušší varianta: Pico připájené přímo na malinkou destičku. Úložištěm je interní flash, volitelně lze osadit slot na microSD, žádné převodníky úrovní — spájet a jet. Funguje s původním Picem (2&nbsp;MB) i s 16MB „fialovými“ klony. <a href="${href}" rel="noopener">Návrh v KiCadu →</a>`,
    deluxeAlt: 'Deska MZPico Deluxe zasunutá v MZ-800',
    deluxeHtml: (href: string) =>
      `<b>Deska Deluxe</b> — plná výbava: převodníky úrovní pro jistotu při 5&nbsp;V, slot na microSD, zvuková část I2S, sedí do horních lišt slotu MZ-800 a přijme Pico&nbsp;W pro WiFi a cloudové úložiště. <a href="${href}" rel="noopener">Návrh v KiCadu →</a>`,
    startedH2: 'Jak začít',
    steps: [
      'Postavte desku podle otevřených návrhů v KiCadu (stačí základní zkušenost s pájením), nebo začněte jen s Picem na desce Frugal.',
      'Stáhněte firmware <code>.uf2</code> pro svou desku ze <a href="{releases}" rel="noopener">stránky s vydáními</a>, podržte <kbd>BOOTSEL</kbd> a nakopírujte soubor na USB disk Pica.',
      'Software pro MZ-800 nahrajte přes USB jako na flashku — nebo si ho <a href="{catalog}">vezměte z tohoto katalogu</a> — kartu zasuňte, počítač zapněte. Hotovo.',
    ],
    docsHtml: (gh: string) =>
      `Kompletní dokumentace, popis konfigurace a poznámky ke stavbě jsou v repozitáři <a href="${gh}/MZPico-firmware" rel="noopener">MZPico-firmware</a>. Návrhy hardwaru fungují, firmware se aktivně vyvíjí. Desky jsou pod licencí <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noopener">CC&nbsp;BY-NC-SA&nbsp;4.0</a>, firmware i tento katalog najdete na <a href="${gh}" rel="noopener">GitHubu</a>.`,
  },
};
