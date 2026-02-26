import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  ProcessingError,
  NotFoundError,
  ForbiddenError,
} from './errors.js';

describe('Custom error classes', () => {
  describe('AppError', () => {
    it('should set message, status, code, and details', () => {
      const err = new AppError('something broke', 500, 'INTERNAL_ERROR', { foo: 'bar' });
      expect(err.message).toBe('something broke');
      expect(err.status).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.details).toEqual({ foo: 'bar' });
      expect(err.name).toBe('AppError');
      expect(err).toBeInstanceOf(Error);
    });

    it('should default details to empty object', () => {
      const err = new AppError('msg', 400, 'CODE');
      expect(err.details).toEqual({});
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and default code INVALID_PARAMETER', () => {
      const err = new ValidationError('bad input');
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_PARAMETER');
      expect(err.message).toBe('bad input');
      expect(err.name).toBe('ValidationError');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should accept a custom code and details', () => {
      const err = new ValidationError('wrong type', 'INVALID_FILE_TYPE', { received: 'pdf' });
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.details).toEqual({ received: 'pdf' });
    });
  });

  describe('ProcessingError', () => {
    it('should have status 422 and default code PROCESSING_FAILED', () => {
      const err = new ProcessingError('conversion failed');
      expect(err.status).toBe(422);
      expect(err.code).toBe('PROCESSING_FAILED');
      expect(err.name).toBe('ProcessingError');
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept a custom code', () => {
      const err = new ProcessingError('corrupt', 'CORRUPTED_FILE');
      expect(err.code).toBe('CORRUPTED_FILE');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404 and default message/code', () => {
      const err = new NotFoundError();
      expect(err.status).toBe(404);
      expect(err.code).toBe('FILE_NOT_FOUND');
      expect(err.message).toBe('File not found or has expired');
      expect(err.name).toBe('NotFoundError');
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept a custom message', () => {
      const err = new NotFoundError('session gone');
      expect(err.message).toBe('session gone');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403 and default message/code', () => {
      const err = new ForbiddenError();
      expect(err.status).toBe(403);
      expect(err.code).toBe('SESSION_FORBIDDEN');
      expect(err.message).toBe('Access denied to this resource');
      expect(err.name).toBe('ForbiddenError');
      expect(err).toBeInstanceOf(AppError);
    });

    it('should accept a custom message and code', () => {
      const err = new ForbiddenError('nope', 'SESSION_FORBIDDEN', { sessionId: 'abc' });
      expect(err.message).toBe('nope');
      expect(err.details).toEqual({ sessionId: 'abc' });
    });
  });
});
