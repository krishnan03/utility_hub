import { describe, it, expect } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { apiLimiter } from './rateLimit.js';

describe('rateLimit middleware', () => {
  it('should export apiLimiter as a function (middleware)', () => {
    expect(typeof apiLimiter).toBe('function');
  });

  it('should allow requests under the limit', async () => {
    const { default: request } = await import('supertest');

    const app = express();
    app.use(rateLimit({ windowMs: 60000, max: 5, standardHeaders: true, legacyHeaders: false }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should block requests exceeding the limit', async () => {
    const { default: request } = await import('supertest');

    const app = express();
    app.use(rateLimit({
      windowMs: 60000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      },
    }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('should include standard rate limit headers in response', async () => {
    const { default: request } = await import('supertest');

    const app = express();
    app.use(rateLimit({ windowMs: 60000, max: 10, standardHeaders: true, legacyHeaders: false }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});
