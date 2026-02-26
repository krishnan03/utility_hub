import { describe, it, expect, afterAll } from 'vitest';
import { readFile, rm, access } from 'node:fs/promises';
import path from 'path';
import { generateQr, generateBarcode } from '../qrService.js';
import config from '../../config/index.js';

const outputDir = path.join(config.uploadDir, 'output');

// Clean up generated files after all tests
afterAll(async () => {
  try {
    await rm(outputDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('qrService', () => {
  describe('generateQr', () => {
    it('should generate a QR code PNG from text data', async () => {
      const result = await generateQr('https://example.com');

      expect(result.outputPath).toMatch(/\.png$/);
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/png');

      // Verify the file exists and starts with PNG magic bytes
      const buffer = await readFile(result.outputPath);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });

    it('should accept custom color, background, size, and error correction', async () => {
      const result = await generateQr('Hello World', {
        color: '#ff0000',
        background: '#00ff00',
        size: 200,
        errorCorrection: 'H',
      });

      expect(result.outputPath).toMatch(/\.png$/);
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/png');
    });

    it('should clamp size to minimum 100', async () => {
      const result = await generateQr('test', { size: 10 });
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should clamp size to maximum 2000', async () => {
      const result = await generateQr('test', { size: 5000 });
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should default to error correction M', async () => {
      const result = await generateQr('test');
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should throw ValidationError for empty data', async () => {
      await expect(generateQr('')).rejects.toThrow('QR data is required');
    });

    it('should throw ValidationError for null data', async () => {
      await expect(generateQr(null)).rejects.toThrow('QR data is required');
    });

    it('should throw ValidationError for whitespace-only data', async () => {
      await expect(generateQr('   ')).rejects.toThrow('QR data is required');
    });

    it('should throw ValidationError for invalid error correction level', async () => {
      await expect(generateQr('test', { errorCorrection: 'X' }))
        .rejects.toThrow('Invalid error correction level');
    });

    it('should handle all valid error correction levels', async () => {
      for (const level of ['L', 'M', 'Q', 'H']) {
        const result = await generateQr('test', { errorCorrection: level });
        expect(result.outputSize).toBeGreaterThan(0);
      }
    });
  });

  describe('generateBarcode', () => {
    it('should generate a CODE128 barcode SVG', async () => {
      const result = await generateBarcode('ABC-123', 'CODE128');

      expect(result.outputPath).toMatch(/\.svg$/);
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/svg+xml');

      const content = await readFile(result.outputPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('ABC-123');
    });

    it('should default to CODE128 format', async () => {
      const result = await generateBarcode('test-data');
      expect(result.mimeType).toBe('image/svg+xml');

      const content = await readFile(result.outputPath, 'utf-8');
      expect(content).toContain('<svg');
    });

    it('should generate an EAN-13 barcode with 12 digits', async () => {
      const result = await generateBarcode('590123412345', 'EAN13');
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/svg+xml');
    });

    it('should generate an EAN-13 barcode with 13 digits', async () => {
      const result = await generateBarcode('5901234123457', 'EAN13');
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should generate a UPC-A barcode with 11 digits', async () => {
      const result = await generateBarcode('03600029145', 'UPCA');
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/svg+xml');
    });

    it('should generate a UPC-A barcode with 12 digits', async () => {
      const result = await generateBarcode('036000291452', 'UPCA');
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should throw ValidationError for empty data', async () => {
      await expect(generateBarcode('')).rejects.toThrow('Barcode data is required');
    });

    it('should throw ValidationError for unsupported format', async () => {
      await expect(generateBarcode('test', 'QR'))
        .rejects.toThrow('Unsupported barcode format');
    });

    it('should throw ValidationError for EAN-13 with non-digit data', async () => {
      await expect(generateBarcode('abcdefghijkl', 'EAN13'))
        .rejects.toThrow('EAN-13 requires exactly 12 or 13 digits');
    });

    it('should throw ValidationError for UPC-A with non-digit data', async () => {
      await expect(generateBarcode('abcdefghijk', 'UPCA'))
        .rejects.toThrow('UPC-A requires exactly 11 or 12 digits');
    });

    it('should accept custom width and height options', async () => {
      const result = await generateBarcode('test', 'CODE128', { width: 3, height: 150 });
      expect(result.outputSize).toBeGreaterThan(0);
    });

    it('should handle case-insensitive format', async () => {
      const result = await generateBarcode('test', 'code128');
      expect(result.outputSize).toBeGreaterThan(0);
    });
  });
});
