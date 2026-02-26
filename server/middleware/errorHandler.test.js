import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { requestIdMiddleware, errorHandler } from './errorHandler.js';
import {
  ValidationError,
  ProcessingError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Helper: build a tiny Express app that throws the given error from a route.
 */
function createApp(errorToThrow) {
  const app = express();
  app.use(requestIdMiddleware);
  app.get('/test', (_req, _res, next) => next(errorToThrow));
  app.use(errorHandler);
  return app;
}

describe('requestIdMiddleware', () => {
  it('should attach a UUID requestId to every request', async () => {
    const { default: request } = await import('supertest');
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/test', (req, res) => res.json({ requestId: req.requestId }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.requestId).toMatch(UUID_REGEX);
  });

  it('should generate unique IDs per request', async () => {
    const { default: request } = await import('supertest');
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/test', (req, res) => res.json({ requestId: req.requestId }));

    const res1 = await request(app).get('/test');
    const res2 = await request(app).get('/test');
    expect(res1.body.requestId).not.toBe(res2.body.requestId);
  });
});

describe('errorHandler', () => {
  it('should return consistent JSON for ValidationError', async () => {
    const { default: request } = await import('supertest');
    const err = new ValidationError('bad type', 'INVALID_FILE_TYPE', { received: 'pdf' });
    const app = createApp(err);

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'bad type',
        details: { received: 'pdf' },
      },
    });
  });

  it('should return 422 for ProcessingError', async () => {
    const { default: request } = await import('supertest');
    const err = new ProcessingError('corrupt file', 'CORRUPTED_FILE');
    const app = createApp(err);

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CORRUPTED_FILE');
  });

  it('should return 404 for NotFoundError', async () => {
    const { default: request } = await import('supertest');
    const app = createApp(new NotFoundError());

    const res = await request(app).get('/test');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('should return 403 for ForbiddenError', async () => {
    const { default: request } = await import('supertest');
    const app = createApp(new ForbiddenError());

    const res = await request(app).get('/test');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SESSION_FORBIDDEN');
  });

  it('should map MulterError LIMIT_FILE_SIZE to FILE_TOO_LARGE', async () => {
    const { default: request } = await import('supertest');
    const multerErr = new Error('File too large');
    multerErr.name = 'MulterError';
    multerErr.code = 'LIMIT_FILE_SIZE';
    multerErr.field = 'file';
    const app = createApp(multerErr);

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(res.body.error.details.field).toBe('file');
  });

  it('should map MulterError LIMIT_FILE_COUNT to BATCH_LIMIT_EXCEEDED', async () => {
    const supertest = await import('supertest');
    const request = supertest.default;
    const multerErr = new Error('Too many files');
    multerErr.name = 'MulterError';
    multerErr.code = 'LIMIT_FILE_COUNT';
    const app = createApp(multerErr);

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BATCH_LIMIT_EXCEEDED');
  });

  it('should handle unknown MulterError codes gracefully', async () => {
    const { default: request } = await import('supertest');
    const multerErr = new Error('Something weird');
    multerErr.name = 'MulterError';
    multerErr.code = 'UNKNOWN_CODE';
    const app = createApp(multerErr);

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PARAMETER');
  });

  it('should return 500 with INTERNAL_ERROR for unknown errors', async () => {
    const { default: request } = await import('supertest');
    const app = createApp(new Error('kaboom'));

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: {},
      },
    });
  });

  it('should log errors with request ID', async () => {
    const { default: request } = await import('supertest');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = createApp(new ValidationError('test log'));
    await request(app).get('/test');

    expect(spy).toHaveBeenCalled();
    const logMsg = spy.mock.calls[0][0];
    // Log should contain a UUID-shaped request ID in brackets
    expect(logMsg).toMatch(/\[[0-9a-f-]{36}\]/);
    expect(logMsg).toContain('ValidationError');

    spy.mockRestore();
  });
});
