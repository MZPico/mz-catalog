#!/usr/bin/env python3
"""Build site/public/fonts/mz800.woff2 from the Sharp MZ-800 CG-ROM.

Usage: python3 tools/mzfont/build-mz-font.py <cgrom.bin>
cgrom.bin = the 4 KB character generator ROM (set 1 in the first 2 KB),
extractable from mz800emu's ROM_MZ800_CGROM.c. Glyphs are 8x8, one byte
per row, LSB = leftmost pixel. Display codes: space 0x00, A-Z 0x01-0x1A,
0-9 0x20-0x29, punctuation as mapped below (verified against VRAM text).
Lowercase letters reuse the uppercase glyphs.
"""
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

rom = open(sys.argv[1], 'rb').read()
PX, UPM = 100, 800

def rows_of(code):
    return list(rom[code * 8: code * 8 + 8])


def squeeze(rows, target):
    """Shrink a glyph to `target` ink rows the way the ROM's own Ä does: drop a row
    that repeats a neighbour. The first and last rows stay — they carry the
    letter's top and bottom bars."""
    ink = [r for r in rows if r]
    while len(ink) > target:
        candidates = range(1, len(ink) - 1)
        duplicated = [i for i in candidates if ink[i] == ink[i - 1] or ink[i] == ink[i + 1]]
        if duplicated:
            del ink[duplicated[len(duplicated) // 2]]
        else:  # no duplicate: drop the row closest to a neighbour (least shape lost)
            nearest = lambda i: min(bin(ink[i] ^ ink[i - 1]).count('1'), bin(ink[i] ^ ink[i + 1]).count('1'))
            del ink[min(candidates, key=nearest)]
    return ink


def _bits(pattern):
    return sum(1 << i for i, c in enumerate(pattern) if c == '#')


# Czech diacritics are not in the European CG-ROM (games that needed them loaded
# their own set into CG-RAM), so compose them the way Sharp composed Ä: squeeze
# the letter to six rows and put the mark in the freed top row.
ACCENTS = {
    'acute': _bits('.....##.'),
    'caron': _bits('..#..#..'),
    'ring': _bits('...##...'),
}
CZECH = {
    'Á': (0x01, 'acute'), 'Č': (0x03, 'caron'), 'Ď': (0x04, 'caron'), 'É': (0x05, 'acute'),
    'Ě': (0x05, 'caron'), 'Í': (0x09, 'acute'), 'Ň': (0x0E, 'caron'), 'Ó': (0x0F, 'acute'),
    'Ř': (0x12, 'caron'), 'Š': (0x13, 'caron'), 'Ť': (0x14, 'caron'), 'Ú': (0x15, 'acute'),
    'Ů': (0x15, 'ring'), 'Ý': (0x19, 'acute'), 'Ž': (0x1A, 'caron'),
}


def accented_rows(code, mark):
    return ([ACCENTS[mark]] + squeeze(rows_of(code), 6) + [0] * 8)[:8]


def glyph(code, rows=None):
    """Return (glyph, advance): monospaced — every glyph keeps the authentic
    8px cell advance, with its ink centred exactly in the cell (half-pixel
    offsets in font units, so narrow glyphs like I sit truly centred)."""
    pen = TTGlyphPen(None)
    g = rows if rows is not None else rows_of(code)
    cols = [x for y in range(8) for x in range(8) if (g[y] >> x) & 1]
    if not cols:
        return pen.glyph(), (8 * PX, 0)  # space
    ink = (max(cols) - min(cols) + 1) * PX
    lsb = (8 * PX - ink) // 2  # centred left-side bearing
    dx = lsb - min(cols) * PX
    for y in range(8):
        for x in range(8):
            if (g[y] >> x) & 1:
                x0, y0 = x * PX + dx, (7 - y) * PX
                pen.moveTo((x0, y0)); pen.lineTo((x0 + PX, y0))
                pen.lineTo((x0 + PX, y0 + PX)); pen.lineTo((x0, y0 + PX)); pen.closePath()
    # NOTE: renderers place ink at the hmtx left-side bearing, not at the
    # outline's xMin — the lsb must carry the centring, or it is lost.
    return pen.glyph(), (8 * PX, lsb)

cmap, glyphs, metrics = {}, {'.notdef': TTGlyphPen(None).glyph()}, {'.notdef': (8 * PX, 0)}
def add(ch, code, rows=None):
    n = f'uni{ord(ch):04X}'; glyphs[n], metrics[n] = glyph(code, rows); cmap[ord(ch)] = n

add(' ', 0x00)
for i in range(26): add(chr(65 + i), 0x01 + i); add(chr(97 + i), 0x01 + i)
for i in range(10): add(chr(48 + i), 0x20 + i)
for ch, code in {'-': 0x2A, '=': 0x2B, ';': 0x2C, '/': 0x2D, '.': 0x2E, ',': 0x2F, '£': 0x1B,
                 '?': 0x49, ':': 0x4F, '@': 0x55, '!': 0x61, '"': 0x62, '#': 0x63, '$': 0x64,
                 '%': 0x65, '&': 0x66, "'": 0x67, '(': 0x68, ')': 0x69, '+': 0x6A, '*': 0x6B,
                 '↑': 0x50, '↓': 0x58, '←': 0x45, '→': 0x5A, '♥': 0x53, '♠': 0x41, '▊': 0x43,
                 '–': 0x2A, '—': 0x2A,
                 # German umlauts exist in the European CG-ROM; Czech diacritics do not
                 # (games that needed them loaded their own set into CG-RAM), so Czech
                 # headings fall back to the UI font — see global.css.
                 'ä': 0x9B, 'ü': 0xAB, 'ö': 0xAC, 'Ä': 0xAE, 'Ö': 0xAF, 'Ü': 0xAD}.items():
    add(ch, code)

# Czech letters, upper and lower case sharing the composed glyph (as the rest of
# this font maps lowercase onto the uppercase shapes).
for upper, (base, mark) in CZECH.items():
    rows = accented_rows(base, mark)
    add(upper, base, rows)
    add(upper.lower(), base, rows)

order = ['.notdef'] + [n for n in glyphs if n != '.notdef']
fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: metrics[n] for n in order})
fb.setupHorizontalHeader(ascent=700, descent=-100)
fb.setupNameTable({'familyName': 'MZ-800', 'styleName': 'Regular', 'fullName': 'MZ-800',
                   'psName': 'MZ800-Regular',
                   'copyright': 'Glyphs from the Sharp MZ-800 character generator ROM.'})
fb.setupOS2(sTypoAscender=700, sTypoDescender=-100, usWinAscent=700, usWinDescent=100)
fb.setupPost(); fb.font.flavor = 'woff2'
fb.save('site/public/fonts/mz800.woff2')
print('wrote site/public/fonts/mz800.woff2,', len(cmap), 'characters')
