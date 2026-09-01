import { defineCollection, z } from 'astro:content';
// @ts-ignore — plain ESM helper shared with the CLI scripts
import { readCatalog, TITLES_DIR } from '../../scripts/lib/catalog.mjs';

// The authoritative schema for meta.yaml is schema/meta.schema.json
// (enforced by scripts/validate.mjs). This zod schema only types the
// loader output, which adds slug, screenshots and per-file derived data.
const mzfHeader = z.object({
  attribute: z.number().int(),
  attributeName: z.string(),
  name: z.string(),
  dataSize: z.number().int(),
  loadAddress: z.number().int(),
  execAddress: z.number().int(),
});

const file = z.object({
  path: z.string(),
  kind: z.enum(['standard', 'turbo', 'alt-dump']),
  note: z.string().optional(),
  size: z.number().int(),
  crc32: z.string(),
  header: mzfHeader.nullable(),
});

const titles = defineCollection({
  loader: {
    name: 'mz-catalog-titles',
    load: async ({ store, parseData, logger, watcher }) => {
      const reload = async () => {
        const catalog = await readCatalog();
        store.clear();
        for (const t of catalog) {
          const data = await parseData({
            id: t.slug,
            data: { ...t.meta, slug: t.slug, files: t.files, screenshots: t.screenshots },
          });
          store.set({ id: t.slug, data });
        }
        logger.info(`Loaded ${catalog.length} title(s) from titles/`);
      };
      await reload();
      if (watcher) {
        watcher.add(TITLES_DIR);
        watcher.on('all', (_event: string, changed: string) => {
          if (changed.startsWith(TITLES_DIR)) reload().catch((err) => logger.error(String(err)));
        });
      }
    },
  },
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    year: z.number().int().optional(),
    publisher: z.string().optional(),
    genre: z.array(z.string()),
    machine: z.enum(['mz-700', 'mz-800', 'mz-1500']),
    mode: z.enum(['native', 'mz-700']).optional(),
    language: z.string().optional(),
    files: z.array(file).min(1),
    description: z.string().optional(),
    controls: z.string().optional(),
    touch: z
      .object({
        pad: z.union([z.enum(['cursor', 'wasd', 'none']), z.object({ up: z.string(), down: z.string(), left: z.string(), right: z.string() })]).optional(),
        buttons: z.array(z.object({ label: z.string(), key: z.string() })).optional(),
        extra: z.array(z.object({ label: z.string(), key: z.string() })).optional(),
      })
      .optional(),
    source: z.string().optional(),
    screenshots: z.array(z.string()),
  }),
});

export const collections = { titles };
