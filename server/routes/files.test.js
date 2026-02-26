import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { sessionMiddleware } from '../middleware/session.js';
import { requestIdMiddleware, errorHandler } from '../middleware/errorHandler.js';
import { addFile, clearAll } from '../services/fileStore.js';
import filesRouter from './files.js';

let tmpDir;
const SESSION_A = 'session-aaa-111';
const SESSION_B = 'session-bbb-222';

function createTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(sessionMiddleware);
  app.use('/api/files', filesRouter);
  app.use(errorHandler);
  return app;
}

function makeRecord(sessionId, overrides = {}) {
  const outputPath = path.join(tmpDir, `output-${overrides.id || 'test-file-1'}.txt`);
  fs.writeFileSync(outputPath, 'file-content');
  return {
    id: 'test-file-1',
    originalName: 'document.txt',
    outputName: 'document-processed.txt',
    inputPath: path.join(tmpDir, 'input.txt'),
    outputPath,
    mimeType: 'text/plain',
    originalSize: 1000,
    outputSize: 500,
    tool: 'test-tool',
    options: {},
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    sessionId,
    status: 'completed',
    ...overrides,
  };
}

describe('files routes', () => {
  let app;

  beforeEach(() => {
    clearAll();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-test-'));
    app = createTestApp();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/files/:id/info', () => {
    it('should return file metadata with remaining time', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);

      const res = await request(app)
        .get('/api/files/test-file-1/info')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file.id).toBe('test-file-1');
      expect(res.body.file.originalName).toBe('document.txt');
      expect(res.body.file.outputName).toBe('document-processed.txt');
      expect(res.body.file.mimeType).toBe('text/plain');
      expect(res.body.file.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.file.remainingSeconds).toBeLessThanOrEqual(24 * 60 * 60);
    });

    it('should return 404 for unknown file id', async () => {
      const res = await request(app)
        .get('/api/files/nonexistent/info')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return 403 when session does not match', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);

      const res = await request(app)
        .get('/api/files/test-file-1/info')
        .set('Cookie', `session_id=${SESSION_B}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SESSION_FORBIDDEN');
    });
  });

  describe('GET /api/files/:id/download', () => {
    it('should stream the file with correct headers', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);

      const res = await request(app)
        .get('/api/files/test-file-1/download')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('document-processed.txt');
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['x-expires-at']).toBe(record.expiresAt);
      expect(Number(res.headers['x-remaining-seconds'])).toBeGreaterThan(0);
      expect(res.text).toBe('file-content');
    });

    it('should return 404 for unknown file id', async () => {
      const res = await request(app)
        .get('/api/files/nonexistent/download')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return 403 when session does not match', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);

      const res = await request(app)
        .get('/api/files/test-file-1/download')
        .set('Cookie', `session_id=${SESSION_B}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SESSION_FORBIDDEN');
    });

    it('should return 404 when output file is missing from disk', async () => {
      const record = makeRecord(SESSION_A, { outputPath: path.join(tmpDir, 'gone.txt') });
      addFile(record);

      const res = await request(app)
        .get('/api/files/test-file-1/download')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('should delete the file and return success', async () => {
      const record = makeRecord(SESSION_A);
      // Also create the input file so both can be cleaned up
      fs.writeFileSync(record.inputPath, 'input-data');
      addFile(record);

      const res = await request(app)
        .delete('/api/files/test-file-1')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('File deleted successfully');

      // Verify physical files are removed
      expect(fs.existsSync(record.outputPath)).toBe(false);
      expect(fs.existsSync(record.inputPath)).toBe(false);
    });

    it('should return 404 for unknown file id', async () => {
      const res = await request(app)
        .delete('/api/files/nonexistent')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return 403 when session does not match', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);

      const res = await request(app)
        .delete('/api/files/test-file-1')
        .set('Cookie', `session_id=${SESSION_B}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SESSION_FORBIDDEN');
    });

    it('should succeed even if physical files are already gone', async () => {
      const record = makeRecord(SESSION_A);
      addFile(record);
      // Remove the output file before the DELETE request
      fs.unlinkSync(record.outputPath);

      const res = await request(app)
        .delete('/api/files/test-file-1')
        .set('Cookie', `session_id=${SESSION_A}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
