import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingError, ValidationError } from '../utils/errors.js';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';

/**
 * Embed a signature (text or image) onto a PDF page.
 *
 * @param {string} pdfPath - Absolute path to the source PDF
 * @param {object} signatureConfig - Signature configuration
 * @param {string} signatureConfig.type - 'text' or 'image'
 * @param {string} [signatureConfig.text] - Signature text (required for type 'text')
 * @param {string} [signatureConfig.imagePath] - Path to PNG image (required for type 'image')
 * @param {number} signatureConfig.page - 0-indexed page number
 * @param {number} signatureConfig.x - X position on the page
 * @param {number} signatureConfig.y - Y position on the page
 * @param {number} signatureConfig.width - Width of the signature area
 * @param {number} signatureConfig.height - Height of the signature area
 * @param {string} [signatureConfig.dateStamp] - Optional date stamp text
 * @param {string} [signatureConfig.annotation] - Optional annotation text
 * @returns {Promise<{ outputPath: string, outputSize: number, pageCount: number, mimeType: string }>}
 */
export async function signPdf(pdfPath, signatureConfig) {
  if (!pdfPath) {
    throw new ValidationError('PDF file path is required', 'MISSING_PARAMETER');
  }
  if (!signatureConfig) {
    throw new ValidationError('Signature configuration is required', 'MISSING_PARAMETER');
  }

  const { type, text, imagePath, page: pageIndex, x, y, width, height, dateStamp, annotation } = signatureConfig;

  if (!type || !['text', 'image'].includes(type)) {
    throw new ValidationError(
      'Signature type must be "text" or "image"',
      'INVALID_PARAMETER'
    );
  }

  if (type === 'text' && (!text || typeof text !== 'string' || text.trim().length === 0)) {
    throw new ValidationError('Signature text is required for type "text"', 'MISSING_PARAMETER');
  }

  if (type === 'image' && (!imagePath || typeof imagePath !== 'string')) {
    throw new ValidationError('Signature image path is required for type "image"', 'MISSING_PARAMETER');
  }

  if (pageIndex == null || typeof pageIndex !== 'number' || !Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new ValidationError('Page must be a non-negative integer (0-indexed)', 'INVALID_PARAMETER');
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new ValidationError('x and y positions are required and must be numbers', 'INVALID_PARAMETER');
  }

  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    throw new ValidationError('width and height are required and must be positive numbers', 'INVALID_PARAMETER');
  }

  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    if (pageIndex >= totalPages) {
      throw new ValidationError(
        `Page index ${pageIndex} is out of bounds. PDF has ${totalPages} page(s).`,
        'INVALID_PARAMETER'
      );
    }

    const pdfPage = pdfDoc.getPage(pageIndex);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    if (type === 'text') {
      // Calculate font size to fit within the specified width/height
      const fontSize = Math.min(height * 0.7, width / (text.length * 0.5));
      const clampedSize = Math.max(8, Math.min(fontSize, 72));

      pdfPage.drawText(text, {
        x,
        y,
        size: clampedSize,
        font,
        color: rgb(0, 0, 0),
      });
    } else {
      // type === 'image'
      if (!fs.existsSync(imagePath)) {
        throw new ValidationError('Signature image file not found', 'FILE_NOT_FOUND');
      }

      const imageBytes = fs.readFileSync(imagePath);
      let embeddedImage;

      try {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } catch {
        // If PNG embedding fails, try JPG
        try {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } catch {
          throw new ProcessingError(
            'Failed to embed signature image. Ensure it is a valid PNG or JPG file.',
            'PROCESSING_FAILED'
          );
        }
      }

      pdfPage.drawImage(embeddedImage, {
        x,
        y,
        width,
        height,
      });
    }

    // Add date stamp if provided
    if (dateStamp && typeof dateStamp === 'string' && dateStamp.trim().length > 0) {
      const dateSize = Math.max(8, Math.min(height * 0.3, 14));
      pdfPage.drawText(dateStamp, {
        x,
        y: y - dateSize - 4,
        size: dateSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Add annotation if provided
    if (annotation && typeof annotation === 'string' && annotation.trim().length > 0) {
      const annoSize = Math.max(8, Math.min(height * 0.25, 12));
      const dateOffset = dateStamp ? annoSize + 8 : 0;
      pdfPage.drawText(annotation, {
        x,
        y: y - annoSize - 4 - dateOffset,
        size: annoSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    const savedBytes = await pdfDoc.save();

    const outputDir = getOutputDir();
    await ensureDir(outputDir);
    const outputFilename = `${uuidv4()}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);

    fs.writeFileSync(outputPath, savedBytes);
    const stats = fs.statSync(outputPath);

    return {
      outputPath,
      outputSize: stats.size,
      pageCount: pdfDoc.getPageCount(),
      mimeType: 'application/pdf',
    };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Failed to sign PDF: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}
