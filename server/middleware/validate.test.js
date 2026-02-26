import { describe, it, expect, vi } from 'vitest';
import { validate } from './validate.js';

// Helper to create mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    body: {},
    file: undefined,
    files: undefined,
    ...overrides,
  };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  describe('requiredParams', () => {
    it('should call next() when all required params are present', () => {
      const middleware = validate({ requiredParams: ['format'] });
      const { req, res, next } = createMocks({ body: { format: 'png' } });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next(err) when a required param is missing', () => {
      const middleware = validate({ requiredParams: ['format'] });
      const { req, res, next } = createMocks({ body: {} });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const err = next.mock.calls[0][0];
      expect(err.message).toContain('format');
      expect(err.status).toBe(400);
      expect(err.code).toBe('MISSING_PARAMETER');
    });

    it('should reject empty string values for required params', () => {
      const middleware = validate({ requiredParams: ['format'] });
      const { req, res, next } = createMocks({ body: { format: '' } });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject null values for required params', () => {
      const middleware = validate({ requiredParams: ['format'] });
      const { req, res, next } = createMocks({ body: { format: null } });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate multiple required params', () => {
      const middleware = validate({ requiredParams: ['format', 'quality'] });
      const { req, res, next } = createMocks({ body: { format: 'png' } });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('quality');
    });
  });

  describe('allowedFileTypes', () => {
    it('should pass when file MIME type is allowed', () => {
      const middleware = validate({ allowedFileTypes: ['image/png', 'image/jpeg'] });
      const { req, res, next } = createMocks({
        file: { mimetype: 'image/png' },
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject when file MIME type is not allowed', () => {
      const middleware = validate({ allowedFileTypes: ['image/png'] });
      const { req, res, next } = createMocks({
        file: { mimetype: 'application/pdf' },
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const err = next.mock.calls[0][0];
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.status).toBe(400);
    });

    it('should validate all files in a batch', () => {
      const middleware = validate({ allowedFileTypes: ['image/png'] });
      const { req, res, next } = createMocks({
        files: [
          { mimetype: 'image/png' },
          { mimetype: 'image/jpeg' },
        ],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should skip file type check when allowedFileTypes is empty', () => {
      const middleware = validate({ allowedFileTypes: [] });
      const { req, res, next } = createMocks({
        file: { mimetype: 'anything/goes' },
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('maxBatchSize', () => {
    it('should pass when batch size is within limit', () => {
      const middleware = validate({ maxBatchSize: 5 });
      const { req, res, next } = createMocks({
        files: [{ mimetype: 'a' }, { mimetype: 'b' }],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject when batch size exceeds limit', () => {
      const middleware = validate({ maxBatchSize: 2 });
      const { req, res, next } = createMocks({
        files: [{ mimetype: 'a' }, { mimetype: 'b' }, { mimetype: 'c' }],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const err = next.mock.calls[0][0];
      expect(err.code).toBe('BATCH_LIMIT_EXCEEDED');
      expect(err.status).toBe(400);
      expect(err.message).toContain('3');
      expect(err.message).toContain('2');
    });

    it('should skip batch size check when maxBatchSize is undefined', () => {
      const middleware = validate({});
      const { req, res, next } = createMocks({
        files: Array(50).fill({ mimetype: 'a' }),
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('combined rules', () => {
    it('should validate params, file types, and batch size together', () => {
      const middleware = validate({
        requiredParams: ['format'],
        allowedFileTypes: ['image/png'],
        maxBatchSize: 20,
      });
      const { req, res, next } = createMocks({
        body: { format: 'jpg' },
        files: [{ mimetype: 'image/png' }],
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail on first validation error (required params checked first)', () => {
      const middleware = validate({
        requiredParams: ['format'],
        allowedFileTypes: ['image/png'],
      });
      const { req, res, next } = createMocks({
        body: {},
        files: [{ mimetype: 'image/jpeg' }],
      });

      middleware(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err.code).toBe('MISSING_PARAMETER');
    });
  });

  describe('no files scenario', () => {
    it('should pass when no files and no file rules', () => {
      const middleware = validate({ requiredParams: ['name'] });
      const { req, res, next } = createMocks({ body: { name: 'test' } });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
