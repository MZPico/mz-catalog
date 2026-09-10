#!/usr/bin/env python3
"""Capture title and gameplay screenshots for catalog entries that lack them.

Drives the native mz800emu over its MCP socket, headless. That build runs about
18x real time (there is no audio device to pace it), so a title animation or a
whole first life can pass between two slow snapshots: frames are grabbed in
quick bursts and chosen afterwards instead.

    python3 tools/screenshots/auto-capture.py --missing --workers 4 --out /tmp/shots
    python3 tools/screenshots/auto-capture.py hlipa quixy --out /tmp/shots

Nothing is written into titles/ — candidates land in --out/<slug>/, with the
text found on screen and in the program (hints.json), for a human to look at
before install-shots.py copies them over. Existing screenshots are never replaced.

Emulator binary: $MZ800EMU, default ~/src/mz800emu/build/build-mz800emu/mz800emu
"""
import argparse
import glob
import json
import os
import queue
import socket
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

import re

import numpy as np
from PIL import Image

EMU = os.environ.get('MZ800EMU', os.path.expanduser('~/src/mz800emu/build/build-mz800emu/mz800emu'))
SCREEN = (112, 28, 816, 260)          # the MZ picture inside the emulator's 928x288 frame
OUT_SIZE = (704, 464)                 # catalog format: 1:2 pixels doubled vertically
# Tried in this order after the attract loop: the usual start keys, then menu
# numbers ("3 PLAY GAME"), then a run of presses to click through instruction
# pages, holding a direction at the end so there is something moving to catch.
# MZ-700 display codes -> text, for reading the screen straight out of VRAM
# (0xD000, 40x25). Upper case and punctuation as in tools/mzfont; lower case
# a-z sits at 0x81-0x9A, read off Circus Star's "Copyright (C) 1983 by OAK
# corp." and "Programmed by K.Kobayashi & Kobax.".
DISPLAY = {0x00: ' '}
DISPLAY.update({0x01 + i: chr(65 + i) for i in range(26)})
DISPLAY.update({0x81 + i: chr(97 + i) for i in range(26)})
DISPLAY.update({0x20 + i: chr(48 + i) for i in range(10)})
DISPLAY.update({0x2A: '-', 0x2B: '=', 0x2C: ';', 0x2D: '/', 0x2E: '.', 0x2F: ',', 0x49: '?',
                0x4F: ':', 0x55: '@', 0x61: '!', 0x62: '"', 0x63: '#', 0x64: '$', 0x65: '%',
                0x66: '&', 0x67: "'", 0x68: '(', 0x69: ')', 0x6A: '+', 0x6B: '*'})

START_KEYS = ['Space', 'Enter', 'S', '1', '3', '2', 'Y', 'J', '0', 'Z',
              'Space', 'Enter', 'Space', 'Enter', 'Right']


class Emulator:
    def __init__(self, mzf, port, cwd):
        env = dict(os.environ, SDL_AUDIODRIVER='dummy')
        # The emulator reads mz800emu.ini from its working directory. Start it in
        # an empty one: a developer's ini can have a disk in the floppy drive, and
        # a game that crashes then boots whatever is on it (seen: FUZIX, with a
        # screenshot to match).
        self.proc = subprocess.Popen(
            [EMU, '--headless', '--maxspeed-bench', '--no-first-run-windows', '--no-save-ini',
             '--run-mzf', mzf, '--mcp-tcp-port', str(port)],
            cwd=cwd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(150):
            try:
                self.sock = socket.create_connection(('127.0.0.1', port), timeout=30)
                break
            except OSError:
                time.sleep(0.1)
        else:
            self.close()
            raise RuntimeError('emulator did not open its MCP port')
        self.f = self.sock.makefile('rwb')
        json.loads(self.f.readline())
        self.n = 0

    def req(self, cmd, data=None):
        self.n += 1
        msg = {'req_id': self.n, 'cmd': cmd}
        if data:
            msg['data'] = data
        self.f.write((json.dumps(msg) + '\n').encode())
        self.f.flush()
        return json.loads(self.f.readline())

    def shot(self, path):
        """Save a frame; None when the emulator had nothing to write yet."""
        self.req('screenshot_save_to_file', {'path': path, 'filename': path})
        for _ in range(10):                      # the file can land a frame later
            if os.path.exists(path):
                return path
            time.sleep(0.03)
        return None

    def screen_text(self):
        """Lines of text on an MZ-700-mode screen, straight from VRAM."""
        import base64
        r = self.req('mem_read', {'addr': 0xD000, 'len': 1000})
        v = base64.b64decode(r.get('data', {}).get('data_b64', ''))
        lines = []
        for row in range(len(v) // 40):
            cells = v[row * 40:(row + 1) * 40]
            text = ''.join(DISPLAY.get(b, '\x00') for b in cells)
            # graphics characters split the line into the pieces of real text
            for piece in text.split('\x00'):
                piece = ' '.join(piece.split())
                if sum(c.isalpha() for c in piece) >= 4:
                    lines.append(piece)
        return lines

    def key(self, key, hold=8):
        self.req('input_send_keys_with_delays', {'events': [{'key': key, 'hold_frames': hold}]})

    def close(self):
        try:
            self.sock.close()
        except Exception:
            pass
        self.proc.kill()
        self.proc.wait()


def grab(mzf, port, workdir):
    """Burst-capture the attract sequence, then the reaction to common start keys.
    Returns (frames, screen text seen along the way)."""
    frames = []
    text = []
    home = os.path.join(workdir, 'emu')
    os.makedirs(home)
    emu = Emulator(mzf, port, home)
    try:
        time.sleep(1.0)
        for i in range(26):                                   # title / attract loop
            frames.append(('attract', emu.shot(f'{workdir}/a{i:02d}.png')))
            if i % 4 == 3:
                text += emu.screen_text()
            time.sleep(0.2)
        for n, k in enumerate(START_KEYS):                    # whatever starts the game
            emu.key(k, hold=40 if k == 'Right' else 8)
            for j in range(3):
                frames.append((f'key{n:02d}', emu.shot(f'{workdir}/k{n:02d}{j}.png')))
                time.sleep(0.12)
            text += emu.screen_text()
    finally:
        emu.close()
    return [(tag, path) for tag, path in frames if path], list(dict.fromkeys(text))


# --- metadata hints --------------------------------------------------------

YEAR_RE = re.compile(r'(?<![0-9])(19[78][0-9])(?![0-9])')
CREDIT_RE = re.compile(r'\(c\)|©|copyright|\bby\b|version|written|programm|convert|soft|corp|ltd|gmbh', re.I)


def binary_text(mzf):
    """Printable runs in the program bytes, read as ASCII and as display codes."""
    data = open(mzf, 'rb').read()[128:]
    found = []
    for decode in (lambda b: chr(b) if 32 <= b < 127 else None, lambda b: DISPLAY.get(b)):
        run = []
        for b in data + b'\xff':
            ch = decode(b)
            if ch is None or (ch == ' ' and run and run[-1] == ' '):
                piece = ' '.join(''.join(run).split())
                if len(piece) >= 8 and sum(c.isalpha() for c in piece) >= 5:
                    found.append(piece)
                run = [] if ch is None else run
            if ch is not None:
                run.append(ch)
    return list(dict.fromkeys(found))


ROMAN_RE = re.compile(r'\bMCMLXXX(?:IX|IV|V?I{0,3})\b|\bMCMLXX(?:IX|IV|V?I{0,3})\b')
ROMAN = {'M': 1000, 'C': 100, 'L': 50, 'X': 10, 'V': 5, 'I': 1}


def roman(numeral):
    total = 0
    for a, b in zip(numeral, numeral[1:] + ' '):
        v = ROMAN[a]
        total += -v if b in ROMAN and ROMAN[b] > v else v
    return str(total)


def hints(screen, binary):
    """Snippets worth a human's look: a year, a copyright or a credit, with a
    little context either side — whole binary runs can be hundreds of bytes."""
    snippets = []
    for src, line in [('screen', l) for l in screen] + [('binary', l) for l in binary]:
        for m in list(YEAR_RE.finditer(line)) + list(ROMAN_RE.finditer(line)) + list(CREDIT_RE.finditer(line)):
            a, b = max(0, m.start() - 40), min(len(line), m.end() + 40)
            snippets.append((src, line[a:b].strip()))
    snippets = list(dict.fromkeys(snippets))
    years = sorted({y for _, t in snippets for y in YEAR_RE.findall(t)} |
                   {roman(r) for _, t in snippets for r in ROMAN_RE.findall(t)})
    # the screen is what the author meant people to read; list it first
    snippets.sort(key=lambda st: st[0] != 'screen')
    return {'years': years, 'lines': [f'{src}: {t}' for src, t in snippets][:20]}


def load(path):
    im = Image.open(path).convert('RGB').crop(SCREEN)
    small = np.asarray(im.convert('L').resize((88, 58)), dtype=np.int16)
    q = np.asarray(im.resize((176, 116), Image.NEAREST)) // 32
    colors = len(np.unique(q.reshape(-1, 3), axis=0))
    dominant = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)[1].max() / (176 * 116)
    # Instruction and menu pages: a flat background with a couple of text
    # colours. They make a poor picture of the game, so they rank last.
    texty = dominant > 0.72 and colors <= 4
    return {'img': im, 'small': small, 'colors': colors, 'dominant': dominant, 'texty': texty}


def differs(a, b, frac=0.08):
    return (np.abs(a['small'] - b['small']) > 48).mean() > frac


def choose(frames, relaxed=False):
    """Title = first stable non-blank attract frame; gameplay = richest frame unlike it.
    Relaxed accepts sparse screens too — a BASIC banner is a few lines on an empty page."""
    info = [(tag, path, load(path)) for tag, path in frames]
    limit, min_colors = (0.998, 2) if relaxed else (0.97, 3)
    rich = [(t, p, x) for t, p, x in info if x['dominant'] < limit and x['colors'] >= min_colors]
    if not rich:
        return None, None, 'blank'
    attract = [r for r in rich if r[0] == 'attract']
    title = None
    for (t1, p1, x1), (t2, p2, x2) in zip(attract, attract[1:]):
        if not differs(x1, x2, 0.02):
            title = (t1, p1, x1)
            break
    title = title or max(rich, key=lambda r: r[2]['colors'])
    others = [(i, r) for i, r in enumerate(rich) if differs(r[2], title[2])]
    # Richest picture wins; text pages lose to anything else; between equals,
    # the later frame — deeper into the game — is the better guess.
    score = lambda ir: (not ir[1][2]['texty'], ir[1][2]['colors'], ir[0])
    game = max(others, key=score)[1] if others else None
    return title, game, 'ok'


def save(entry, dest):
    entry[2]['img'].resize(OUT_SIZE, Image.NEAREST).save(dest)


def capture(slug, mzf, port, out, relaxed=False):
    os.makedirs(f'{out}/{slug}', exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        try:
            frames, screen = grab(mzf, port, tmp)
        except Exception as e:
            return slug, f'error: {e}'
        with open(f'{out}/{slug}/hints.json', 'w') as h:
            json.dump(hints(screen, binary_text(mzf)), h, indent=1, ensure_ascii=False)
        title, game, status = choose(frames, relaxed)
        if status != 'ok':
            return slug, status
        save(title, f'{out}/{slug}/01-auto.png')
        if game:
            save(game, f'{out}/{slug}/02-auto.png')
        return slug, 'title+gameplay' if game else 'title only'


def catalog_needs(missing_only):
    rows = []
    for meta in sorted(glob.glob('titles/*/meta.yaml')):
        d = os.path.dirname(meta)
        slug = os.path.basename(d)
        have = set(os.listdir(f'{d}/screenshots')) if os.path.isdir(f'{d}/screenshots') else set()
        if missing_only and '02-auto.png' in have:
            continue
        mzf = sorted(glob.glob(f'{d}/*.mzf'))
        if mzf:
            rows.append((slug, os.path.abspath(mzf[0])))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slugs', nargs='*')
    ap.add_argument('--missing', action='store_true', help='every title without a gameplay shot')
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--port', type=int, default=23900)
    ap.add_argument('--out', required=True)
    ap.add_argument('--relaxed', action='store_true', help='accept sparse screens (BASIC banners, menus)')
    args = ap.parse_args()

    done = lambda slug: os.path.exists(f'{args.out}/{slug}/hints.json')
    todo = [row for row in catalog_needs(True) if not done(row[0])] if args.missing else [
        (s, os.path.abspath(sorted(glob.glob(f'titles/{s}/*.mzf'))[0])) for s in args.slugs]
    print(f'{len(todo)} title(s), {args.workers} worker(s)', flush=True)
    # Each emulator needs its own MCP port; hand them out from a pool so two
    # runs can never meet on one.
    ports = queue.Queue()
    for i in range(args.workers):
        ports.put(args.port + i)

    def job(slug, mzf):
        port = ports.get()
        try:
            return capture(slug, mzf, port, args.out, args.relaxed)
        finally:
            ports.put(port)

    results = {}
    with ThreadPoolExecutor(args.workers) as pool:
        for slug, status in pool.map(lambda row: job(*row), todo):
            results[slug] = status
            print(f'{slug:16} {status}', flush=True)
    json.dump(results, open(f'{args.out}/results.json', 'w'), indent=1)


if __name__ == '__main__':
    sys.exit(main())
