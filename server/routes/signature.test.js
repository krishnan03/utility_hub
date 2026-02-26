import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import app from '../index.js';

let tmpDir;
let pdfPath;
let pngSigPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-route-test-'));

  // Create a 2-page PDF
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  doc.addPage([612, 792]);
  pdfPath = path.join(tmpDir, 'test.pdf');
  fs.writeFileSync(pdfPath, await doc.save());

  // Create a small PNG signature image
  pngSigPath = path.join(tmpDir, 'sig.png');
  await sharp({
    create: { width: 200, height: 50, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.8 } },
  }).png().toFile(pngSigPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/signature/sign', () => {
  it('should sign a PDF with a text signature', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .field('type', 'text')
      .field('text', 'John Doe')
      .field('page', '0')
      .field('x', '100')
      .field('y', '100')
      .field('width', '200')
      .field('height', '50');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\//);
    expect(res.body.metadata.mimeType).toBe('application/pdf');
    expect(res.body.metadata.pageCount).toBe(2);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    expect(res.body.metadata.expiresAt).toBeTruthy();
  });

  it('should sign a PDF with an image signature', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .attach('signature', pngSigPath)
      .field('type', 'image')
      .field('page', '0')
      .field('x', '50')
      .field('y', '200')
      .field('width', '150')
      .field('height', '40');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.pageCount).toBe(2);
  });

  it('should sign with text signature including date stamp and annotation', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .field('type', 'text')
      .field('text', 'Approved')
      .field('page', '1')
      .field('x', '100')
      .field('y', '150')
      .field('width', '200')
      .field('height', '50')
      .field('dateStamp', '2024-06-15')
      .field('annotation', 'Final review complete');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when no PDF file is provided', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .field('type', 'text')
      .field('text', 'Test')
      .field('page', '0')
      .field('x', '10')
      .field('y', '10')
      .field('width', '100')
      .field('height', '30');

    expect(res.status).toBe(400);
  });

  it('should return 400 when type is missing', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .field('page', '0')
      .field('x', '10')
      .field('y', '10')
      .field('width', '100')
      .field('height', '30');

    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid page index', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .field('type', 'text')
      .field('text', 'Test')
      .field('page', '10')
      .field('x', '10')
      .field('y', '10')
      .field('width', '100')
      .field('height', '30');

    expect(res.status).toBe(400);
  });

  it('should return 400 when text is empty for text type', async () => {
    const res = await request(app)
      .post('/api/signature/sign')
      .attach('file', pdfPath)
      .field('type', 'text')
      .field('text', '')
      .field('page', '0')
      .field('x', '10')
      .field('y', '10')
      .field('width', '100')
      .field('height', '30');

    expect(res.status).toBe(400);
  });
});
