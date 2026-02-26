import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../index.js';
import { clearAll } from '../services/fileStore.js';

let tmpDir;
let testPngPath;
let testTxtPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-route-test-'));

  testPngPath = path.join(tmpDir, 'test.png');
  await sharp({
    create: { width: 8, height: 8, channels: 4, background: { r: 100, g: 100, b: 255, alpha: 1 } },
  })
    .png()
    .toFile(testPngPath);

  // Create a non-image file for rejection testing
  testTxtPath = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(testTxtPath, 'not an image');
});

afterAll(() => {
  clearAll();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/image/convert', () => {
  it('should convert a single image', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'webp')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
    expect(res.body.metadata.mimeType).toBe('image/webp');
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
  });

  it('should convert batch images', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'jpg')
      .attach('files', testPngPath)
      .attach('files', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
    for (const r of res.body.results) {
      expect(r.success).toBe(true);
      expect(r.metadata.mimeType).toBe('image/jpeg');
    }
  });

  it('should return error when targetFormat is missing', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .attach('file', testPngPath);

    expect(res.status).toBe(400);
  });

  it('should return error when no files are uploaded', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'png');

    expect(res.status).toBe(400);
  });

  it('should return error for unsupported target format', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'xyz')
      .attach('file', testPngPath);

    expect(res.status).toBe(422);
  });

  it('should respect preserveMetadata=false', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'png')
      .field('preserveMetadata', 'false')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject non-image files', async () => {
    const res = await request(app)
      .post('/api/image/convert')
      .field('targetFormat', 'png')
      .attach('file', testTxtPath);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/image/compress', () => {
  it('should compress a single image with default settings', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
    expect(res.body.metadata.originalSize).toBeGreaterThan(0);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
  });

  it('should compress with custom quality and lossy mode', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .field('quality', '50')
      .field('mode', 'lossy')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.originalSize).toBeGreaterThan(0);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
  });

  it('should compress in lossless mode', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .field('mode', 'lossless')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should compress batch images', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .field('quality', '70')
      .attach('files', testPngPath)
      .attach('files', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
    for (const r of res.body.results) {
      expect(r.success).toBe(true);
      expect(r.metadata.originalSize).toBeGreaterThan(0);
      expect(r.metadata.outputSize).toBeGreaterThan(0);
    }
  });

  it('should return error when no files are uploaded', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .field('quality', '80');

    expect(res.status).toBe(400);
  });

  it('should reject non-image files', async () => {
    const res = await request(app)
      .post('/api/image/compress')
      .attach('file', testTxtPath);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/image/resize', () => {
  it('should resize a single image with width and height', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '4')
      .field('height', '4')
      .field('maintainAspectRatio', 'false')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
    expect(res.body.metadata.width).toBe(4);
    expect(res.body.metadata.height).toBe(4);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
  });

  it('should resize with only width (aspect ratio preserved)', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '4')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(4);
    // Original is 8x8 square, so height should also be 4
    expect(res.body.metadata.height).toBe(4);
  });

  it('should resize by percentage', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('percentage', '50')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 8x8 at 50% → 4x4
    expect(res.body.metadata.width).toBe(4);
    expect(res.body.metadata.height).toBe(4);
  });

  it('should resize using a preset', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('preset', 'youtube-thumbnail')
      .field('maintainAspectRatio', 'false')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(1280);
    expect(res.body.metadata.height).toBe(720);
  });

  it('should resize batch images', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '4')
      .field('height', '4')
      .field('maintainAspectRatio', 'false')
      .attach('files', testPngPath)
      .attach('files', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
    for (const r of res.body.results) {
      expect(r.success).toBe(true);
      expect(r.metadata.width).toBe(4);
      expect(r.metadata.height).toBe(4);
    }
  });

  it('should default maintainAspectRatio to true', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '4')
      .field('height', '2')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    // 8x8 inside 4x2 with aspect ratio → should fit inside, so 2x2
    expect(res.body.metadata.width).toBeLessThanOrEqual(4);
    expect(res.body.metadata.height).toBeLessThanOrEqual(2);
  });

  it('should return error when no files are uploaded', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '100');

    expect(res.status).toBe(400);
  });

  it('should return error when no dimensions provided', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .attach('file', testPngPath);

    expect(res.status).toBe(422);
  });

  it('should reject non-image files', async () => {
    const res = await request(app)
      .post('/api/image/resize')
      .field('width', '100')
      .attach('file', testTxtPath);

    expect(res.status).toBe(400);
  });
});


let testLargePngPath;

beforeAll(async () => {
  // Create a larger image (100x80) for edit route tests
  testLargePngPath = path.join(tmpDir, 'test-large-route.png');
  await sharp({
    create: { width: 100, height: 80, channels: 4, background: { r: 128, g: 64, b: 200, alpha: 1 } },
  })
    .png()
    .toFile(testLargePngPath);
});

describe('POST /api/image/edit', () => {
  it('should crop a single image with explicit coordinates', async () => {
    const ops = JSON.stringify({ crop: { left: 10, top: 10, width: 50, height: 40 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
    expect(res.body.metadata.width).toBe(50);
    expect(res.body.metadata.height).toBe(40);
  });

  it('should crop with a preset aspect ratio', async () => {
    const ops = JSON.stringify({ crop: { preset: '1:1' } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(80);
    expect(res.body.metadata.height).toBe(80);
  });

  it('should rotate an image by 90 degrees', async () => {
    const ops = JSON.stringify({ rotate: { angle: 90 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(80);
    expect(res.body.metadata.height).toBe(100);
  });

  it('should flip an image horizontally', async () => {
    const ops = JSON.stringify({ flip: { direction: 'horizontal' } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(100);
    expect(res.body.metadata.height).toBe(80);
  });

  it('should apply a text watermark', async () => {
    const ops = JSON.stringify({ watermark: { text: 'Test', position: 'center', opacity: 0.5 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.width).toBe(100);
    expect(res.body.metadata.height).toBe(80);
  });

  it('should apply batch edit operations (same ops to multiple files)', async () => {
    const ops = JSON.stringify({ rotate: { angle: 180 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('files', testLargePngPath)
      .attach('files', testLargePngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
    for (const r of res.body.results) {
      expect(r.success).toBe(true);
      expect(r.metadata.width).toBe(100);
      expect(r.metadata.height).toBe(80);
    }
  });

  it('should return error when no files are uploaded', async () => {
    const ops = JSON.stringify({ rotate: { angle: 90 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops);

    expect(res.status).toBe(400);
  });

  it('should return error when operations is missing', async () => {
    const res = await request(app)
      .post('/api/image/edit')
      .attach('file', testLargePngPath);

    expect(res.status).toBe(400);
  });

  it('should return error for invalid operations JSON', async () => {
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', '{invalid json}')
      .attach('file', testLargePngPath);

    expect(res.status).toBe(400);
  });

  it('should reject non-image files', async () => {
    const ops = JSON.stringify({ rotate: { angle: 90 } });
    const res = await request(app)
      .post('/api/image/edit')
      .field('operations', ops)
      .attach('file', testTxtPath);

    expect(res.status).toBe(400);
  });
});
