import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { rm } from 'node:fs/promises';
import app from '../../index.js';
import config from '../../config/index.js';
import { clearAll } from '../../services/fileStore.js';

const outputDir = path.join(config.uploadDir, 'output');
let tmpDir;
let testPngPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'favicon-route-test-'));

  testPngPath = path.join(tmpDir, 'icon.png');
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } },
  })
    .png()
    .toFile(testPngPath);
});

afterAll(async () => {
  clearAll();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('Favicon Routes', () => {
  describe('POST /api/favicon/generate', () => {
    it('should generate favicons and return ProcessResponse with ZIP', async () => {
      const res = await request(app)
        .post('/api/favicon/generate')
        .attach('file', testPngPath)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.fileId).toBeDefined();
      expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
      expect(res.body.metadata.mimeType).toBe('application/zip');
      expect(res.body.metadata.outputSize).toBeGreaterThan(0);
      expect(res.body.metadata.outputName).toBe('favicons.zip');
      expect(res.body.metadata.expiresAt).toBeDefined();
      expect(res.body.metadata.sizes).toHaveLength(8);
    });

    it('should include all expected sizes in metadata', async () => {
      const res = await request(app)
        .post('/api/favicon/generate')
        .attach('file', testPngPath)
        .expect(200);

      const sizes = res.body.metadata.sizes.map((s) => s.size);
      expect(sizes).toContain(16);
      expect(sizes).toContain(32);
      expect(sizes).toContain(180);
      expect(sizes).toContain(512);
    });

    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/favicon/generate')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should make the generated ZIP downloadable', async () => {
      const genRes = await request(app)
        .post('/api/favicon/generate')
        .attach('file', testPngPath)
        .expect(200);

      const downloadRes = await request(app)
        .get(genRes.body.downloadUrl)
        .set('Cookie', genRes.headers['set-cookie'] || [])
        .expect(200);

      expect(downloadRes.headers['content-type']).toMatch(/zip|octet-stream/);
    });

    it('should reject non-image files', async () => {
      const textFile = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(textFile, 'not an image');

      const res = await request(app)
        .post('/api/favicon/generate')
        .attach('file', textFile)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});
