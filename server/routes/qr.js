import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { generateQr, generateBarcode } from '../services/qrService.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

/**
 * POST /api/qr/generate
 * Generate a QR code image from text/URL/contact data.
 *
 * Body: { data, color?, background?, size?, errorCorrection? }
 * Returns: ProcessResponse with QR code image
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { data, color, background, size, errorCorrection } = req.body;

    if (!data) {
      return next(new ValidationError(
        'Missing required parameter: data (text, URL, or contact info to encode)',
        'MISSING_PARAMETER'
      ));
    }

    const result = await generateQr(data, { color, background, size, errorCorrection });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);
    const fileId = uuidv4();

    const record = {
      id: fileId,
      originalName: 'qr-input.txt',
      outputName: path.basename(result.outputPath),
      inputPath: null,
      outputPath: result.outputPath,
      mimeType: result.mimeType,
      originalSize: Buffer.byteLength(data, 'utf-8'),
      outputSize: result.outputSize,
      tool: 'qr-generate',
      options: { color, background, size, errorCorrection },
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionId: req.sessionId,
      status: 'completed',
    };

    addFile(record);

    return res.json({
      success: true,
      fileId: record.id,
      downloadUrl: `/api/files/${record.id}/download`,
      metadata: {
        originalName: record.originalName,
        outputName: record.outputName,
        originalSize: record.originalSize,
        outputSize: record.outputSize,
        mimeType: record.mimeType,
        expiresAt: record.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/qr/barcode
 * Generate a barcode image in SVG format.
 *
 * Body: { data, format? ('CODE128'|'EAN13'|'UPCA'), width?, height? }
 * Returns: ProcessResponse with barcode SVG image
 */
router.post('/barcode', async (req, res, next) => {
  try {
    const { data, format, width, height } = req.body;

    if (!data) {
      return next(new ValidationError(
        'Missing required parameter: data (text to encode as barcode)',
        'MISSING_PARAMETER'
      ));
    }

    const result = await generateBarcode(data, format, { width, height });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);
    const fileId = uuidv4();

    const record = {
      id: fileId,
      originalName: 'barcode-input.txt',
      outputName: path.basename(result.outputPath),
      inputPath: null,
      outputPath: result.outputPath,
      mimeType: result.mimeType,
      originalSize: Buffer.byteLength(data, 'utf-8'),
      outputSize: result.outputSize,
      tool: 'barcode-generate',
      options: { format, width, height },
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionId: req.sessionId,
      status: 'completed',
    };

    addFile(record);

    return res.json({
      success: true,
      fileId: record.id,
      downloadUrl: `/api/files/${record.id}/download`,
      metadata: {
        originalName: record.originalName,
        outputName: record.outputName,
        originalSize: record.originalSize,
        outputSize: record.outputSize,
        mimeType: record.mimeType,
        expiresAt: record.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
