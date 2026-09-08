import { defineConfig } from 'astro/config';
import catalog from './integrations/catalog.mjs';

// Canonical origin. Never point this at a *.pages.dev host.
export default defineConfig({
  site: 'https://mzpico.com',
  output: 'static',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'cs', 'de', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
  trailingSlash: 'always',
  integrations: [catalog()],
});
