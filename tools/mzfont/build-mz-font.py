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

def glyph(code):
    pen = TTGlyphPen(None)
    g = rom[code * 8: code * 8 + 8]
    cols = [x for y in range(8) for x in range(8) if (g[y] >> x) & 1]
    # centre the ink horizontally in the 8px cell (raw glyphs sit left, which
    # looks lopsided for narrow characters like I in proportional contexts)
    dx = ((8 - (max(cols) - min(cols) + 1)) // 2 - min(cols)) if cols else 0
    for y in range(8):
        for x in range(8):
            if (g[y] >> x) & 1:
                x0, y0 = (x + dx) * PX, (7 - y) * PX
                pen.moveTo((x0, y0)); pen.lineTo((x0 + PX, y0))
                pen.lineTo((x0 + PX, y0 + PX)); pen.lineTo((x0, y0 + PX)); pen.closePath()
    return pen.glyph()

cmap, glyphs = {}, {'.notdef': TTGlyphPen(None).glyph()}
def add(ch, code):
    n = f'uni{ord(ch):04X}'; glyphs[n] = glyph(code); cmap[ord(ch)] = n

add(' ', 0x00)
for i in range(26): add(chr(65 + i), 0x01 + i); add(chr(97 + i), 0x01 + i)
for i in range(10): add(chr(48 + i), 0x20 + i)
for ch, code in {'-': 0x2A, '=': 0x2B, ';': 0x2C, '/': 0x2D, '.': 0x2E, ',': 0x2F, '£': 0x1B,
                 '?': 0x49, ':': 0x4F, '@': 0x55, '!': 0x61, '"': 0x62, '#': 0x63, '$': 0x64,
                 '%': 0x65, '&': 0x66, "'": 0x67, '(': 0x68, ')': 0x69, '+': 0x6A, '*': 0x6B,
                 '↑': 0x50, '↓': 0x58, '←': 0x45, '→': 0x5A, '♥': 0x53, '♠': 0x41, '▊': 0x43,
                 '–': 0x2A, '—': 0x2A}.items():
    add(ch, code)

order = ['.notdef'] + [n for n in glyphs if n != '.notdef']
fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: (UPM, 0) for n in order})
fb.setupHorizontalHeader(ascent=700, descent=-100)
fb.setupNameTable({'familyName': 'MZ-800', 'styleName': 'Regular', 'fullName': 'MZ-800',
                   'psName': 'MZ800-Regular',
                   'copyright': 'Glyphs from the Sharp MZ-800 character generator ROM.'})
fb.setupOS2(sTypoAscender=700, sTypoDescender=-100, usWinAscent=700, usWinDescent=100)
fb.setupPost(); fb.font.flavor = 'woff2'
fb.save('site/public/fonts/mz800.woff2')
print('wrote site/public/fonts/mz800.woff2,', len(cmap), 'characters')
