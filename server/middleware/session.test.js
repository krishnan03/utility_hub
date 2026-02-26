import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { sessionMiddleware } from './session.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function createTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.get('/test', (req, res) => {
    res.json({ sessionId: req.sessionId });
  });
  return app;
}

describe('session middleware', () => {
  it('should generate a UUID session ID when no cookie is present', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toMatch(UUID_REGEX);
  });

  it('should set session_id as an httpOnly cookie', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const res = await request(app).get('/test');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain('session_id=');
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr).toContain('SameSite=Strict');
  });

  it('should reuse existing session_id cookie', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const existingId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const res = await request(app)
      .get('/test')
      .set('Cookie', `session_id=${existingId}`);

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(existingId);
  });

  it('should not set a new cookie when session_id already exists', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const existingId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const res = await request(app)
      .get('/test')
      .set('Cookie', `session_id=${existingId}`);

    const setCookie = res.headers['set-cookie'];
    // Should not set a new session_id cookie
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      expect(cookieStr).not.toContain('session_id=');
    }
  });

  it('should generate different session IDs for different visitors', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const res1 = await request(app).get('/test');
    const res2 = await request(app).get('/test');

    expect(res1.body.sessionId).toMatch(UUID_REGEX);
    expect(res2.body.sessionId).toMatch(UUID_REGEX);
    expect(res1.body.sessionId).not.toBe(res2.body.sessionId);
  });

  it('should attach sessionId to req for downstream use', async () => {
    const { default: request } = await import('supertest');

    const app = express();
    app.use(cookieParser());
    app.use(sessionMiddleware);

    let capturedSessionId;
    app.get('/test', (req, res) => {
      capturedSessionId = req.sessionId;
      res.json({ ok: true });
    });

    await request(app).get('/test');
    expect(capturedSessionId).toMatch(UUID_REGEX);
  });

  it('should not set secure flag in development', async () => {
    const { default: request } = await import('supertest');
    const app = createTestApp();

    const res = await request(app).get('/test');

    const setCookie = res.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    // In test/development, Secure flag should not be present
    expect(cookieStr).not.toContain('Secure');
  });
});
