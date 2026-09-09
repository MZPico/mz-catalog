#!/usr/bin/env python3
"""Trace a black-and-white glyph bitmap into an SVG path.

Made for the logotype badge: drop in a screenshot of one character from the
Sharp MZ wordmark and get a path in the same 573-unit coordinate space the
other glyphs in site/public/mz-badge.svg use.

    python3 tools/mzfont/trace-glyph.py seven.png [--height 573] [--invert]

Outlines are walked as pixel contours and then simplified with
Ramer-Douglas-Peucker, so straight edges stay straight and the result is a
handful of points rather than a thousand.
"""
import argparse

import numpy as np
from PIL import Image


def contours(mask):
    """Boundary loops of the True regions, as lists of pixel-corner points."""
    h, w = mask.shape
    # Edges between a filled and an empty pixel, keyed by their start corner.
    edges = {}
    for y in range(h):
        for x in range(w):
            if not mask[y, x]:
                continue
            if y == 0 or not mask[y - 1, x]:
                edges.setdefault((x, y), []).append((x + 1, y))
            if x + 1 == w or not mask[y, x + 1]:
                edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
            if y + 1 == h or not mask[y + 1, x]:
                edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
            if x == 0 or not mask[y, x - 1]:
                edges.setdefault((x, y + 1), []).append((x, y))
    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        node = start
        while True:
            outs = edges.get(node)
            if not outs:
                break
            nxt = outs.pop()
            if not outs:
                del edges[node]
            loop.append(nxt)
            node = nxt
            if node == start:
                break
        if len(loop) > 8:
            loops.append(loop)
    return loops


def rdp(points, eps):
    if len(points) < 3:
        return points
    a = np.array(points[0], dtype=float)
    b = np.array(points[-1], dtype=float)
    ab = b - a
    norm = np.hypot(*ab)
    pts = np.array(points, dtype=float)
    if norm == 0:
        d = np.hypot(*(pts - a).T)
    else:
        d = np.abs(np.cross(ab, pts - a)) / norm
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('image')
    ap.add_argument('--height', type=float, default=573.0, help='target glyph height in SVG units')
    ap.add_argument('--threshold', type=int, default=128)
    ap.add_argument('--invert', action='store_true', help='glyph is dark on a light background')
    ap.add_argument('--epsilon', type=float, default=1.2, help='simplification tolerance, in pixels')
    args = ap.parse_args()

    img = Image.open(args.image).convert('L')
    a = np.array(img)
    mask = a < args.threshold if args.invert else a >= args.threshold

    ys, xs = np.nonzero(mask)
    if not len(ys):
        raise SystemExit('nothing above the threshold — try --invert or another --threshold')
    top, bottom, left = ys.min(), ys.max(), xs.min()
    scale = args.height / (bottom - top + 1)

    paths = []
    for loop in contours(mask):
        simple = rdp(loop, args.epsilon)
        if len(simple) < 4:
            continue
        pts = [((x - left) * scale, (y - top) * scale) for x, y in simple[:-1]]
        paths.append('M' + ' L'.join(f'{x:.0f},{y:.0f}' for x, y in pts) + ' Z')

    print(f'<!-- traced from {args.image}, {len(paths)} contour(s), '
          f'{(xs.max() - left + 1) * scale:.0f} x {args.height:.0f} units -->')
    print('<path d="' + ' '.join(paths) + '"/>')


if __name__ == '__main__':
    main()
