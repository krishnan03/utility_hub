import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { rm } from 'node:fs/promises';
import path from 'path';
import app from '../../index.js';
import config from '../../config/index.js';
import { clearAll } from '../../services/fileStore.js';

const outputDir = path.join(config.uploadDir, 'output');

afterAll(async () => {
  clearAll();
  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('QR Routes', () => {
  describe('POST /api/qr/generate', () => {
    it('should generate a QR code and return ProcessResponse', async () => {
      const res = await request(app)
        .post('/api/qr/generate')
        .send({ data: 'https://example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.fileId).toBeDefined();
      expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
      expect(res.body.metadata.mimeType).toBe('image/png');
      expect(res.body.metadata.outputSize).toBeGreaterThan(0);
      expect(res.body.metadata.expiresAt).toBeDefined();
    });

    it('should accept custom QR options', async () => {
      const res = await request(app)
        .post('/api/qr/generate')
        .send({
          data: 'Hello World',
          color: '#ff0000',
          background: '#00ff00',
          size: 300,
          errorCorrection: 'H',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.metadata.mimeType).toBe('image/png');
    });

    it('should return 400 when data is missing', async () => {
      const res = await request(app)
        .post('/api/qr/generate')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('data');
    });

    it('should return 400 for invalid error correction level', async () => {
      const res = await request(app)
        .post('/api/qr/generate')
        .send({ data: 'test', errorCorrection: 'Z' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('error correction');
    });

    it('should make the generated file downloadable', async () => {
      const genRes = await request(app)
        .post('/api/qr/generate')
        .send({ data: 'download-test' })
        .expect(200);

      const downloadRes = await request(app)
        .get(genRes.body.downloadUrl)
        .set('Cookie', genRes.headers['set-cookie'] || [])
        .expect(200);

      expect(downloadRes.headers['content-type']).toMatch(/image\/png/);
    });
  });

  describe('POST /api/qr/barcode', () => {
    it('should generate a CODE128 barcode and return ProcessResponse', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: 'ABC-123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.fileId).toBeDefined();
      expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
      expect(res.body.metadata.mimeType).toBe('image/svg+xml');
      expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    });

    it('should accept a specific barcode format', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: '590123412345', format: 'EAN13' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.metadata.mimeType).toBe('image/svg+xml');
    });

    it('should generate UPC-A barcode', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: '03600029145', format: 'UPCA' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 when data is missing', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('data');
    });

    it('should return 400 for unsupported barcode format', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: 'test', format: 'INVALID' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Unsupported barcode format');
    });

    it('should return 400 for EAN-13 with invalid data', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: 'not-digits', format: 'EAN13' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('EAN-13');
    });

    it('should return 400 for UPC-A with invalid data', async () => {
      const res = await request(app)
        .post('/api/qr/barcode')
        .send({ data: 'abc', format: 'UPCA' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('UPC-A');
    });

    it('should make the generated barcode downloadable', async () => {
      const genRes = await request(app)
        .post('/api/qr/barcode')
        .send({ data: 'download-barcode-test' })
        .expect(200);

      const downloadRes = await request(app)
        .get(genRes.body.downloadUrl)
        .set('Cookie', genRes.headers['set-cookie'] || [])
        .expect(200);

      expect(downloadRes.headers['content-type']).toMatch(/svg/);
    });
  });
});
