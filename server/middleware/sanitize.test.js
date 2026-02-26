import { describe, it, expect, vi } from 'vitest';
import { sanitize, validateMimeExtension } from './sanitize.js';

// Helper to create mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    file: undefined,
    files: undefined,
    ...overrides,
  };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('validateMimeExtension', () => {
  it('should accept matching MIME type and extension', () => {
    expect(validateMimeExtension('image/png', 'photo.png')).toEqual({ valid: true });
    expect(validateMimeExtension('image/jpeg', 'photo.jpg')).toEqual({ valid: true });
    expect(validateMimeExtension('image/jpeg', 'photo.jpeg')).toEqual({ valid: true });
    expect(validateMimeExtension('application/pdf', 'doc.pdf')).toEqual({ valid: true });
    expect(validateMimeExtension('audio/mpeg', 'song.mp3')).toEqual({ valid: true });
    expect(validateMimeExtension('video/mp4', 'clip.mp4')).toEqual({ valid: true });
  });

  it('should reject mismatched MIME type and extension', () => {
    const result = validateMimeExtension('image/png', 'photo.jpg');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('image/png');
    expect(result.reason).toContain('.jpg');
  });

  it('should reject files with no extension', () => {
    const result = validateMimeExtension('image/png', 'noext');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('no extension');
  });

  it('should reject dangerous extensions', () => {
    const dangerous = ['.exe', '.bat', '.sh', '.php', '.py', '.ps1', '.jar', '.dll'];
    for (const ext of dangerous) {
      const result = validateMimeExtension('application/octet-stream', `file${ext}`);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('dangerous');
    }
  });

  it('should allow unknown MIME types through', () => {
    const result = validateMimeExtension('application/x-custom', 'data.custom');
    expect(result.valid).toBe(true);
  });

  it('should be case-insensitive for extensions', () => {
    expect(validateMimeExtension('image/png', 'photo.PNG')).toEqual({ valid: true });
    expect(validateMimeExtension('image/jpeg', 'photo.JPG')).toEqual({ valid: true });
  });

  it('should handle SVG files', () => {
    expect(validateMimeExtension('image/svg+xml', 'icon.svg')).toEqual({ valid: true });
  });

  it('should handle document types', () => {
    expect(validateMimeExtension('text/csv', 'data.csv')).toEqual({ valid: true });
    expect(validateMimeExtension('text/plain', 'readme.txt')).toEqual({ valid: true });
    expect(validateMimeExtension('text/html', 'page.html')).toEqual({ valid: true });
  });
});

describe('sanitize middleware', () => {
  it('should call next() for valid single file', () => {
    const { req, res, next } = createMocks({
      file: { mimetype: 'image/png', originalname: 'photo.png' },
    });

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() for valid batch files', () => {
    const { req, res, next } = createMocks({
      files: [
        { mimetype: 'image/png', originalname: 'a.png' },
        { mimetype: 'image/jpeg', originalname: 'b.jpg' },
      ],
    });

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject file with mismatched MIME and extension', () => {
    const { req, res, next } = createMocks({
      file: { mimetype: 'image/png', originalname: 'photo.jpg' },
    });

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_FILE_TYPE');
  });

  it('should reject file with dangerous extension', () => {
    const { req, res, next } = createMocks({
      file: { mimetype: 'application/octet-stream', originalname: 'virus.exe' },
    });

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('dangerous');
  });

  it('should reject first invalid file in a batch', () => {
    const { req, res, next } = createMocks({
      files: [
        { mimetype: 'image/png', originalname: 'good.png' },
        { mimetype: 'image/png', originalname: 'bad.jpg' },
      ],
    });

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call next() when no files are present', () => {
    const { req, res, next } = createMocks({});

    sanitize(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
