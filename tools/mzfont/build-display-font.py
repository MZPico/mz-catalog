#!/usr/bin/env python3
"""Build site/public/fonts/mz-display.woff2 — every character the MZ can draw.

    python3 tools/mzfont/build-display-font.py tools/mzfont/cgrom.bin

The character generator holds two sets of 256 glyphs, 8x8 pixels, one byte per
row, least significant bit on the left. Nothing is mapped to Unicode: a display
code is shown as the machine draws it, so set 1 code c becomes U+E000+c and set
2 code c becomes U+E100+c. Pages render a byte by asking for that code point in
this font, which is why graphics characters come out right and need no table.

The ROM is Sharp's; it sits here for the same reason the emulator carries the
machine's ROMs — to show the machine as it was.
"""
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX, UPM, ASCENT = 100, 800, 800          # one ROM pixel = 100 units, cell is 8x8
rom = open(sys.argv[1], 'rb').read()
if len(rom) < 4096:
    raise SystemExit(f'expected a 4 KB character generator, got {len(rom)} bytes')

def glyph(rows):
    """Pixels to outlines: one rectangle per run of set bits, merged per row."""
    pen = TTGlyphPen(None)
    for y, bits in enumerate(rows):
        x = 0
        while x < 8:
            if not (bits >> x) & 1:
                x += 1
                continue
            start = x
            while x < 8 and (bits >> x) & 1:
                x += 1
            left, right = start * PX, x * PX
            top, bottom = ASCENT - y * PX, ASCENT - (y + 1) * PX
            pen.moveTo((left, bottom)); pen.lineTo((left, top)); pen.lineTo((right, top)); pen.lineTo((right, bottom)); pen.closePath()
    return pen.glyph()

glyphs, cmap, widths = {'.notdef': TTGlyphPen(None).glyph()}, {}, {'.notdef': 8 * PX}
for which, base, plane in ((1, 0, 0xE000), (2, 2048, 0xE100)):
    for code in range(256):
        name = f'mz{which}_{code:02x}'
        glyphs[name] = glyph(rom[base + code * 8: base + code * 8 + 8])
        widths[name] = 8 * PX
        cmap[plane + code] = name

fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(list(glyphs))
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: (w, 0) for n, w in widths.items()})
fb.setupHorizontalHeader(ascent=ASCENT, descent=0)
fb.setupNameTable({
    'familyName': 'MZ Display', 'styleName': 'Regular', 'psName': 'MZDisplay-Regular',
    'copyright': 'Glyph data from the Sharp MZ character generator ROM (c) Sharp Corporation.',
})
fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=0, usWinAscent=ASCENT, usWinDescent=0)
fb.setupPost()
fb.font.flavor = 'woff2'
out = 'site/public/fonts/mz-display.woff2'
fb.save(out)
print(f'{out}: {len(cmap)} glyphs (set 1 at U+E000, set 2 at U+E100)')
