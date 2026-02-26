#!/usr/bin/env node

/**
 * Generate sitemap.xml from the tool registry.
 * Run: node scripts/generate-sitemap.js
 * Output: client/public/sitemap.xml
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://toolspilot.work';
const today = new Date().toISOString().split('T')[0];

// Parse tool paths from the registry
const registryPath = join(__dirname, '../client/src/lib/toolRegistry.js');
const raw = readFileSync(registryPath, 'utf-8');

// Extract all path values
const paths = [];
const pathRegex = /path:\s*'([^']+)'/g;
let match;
while ((match = pathRegex.exec(raw)) !== null) {
  paths.push(match[1]);
}

// Static pages
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
];

// Category pages
const categories = [
  'image', 'document', 'text', 'developer', 'media',
  'finance', 'ai', 'student', 'design', 'security',
  'seo', 'utility', 'spreadsheet',
];

const categoryPages = categories.map((c) => ({
  path: `/category/${c}`,
  priority: '0.7',
  changefreq: 'weekly',
}));

// Tool pages
const toolPages = paths.map((p) => ({
  path: p,
  priority: '0.8',
  changefreq: 'monthly',
}));

const allPages = [...staticPages, ...categoryPages, ...toolPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

const outPath = join(__dirname, '../client/public/sitemap.xml');
writeFileSync(outPath, xml, 'utf-8');
console.log(`Sitemap generated: ${allPages.length} URLs → ${outPath}`);
