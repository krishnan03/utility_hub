import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../index.js';

let tmpDir;
let mdPath;
let htmlPath;
let txtPath;
let csvPath;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-route-test-'));

  mdPath = path.join(tmpDir, 'test.md');
  fs.writeFileSync(mdPath, '# Hello\n\nThis is **bold**.');

  htmlPath = path.join(tmpDir, 'test.html');
  fs.writeFileSync(htmlPath, '<h1>Hello</h1><p>This is <strong>bold</strong>.</p>');

  txtPath = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(txtPath, 'Hello World\n\nPlain text.');

  csvPath = path.join(tmpDir, 'test.csv');
  fs.writeFileSync(csvPath, 'Name,Age\nAlice,30');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/document/convert', () => {
  it('should convert Markdown to HTML and return ProcessResponse', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', mdPath)
      .field('targetFormat', 'html');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toContain('/api/files/');
    expect(res.body.metadata.mimeType).toBe('text/html');
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    expect(res.body.metadata.expiresAt).toBeTruthy();
  });

  it('should convert HTML to Markdown', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', htmlPath)
      .field('targetFormat', 'md');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.mimeType).toBe('text/markdown');
  });

  it('should convert plain text to HTML', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', txtPath)
      .field('targetFormat', 'html');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.mimeType).toBe('text/html');
  });

  it('should convert CSV to HTML', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', csvPath)
      .field('targetFormat', 'html');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.mimeType).toBe('text/html');
  });

  it('should return 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .field('targetFormat', 'html');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_PARAMETER');
  });

  it('should return 400 when targetFormat is missing', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', mdPath);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_PARAMETER');
  });

  it('should return error for unsupported target format', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', mdPath)
      .field('targetFormat', 'docx');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error for same source and target format', async () => {
    const res = await request(app)
      .post('/api/document/convert')
      .attach('file', mdPath)
      .field('targetFormat', 'md');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});
