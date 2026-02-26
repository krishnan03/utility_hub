import { describe, it, expect } from 'vitest';
import { extractText, SUPPORTED_LANGUAGES, VALID_OCR_MIMES } from '../ocrService.js';

describe('ocrService', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should include all 10 required languages', () => {
      const requiredCodes = ['eng', 'spa', 'fra', 'deu', 'por', 'chi_sim', 'jpn', 'kor', 'hin', 'ara'];
      for (const code of requiredCodes) {
        expect(SUPPORTED_LANGUAGES).toHaveProperty(code);
        expect(typeof SUPPORTED_LANGUAGES[code]).toBe('string');
      }
    });

    it('should have exactly 10 supported languages', () => {
      expect(Object.keys(SUPPORTED_LANGUAGES)).toHaveLength(10);
    });
  });

  describe('VALID_OCR_MIMES', () => {
    it('should include common image MIME types', () => {
      expect(VALID_OCR_MIMES).toContain('image/png');
      expect(VALID_OCR_MIMES).toContain('image/jpeg');
      expect(VALID_OCR_MIMES).toContain('image/bmp');
      expect(VALID_OCR_MIMES).toContain('image/tiff');
      expect(VALID_OCR_MIMES).toContain('image/webp');
    });
  });

  describe('extractText', () => {
    it('should throw ValidationError when inputPath is empty', async () => {
      await expect(extractText('')).rejects.toThrow('Input file path is required');
    });

    it('should throw ValidationError when inputPath is null', async () => {
      await expect(extractText(null)).rejects.toThrow('Input file path is required');
    });

    it('should throw ValidationError when inputPath is undefined', async () => {
      await expect(extractText(undefined)).rejects.toThrow('Input file path is required');
    });

    it('should throw ValidationError for unsupported language', async () => {
      await expect(extractText('/some/path.png', 'xyz'))
        .rejects.toThrow('Unsupported language: xyz');
    });

    it('should throw ValidationError listing supported languages for invalid language', async () => {
      try {
        await extractText('/some/path.png', 'invalid');
      } catch (err) {
        expect(err.message).toContain('Supported:');
        expect(err.message).toContain('eng');
        expect(err.code).toBe('INVALID_PARAMETER');
      }
    });

    it('should throw ProcessingError for non-existent file', async () => {
      await expect(extractText('/nonexistent/file.png', 'eng'))
        .rejects.toThrow(/OCR processing failed/);
    });

    it('should default to eng when language is falsy', async () => {
      // Passing empty string should default to eng, but still fail on missing file
      await expect(extractText('/nonexistent/file.png', ''))
        .rejects.toThrow(/OCR processing failed/);
    });
  });
});
