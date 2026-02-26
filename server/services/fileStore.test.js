import { describe, it, expect, beforeEach } from 'vitest';
import { addFile, getFile, deleteFile, getExpiredFiles, getAllFiles, clearAll } from './fileStore.js';

function makeRecord(overrides = {}) {
  return {
    id: 'file-1',
    originalName: 'photo.png',
    outputName: 'photo-converted.jpg',
    inputPath: '/uploads/input/photo.png',
    outputPath: '/uploads/output/photo-converted.jpg',
    mimeType: 'image/jpeg',
    originalSize: 2048000,
    outputSize: 512000,
    tool: 'image-convert',
    options: {},
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    sessionId: 'session-aaa',
    status: 'completed',
    ...overrides,
  };
}

describe('fileStore', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('addFile', () => {
    it('should store and return the record', () => {
      const record = makeRecord();
      const result = addFile(record);
      expect(result).toEqual(record);
    });

    it('should throw when record has no id', () => {
      expect(() => addFile({ originalName: 'test.png' })).toThrow('File record must include an id');
    });

    it('should throw when called with null', () => {
      expect(() => addFile(null)).toThrow();
    });
  });

  describe('getFile', () => {
    it('should return the stored record by id', () => {
      const record = makeRecord();
      addFile(record);
      expect(getFile('file-1')).toEqual(record);
    });

    it('should return undefined for unknown id', () => {
      expect(getFile('nonexistent')).toBeUndefined();
    });
  });

  describe('deleteFile', () => {
    it('should remove the record and return true', () => {
      addFile(makeRecord());
      expect(deleteFile('file-1')).toBe(true);
      expect(getFile('file-1')).toBeUndefined();
    });

    it('should return false for unknown id', () => {
      expect(deleteFile('nonexistent')).toBe(false);
    });
  });

  describe('getExpiredFiles', () => {
    it('should return records whose expiresAt is in the past', () => {
      addFile(makeRecord({ id: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString() }));
      addFile(makeRecord({ id: 'valid', expiresAt: new Date(Date.now() + 60000).toISOString() }));

      const expired = getExpiredFiles();
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('expired');
    });

    it('should return empty array when nothing is expired', () => {
      addFile(makeRecord());
      expect(getExpiredFiles()).toHaveLength(0);
    });
  });

  describe('getAllFiles', () => {
    it('should return all stored records', () => {
      addFile(makeRecord({ id: 'a' }));
      addFile(makeRecord({ id: 'b' }));
      expect(getAllFiles()).toHaveLength(2);
    });

    it('should return empty array when store is empty', () => {
      expect(getAllFiles()).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should remove every record', () => {
      addFile(makeRecord({ id: 'a' }));
      addFile(makeRecord({ id: 'b' }));
      clearAll();
      expect(getAllFiles()).toHaveLength(0);
    });
  });
});
