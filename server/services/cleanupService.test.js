import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addFile, clearAll, getFile } from './fileStore.js';
import { runCleanup, startCleanup, stopCleanup } from './cleanupService.js';

// Mock safeUnlink so we don't touch the real filesystem
vi.mock('../utils/fileHelpers.js', () => ({
  safeUnlink: vi.fn().mockResolvedValue(true),
}));

// We need to import the mock after vi.mock so we can control it
import { safeUnlink } from '../utils/fileHelpers.js';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn((interval, cb) => {
      return { stop: vi.fn(), _cb: cb };
    }),
  },
}));

import cron from 'node-cron';

function makeExpiredRecord(id) {
  return {
    id,
    originalName: `${id}.png`,
    outputName: `${id}-out.png`,
    inputPath: `/uploads/input/${id}.png`,
    outputPath: `/uploads/output/${id}-out.png`,
    mimeType: 'image/png',
    originalSize: 1000,
    outputSize: 500,
    tool: 'image-convert',
    options: {},
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // expired 1h ago
    sessionId: 'session-1',
    status: 'completed',
  };
}

function makeValidRecord(id) {
  return {
    id,
    originalName: `${id}.png`,
    outputName: `${id}-out.png`,
    inputPath: `/uploads/input/${id}.png`,
    outputPath: `/uploads/output/${id}-out.png`,
    mimeType: 'image/png',
    originalSize: 1000,
    outputSize: 500,
    tool: 'image-convert',
    options: {},
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    sessionId: 'session-1',
    status: 'completed',
  };
}

describe('cleanupService', () => {
  beforeEach(() => {
    clearAll();
    vi.clearAllMocks();
    stopCleanup();
  });

  afterEach(() => {
    stopCleanup();
  });

  describe('runCleanup', () => {
    it('should return zeros when no files are expired', async () => {
      addFile(makeValidRecord('valid-1'));
      const result = await runCleanup();
      expect(result).toEqual({ deleted: 0, failed: 0 });
      expect(safeUnlink).not.toHaveBeenCalled();
    });

    it('should delete expired files from disk and metadata store', async () => {
      addFile(makeExpiredRecord('exp-1'));
      addFile(makeExpiredRecord('exp-2'));
      addFile(makeValidRecord('valid-1'));

      const result = await runCleanup();

      expect(result.deleted).toBe(2);
      expect(result.failed).toBe(0);
      // Physical files deleted (input + output for each)
      expect(safeUnlink).toHaveBeenCalledTimes(4);
      // Metadata removed
      expect(getFile('exp-1')).toBeUndefined();
      expect(getFile('exp-2')).toBeUndefined();
      // Valid file untouched
      expect(getFile('valid-1')).toBeDefined();
    });

    it('should skip files that fail to delete and continue with the rest', async () => {
      addFile(makeExpiredRecord('fail-1'));
      addFile(makeExpiredRecord('ok-1'));

      // First call (inputPath of fail-1) throws, rest succeed
      safeUnlink
        .mockRejectedValueOnce(new Error('EACCES: permission denied'))
        .mockResolvedValue(true);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await runCleanup();

      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
      // fail-1 metadata should still exist (cleanup failed for it)
      expect(getFile('fail-1')).toBeDefined();
      // ok-1 metadata should be removed
      expect(getFile('ok-1')).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should handle files with no outputPath gracefully', async () => {
      const record = makeExpiredRecord('no-output');
      delete record.outputPath;
      addFile(record);

      const result = await runCleanup();

      expect(result.deleted).toBe(1);
      // Only inputPath should be unlinked
      expect(safeUnlink).toHaveBeenCalledTimes(1);
      expect(safeUnlink).toHaveBeenCalledWith(record.inputPath);
    });

    it('should handle files with no inputPath gracefully', async () => {
      const record = makeExpiredRecord('no-input');
      delete record.inputPath;
      addFile(record);

      const result = await runCleanup();

      expect(result.deleted).toBe(1);
      // Only outputPath should be unlinked
      expect(safeUnlink).toHaveBeenCalledTimes(1);
      expect(safeUnlink).toHaveBeenCalledWith(record.outputPath);
    });

    it('should return zeros when store is empty', async () => {
      const result = await runCleanup();
      expect(result).toEqual({ deleted: 0, failed: 0 });
    });
  });

  describe('startCleanup', () => {
    it('should schedule a cron job with the configured interval', () => {
      const job = startCleanup();
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
      expect(job).toBeDefined();
    });

    it('should return the same job if called twice', () => {
      const job1 = startCleanup();
      const job2 = startCleanup();
      expect(job1).toBe(job2);
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopCleanup', () => {
    it('should stop the cron job', () => {
      const job = startCleanup();
      stopCleanup();
      expect(job.stop).toHaveBeenCalled();
    });

    it('should be safe to call when no job is running', () => {
      expect(() => stopCleanup()).not.toThrow();
    });
  });
});
