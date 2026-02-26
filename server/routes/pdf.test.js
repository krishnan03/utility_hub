import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { sessionMiddleware } from '../middleware/session.js';
import { requestIdMiddleware, errorHandler } from '../middleware/errorHandler.js';
import { clearAll } from '../services/fileStore.js';
import pdfRouter from './pdf.js';

const SESSION_ID = 'test-session-pdf-123';
let tmpDir;
let pdf1Path; // 1 page
let pdf2Path; // 2 pages
let pdf5Path; // 5 pages
let textFilePath; // non-PDF file

function createTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(sessionMiddleware);
  app.use('/api/pdf', pdfRouter);
  app.use(errorHandler);
  return app;
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-route-test-'));

  // 1-page PDF
  const doc1 = await PDFDocument.create();
  doc1.addPage([200, 200]);
  pdf1Path = path.join(tmpDir, 'doc1.pdf');
  fs.writeFileSync(pdf1Path, await doc1.save());

  // 2-page PDF
  const doc2 = await PDFDocument.create();
  doc2.addPage([300, 300]);
  doc2.addPage([300, 300]);
  pdf2Path = path.join(tmpDir, 'doc2.pdf');
  fs.writeFileSync(pdf2Path, await doc2.save());

  // 5-page PDF
  const doc5 = await PDFDocument.create();
  for (let i = 0; i < 5; i++) doc5.addPage([400, 400]);
  pdf5Path = path.join(tmpDir, 'doc5.pdf');
  fs.writeFileSync(pdf5Path, await doc5.save());

  // Non-PDF text file
  textFilePath = path.join(tmpDir, 'notapdf.txt');
  fs.writeFileSync(textFilePath, 'This is not a PDF');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  clearAll();
});

describe('POST /api/pdf/merge', () => {
  it('should merge two PDFs and return success response', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/merge')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('files', pdf1Path)
      .attach('files', pdf2Path);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toContain('/api/files/');
    expect(res.body.metadata.pageCount).toBe(3);
    expect(res.body.metadata.mimeType).toBe('application/pdf');
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
  });

  it('should merge three PDFs preserving total page count', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/merge')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('files', pdf1Path)
      .attach('files', pdf2Path)
      .attach('files', pdf5Path);

    expect(res.status).toBe(200);
    expect(res.body.metadata.pageCount).toBe(8);
  });

  it('should return error when only one file provided', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/merge')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('files', pdf1Path);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when no files provided', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/merge')
      .set('Cookie', `session_id=${SESSION_ID}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/pdf/split', () => {
  it('should split a PDF with a single range', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path)
      .field('ranges', '1-3');

    expect(res.status).toBe(200);
    // Single range returns a single object
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.pageCount).toBe(3);
    expect(res.body.metadata.mimeType).toBe('application/pdf');
  });

  it('should split a PDF with multiple ranges and return array', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path)
      .field('ranges', '1-2,4-5');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].metadata.pageCount).toBe(2);
    expect(res.body[1].metadata.pageCount).toBe(2);
  });

  it('should split individual pages', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path)
      .field('ranges', '1,3,5');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    for (const item of res.body) {
      expect(item.metadata.pageCount).toBe(1);
    }
  });

  it('should return error when no file provided', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .field('ranges', '1-3');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when ranges param is missing', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error for out-of-bounds page range', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/split')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path)
      .field('ranges', '1-10');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/pdf/compress', () => {
  it('should compress a PDF and return success response with sizes', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/compress')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toContain('/api/files/');
    expect(res.body.metadata.mimeType).toBe('application/pdf');
    expect(res.body.metadata.originalSize).toBeGreaterThan(0);
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    expect(res.body.metadata.pageCount).toBe(5);
  });

  it('should return outputSize less than or equal to originalSize', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/compress')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path);

    expect(res.status).toBe(200);
    expect(res.body.metadata.outputSize).toBeLessThanOrEqual(res.body.metadata.originalSize);
  });

  it('should compress a single-page PDF', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/compress')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.pageCount).toBe(1);
  });

  it('should return error when no file provided', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/compress')
      .set('Cookie', `session_id=${SESSION_ID}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/pdf/protect', () => {
  it('should protect a PDF with a password and return success', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path)
      .field('action', 'protect')
      .field('password', 'mypassword');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeTruthy();
    expect(res.body.downloadUrl).toContain('/api/files/');
    expect(res.body.metadata.mimeType).toBe('application/pdf');
    expect(res.body.metadata.outputSize).toBeGreaterThan(0);
    expect(res.body.metadata.pageCount).toBe(1);
  });

  it('should protect a multi-page PDF', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf5Path)
      .field('action', 'protect')
      .field('password', 'secret');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata.pageCount).toBe(5);
  });

  it('should unlock a protected PDF with correct password', async () => {
    const app = createTestApp();

    // First protect
    const protectRes = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path)
      .field('action', 'protect')
      .field('password', 'testpass');

    expect(protectRes.status).toBe(200);

    // Get the protected file path from the file store
    // For integration test, we use the downloadUrl to verify the round-trip works
    // We'll create a protected PDF on disk and unlock it
    const { PDFDocument } = await import('pdf-lib');
    const { protect, unlock } = await import('../services/pdfService.js');

    const protectResult = await protect(pdf1Path, 'integrationtest');
    const unlockRes = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', protectResult.outputPath)
      .field('action', 'unlock')
      .field('password', 'integrationtest');

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.success).toBe(true);
    expect(unlockRes.body.metadata.pageCount).toBe(1);

    // Clean up
    const fsMod = await import('fs');
    fsMod.default.unlinkSync(protectResult.outputPath);
  });

  it('should return error when no file provided', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .field('action', 'protect')
      .field('password', 'test');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when action is missing', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path)
      .field('password', 'test');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when action is invalid', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path)
      .field('action', 'invalid')
      .field('password', 'test');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return error when password is missing', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/pdf/protect')
      .set('Cookie', `session_id=${SESSION_ID}`)
      .attach('file', pdf1Path)
      .field('action', 'protect');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
