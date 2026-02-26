import { describe, it, expect } from 'vitest';
import app from './index.js';

describe('Express server', () => {
  it('should export an express app', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should respond to health check', async () => {
    const { default: request } = await import('supertest');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 501 for unimplemented route groups', async () => {
    const { default: request } = await import('supertest');
    const routes = [
      '/api/document/convert',
      '/api/media/convert-audio',
      '/api/ocr/extract',
      '/api/qr/generate',
      '/api/seo/analyze',
      '/api/meme/generate',
      '/api/favicon/generate',
      '/api/gif/create',
      '/api/signature/sign',
    ];

    for (const route of routes) {
      const res = await request(app).post(route);
      expect(res.status).toBe(501);
      expect(res.body.success).toBe(false);
    }
  });
});
