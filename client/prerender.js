/**
 * Post-build prerender script.
 *
 * Generates static HTML files for every route so that search-engine crawlers
 * (and social-media link previews) receive fully-rendered markup without
 * needing to execute JavaScript.
 *
 * How it works:
 *   1. `vite build` produces the SPA in `dist/`.
 *   2. This script serves `dist/` on a local port.
 *   3. Puppeteer visits each route, waits for React to render, then saves
 *      the resulting HTML to `dist/<route>/index.html`.
 *   4. Nginx's `try_files $uri $uri/ /index.html` will serve the prerendered
 *      file when it exists, falling back to the SPA shell otherwise.
 *
 * Usage:  node prerender.js          (runs after `vite build`)
 * CI:     npm run build              (package.json wires both steps)
 */

import { launch } from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = 4173;

// ── Route list ──────────────────────────────────────────────────────
// We read the sitemap to extract every <loc> URL rather than duplicating
// the route list. This keeps the source of truth in one place.
function getRoutesFromSitemap() {
  const sitemap = readFileSync(join(__dirname, 'public', 'sitemap.xml'), 'utf-8');
  const matches = [...sitemap.matchAll(/<loc>https:\/\/toolspilot\.work([^<]*)<\/loc>/g)];
  return matches.map((m) => m[1] || '/');
}

// ── Minimal static file server ──────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url);

      // SPA fallback — if the file doesn't exist, serve index.html
      if (!existsSync(filePath) || !extname(filePath)) {
        filePath = join(DIST, 'index.html');
      }

      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(PORT, () => {
      console.log(`  Static server on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

// ── Prerender logic ─────────────────────────────────────────────────
async function prerender() {
  const routes = getRoutesFromSitemap();
  console.log(`\n⚡ Prerendering ${routes.length} routes...\n`);

  const server = await serve();
  const browser = await launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  let success = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const page = await browser.newPage();

      // Block images/fonts/media to speed up rendering
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'font', 'media'].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      // Wait a bit for React to finish DOM manipulation (SEOHead, structured data)
      await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));

      const html = await page.content();

      // Write to dist/<route>/index.html
      const outDir = join(DIST, route === '/' ? '' : route);
      mkdirSync(outDir, { recursive: true });
      const outFile = join(outDir, 'index.html');
      writeFileSync(outFile, html, 'utf-8');

      success++;
      if (success % 20 === 0 || success === routes.length) {
        console.log(`  ✓ ${success}/${routes.length} rendered`);
      }

      await page.close();
    } catch (err) {
      failed++;
      console.error(`  ✗ Failed: ${route} — ${err.message}`);
    }
  }

  await browser.close();
  server.close();

  console.log(`\n✅ Prerender complete: ${success} succeeded, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

prerender().catch((err) => {
  console.error('Prerender crashed:', err);
  process.exit(1);
});
