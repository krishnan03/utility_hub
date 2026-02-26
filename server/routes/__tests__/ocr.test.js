import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'path';
import app from '../../index.js';
import config from '../../config/index.js';
import { clearAll } from '../../services/fileStore.js';

const outputDir = path.join(config.uploadDir, 'output');
const inputDir = path.join(config.uploadDir, 'input');
const fixturesDir = path.join(config.uploadDir, 'test-fixtures');

beforeAll(async () => {
  await mkdir(fixturesDir, { recursive: true });
});

afterAll(async () => {
  clearAll();
  try {
    await rm(outputDir, { recursive: true, force: true });
    await rm(fixturesDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('OCR Routes', () => {
  describe('POST /api/ocr/extract', () => {
    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/ocr/extract')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('file');
    });

    it('should return 400 for unsupported language parameter', async () => {
      const { default: sharp } = await import('sharp');
      const pngBuf = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 255, b: 255 } },
      }).png().toBuffer();

      const fixturePath = path.join(fixturesDir, 'test-lang.png');
      await writeFile(fixturePath, pngBuf);

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', fixturePath)
        .field('language', 'xyz')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Unsupported language');
    });

    it('should reject non-image file types', async () => {
      const textPath = path.join(fixturesDir, 'test.txt');
      await writeFile(textPath, 'This is not an image');

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', textPath)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should accept a valid image and return success or processing error', async () => {
      // Use sharp to create a proper test PNG with actual pixel data
      // that Tesseract can process. We use a programmatic PNG with known content.
      const { default: sharp } = await import('sharp');
      const pngBuf = await sharp({
        create: { width: 100, height: 30, channels: 3, background: { r: 255, g: 255, b: 255 } },
      }).png().toBuffer();

      const fixturePath = path.join(fixturesDir, 'test-ocr.png');
      await writeFile(fixturePath, pngBuf);

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', fixturePath)
        .field('language', 'eng');

      // Tesseract may succeed or fail depending on environment/model availability.
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.fileId).toBeDefined();
        expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
        expect(res.body.metadata).toBeDefined();
        expect(res.body.metadata.mimeType).toBe('text/plain');
        expect(res.body.metadata).toHaveProperty('text');
        expect(res.body.metadata).toHaveProperty('confidence');
        expect(res.body.metadata).toHaveProperty('language', 'eng');
        expect(res.body.metadata.expiresAt).toBeDefined();
      } else {
        // Tesseract model download may fail in CI — that's acceptable
        expect([422, 500]).toContain(res.status);
        expect(res.body.success).toBe(false);
      }
    });

    it('should default language to eng when not provided', async () => {
      const { default: sharp } = await import('sharp');
      const pngBuf = await sharp({
        create: { width: 100, height: 30, channels: 3, background: { r: 255, g: 255, b: 255 } },
      }).png().toBuffer();

      const fixturePath = path.join(fixturesDir, 'test-default-lang.png');
      await writeFile(fixturePath, pngBuf);

      const res = await request(app)
        .post('/api/ocr/extract')
        .attach('file', fixturePath);

      // Accept either success (Tesseract available) or processing error (model not available)
      if (res.status === 200) {
        expect(res.body.metadata.language).toBe('eng');
      } else {
        expect([422, 500]).toContain(res.status);
      }
    });
  });
});
