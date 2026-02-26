import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { signPdf } from './signatureService.js';

let tmpDir;
let pdf1Path;   // 1-page PDF
let pdf3Path;   // 3-page PDF
let pngSigPath; // small PNG signature image

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-test-'));

  // Create a 1-page PDF
  const doc1 = await PDFDocument.create();
  doc1.addPage([612, 792]); // US Letter
  pdf1Path = path.join(tmpDir, 'doc1.pdf');
  fs.writeFileSync(pdf1Path, await doc1.save());

  // Create a 3-page PDF
  const doc3 = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    doc3.addPage([612, 792]);
  }
  pdf3Path = path.join(tmpDir, 'doc3.pdf');
  fs.writeFileSync(pdf3Path, await doc3.save());

  // Create a small PNG signature image
  pngSigPath = path.join(tmpDir, 'signature.png');
  await sharp({
    create: { width: 200, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.8 } },
  }).png().toFile(pngSigPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('signatureService.signPdf', () => {
  describe('text signatures', () => {
    it('should embed a text signature on a PDF page', async () => {
      const result = await signPdf(pdf1Path, {
        type: 'text',
        text: 'John Doe',
        page: 0,
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });

      expect(result.outputPath).toBeTruthy();
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.pageCount).toBe(1);
      expect(result.mimeType).toBe('application/pdf');

      // Verify output is a valid PDF
      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      fs.unlinkSync(result.outputPath);
    });

    it('should preserve page count on a multi-page PDF', async () => {
      const result = await signPdf(pdf3Path, {
        type: 'text',
        text: 'Jane Smith',
        page: 1,
        x: 50,
        y: 200,
        width: 150,
        height: 40,
      });

      expect(result.pageCount).toBe(3);
      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(3);
      fs.unlinkSync(result.outputPath);
    });

    it('should add a text signature with date stamp', async () => {
      const result = await signPdf(pdf1Path, {
        type: 'text',
        text: 'Signed',
        page: 0,
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        dateStamp: '2024-01-15',
      });

      expect(result.outputPath).toBeTruthy();
      expect(result.outputSize).toBeGreaterThan(0);
      fs.unlinkSync(result.outputPath);
    });

    it('should add a text signature with annotation', async () => {
      const result = await signPdf(pdf1Path, {
        type: 'text',
        text: 'Approved',
        page: 0,
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        annotation: 'Reviewed and approved by management',
      });

      expect(result.outputPath).toBeTruthy();
      expect(result.outputSize).toBeGreaterThan(0);
      fs.unlinkSync(result.outputPath);
    });

    it('should add text signature with both date stamp and annotation', async () => {
      const result = await signPdf(pdf1Path, {
        type: 'text',
        text: 'CEO',
        page: 0,
        x: 100,
        y: 150,
        width: 200,
        height: 50,
        dateStamp: '2024-06-01',
        annotation: 'Final approval',
      });

      expect(result.outputPath).toBeTruthy();
      expect(result.pageCount).toBe(1);
      fs.unlinkSync(result.outputPath);
    });
  });

  describe('image signatures', () => {
    it('should embed a PNG signature image on a PDF page', async () => {
      const result = await signPdf(pdf1Path, {
        type: 'image',
        imagePath: pngSigPath,
        page: 0,
        x: 100,
        y: 100,
        width: 200,
        height: 50,
      });

      expect(result.outputPath).toBeTruthy();
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.pageCount).toBe(1);
      expect(result.mimeType).toBe('application/pdf');

      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      fs.unlinkSync(result.outputPath);
    });

    it('should embed image signature with date stamp and annotation', async () => {
      const result = await signPdf(pdf3Path, {
        type: 'image',
        imagePath: pngSigPath,
        page: 2,
        x: 50,
        y: 200,
        width: 150,
        height: 40,
        dateStamp: '2024-03-20',
        annotation: 'Digitally signed',
      });

      expect(result.pageCount).toBe(3);
      expect(result.outputSize).toBeGreaterThan(0);
      fs.unlinkSync(result.outputPath);
    });
  });

  describe('validation errors', () => {
    const validConfig = { type: 'text', text: 'Test', page: 0, x: 10, y: 10, width: 100, height: 30 };

    it('should throw when pdfPath is missing', async () => {
      await expect(signPdf(null, validConfig)).rejects.toThrow('PDF file path is required');
    });

    it('should throw when signatureConfig is missing', async () => {
      await expect(signPdf(pdf1Path, null)).rejects.toThrow('Signature configuration is required');
    });

    it('should throw for invalid type', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, type: 'draw' }))
        .rejects.toThrow('Signature type must be "text" or "image"');
    });

    it('should throw when type is missing', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, type: undefined }))
        .rejects.toThrow('Signature type must be "text" or "image"');
    });

    it('should throw when text is empty for text type', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, text: '' }))
        .rejects.toThrow('Signature text is required');
    });

    it('should throw when text is whitespace for text type', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, text: '   ' }))
        .rejects.toThrow('Signature text is required');
    });

    it('should throw when imagePath is missing for image type', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, type: 'image', imagePath: undefined }))
        .rejects.toThrow('Signature image path is required');
    });

    it('should throw when image file does not exist', async () => {
      await expect(signPdf(pdf1Path, {
        ...validConfig, type: 'image', imagePath: '/nonexistent/sig.png',
      })).rejects.toThrow('Signature image file not found');
    });

    it('should throw when page index is negative', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, page: -1 }))
        .rejects.toThrow('Page must be a non-negative integer');
    });

    it('should throw when page index is out of bounds', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, page: 5 }))
        .rejects.toThrow('out of bounds');
    });

    it('should throw when x or y is missing', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, x: undefined }))
        .rejects.toThrow('x and y positions are required');
    });

    it('should throw when width or height is zero', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, width: 0 }))
        .rejects.toThrow('width and height are required and must be positive');
    });

    it('should throw when width is negative', async () => {
      await expect(signPdf(pdf1Path, { ...validConfig, height: -10 }))
        .rejects.toThrow('width and height are required and must be positive');
    });

    it('should throw when PDF file does not exist', async () => {
      await expect(signPdf('/nonexistent/file.pdf', validConfig)).rejects.toThrow();
    });
  });
});
