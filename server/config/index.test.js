import { describe, it, expect, vi } from 'vitest';

describe('config', () => {
  it('should export a config object with all expected keys', async () => {
    const { default: config } = await import('./index.js');
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('nodeEnv');
    expect(config).toHaveProperty('uploadDir');
    expect(config).toHaveProperty('maxFileSize');
    expect(config).toHaveProperty('fileExpiryHours');
    expect(config).toHaveProperty('cleanupInterval');
    expect(config).toHaveProperty('corsOrigin');
    expect(config).toHaveProperty('rateLimitWindowMs');
    expect(config).toHaveProperty('rateLimitMax');
  });

  it('should have correct default values', async () => {
    // The test environment doesn't set these env vars, so defaults apply
    const { default: config } = await import('./index.js');
    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('test'); // vitest sets NODE_ENV=test
    expect(config.uploadDir).toBe('./uploads');
    expect(config.maxFileSize).toBe(104857600);
    expect(config.fileExpiryHours).toBe(24);
    expect(config.cleanupInterval).toBe('0 * * * *');
    expect(config.corsOrigin).toBe('*');
    expect(config.rateLimitWindowMs).toBe(900000);
    expect(config.rateLimitMax).toBe(100);
  });

  it('should have numeric types for numeric config values', async () => {
    const { default: config } = await import('./index.js');
    expect(typeof config.port).toBe('number');
    expect(typeof config.maxFileSize).toBe('number');
    expect(typeof config.fileExpiryHours).toBe('number');
    expect(typeof config.rateLimitWindowMs).toBe('number');
    expect(typeof config.rateLimitMax).toBe('number');
  });

  it('should have string types for string config values', async () => {
    const { default: config } = await import('./index.js');
    expect(typeof config.nodeEnv).toBe('string');
    expect(typeof config.uploadDir).toBe('string');
    expect(typeof config.cleanupInterval).toBe('string');
    expect(typeof config.corsOrigin).toBe('string');
  });
});
