import { defineCollection, z } from 'astro:content';
// @ts-ignore — plain ESM helper shared with the CLI scripts
import { readCatalog, TITLES_DIR } from '../../scripts/lib/catalog.mjs';

// One warp step: tests joined by &&, all true at once: pc == A, [A] == V, [A] != V, [A] & M == V
// (A, M, V: hex 0x.. or decimal; the emulator's parser, mzarch.c mzwasm_warp_parse_step).
const N = '(?:0[xX][0-9a-fA-F]+|0|[1-9][0-9]*)';
const WARP_TEST = `(?:pc\\s*==\\s*${N}|\\[\\s*${N}\\s*\\](?:\\s*&\\s*${N})?\\s*[!=]=\\s*${N})`;
export const WARP_STEP = new RegExp(`^\\s*${WARP_TEST}(?:\\s*&&\\s*${WARP_TEST}){0,4}\\s*$`);

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

const localized = z.union([
  z.string(),
  z.object({ en: z.string(), cs: z.string().optional(), de: z.string().optional(), ja: z.string().optional() }),
]);

const file = z.object({
  path: z.string(),
  kind: z.enum(['standard', 'turbo', 'alt-dump', 'disk']),
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
            data: { ...t.meta, slug: t.slug, files: t.files, ports: t.ports, screenshots: t.screenshots },
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
    original: z.object({ title: z.string().optional(), publisher: z.string().optional(), year: z.number().int().optional() }).optional(),
    genre: z.array(z.string()),
    machine: z.enum(['mz-700', 'mz-800', 'mz-1500']),
    mode: z.enum(['native', 'mz-700']).optional(),
    port: z.enum(['zx-spectrum', 'msx', 'c64', 'atari', 'arcade']).optional(),
    language: z.string().optional(),
    files: z.array(file).min(1),
    // Either English prose or a per-language map (en required, the fallback).
    description: z
      .union([
        z.string(),
        z.object({ en: z.string(), cs: z.string().optional(), de: z.string().optional(), ja: z.string().optional() }),
      ])
      .optional(),
    controls: z.string().optional(),
    web: z.boolean().optional(),
    network: z.boolean().optional(),          // plays over the internet (badge)
    saves: z.boolean().optional(),            // false = no saved positions on the play page
    // the browser emulator's machine for this title (play page only; site/src/lib/mz/machine.ts titleMachine)
    hardware: z
      .object({
        ramdisk: z.enum(['none', '64K', '256K', '512K', '1M', '16M']).optional(),
        mzpico: z.boolean().optional(),
        joy1: z.enum(['NONE', 'NUM_KEYPAD', 'JOYSTICK']).optional(),
        joy2: z.enum(['NONE', 'NUM_KEYPAD', 'JOYSTICK']).optional(),
      })
      .optional(),
    // the play page runs the machine at full speed, silent, until the program reaches a point
    // (a long loader), then normal speed with sound (Play.astro; emulator: mz_wasm_warp_start)
    warp: z
      .object({
        until: z.array(z.string().regex(WARP_STEP)).min(1).max(4),
        max_seconds: z.number().int().min(1).max(600),
      })
      .optional(),
    play: z.string().regex(/^\/[a-z0-9_\/-]*\/$/).optional(),   // a native browser build played instead of the emulator (a site path)
    // front-page spotlight: a short pitch per language (en required)
    spotlight: z.object({ en: z.string(), cs: z.string().optional(), de: z.string().optional(), ja: z.string().optional() }).optional(),
    touch: z
      .object({
        pad: z.union([z.enum(['cursor', 'wasd', 'none']), z.object({ up: z.string(), down: z.string(), left: z.string(), right: z.string() })]).optional(),
        buttons: z.array(z.object({ label: z.string(), key: z.string() })).optional(),
        extra: z.array(z.object({ label: z.string(), key: z.string() })).optional(),
      })
      .optional(),
    source: z.string().optional(),
    // the same title on other machines (ports[]), download only (never in manifest.json)
    ports: z
      .array(
        z.object({
          machine: z.string(),
          name: z.string(),
          play: z.boolean().optional(),
          guide: z.string().optional(),
          files: z.array(z.object({ path: z.string(), label: z.string().optional(), size: z.number().int() })),
          needs: localized.optional(),
          network: localized.optional(),
          keys: localized.optional(),
          limits: localized.optional(),
        }),
      )
      .optional(),
    version: z.string().optional(),
    release: z.string().optional(),
    screenshots: z.array(z.string()),
  }),
});

export const collections = { titles };
