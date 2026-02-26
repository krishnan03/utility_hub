import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../index.js';

let tmpDir;
let testPngPath;
let bgImagePath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-route-test-'));

  // Create a test image with white background and red center
  const width = 50;
  const height = 50;
  const channels = 4;
  const rawData = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (x >= 15 && x < 35 && y >= 15 && y < 35) {
        rawData[idx] = 255; rawData[idx + 1] = 0; rawData[idx + 2] = 0; rawData[idx + 3] = 255;
      } else {
        rawData[idx] = 255; rawData[idx + 1] = 255; rawData[idx + 2] = 255; rawData[idx + 3] = 255;
      }
    }
  }

  testPngPath = path.join(tmpDir, 'test.png');
  await sharp(rawData, { raw: { width, height, channels } }).png().toFile(testPngPath);

  // Background replacement image
  bgImagePath = path.join(tmpDir, 'bg.png');
  await sharp({
    create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
  }).png().toFile(bgImagePath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/image/remove-bg', () => {
  it('should remove background from a single file', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/.+\/download$/);
    expect(res.body.metadata.mimeType).toBe('image/png');
    expect(res.body.metadata.originalSize).toBeGreaterThan(0);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    expect(res.body.metadata.expiresAt).toBeTruthy();
  });

  it('should process batch files (field: files)', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('files', testPngPath)
      .attach('files', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].fileId).toBeTruthy();
    expect(res.body.results[1].fileId).toBeTruthy();
  });

  it('should accept replacementColor parameter', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('file', testPngPath)
      .field('replacementColor', '#00FF00');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.mimeType).toBe('image/png');
  });

  it('should accept replacementImage file field', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('file', testPngPath)
      .attach('replacementImage', bgImagePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.mimeType).toBe('image/png');
  });

  it('should return error when no files uploaded', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return single result object for single file upload', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('file', testPngPath);

    expect(res.status).toBe(200);
    // Single file should return flat object, not array
    expect(res.body.results).toBeUndefined();
    expect(res.body.fileId).toBeTruthy();
  });

  it('should return results array for batch upload', async () => {
    const res = await request(app)
      .post('/api/image/remove-bg')
      .attach('files', testPngPath)
      .attach('files', testPngPath)
      .attach('files', testPngPath);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
  });
});
