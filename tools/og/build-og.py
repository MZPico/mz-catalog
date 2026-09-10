#!/usr/bin/env python3
"""Build site/public/og/<slug>.png — the 1200x630 social/AI preview cards.

One card per title that has a screenshot, composed from the gameplay shot:
a darkened, blurred copy of the shot as backdrop, the crisp pixels on top and
the title in the MZ-800 font underneath. Offline tool, like tools/mzfont —
run it after adding or replacing screenshots:

    python3 tools/og/build-og.py
"""
import glob
import os
import re
import io

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

W, H = 1200, 630
BAND = 116
BG = (14, 15, 18)
FG = (233, 236, 239)
DIM = (150, 155, 165)
ACCENT = (255, 45, 45)
OUT = 'site/public/og'


def mz_font(size):
    """The site's MZ-800 webfont, unwrapped from WOFF2 for Pillow."""
    f = TTFont('site/public/fonts/mz800.woff2')
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def field(meta, name):
    m = re.search(rf'^{name}:\s*(.+)$', meta, re.M)
    return m.group(1).strip().strip('"') if m else None


def centered(draw, text, font, y, fill):
    b = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (b[2] - b[0])) // 2 - b[0], y - b[1]), text, font=font, fill=fill)
    return b[3] - b[1]


def card(shot_path, title, subtitle, dest):
    shot = Image.open(shot_path).convert('RGB')
    img = Image.new('RGB', (W, H), BG)

    # Backdrop: the same shot blown up to cover the card, blurred and dimmed.
    r = max(W / shot.width, H / shot.height)
    back = shot.resize((int(shot.width * r), int(shot.height * r)), Image.LANCZOS)
    back = back.crop(((back.width - W) // 2, (back.height - H) // 2,
                      (back.width - W) // 2 + W, (back.height - H) // 2 + H))
    back = back.filter(ImageFilter.GaussianBlur(18))
    img.paste(Image.blend(back, Image.new('RGB', (W, H), BG), 0.72), (0, 0))

    # Foreground: integer scaling only, so the pixels stay pixels.
    scale = max(1, min((W - 260) // shot.width, (H - BAND - 60) // shot.height))
    fore = shot.resize((shot.width * scale, shot.height * scale), Image.NEAREST)
    fx, fy = (W - fore.width) // 2, (H - BAND - fore.height) // 2
    d = ImageDraw.Draw(img)
    d.rectangle([fx - 3, fy - 3, fx + fore.width + 2, fy + fore.height + 2], outline=(60, 63, 70), width=3)
    img.paste(fore, (fx, fy))

    d.rectangle([0, H - BAND, W, H], fill=BG)
    d.rectangle([0, H - BAND - 3, W, H - BAND], fill=ACCENT)
    size = 46
    while size > 22:
        f = mz_font(size)
        if d.textbbox((0, 0), title, font=f)[2] <= W - 80:
            break
        size -= 4
    centered(d, title, mz_font(size), H - BAND + 24, FG)
    if subtitle:
        centered(d, subtitle, mz_font(20), H - 36, DIM)
    img.save(dest)


def main():
    os.makedirs(OUT, exist_ok=True)
    made = 0
    for meta_path in sorted(glob.glob('titles/*/meta.yaml')):
        meta = open(meta_path, encoding='utf-8').read()
        slug = os.path.basename(os.path.dirname(meta_path))
        shots = sorted(glob.glob(f'titles/{slug}/screenshots/*.png'))
        if not shots:
            continue
        shot = next((s for s in shots if os.path.basename(s).startswith('02')), shots[0])
        title = field(meta, 'title') or slug
        machine = (field(meta, 'machine') or '').upper()
        bits = [b for b in (field(meta, 'year'), field(meta, 'publisher'), machine) if b]
        card(shot, title.upper(), ' - '.join(bits), f'{OUT}/{slug}.png')
        made += 1
    # A title that left the catalog should not leave its card behind.
    live = {os.path.basename(os.path.dirname(m)) for m in glob.glob('titles/*/meta.yaml')}
    stale = [c for c in glob.glob(f'{OUT}/*.png') if os.path.splitext(os.path.basename(c))[0] not in live]
    for c in stale:
        os.remove(c)
    print(f'wrote {made} card(s) to {OUT}/' + (f', removed {len(stale)} stale' if stale else ''))


if __name__ == '__main__':
    main()
