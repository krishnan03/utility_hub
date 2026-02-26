import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createUpload, uploadSingle, uploadArray } from './upload.js';
import config from '../config/index.js';

const TEST_UPLOAD_DIR = path.join(config.uploadDir, 'input');

// Helper: create a small test app with the given upload middleware
function createTestApp(middleware) {
  const app = express();
  app.post('/upload', middleware, (req, res) => {
    const files = req.files ?? (req.file ? [req.file] : []);
    res.json({
      count: files.length,
      files: files.map((f) => ({
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        originalname: f.originalname,
      })),
    });
  });
  // Error handler for multer errors
  app.use((err, _req, res, _next) => {
    res.status(400).json({ error: err.message, code: err.code });
  });
  return app;
}

describe('upload middleware', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_UPLOAD_DIR)) {
      fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up any test files
    if (fs.existsSync(TEST_UPLOAD_DIR)) {
      const files = fs.readdirSync(TEST_UPLOAD_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(TEST_UPLOAD_DIR, file));
      }
    }
  });

  describe('createUpload', () => {
    it('should return a multer instance', () => {
      const upload = createUpload();
      expect(upload).toBeDefined();
      expect(typeof upload.single).toBe('function');
      expect(typeof upload.array).toBe('function');
    });

    it('should accept custom maxFileSize', () => {
      const upload = createUpload({ maxFileSize: 1024 });
      expect(upload).toBeDefined();
    });

    it('should accept allowedMimeTypes', () => {
      const upload = createUpload({ allowedMimeTypes: ['image/png'] });
      expect(upload).toBeDefined();
    });
  });

  describe('uploadSingle', () => {
    it('should be a function (middleware)', () => {
      expect(typeof uploadSingle).toBe('function');
    });

    it('should accept a single file upload', async () => {
      const { default: request } = await import('supertest');
      const app = createTestApp(uploadSingle);

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('hello'), 'test.txt');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.files[0].originalname).toBe('test.txt');
      // UUID-based filename
      expect(res.body.files[0].filename).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.txt$/
      );
    });
  });

  describe('uploadArray', () => {
    it('should be a function (middleware)', () => {
      expect(typeof uploadArray).toBe('function');
    });

    it('should accept multiple file uploads', async () => {
      const { default: request } = await import('supertest');
      const app = createTestApp(uploadArray);

      const res = await request(app)
        .post('/upload')
        .attach('files', Buffer.from('a'), 'a.txt')
        .attach('files', Buffer.from('b'), 'b.txt');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });
  });

  describe('MIME type filtering', () => {
    it('should reject files with disallowed MIME types', async () => {
      const { default: request } = await import('supertest');
      const upload = createUpload({ allowedMimeTypes: ['image/png'] });
      const app = createTestApp(upload.single('file'));

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('not a png'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_FILE_TYPE');
    });

    it('should accept files with allowed MIME types', async () => {
      const { default: request } = await import('supertest');
      const upload = createUpload({ allowedMimeTypes: ['application/octet-stream'] });
      const app = createTestApp(upload.single('file'));

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('data'), 'test.bin');

      expect(res.status).toBe(200);
    });
  });

  describe('file size limit', () => {
    it('should reject files exceeding the size limit', async () => {
      const { default: request } = await import('supertest');
      const upload = createUpload({ maxFileSize: 10 }); // 10 bytes
      const app = createTestApp(upload.single('file'));

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.alloc(100, 'x'), 'big.txt');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('LIMIT_FILE_SIZE');
    });

    it('should accept files within the size limit', async () => {
      const { default: request } = await import('supertest');
      const upload = createUpload({ maxFileSize: 1000 });
      const app = createTestApp(upload.single('file'));

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('small'), 'small.txt');

      expect(res.status).toBe(200);
    });
  });

  describe('file naming', () => {
    it('should generate UUID-based filenames preserving extension', async () => {
      const { default: request } = await import('supertest');
      const app = createTestApp(uploadSingle);

      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('data'), 'photo.png');

      expect(res.status).toBe(200);
      expect(res.body.files[0].filename).toMatch(/\.png$/);
      expect(res.body.files[0].filename).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
      );
    });
  });
});
