import { defineConfig } from 'astro/config';
import catalog from './integrations/catalog.mjs';

// Canonical origin. Never point this at a *.pages.dev host.
export default defineConfig({
  site: 'https://software.mzpico.org',
  output: 'static',
  trailingSlash: 'always',
  integrations: [catalog()],
});
