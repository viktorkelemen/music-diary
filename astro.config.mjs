// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://viktorpatchlog.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap()],
  server: { host: '0.0.0.0' },
});
