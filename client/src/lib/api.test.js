import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import api from './api.js';

// We test the interceptor logic by inspecting the axios instance config
// and by simulating interceptor behavior

describe('api (Axios instance)', () => {
  it('has baseURL set to /api', () => {
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('has timeout set to 60 seconds', () => {
    expect(api.defaults.timeout).toBe(60000);
  });

  it('has withCredentials enabled', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('has request and response interceptors registered', () => {
    // Axios stores interceptors internally
    expect(api.interceptors.request.handlers.length).toBeGreaterThanOrEqual(1);
    expect(api.interceptors.response.handlers.length).toBeGreaterThanOrEqual(1);
  });

  describe('response interceptor — success', () => {
    it('extracts data from successful response', () => {
      // The success handler is the first function in the response interceptor
      const successHandler = api.interceptors.response.handlers[0].fulfilled;
      const mockResponse = { data: { success: true, fileId: '123' }, status: 200 };
      expect(successHandler(mockResponse)).toEqual({ success: true, fileId: '123' });
    });
  });

  describe('response interceptor — error', () => {
    const errorHandler = api.interceptors.response.handlers[0].rejected;

    it('normalizes server error with error body', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            error: { code: 'INVALID_FILE_TYPE', message: 'Bad file' },
          },
        },
      };

      await expect(errorHandler(error)).rejects.toEqual({
        success: false,
        status: 400,
        error: { code: 'INVALID_FILE_TYPE', message: 'Bad file' },
      });
    });

    it('normalizes server error without structured error body', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      const result = errorHandler(error).catch((e) => e);
      await expect(result).resolves.toMatchObject({
        success: false,
        status: 500,
        error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' },
      });
    });

    it('normalizes network error (no response)', async () => {
      const error = { request: {} };

      await expect(errorHandler(error)).rejects.toEqual({
        success: false,
        status: 0,
        error: { code: 'NETWORK_ERROR', message: 'Network error — please check your connection' },
      });
    });

    it('normalizes generic error (no request, no response)', async () => {
      const error = { message: 'timeout exceeded' };

      await expect(errorHandler(error)).rejects.toEqual({
        success: false,
        status: 0,
        error: { code: 'REQUEST_ERROR', message: 'timeout exceeded' },
      });
    });
  });

  describe('request interceptor', () => {
    it('sets withCredentials on config', () => {
      const requestHandler = api.interceptors.request.handlers[0].fulfilled;
      const config = { headers: {} };
      const result = requestHandler(config);
      expect(result.withCredentials).toBe(true);
    });
  });
});
