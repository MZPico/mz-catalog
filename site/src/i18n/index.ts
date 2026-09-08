import { en, type Ui } from './en';
import { cs } from './cs';
import { de } from './de';
import { ja } from './ja';

export const locales = ['en', 'cs', 'de', 'ja'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'en';

const dictionaries: Record<Lang, Ui> = { en, cs, de, ja };

// Astro does not type-check during `astro build`, so a missing key would quietly
// render as "undefined". Compare the shapes ourselves and fail the build instead.
function shapeKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => shapeKeys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof value}`];
}
const reference = shapeKeys(en).sort();
for (const lang of locales) {
  if (lang === defaultLang) continue;
  const actual = shapeKeys(dictionaries[lang]).sort();
  const missing = reference.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !reference.includes(k));
  if (missing.length || extra.length) {
    throw new Error(
      `i18n dictionary "${lang}" does not match "en"` +
        (missing.length ? `\n  missing/different: ${missing.join(', ')}` : '') +
        (extra.length ? `\n  unexpected: ${extra.join(', ')}` : ''),
    );
  }
}

export const useTranslations = (lang: Lang): Ui => dictionaries[lang] ?? en;

/** Locale of a rendered URL: /cs/... -> cs, everything else -> en. */
export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split('/')[1] as Lang;
  return seg !== defaultLang && (locales as readonly string[]).includes(seg) ? seg : defaultLang;
}

/** Prefix an absolute site path with the locale (English stays at the root). */
export const localizePath = (lang: Lang, path: string): string =>
  lang === defaultLang ? path : `/${lang}${path}`;

/** The same page without its locale prefix, for language switching and hreflang. */
export function stripLang(pathname: string): string {
  const seg = pathname.split('/')[1] as Lang;
  if (seg !== defaultLang && (locales as readonly string[]).includes(seg)) {
    const rest = pathname.slice(seg.length + 1);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

export { en };
export type { Ui };
