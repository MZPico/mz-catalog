#!/usr/bin/env python3
"""Install screenshots produced by auto-capture.py into titles/.

Only empty slots are filled — an existing 01-auto.png or 02-auto.png is never
replaced. Before that, candidates that are not about their title are dropped:
a picture that turns up, near enough, for three or more different titles is
the machine's boot screen, the monitor prompt, BASIC's banner or a shared
loader, not a game.

    python3 tools/screenshots/install-shots.py --from /tmp/shots          # dry run
    python3 tools/screenshots/install-shots.py --from /tmp/shots --apply
"""
import argparse
import os
import shutil
from collections import defaultdict

import numpy as np
from PIL import Image

SLOTS = ('01-auto.png', '02-auto.png')


def signature(path):
    """Coarse shape of the picture: 44x29 grey levels in eight steps."""
    im = Image.open(path).convert('L').resize((44, 29))
    return np.asarray(im, dtype=np.int16) // 32


def same(a, b):
    return (a != b).mean() < 0.04


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', required=True)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    candidates = []                                   # (slug, slot, path, signature)
    for slug in sorted(os.listdir(args.src)):
        d = os.path.join(args.src, slug)
        if not os.path.isdir(d) or not os.path.isdir(f'titles/{slug}'):
            continue
        for slot in SLOTS:
            p = os.path.join(d, slot)
            if os.path.exists(p) and not os.path.exists(f'titles/{slug}/screenshots/{slot}'):
                candidates.append((slug, slot, p, signature(p)))

    # Cluster near-identical pictures and see how many titles each cluster spans.
    clusters = []
    for c in candidates:
        for cl in clusters:
            if same(cl[0][3], c[3]):
                cl.append(c)
                break
        else:
            clusters.append([c])
    generic = set()
    for cl in clusters:
        slugs = {c[0] for c in cl}
        if len(slugs) >= 3:
            generic |= {(c[0], c[1]) for c in cl}
            print(f'generic picture shared by {len(slugs)} titles, e.g. {", ".join(sorted(slugs)[:5])}')

    installed = defaultdict(list)
    for slug, slot, path, _ in candidates:
        if (slug, slot) in generic:
            continue
        installed[slug].append(slot)
        if args.apply:
            os.makedirs(f'titles/{slug}/screenshots', exist_ok=True)
            shutil.copyfile(path, f'titles/{slug}/screenshots/{slot}')

    n = sum(len(v) for v in installed.values())
    print(f'{"installed" if args.apply else "would install"} {n} screenshot(s) for {len(installed)} title(s); '
          f'{len(generic)} generic candidate(s) dropped')


if __name__ == '__main__':
    main()
