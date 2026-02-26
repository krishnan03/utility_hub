import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { merge, split, convertToPdf, compress, protect, unlock, reorder, rotate, watermark, managePage } from './pdfService.js';

let tmpDir;
let pdf1Path;
let pdf2Path;
let pdf3Path; // 5-page PDF for split tests

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-test-'));

  // Create a 1-page PDF
  const doc1 = await PDFDocument.create();
  doc1.addPage([200, 200]);
  pdf1Path = path.join(tmpDir, 'doc1.pdf');
  fs.writeFileSync(pdf1Path, await doc1.save());

  // Create a 2-page PDF
  const doc2 = await PDFDocument.create();
  doc2.addPage([300, 300]);
  doc2.addPage([300, 300]);
  pdf2Path = path.join(tmpDir, 'doc2.pdf');
  fs.writeFileSync(pdf2Path, await doc2.save());

  // Create a 5-page PDF for split tests
  const doc3 = await PDFDocument.create();
  for (let i = 0; i < 5; i++) {
    doc3.addPage([400, 400]);
  }
  pdf3Path = path.join(tmpDir, 'doc3.pdf');
  fs.writeFileSync(pdf3Path, await doc3.save());
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('pdfService.merge', () => {
  it('should merge two PDFs and return correct page count', async () => {
    const result = await merge([pdf1Path, pdf2Path]);
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.pageCount).toBe(3); // 1 + 2
    expect(result.mimeType).toBe('application/pdf');

    // Verify the output is a valid PDF with correct page count
    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    fs.unlinkSync(result.outputPath);
  });

  it('should merge three PDFs preserving total page count', async () => {
    const result = await merge([pdf1Path, pdf2Path, pdf3Path]);
    expect(result.pageCount).toBe(8); // 1 + 2 + 5
    fs.unlinkSync(result.outputPath);
  });

  it('should merge PDFs in the order provided', async () => {
    const result = await merge([pdf2Path, pdf1Path]);
    expect(result.pageCount).toBe(3);

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    // First page should have dimensions from doc2 (300x300)
    const page0 = doc.getPage(0);
    const { width } = page0.getSize();
    expect(Math.round(width)).toBe(300);
    // Third page should have dimensions from doc1 (200x200)
    const page2 = doc.getPage(2);
    const { width: w2 } = page2.getSize();
    expect(Math.round(w2)).toBe(200);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when fewer than 2 files provided', async () => {
    await expect(merge([pdf1Path])).rejects.toThrow('At least two PDF files');
  });

  it('should throw when no files provided', async () => {
    await expect(merge([])).rejects.toThrow('At least two PDF files');
  });

  it('should throw when null provided', async () => {
    await expect(merge(null)).rejects.toThrow('At least two PDF files');
  });
});

describe('pdfService.split', () => {
  it('should split a PDF into a single range', async () => {
    const results = await split(pdf3Path, '1-3');
    expect(results).toHaveLength(1);
    expect(results[0].pageCount).toBe(3);
    expect(results[0].outputSize).toBeGreaterThan(0);
    expect(results[0].mimeType).toBe('application/pdf');
    fs.unlinkSync(results[0].outputPath);
  });

  it('should split a PDF into multiple ranges', async () => {
    const results = await split(pdf3Path, '1-2,4-5');
    expect(results).toHaveLength(2);
    expect(results[0].pageCount).toBe(2);
    expect(results[1].pageCount).toBe(2);
    fs.unlinkSync(results[0].outputPath);
    fs.unlinkSync(results[1].outputPath);
  });

  it('should split individual pages', async () => {
    const results = await split(pdf3Path, '1,3,5');
    expect(results).toHaveLength(3);
    expect(results[0].pageCount).toBe(1);
    expect(results[1].pageCount).toBe(1);
    expect(results[2].pageCount).toBe(1);
    for (const r of results) fs.unlinkSync(r.outputPath);
  });

  it('should handle mixed ranges and individual pages', async () => {
    const results = await split(pdf3Path, '1-2,4');
    expect(results).toHaveLength(2);
    expect(results[0].pageCount).toBe(2);
    expect(results[1].pageCount).toBe(1);
    for (const r of results) fs.unlinkSync(r.outputPath);
  });

  it('should produce valid PDF output files', async () => {
    const results = await split(pdf3Path, '2-4');
    const bytes = fs.readFileSync(results[0].outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    fs.unlinkSync(results[0].outputPath);
  });

  it('should throw for invalid page range (out of bounds)', async () => {
    await expect(split(pdf3Path, '1-10')).rejects.toThrow('Invalid page range');
  });

  it('should throw for invalid page number (0)', async () => {
    await expect(split(pdf3Path, '0')).rejects.toThrow('Invalid page number');
  });

  it('should throw for invalid page number (negative)', async () => {
    await expect(split(pdf3Path, '-1')).rejects.toThrow('Invalid page range');
  });

  it('should throw for reversed range', async () => {
    await expect(split(pdf3Path, '3-1')).rejects.toThrow('Invalid page range');
  });

  it('should throw when ranges param is missing', async () => {
    await expect(split(pdf3Path, '')).rejects.toThrow('Page ranges string is required');
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(split(null, '1-3')).rejects.toThrow('PDF file path is required');
  });
});

describe('pdfService.compress', () => {
  it('should compress a PDF and return original and output sizes', async () => {
    const result = await compress(pdf3Path);
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.pageCount).toBe(5);
    expect(result.mimeType).toBe('application/pdf');
    fs.unlinkSync(result.outputPath);
  });

  it('should produce a valid PDF after compression', async () => {
    const result = await compress(pdf1Path);
    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    fs.unlinkSync(result.outputPath);
  });

  it('should return output size less than or equal to original size', async () => {
    const result = await compress(pdf3Path);
    expect(result.outputSize).toBeLessThanOrEqual(result.originalSize);
    fs.unlinkSync(result.outputPath);
  });

  it('should preserve page count after compression', async () => {
    const result = await compress(pdf2Path);
    expect(result.pageCount).toBe(2);

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when pdfPath is null', async () => {
    await expect(compress(null)).rejects.toThrow('PDF file path is required');
  });

  it('should throw when pdfPath is undefined', async () => {
    await expect(compress(undefined)).rejects.toThrow('PDF file path is required');
  });

  it('should throw when file does not exist', async () => {
    await expect(compress('/nonexistent/file.pdf')).rejects.toThrow();
  });
});

describe('pdfService.protect', () => {
  it('should protect a PDF and return valid result', async () => {
    const result = await protect(pdf1Path, 'mypassword');
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.pageCount).toBe(1);
    expect(result.mimeType).toBe('application/pdf');

    // Verify the output is a valid PDF
    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(1);
    // Verify protection marker is set
    expect(doc.getProducer()).toMatch(/^protected:/);
    fs.unlinkSync(result.outputPath);
  });

  it('should protect a multi-page PDF preserving page count', async () => {
    const result = await protect(pdf3Path, 'secret123');
    expect(result.pageCount).toBe(5);

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(protect(null, 'pass')).rejects.toThrow('PDF file path is required');
  });

  it('should throw when password is missing', async () => {
    await expect(protect(pdf1Path, '')).rejects.toThrow('Password is required');
  });

  it('should throw when password is null', async () => {
    await expect(protect(pdf1Path, null)).rejects.toThrow('Password is required');
  });

  it('should throw when password is whitespace only', async () => {
    await expect(protect(pdf1Path, '   ')).rejects.toThrow('Password is required');
  });

  it('should throw when file does not exist', async () => {
    await expect(protect('/nonexistent/file.pdf', 'pass')).rejects.toThrow();
  });
});

describe('pdfService.unlock', () => {
  it('should unlock a protected PDF with correct password', async () => {
    // First protect, then unlock
    const protectResult = await protect(pdf1Path, 'testpass');
    const unlockResult = await unlock(protectResult.outputPath, 'testpass');

    expect(unlockResult.outputPath).toBeTruthy();
    expect(unlockResult.outputSize).toBeGreaterThan(0);
    expect(unlockResult.pageCount).toBe(1);
    expect(unlockResult.mimeType).toBe('application/pdf');

    // Verify the protection marker is removed
    const bytes = fs.readFileSync(unlockResult.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getProducer()).not.toMatch(/^protected:/);

    fs.unlinkSync(protectResult.outputPath);
    fs.unlinkSync(unlockResult.outputPath);
  });

  it('should preserve page count through protect-unlock round-trip', async () => {
    const protectResult = await protect(pdf3Path, 'roundtrip');
    const unlockResult = await unlock(protectResult.outputPath, 'roundtrip');

    expect(unlockResult.pageCount).toBe(5);

    const bytes = fs.readFileSync(unlockResult.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);

    fs.unlinkSync(protectResult.outputPath);
    fs.unlinkSync(unlockResult.outputPath);
  });

  it('should throw with incorrect password', async () => {
    const protectResult = await protect(pdf1Path, 'correctpass');

    await expect(unlock(protectResult.outputPath, 'wrongpass'))
      .rejects.toThrow('Incorrect password');

    fs.unlinkSync(protectResult.outputPath);
  });

  it('should unlock an unprotected PDF without error', async () => {
    // Unlocking an unprotected PDF should just re-save it
    const result = await unlock(pdf1Path, 'anypassword');
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.pageCount).toBe(1);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(unlock(null, 'pass')).rejects.toThrow('PDF file path is required');
  });

  it('should throw when password is missing', async () => {
    await expect(unlock(pdf1Path, '')).rejects.toThrow('Password is required');
  });

  it('should throw when password is null', async () => {
    await expect(unlock(pdf1Path, null)).rejects.toThrow('Password is required');
  });

  it('should throw when file does not exist', async () => {
    await expect(unlock('/nonexistent/file.pdf', 'pass')).rejects.toThrow();
  });
});


describe('pdfService.reorder', () => {
  it('should reorder pages and preserve page count', async () => {
    const result = await reorder(pdf3Path, [4, 3, 2, 1, 0]);
    expect(result.pageCount).toBe(5);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/pdf');

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);
    fs.unlinkSync(result.outputPath);
  });

  it('should allow duplicating pages via reorder', async () => {
    const result = await reorder(pdf3Path, [0, 0, 1]);
    expect(result.pageCount).toBe(3);
    fs.unlinkSync(result.outputPath);
  });

  it('should allow subset of pages', async () => {
    const result = await reorder(pdf3Path, [2, 0]);
    expect(result.pageCount).toBe(2);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(reorder(null, [0, 1])).rejects.toThrow('PDF file path is required');
  });

  it('should throw when pageOrder is empty', async () => {
    await expect(reorder(pdf3Path, [])).rejects.toThrow('pageOrder must be a non-empty array');
  });

  it('should throw when pageOrder is not an array', async () => {
    await expect(reorder(pdf3Path, 'invalid')).rejects.toThrow('pageOrder must be a non-empty array');
  });

  it('should throw for out-of-bounds page index', async () => {
    await expect(reorder(pdf3Path, [0, 10])).rejects.toThrow('Invalid page index');
  });

  it('should throw for negative page index', async () => {
    await expect(reorder(pdf3Path, [-1, 0])).rejects.toThrow('Invalid page index');
  });
});

describe('pdfService.rotate', () => {
  it('should rotate specified pages by 90 degrees', async () => {
    const result = await rotate(pdf3Path, [0, 2], 90);
    expect(result.pageCount).toBe(5);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/pdf');

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);
    // Rotated page should have 90 degree rotation
    const page0 = doc.getPage(0);
    expect(page0.getRotation().angle).toBe(90);
    // Non-rotated page should remain at 0
    const page1 = doc.getPage(1);
    expect(page1.getRotation().angle).toBe(0);
    fs.unlinkSync(result.outputPath);
  });

  it('should rotate by 180 degrees', async () => {
    const result = await rotate(pdf1Path, [0], 180);
    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(180);
    fs.unlinkSync(result.outputPath);
  });

  it('should rotate by 270 degrees', async () => {
    const result = await rotate(pdf1Path, [0], 270);
    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(270);
    fs.unlinkSync(result.outputPath);
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(rotate(null, [0], 90)).rejects.toThrow('PDF file path is required');
  });

  it('should throw when pageIndices is empty', async () => {
    await expect(rotate(pdf1Path, [], 90)).rejects.toThrow('pageIndices must be a non-empty array');
  });

  it('should throw for invalid angle', async () => {
    await expect(rotate(pdf1Path, [0], 45)).rejects.toThrow('Invalid rotation angle');
  });

  it('should throw for out-of-bounds page index', async () => {
    await expect(rotate(pdf1Path, [5], 90)).rejects.toThrow('Invalid page index');
  });
});

describe('pdfService.watermark', () => {
  it('should apply watermark and preserve page count', async () => {
    const result = await watermark(pdf3Path, { text: 'CONFIDENTIAL' });
    expect(result.pageCount).toBe(5);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/pdf');

    const bytes = fs.readFileSync(result.outputPath);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(5);
    fs.unlinkSync(result.outputPath);
  });

  it('should apply watermark with custom config', async () => {
    const result = await watermark(pdf1Path, {
      text: 'DRAFT',
      fontSize: 30,
      opacity: 0.5,
      position: 'top-left',
    });
    expect(result.pageCount).toBe(1);
    fs.unlinkSync(result.outputPath);
  });

  it('should support all position options', async () => {
    const positions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
    for (const position of positions) {
      const result = await watermark(pdf1Path, { text: 'TEST', position });
      expect(result.pageCount).toBe(1);
      fs.unlinkSync(result.outputPath);
    }
  });

  it('should throw when pdfPath is missing', async () => {
    await expect(watermark(null, { text: 'test' })).rejects.toThrow('PDF file path is required');
  });

  it('should throw when text is missing', async () => {
    await expect(watermark(pdf1Path, {})).rejects.toThrow('Watermark text is required');
  });

  it('should throw when text is empty string', async () => {
    await expect(watermark(pdf1Path, { text: '  ' })).rejects.toThrow('Watermark text is required');
  });

  it('should throw for invalid position', async () => {
    await expect(watermark(pdf1Path, { text: 'test', position: 'middle' }))
      .rejects.toThrow('Invalid position');
  });
});

describe('pdfService.managePage', () => {
  describe('add action', () => {
    it('should add a blank page (N+1)', async () => {
      const result = await managePage(pdf3Path, 'add');
      expect(result.pageCount).toBe(6); // 5 + 1
      expect(result.mimeType).toBe('application/pdf');

      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(6);
      fs.unlinkSync(result.outputPath);
    });

    it('should add a blank page to a 1-page PDF', async () => {
      const result = await managePage(pdf1Path, 'add');
      expect(result.pageCount).toBe(2);
      fs.unlinkSync(result.outputPath);
    });
  });

  describe('delete action', () => {
    it('should delete a page (N-1)', async () => {
      const result = await managePage(pdf3Path, 'delete', 0);
      expect(result.pageCount).toBe(4); // 5 - 1
      expect(result.mimeType).toBe('application/pdf');

      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(4);
      fs.unlinkSync(result.outputPath);
    });

    it('should delete the last page', async () => {
      const result = await managePage(pdf3Path, 'delete', 4);
      expect(result.pageCount).toBe(4);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw when deleting the only page', async () => {
      await expect(managePage(pdf1Path, 'delete', 0))
        .rejects.toThrow('Cannot delete the only page');
    });

    it('should throw for out-of-bounds page number', async () => {
      await expect(managePage(pdf3Path, 'delete', 10))
        .rejects.toThrow('Invalid page number');
    });
  });

  describe('extract action', () => {
    it('should extract a single page', async () => {
      const result = await managePage(pdf3Path, 'extract', 2);
      expect(result.pageCount).toBe(1);
      expect(result.mimeType).toBe('application/pdf');

      const bytes = fs.readFileSync(result.outputPath);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      fs.unlinkSync(result.outputPath);
    });

    it('should extract the first page', async () => {
      const result = await managePage(pdf3Path, 'extract', 0);
      expect(result.pageCount).toBe(1);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw for out-of-bounds page number', async () => {
      await expect(managePage(pdf3Path, 'extract', 10))
        .rejects.toThrow('Invalid page number');
    });
  });

  describe('validation', () => {
    it('should throw when pdfPath is missing', async () => {
      await expect(managePage(null, 'add')).rejects.toThrow('PDF file path is required');
    });

    it('should throw for invalid action', async () => {
      await expect(managePage(pdf3Path, 'invalid'))
        .rejects.toThrow('Invalid action');
    });

    it('should throw when action is missing', async () => {
      await expect(managePage(pdf3Path, null))
        .rejects.toThrow('Invalid action');
    });
  });
});
