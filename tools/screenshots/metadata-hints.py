#!/usr/bin/env python3
"""Turn the hints auto-capture.py collected into year / publisher suggestions.

Reads <out>/<slug>/hints.json and prints one row per title that has anything
worth proposing, with the evidence next to it. Nothing is written to titles/:
the rows are for a human to confirm, because a year on a title screen can be
the port's, the original's or the cracker's.

    python3 tools/screenshots/metadata-hints.py /tmp/shots [--json proposals.json]
"""
import glob
import json
import os
import re
import sys

# "(C) 1985 by BBG SOFTWARE", "Copyright (C) 1983 by OAK corp.", "© 1984 dB-SOFT"
COPY_RE = re.compile(
    r'(?:\(c\)|©|copyright)\s*(?:\(c\)\s*)?(?P<y1>19[78]\d)?\s*(?:by\s+)?(?P<who>[A-Za-z][\w&.\' -]{2,40}?)'
    r'\s*(?P<y2>19[78]\d)?\s*(?:$|[.,;!$]|  )', re.I)
# "BBG SOFTWARE", "PALACE SOFTWARE", "TECNO-SOFT", "OAK corp."
HOUSE_RE = re.compile(r'\b([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,2}\s+(?:SOFTWARE|SOFT|CORP\.?|LTD\.?|GMBH))\b', re.I)
PORT_RE = re.compile(r'(?:sharp|mz[- ]?[78]00)\s+version\s+by\s+(?P<who>[A-Za-z][\w .&-]{2,40})', re.I)
LEAD = re.compile(r'^(?:by|the|this|of)\s+', re.I)


def tidy(name):
    """'BBG SOFTWARE' -> 'BBG Software', 'PALACE SOFTWARE' -> 'Palace Software'.
    Short all-capitals words are initials and stay as they are; a name that is
    already in mixed case was written that way on purpose and is kept."""
    name = LEAD.sub('', ' '.join(name.split()).strip(' .,-'))
    if not name.isupper():
        return name
    common = {'THE', 'AND', 'FOR', 'OF', 'BY', 'TO', 'IN', 'ON', 'A', 'AN'}
    word = lambda w: w if len(w) <= 3 and w.isalpha() and w not in common else \
        '-'.join(part.capitalize() for part in w.split('-'))
    return ' '.join(word(w) if w not in common or i == 0 else w.lower() for i, w in enumerate(name.split(' ')))


def propose(h):
    years, publishers, porters, evidence = [], [], [], []
    for line in h['lines']:
        text = line.split(': ', 1)[1]
        for m in COPY_RE.finditer(text):
            who = m.group('who')
            if who and len(who) > 2:
                publishers.append(tidy(who))
                evidence.append(line)
            years += [y for y in (m.group('y1'), m.group('y2')) if y]
        for m in HOUSE_RE.finditer(text):
            publishers.append(tidy(m.group(1)))
            evidence.append(line)
        for m in PORT_RE.finditer(text):
            porters.append(tidy(m.group('who')))
            evidence.append(line)
    years = years or h['years']
    pick = lambda xs: max(set(xs), key=xs.count) if xs else None
    return {
        'year': pick(years),
        'publisher': pick(publishers),
        'port_by': pick(porters),
        'evidence': list(dict.fromkeys(evidence))[:4] or h['lines'][:3],
    }


def main():
    out = sys.argv[1]
    rows = {}
    for path in sorted(glob.glob(f'{out}/*/hints.json')):
        slug = os.path.basename(os.path.dirname(path))
        h = json.load(open(path))
        if not h['lines']:
            continue
        p = propose(h)
        if p['year'] or p['publisher'] or p['port_by']:
            rows[slug] = p
    for slug, p in rows.items():
        print(f"{slug:14} year={p['year'] or '-':5} publisher={p['publisher'] or '-':28} port_by={p['port_by'] or '-'}")
        for e in p['evidence']:
            print(f'{"":16}{e[:110]}')
    print(f'\n{len(rows)} title(s) with something to propose')
    if '--json' in sys.argv:
        json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
