// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

// Entries with `unlisted: true` in their frontmatter stay out of the sitemap.
const entriesDir = 'src/content/entries';
const unlistedSlugs = fs
  .readdirSync(entriesDir)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => /^unlisted:\s*true\s*$/m.test(fs.readFileSync(path.join(entriesDir, file), 'utf8')))
  .map((file) => file.replace(/\.md$/, ''));

// https://astro.build/config
export default defineConfig({
  site: 'https://viktorpatchlog.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      filter: (page) => !unlistedSlugs.some((slug) => page.includes(`/entry/${slug}`)),
    }),
  ],
  server: { host: '0.0.0.0' },
});
