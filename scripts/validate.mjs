#!/usr/bin/env node
// Validate every titles/<slug>/ folder: schema, file references, MZF
// sanity. Exit code 1 on any error. Warnings never fail the run.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import {
  TITLES_DIR, SCHEMA_PATH, SLUG_RE, SCREENSHOT_EXTENSIONS,
  MZF_HEADER_SIZE, MZF_ATTRIBUTES, parseMzfHeader, listTitleSlugs,
} from './lib/catalog.mjs';

const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strictRequired: false });
const validateMeta = ajv.compile(schema);

let errors = 0;
let warnings = 0;
const noScreenshots = [];
const fail = (slug, msg) => { errors++; console.error(`  ERROR  ${slug}: ${msg}`); };
const warn = (slug, msg) => { warnings++; console.warn(`  warn   ${slug}: ${msg}`); };

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function checkTitle(slug) {
  const dir = path.join(TITLES_DIR, slug);
  if (!SLUG_RE.test(slug)) fail(slug, `folder name must match ${SLUG_RE} (lowercase, digits, hyphens)`);

  // --- meta.yaml
  const metaPath = path.join(dir, 'meta.yaml');
  if (!(await exists(metaPath))) return fail(slug, 'meta.yaml is missing');
  let meta;
  try {
    meta = YAML.parse(await readFile(metaPath, 'utf8'));
  } catch (err) {
    return fail(slug, `meta.yaml does not parse: ${err.message}`);
  }
  if (!validateMeta(meta)) {
    for (const e of validateMeta.errors) {
      const where = e.instancePath || '(root)';
      const extra = e.keyword === 'additionalProperty' || e.params?.additionalProperty
        ? ` (${e.params.additionalProperty})` : e.params?.allowedValues ? ` [${e.params.allowedValues.join(', ')}]` : '';
      fail(slug, `meta.yaml ${where} ${e.message}${extra}`);
    }
    return; // file checks below depend on a well-formed files[]
  }

  // --- referenced files
  const listed = new Set();
  for (const f of meta.files) {
    if (listed.has(f.path)) fail(slug, `files[]: "${f.path}" listed twice`);
    listed.add(f.path);
    const abs = path.join(dir, f.path);
    if (!(await exists(abs))) { fail(slug, `files[]: "${f.path}" does not exist`); continue; }
    const buf = await readFile(abs);
    if (buf.length < MZF_HEADER_SIZE) { fail(slug, `${f.path}: shorter than a 128-byte MZF header`); continue; }
    const h = parseMzfHeader(buf);
    if (!(h.attribute in MZF_ATTRIBUTES)) warn(slug, `${f.path}: unusual MZF attribute 0x${h.attribute.toString(16)}`);
    const expected = MZF_HEADER_SIZE + h.dataSize;
    const extra = buf.length - expected;
    // The legacy pipeline padded files to 128/512-byte boundaries — benign.
    const isPadding = extra > 0 && extra < 512 && (buf.length % 128 === 0 || buf.length % 512 === 0);
    if (buf.length !== expected && !isPadding) {
      warn(slug, `${f.path}: header declares ${h.dataSize} data bytes (file would be ${expected}), actual file is ${buf.length} bytes — trailing data?`);
    }
  }

  // --- folder contents: no orphans, nothing unexpected
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (name === 'meta.yaml' || name === 'README.md') continue;
    if (entry.isDirectory()) {
      if (name === 'screenshots') continue;
      fail(slug, `unexpected directory "${name}" (only screenshots/ is allowed)`);
      continue;
    }
    if (name.toLowerCase().endsWith('.mzf')) {
      if (!listed.has(name)) fail(slug, `"${name}" is not listed in meta.yaml files[]`);
      continue;
    }
    fail(slug, `unexpected file "${name}"`);
  }

  // --- screenshots
  const shotsDir = path.join(dir, 'screenshots');
  if (await exists(shotsDir)) {
    const shots = await readdir(shotsDir, { withFileTypes: true });
    if (shots.length === 0) warn(slug, 'screenshots/ is empty');
    for (const s of shots) {
      const ext = path.extname(s.name).toLowerCase();
      if (!s.isFile() || !SCREENSHOT_EXTENSIONS.has(ext)) fail(slug, `screenshots/${s.name}: only image files (${[...SCREENSHOT_EXTENSIONS].join(', ')}) are allowed`);
      else if (!/^[a-z0-9][a-z0-9._-]*$/.test(s.name)) fail(slug, `screenshots/${s.name}: use lowercase letters, digits, ".", "_" or "-" in file names`);
    }
  } else {
    noScreenshots.push(slug);
  }
}

const slugs = await listTitleSlugs();
if (slugs.length === 0) { console.error('titles/ contains no titles'); process.exit(1); }
console.log(`Validating ${slugs.length} title(s) in ${path.relative(process.cwd(), TITLES_DIR) || '.'} …`);
for (const slug of slugs) await checkTitle(slug);
if (noScreenshots.length) {
  warnings++;
  console.warn(`  warn   ${noScreenshots.length} title(s) have no screenshots yet`);
}

console.log(`${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
