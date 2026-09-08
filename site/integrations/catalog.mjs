// Astro integration that makes the catalog binaries part of the site:
//  - dev:   serves /files/<slug>/<name>, /screenshots/<slug>/<name> and
//           /manifest.json straight from titles/
//  - build: copies MZF files + screenshots into dist/ and writes
//           dist/manifest.json
import { cp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog, TITLES_DIR, SLUG_RE } from '../../scripts/lib/catalog.mjs';
import { buildManifest, serializeManifest } from '../../scripts/build-manifest.mjs';

const IMAGE_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp',
};

export default function catalog() {
  return {
    name: 'mz-catalog',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const pathname = new URL(req.url, 'http://localhost').pathname;
          if (pathname === '/manifest.json') {
            res.setHeader('Content-Type', 'application/json');
            res.end(serializeManifest(buildManifest(await readCatalog())));
            return;
          }
          const m = pathname.match(/^\/(files|screenshots)\/([^/]+)\/([^/]+)$/);
          if (!m) return next();
          const [, kind, slug, rawName] = m;
          const name = decodeURIComponent(rawName);
          if (!SLUG_RE.test(slug) || name.includes('..') || name.includes('/')) return next();
          const abs = path.join(TITLES_DIR, slug, kind === 'files' ? name : path.join('screenshots', name));
          if (!existsSync(abs)) return next();
          res.setHeader('Content-Type', kind === 'files'
            ? 'application/octet-stream'
            : IMAGE_TYPES[path.extname(name).toLowerCase()] ?? 'application/octet-stream');
          createReadStream(abs).pipe(res);
        });
      },

      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const titles = await readCatalog();
        let files = 0;
        let shots = 0;
        for (const t of titles) {
          for (const f of t.files) {
            await mkdir(path.join(out, 'files', t.slug), { recursive: true });
            await cp(path.join(t.dir, f.path), path.join(out, 'files', t.slug, f.path));
            files++;
          }
          for (const s of t.screenshots) {
            await mkdir(path.join(out, 'screenshots', t.slug), { recursive: true });
            await cp(path.join(t.dir, 'screenshots', s), path.join(out, 'screenshots', t.slug, s));
            shots++;
          }
        }
        await writeFile(path.join(out, 'manifest.json'), serializeManifest(buildManifest(titles)));
        // Transitional support file for the api.mzpico.com Worker shim (legacy
        // /list + /download emulation). Not part of the manifest contract.
        const legacy = {};
        for (const t of titles) {
          const folder = /folder ([a-z0-9-]+)/.exec(t.meta.source ?? '')?.[1] ?? 'programs';
          legacy[folder] ??= [];
          for (const f of t.files) legacy[folder].push({ name: f.path, size: f.size, path: `/files/${t.slug}/${f.path}` });
        }
        for (const k of Object.keys(legacy)) legacy[k].sort((a, b) => a.name.localeCompare(b.name));
        await writeFile(path.join(out, 'legacy-api.json'), JSON.stringify(legacy) + '\n');

        // Cross-origin isolation has to cover the localized play pages too
        // (/cs/play/..., /de/play/...): without COOP/COEP there is no
        // SharedArrayBuffer, and the emulator's pthread build refuses to run.
        // Derived from the built output, so a new language needs no edit here.
        const localePlayDirs = (await readdir(out, { withFileTypes: true }))
          .filter((e) => e.isDirectory() && e.name !== 'play' && existsSync(path.join(out, e.name, 'play')))
          .map((e) => e.name)
          .sort();
        if (localePlayDirs.length) {
          const headersPath = path.join(out, '_headers');
          const rules = localePlayDirs
            .map((l) => `\n/${l}/play/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n  Cache-Control: public, max-age=3600\n`)
            .join('');
          const existing = await readFile(headersPath, 'utf8').catch(() => '');
          await writeFile(headersPath, `${existing}${rules}`);
          logger.info(`cross-origin isolation headers for localized play pages: ${localePlayDirs.join(', ')}`);
        }

        // Staging builds also ask crawlers to stay away at the HTTP level
        // (the pages carry a noindex meta tag as well).
        if (process.env.MZ_STAGING === '1') {
          const headersPath = path.join(out, '_headers');
          const existing = await readFile(headersPath, 'utf8').catch(() => '');
          await writeFile(headersPath, `${existing}\n# Staging preview — keep it out of search results.\n/*\n  X-Robots-Tag: noindex, nofollow\n`);
        }
        logger.info(`${titles.length} titles: copied ${files} MZF file(s), ${shots} screenshot(s), wrote manifest.json + legacy-api.json`);
      },
    },
  };
}
