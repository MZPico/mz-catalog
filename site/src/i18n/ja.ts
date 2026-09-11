import type { Ui } from './en';

export const ja: Ui = {
  meta: {
    siteName: 'シャープ MZ ソフトウェアカタログ',
    homeTitle: 'シャープ MZ ソフトウェアカタログ — MZ-700 / MZ-800',
    defaultDescription:
      'シャープ MZ-700 / MZ-800 用ソフトウェアのカタログと保存アーカイブ。',
  },
  langName: { en: 'English', cs: 'Čeština', de: 'Deutsch', ja: '日本語' },
  langSwitchLabel: '言語',
  nav: { card: 'カード', archive: 'アーカイブ', titles: '名作', machines: '機種', about: 'このサイトについて', github: 'GitHub' },
  footer: {
    privacy: 'プライバシー',
    blurb:
      'シャープ MZ シリーズのソフトウェアを保存するプロジェクトです。ファイルは保存とエミュレーションのために公開しています。',
    rightsHtml: (aboutHref: string) =>
      `権利をお持ちの方は<a href="${aboutHref}#takedown">削除のご依頼</a>をご覧ください。機械可読インデックス: <a href="/manifest.json"><code>manifest.json</code></a>`,
  },
  home: {
    h1: 'シャープ MZ の名作',
    introHtml: (cardHref: string) =>
      `シャープ MZ-700 / MZ-800 でまず遊ぶべき作品を、一本ずつ解説を添えて紹介しています — オリジナルの <code>.mzf</code> テープイメージに、スクリーンショット、操作方法、そして背景となる来歴を添えて。ブラウザーでそのまま遊ぶことも、エミュレーター用にダウンロードすることも、MZ-800 用のオープンな Raspberry&nbsp;Pi&nbsp;Pico 拡張カード <a href="${cardHref}">MZPico</a> を使って Wi-Fi 経由で実機に読み込ませることもできます。`,
    allMachines: 'すべての機種',
    allGenres: 'すべてのジャンル',
    filterByMachine: '機種で絞り込む',
    filterByGenre: 'ジャンルで絞り込む',
    noMatch: '条件に合うタイトルはありません。',
    noScreenshot: 'スクリーンショットなし',
    playAria: (title: string) => `${title} をブラウザーで遊ぶ`,
    archiveTeaser: 'ここに保存されているそれ以外のすべては、アーカイブ全体にあります。解説の有無は問いません。',
  },
  archive: {
    h1: 'アーカイブ全体',
    lead:
      'ここに保存されているすべての作品。名作には解説ページがあり、それ以外はカセットのヘッダが伝える情報と、手元にあるスクリーンショットを載せています。訂正や追加の情報を歓迎します。',
    filterName: 'タイトル・発売元・説明を検索…',
    sort: '並び替え',
    sortName: '名前',
    sortPlays: 'よく遊ばれている順',
    sortRating: '評価の高い順',
    sortYear: '年',
    filterZx: 'ZX port',
    filterHint: 'クリックで切り替え: すべて → これだけ → これを除く',
    curated: 'featured',
    showing: (shown: string | number, total: string | number) => `${total} 本中 ${shown} 本`,
    none: '条件に合う作品はありません。',
    unknown: '—',
  },
  machines: {
    h1: '機種',
    lead: 'このカタログが対象とするシャープ MZ シリーズのホームコンピューター。',
    specs: '仕様',
    inCatalog: 'カタログから',
    none: 'まだありません — ご協力を歓迎します。',
    overviewDescription: (name: string) => `${name} — 機種の概要とソフトウェアカタログ。`,
  },
  machineInfo: {
    'mz-700': {
      intro:
        'MZ-80K シリーズの後継機で、ヨーロッパでもっとも普及したシャープのホームコンピューターのひとつです。' +
        'いわゆる「クリーンマシン」で、起動するとモニター ROM が立ち上がり、BASIC（ほかのシステムでも）はカセットから読み込みます。' +
        '画面はキャラクター単位で、ゲームは豊富な内蔵キャラクターセットを使って見事な疑似グラフィックスを描きました。',
      specs: [
        ['CPU', 'Z80A @ 3.5 MHz'],
        ['メモリー', '64 KB'],
        ['画面', '40×25 文字、1 文字あたり 8 色（前景／背景）、ビットマップモードなし'],
        ['音声', '8253 タイマーで駆動する 1 チャンネルのビープ音'],
        ['記録媒体', 'カセット（1200 ボー）。MZ-721 / 731 はレコーダー内蔵'],
        ['機種構成', 'MZ-711（基本）、MZ-721（レコーダー付き）、MZ-731（レコーダー＋カラープロッター）'],
      ] as [string, string][],
      softwareNote: 'MZ-700 用のタイトルは、MZ-800 の MZ-700 互換モードでも動作します。',
    },
    'mz-800': {
      intro:
        'MZ-700 のヨーロッパ向け後継機で、MZ-700 互換モードを残しつつ、本格的なビットマップグラフィックスと' +
        'プログラマブルサウンドジェネレーターを搭載しました。とくにチェコスロバキアとドイツで人気を集め、' +
        'ZX Spectrum のタイトルを移植する活発なシーンが生まれました。ストレージカード MZPico はこの機種向けです。',
      specs: [
        ['CPU', 'Z80A @ 3.5 MHz'],
        ['メモリー', '64 KB'],
        ['VRAM', '16 KB（32 KB まで拡張可能）'],
        ['画面', '320×200 で 4 色、または 640×200 で 2 色（16 色パレット）。VRAM 拡張時は 16 / 4 色'],
        ['音声', 'PSG SN76489 — 3 音＋ノイズ'],
        ['モード', 'MZ-800 ネイティブモードと MZ-700 互換モード（起動時に選択）'],
        ['記録媒体', 'カセット（MZ-821 は内蔵）。オプションでクイックディスクやフロッピーインターフェース'],
      ] as [string, string][],
      softwareNote:
        'MZ-800 のソフトはネイティブモードのものと MZ-700 モードのものに分かれます。どちらを使うかは各カタログ項目に記載しています。',
    },
  },
  title: {
    play: '▶ ブラウザーで遊ぶ',
    continue: '▶ 続きから',
    continueSaved: '{ago}に保存',
    playShort: '▶ 遊ぶ',
    download: '⬇ .mzf をダウンロード',
    downloadShort: '⬇ .mzf',
    tapeAudio: '♪ テープ音声',
    aboutGame: 'ゲームについて',
    controls: '操作方法',
    files: 'ファイル',
    techDetails: '技術情報 — テープヘッダー、アドレス、チェックサム',
    th: {
      file: 'ファイル',
      kind: '種別',
      tapeName: 'テープ上の名前',
      type: 'タイプ',
      load: 'ロード',
      exec: '実行',
      bodySize: '本体長',
      fileSize: 'ファイルサイズ',
      crc: 'CRC-32',
    },
    kinds: { standard: '標準', turbo: 'ターボローダー', 'alt-dump': '別ダンプ' },
    modeNative: 'MZ-800 ネイティブモード',
    mode700: 'MZ-700 互換モード',
    modeTitle: 'MZ-800 の動作モード',
    portZx: 'ZX port',
    original: 'オリジナル',
    portTitle: 'ZX Spectrum 版からの移植',
    languageTitle: '言語',
    notCurated:
      'この項目はまだ誰も書き起こしていません。以下はカセットイメージそのものから読み取った情報です。作品や制作年、作者をご存じでしたらお知らせください。',
    plays: 'プレイ回数',
    rating: '評価',
    rate: '評価する',
    votes: (n: number) => `${n} 票`,
    unrated: 'まだ評価がありません',
    rateThanks: 'ありがとうございます',
    starLabel: (n: number) => `5 段階中 ${n}`,
    screenshotAlt: (title: string, i: number) => `${title} のスクリーンショット ${i}`,
    summary: (title: string, machine: string, genres: string, year?: number) =>
      `${title} — ${machine} ${genres}${year ? `（${year}年）` : ''}。.mzf テープイメージをダウンロードできます。`,
  },
  tape: {
    hintHtml:
      'スマートフォンやノートパソコンをデータレコーダーとして使えます。ヘッドホン出力を MZ のテープ入力（read）端子につなぎ、音量を最大にして、ここで再生を押し、本体では <code>L</code> + CR（モニター）か起動メニューの <code>C</code> を入力してください。あとで使うために WAV をダウンロードすることもできます。',
    layout: '形式',
    layoutFast: '高速（短いパイロット）',
    layoutAuthentic: '忠実（再送コピーあり）',
    invert: '極性を反転',
    play: '▶ テープ音声を再生',
    downloadWav: '⬇ .wav をダウンロード',
    generating: '生成中…',
    ready: (length: string) => `テープ ${length} — 音量 100 % で MZ のテープ入力へ再生してください`,
    downloadFailed: (status: number) => `ダウンロードに失敗しました（${status}）`,
  },
  play: {
    headline: (title: string) => `${title} — オンラインで遊ぶ`,
    pageDescription: (title: string) => `エミュレーター mz800emu で ${title} をブラウザーで動かします。`,
    back: '← タイトルのページに戻る',
    start: (title: string) => `▶ ${title} を開始`,
    startHint:
      'MZ-800 エミュレーター（約 7 MB）を読み込み、テープイメージを実行します。音を出すにはクリックが一度必要です。',
    tapToPlay: '▶ タップして開始',
    tapHint: '全画面・横向き・音あり。',
    enableSound: '🔊 音を出す',
    withoutSound: '✕ 音なしで遊ぶ',
    fullscreen: '⛶ 全画面',
    fullscreenTitle: '全画面（F11、Esc で解除）',
    restart: '↻ 再起動',
    restartTitle: 'ゲームをやり直す（F12）',
    touch: '🎮 タッチ',
    touchTitle: 'タッチ操作の表示／非表示（十字キー、FIRE = スペース、RET = Enter）',
    sides: '⇄ 左右入替',
    sidesTitle: '左右を入れ替える：十字キーを右、ボタンを左に',
    mute: '🔇 消音',
    unmute: '🔊 消音解除',
    muteTitle: 'エミュレーターの消音／解除',
    keysTips: 'キーとヒント',
    saves: {
      save: '💾 保存',
      saveTitle: 'このブラウザーに現在の状態を保存',
      load: '⤴ 読み込み',
      loadTitle: '保存した状態に戻る',
      panel: '保存した状態',
      none: 'このゲームの保存データはまだありません。',
      savedAt: '{ago}に保存。',
      saving: '保存中…',
      saved: '保存しました',
      loaded: '保存した状態を復元しました',
      failed: '保存できませんでした',
      loadFailed: 'この保存データはこのバージョンのエミュレーターまたはテープに合いません — 最初から始めます',
      auto: 'プレイ中に自動保存する（2 分ごと、およびページを離れるとき）',
      export: '⬇ .mzs をダウンロード',
      import: '⬆ .mzs を開く…',
      remove: '✕ 削除',
      note: '保存データはこの端末のこのブラウザーにだけ残り、どこにも送信されません。Safari は一週間アクセスがないと消去することがあるので、残したい状態は .mzs としてダウンロードしてください。同じファイルはデスクトップ版 mz800emu でも開けます。',
    },
    gamepad: '🎮 コントローラー: {map}',
    tips: [
      'ゲームコントローラー（Xbox、PlayStation、8BitDo など）も使えます。接続するにはボタンを一度押してください。十字キーまたは左スティック = 矢印キー、A/B/X/Y = ゲームのボタン、Start と肩ボタン = その他のキー。正確な割り当ては画面の下の行に表示されます。',
      '画面をクリックするとキーボード入力がそちらに移ります。シャープ独自キー: GRAPH = Caps Lock、ALPHA = <code>\\</code>、INST = Insert、DEL = Backspace。',
      'エミュレーターはキオスクモードで動作し、<kbd>F11</kbd>（全画面の切り替え。Esc でも解除）と <kbd>F12</kbd>（ゲームのやり直し）以外のキーはすべて MZ に渡ります — ⛶ 全画面と ↻ 再起動のボタンと同じ動作です。',
      'スマートフォン・タブレット: 🎮 タッチで画面上に十字キー（斜め入力も可）と FIRE（スペース）、RET（Enter）が出ます。多くのゲームはこれで遊べます。端末を横向きにして ⛶ 全画面をお使いください。',
      'すべてお使いのブラウザー内で動作し、どこにも送信されません。',
    ],
    creditHtml:
      'エミュレーションは <a href="https://github.com/michalhucik/mz800emu" rel="noopener">mz800emu</a>（GPL）を WebAssembly に変換したものです — <a href="/play/emu/README.md">ビルド手順とソース</a>。',
    pace: (pct: number) =>
      `⚠ エミュレーションが ${pct} % の速度で動作しています。端末かブラウザーが処理を抑えています。ほかのウィンドウやアプリを閉じる、電源につなぐ、またはこのサイトでブラウザーの省電力モードを無効にしてみてください。`,
    downloading: 'テープイメージを取得中…',
    loadingEmulator: 'エミュレーターを読み込み中…',
    fetchFailed: (file: string, status: number) => `${file} を取得できませんでした（${status}）`,
    scriptFailed: 'エミュレーターのスクリプトを読み込めませんでした',
    aborted: (what: string) => `エミュレーターが停止しました: ${what}`,
  },
  about: {
    title: 'このサイトについて',
    h1: 'このカタログについて',
    introHtml:
      'このサイトはシャープ MZ-700 / MZ-800 用のソフトウェアを収録しています。タイトルごとに 1 ページを設け、書誌情報、スクリーンショット、オリジナルの <code>.mzf</code> テープイメージを掲載しています。目的は保存です — 数十年前のカセットソフトを、エミュレーターでも実機でも使える状態で残すことです。',
    cardHtml: (cardHref: string) =>
      `同じデータはストレージカード <a href="${cardHref}">MZPico</a> でも使われます。カードは <a href="/manifest.json"><code>manifest.json</code></a> を読み取り、MZ-800 上で直接タイトルを一覧・読み込みできます。`,
    contributingH2: '協力する',
    contributingHtml: (repo: string) =>
      `カタログは <a href="${repo}" rel="noopener">mz-catalog リポジトリ</a>にあります。各タイトルは <code>meta.yaml</code>、MZF ファイル、スクリーンショットを収めたフォルダーです。追加や訂正はプルリクエストで歓迎します — 形式は README に、各項目の検証は継続的インテグレーションがスキーマに沿って行います。`,
    takedownH2: '削除のご依頼',
    takedownHtml: (repo: string) =>
      `ファイルは保存および教育目的で公開しています。掲載タイトルの権利をお持ちで、削除やクレジットの変更をご希望の場合は、<a href="${repo}/issues/new" rel="noopener">issue を作成</a>いただくか、リポジトリ経由で管理者までご連絡ください。確認のとれたご依頼には速やかに対応します。`,
  },
  privacy: {
    title: 'プライバシー',
    description: `mzpico.com が訪問者について何を、どこに、どれだけの期間、なぜ保存するか。Cookie もトラッキングもありません。`,
    h1: 'プライバシー',
    updated: '最終更新',
    sections: [
      {
        h2: '要点',
        html: `Cookie、トラッキング、広告は使っていません。他社のサーバーから読み込むものもありません。アクセスは匿名の日別合計としてのみ数えます。必要な機能を使ったときだけ、いくつかの情報をあなた自身のブラウザーに保存します。サーバーに残すのはソルト付きハッシュだけで、IP アドレスや識別子をそのまま保存することはありません。`,
      },
      {
        h2: '運営者',
        html: `mzpico.com は Martin Matyáš が運営する個人の非営利プロジェクトで、ここに記載したデータの管理者です。連絡先: <a href="mailto:privacy@mzpico.com">privacy@mzpico.com</a>`,
      },
      {
        h2: 'ブラウザーに保存するもの',
        html: `<ul><li><b>タッチ操作の配置</b>（<code>mz-touch-swap</code>）— スマートフォンで画面上の操作ボタンを入れ替えた場合のみ。</li><li><b>評価用 ID</b>（<code>mz-voter</code>）— 初めてタイトルを評価したときに作られる乱数。あとで評価を変更でき、一人が一票として数えられるようにするためのもので、あなたについての情報は含みません。</li><li><b>保存データ</b>（IndexedDB <code>mzpico</code>）— 保存ボタンを押したとき、自動保存をオンにしたとき、.mzs ファイルを開いたときのみ。エミュレートしているマシンの状態と画面の画像です。ゲームのページで削除できます。自動保存の設定自体は <code>mz-autosave</code> に保存されます。</li></ul>これらはあなたの端末にだけ残り、ブラウザーでサイトのデータを消去すると削除されます。`,
      },
      {
        h2: 'サーバーに保存するもの',
        html: `<ul><li><b>評価</b>: タイトル、星の数（1〜5）、日時、評価用 ID とネットワークアドレスを合わせたソルト付きハッシュ、アドレスのみのソルト付きハッシュ（一つのネットワークから大量に投票できないようにするため）。評価が表示されている間保存します。</li><li><b>プレイ回数</b>: ネットワークアドレスのソルト付きハッシュとタイトル・日付。一つのネットワークは一日一回だけ数えます。その日が終われば削除し、タイトルごとの合計だけが残ります。</li><li><b>不正利用対策</b>: ハッシュ化したアドレスごと・一時間ごとの書き込み回数。一時間が過ぎれば削除します。</li><li><b>アクセス統計</b>: ページが表示されると、どのページか、どのサイトから来たか（ドメインのみ、例: google.com）、リンクに含まれるキャンペーンタグを送信します。国とスマートフォンかどうかはリクエストから判断します。これらはページ・参照元・国・言語・端末ごとの日別合計に加算され、それ以外は保存しません。一日の訪問者数を数えるため、ネットワークアドレスとブラウザーのソルト付きハッシュをその日だけ保存し、翌日に削除します。ロボットは数えません。ブラウザーが Do Not Track または Global Privacy Control を送信している場合、ページは何も送信しません。</li></ul>ソルトは秘密なので、ハッシュからアドレスや ID を復元することはできません。法的根拠は、公正な評価を表示しサイトを不正利用から守るという正当な利益です（GDPR 第6条1項(f)）。`,
      },
      {
        h2: 'ホスティング',
        html: `サイトは Cloudflare 上で動いています。Cloudflare は処理者として、同社のデータ処理条件に基づき、ページの配信と攻撃からの保護のために IP アドレスとリクエスト情報を処理します。EU 域外での処理は、EU–米国データプライバシーフレームワークと標準契約条項に基づきます。Cloudflare の集計済みトラフィック（リクエスト数、どのロボットやクローラーか、MZPico カードのダウンロード数）は参照しますが、個々の訪問者の記録は参照しません。`,
      },
      {
        h2: 'あなたの権利',
        html: `データの開示、訂正、削除を求めること、処理に異議を述べることができます。サーバーにはハッシュしかないため、あなたの評価を特定するにはブラウザーにある評価用 ID が必要です。依頼の際に添えてください（サイトのローカルストレージの <code>mz-voter</code> にあります）。データ保護監督機関に苦情を申し立てることもできます。チェコでは <a href="https://uoou.gov.cz/" rel="noopener">ÚOOÚ</a>、またはお住まいの国の機関です。`,
      },
    ],
  },
  card: {
    title: 'MZPico カード',
    description:
      'MZPico — シャープ MZ-800 用の、Raspberry Pi Pico を使ったオープンハードウェアのストレージカード。MZF の即時ロード、フロッピー／クイックディスク／RAM ディスクのエミュレーション、I2S 音声、Wi-Fi クラウドストレージに対応。',
    h1: 'MZPico カード',
    leadHtml: (machineHref: string) =>
      `<a href="${machineHref}">シャープ MZ-800</a> 用の、Raspberry&nbsp;Pi&nbsp;Pico で動くオープンハードウェアのストレージシステムです。カセットテープも、純正のフロッピーやクイックディスクのドライブも要りません。Pico と小さな基板、数か所のはんだ付けだけで、実機が何でも数秒で読み込みます。`,
    photoAlt: 'MZPico の基板',
    photoCaption: 'MZPico ファミリー — Frugal と Deluxe の基板。',
    whatItDoesH2: 'できること',
    features: [
      '<b>MZF プログラムローダー</b> — <code>.mzf</code> テープイメージを MZ-800 へ直接読み込みます。カセット音声を介さず一瞬で完了します。',
      '<b>フロッピーディスクのエミュレーション</b> — <code>.dsk</code> イメージをマウントし、フロッピードライブとして振る舞います。',
      '<b>クイックディスクのエミュレーション</b> — <code>.mzq</code> イメージのほか、普通のディレクトリーをそのままクイックディスクとして扱うモードもあります。',
      '<b>RAM ディスクのエミュレーション</b> — SRAM ブートディスク、ページング RAM ディスク、PicoRD に対応し、SRAM エミュレーションによる高速起動もできます。',
      '<b>I2S による音声出力</b> <span class="meta">（Deluxe 基板）</span> — MZ-800 の 2 つの音源を基板上の I2S DAC で鳴らします。ステレオ定位付きの SN76489 PSG と、8253 のビープ音の両方です。',
      '<b>Wi-Fi クラウドストレージ</b> <span class="meta">（Pico&nbsp;W）</span> — カードは<em>このカタログ</em>を Wi-Fi 経由で <code>cloud:/</code> デバイスとして参照します。このサイトのどのタイトルも、パソコンを使わずに実機へ読み込めます。',
      '<b>柔軟な設定</b> — すべての基板で共通のファームウェア、INI 形式の設定ファイル、任意に決められる I/O ポート、同じ仮想デバイスの複数同時利用に対応します。',
    ],
    onMachineH2: '実機での画面',
    menuAlt: 'MZ-800 上の MZPico 起動メニュー',
    menuCaption: 'お気に入りのプログラムを並べられる起動メニュー。',
    explorerAlt: 'MZ-800 上の MZPico ファイルエクスプローラー',
    explorerCaption: 'ディレクトリーツリーと高速検索を備えたファイル一覧。',
    boardsH2: '2 種類の基板',
    frugalAlt: 'MZPico Frugal 基板',
    frugalHtml: (href: string) =>
      `<b>Frugal 基板</b> — もっとも簡単な構成です。ごく小さな基板に Pico を直接はんだ付けし、内蔵フラッシュを記憶領域として使います。microSD スロットは任意、レベルシフターは不要 — はんだ付けすればすぐ使えます。純正 Pico（2&nbsp;MB）にも 16&nbsp;MB の「パープル」互換品にも対応します。<a href="${href}" rel="noopener">KiCad の設計データ →</a>`,
    deluxeAlt: 'MZ-800 に挿した MZPico Deluxe 基板',
    deluxeHtml: (href: string) =>
      `<b>Deluxe 基板</b> — 全機能版です。5&nbsp;V を確実に扱うためのレベルシフター、microSD スロット、I2S サウンド部を備え、MZ-800 上段スロットのレールにも収まり、Wi-Fi とクラウドストレージのために Pico&nbsp;W も搭載できます。<a href="${href}" rel="noopener">KiCad の設計データ →</a>`,
    startedH2: 'はじめかた',
    steps: [
      'オープンな KiCad の設計データから基板を作ります（基本的なはんだ付けができれば十分です）。まずは Frugal 基板に Pico だけを載せる形でもかまいません。',
      'お使いの基板向けのファームウェア <code>.uf2</code> を<a href="{releases}" rel="noopener">リリースページ</a>から入手し、<kbd>BOOTSEL</kbd> を押しながら Pico の USB ドライブへコピーします。',
      'MZ-800 用のソフトを USB マスストレージ経由で書き込むか、<a href="{catalog}">このカタログから入手</a>して、カードを挿し、本体の電源を入れれば完了です。',
    ],
    docsHtml: (gh: string) =>
      `詳しい説明、設定のリファレンス、製作メモは <a href="${gh}/MZPico-firmware" rel="noopener">MZPico-firmware</a> リポジトリにあります。ハードウェアの設計は動作しており、ファームウェアは活発に開発中です。基板は <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noopener">CC&nbsp;BY-NC-SA&nbsp;4.0</a> ライセンス、ファームウェアとこのカタログは <a href="${gh}" rel="noopener">GitHub</a> で公開しています。`,
  },
};
