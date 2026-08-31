// Astro integration that makes the catalog binaries part of the site:
//  - dev:   serves /files/<slug>/<name>, /screenshots/<slug>/<name> and
//           /manifest.json straight from titles/
//  - build: copies MZF files + screenshots into dist/ and writes
//           dist/manifest.json
import { cp, mkdir, writeFile } from 'node:fs/promises';
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
        logger.info(`${titles.length} titles: copied ${files} MZF file(s), ${shots} screenshot(s), wrote manifest.json`);
      },
    },
  };
}
