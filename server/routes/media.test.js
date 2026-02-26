import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

/**
 * Check if ffmpeg is available. If not, we skip tests that require actual conversion.
 */
let ffmpegAvailable = false;

beforeAll(async () => {
  try {
    const { execSync } = await import('child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
});

describe('POST /api/media/convert-audio', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/media/convert-audio')
      .field('targetFormat', 'mp3');

    expect(res.status).toBe(400);
  });

  it('returns 400 when targetFormat is missing', async () => {
    // Create a minimal buffer and send with accepted MIME type
    const buf = Buffer.alloc(44);
    buf.write('RIFF', 0);

    const res = await request(app)
      .post('/api/media/convert-audio')
      .attach('file', buf, { filename: 'test.wav', contentType: 'audio/wav' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported audio MIME type', async () => {
    const buf = Buffer.from('not a real audio file');

    const res = await request(app)
      .post('/api/media/convert-audio')
      .attach('file', buf, { filename: 'test.exe', contentType: 'application/x-msdownload' })
      .field('targetFormat', 'mp3');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/media/convert-video', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/media/convert-video')
      .field('targetFormat', 'mp4');

    expect(res.status).toBe(400);
  });

  it('returns 400 when targetFormat is missing', async () => {
    const buf = Buffer.alloc(64);
    // Minimal MP4 header bytes
    buf.writeUInt32BE(32, 0);
    buf.write('ftyp', 4);

    const res = await request(app)
      .post('/api/media/convert-video')
      .attach('file', buf, { filename: 'test.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported video MIME type', async () => {
    const buf = Buffer.from('not a real video file');

    const res = await request(app)
      .post('/api/media/convert-video')
      .attach('file', buf, { filename: 'test.exe', contentType: 'application/x-msdownload' })
      .field('targetFormat', 'mp4');

    expect(res.status).toBe(400);
  });
});
