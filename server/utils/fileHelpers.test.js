import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';

const { mockMkdir, mockUnlink } = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: { mkdir: mockMkdir, unlink: mockUnlink },
  mkdir: mockMkdir,
  unlink: mockUnlink,
}));

vi.mock('../config/index.js', () => ({
  default: { uploadDir: './uploads' },
}));

import { ensureDir, safeUnlink, getOutputDir, getInputDir } from './fileHelpers.js';

describe('fileHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureDir', () => {
    it('should call mkdir with recursive option', async () => {
      mockMkdir.mockResolvedValue(undefined);
      await ensureDir('/some/path');
      expect(mockMkdir).toHaveBeenCalledWith('/some/path', { recursive: true });
    });

    it('should propagate errors from mkdir', async () => {
      mockMkdir.mockRejectedValue(new Error('permission denied'));
      await expect(ensureDir('/forbidden')).rejects.toThrow('permission denied');
    });
  });

  describe('safeUnlink', () => {
    it('should return true when file is deleted successfully', async () => {
      mockUnlink.mockResolvedValue(undefined);
      const result = await safeUnlink('/some/file.txt');
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalledWith('/some/file.txt');
    });

    it('should return false when file does not exist (ENOENT)', async () => {
      const err = new Error('no such file');
      err.code = 'ENOENT';
      mockUnlink.mockRejectedValue(err);
      const result = await safeUnlink('/missing/file.txt');
      expect(result).toBe(false);
    });

    it('should throw on errors other than ENOENT', async () => {
      const err = new Error('permission denied');
      err.code = 'EACCES';
      mockUnlink.mockRejectedValue(err);
      await expect(safeUnlink('/locked/file.txt')).rejects.toThrow('permission denied');
    });
  });

  describe('getOutputDir', () => {
    it('should return uploadDir/output', () => {
      expect(getOutputDir()).toBe(path.join('./uploads', 'output'));
    });
  });

  describe('getInputDir', () => {
    it('should return uploadDir/input', () => {
      expect(getInputDir()).toBe(path.join('./uploads', 'input'));
    });
  });
});
