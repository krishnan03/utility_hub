import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUpload } from '../middleware/upload.js';
import { sanitize } from '../middleware/sanitize.js';
import { signPdf } from '../services/signatureService.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

const signatureUpload = createUpload({ allowedMimeTypes: ALLOWED_MIME_TYPES });

/**
 * POST /api/signature/sign
 *
 * Accepts a PDF file (field: 'file'), an optional signature image (field: 'signature'),
 * and body params: type, text, page, x, y, width, height, dateStamp, annotation.
 *
 * Returns a ProcessResponse with the signed PDF.
 */
router.post(
  '/sign',
  (req, res, next) => {
    const upload = signatureUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) err.status = 400;
        return next(err);
      }
      // Normalize req.files to a flat array for sanitize middleware
      if (req.files && !Array.isArray(req.files)) {
        const pdfFiles = req.files.file || [];
        const sigFiles = req.files.signature || [];
        req._originalFiles = req.files;
        req.files = [...pdfFiles, ...sigFiles];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const originalFiles = req._originalFiles || {};
      const pdfFiles = originalFiles.file || [];
      const sigFiles = originalFiles.signature || [];

      if (pdfFiles.length === 0) {
        return next(new ValidationError(
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const pdfFile = pdfFiles[0];
      if (pdfFile.mimetype !== 'application/pdf') {
        return next(new ValidationError(
          'The file field must be a PDF document.',
          'INVALID_FILE_TYPE'
        ));
      }

      const { type, text, page, x, y, width, height, dateStamp, annotation } = req.body;

      if (!type) {
        return next(new ValidationError(
          'Missing required parameter: type ("text" or "image")',
          'MISSING_PARAMETER'
        ));
      }

      const signatureConfig = {
        type,
        text: text || undefined,
        imagePath: sigFiles.length > 0 ? sigFiles[0].path : undefined,
        page: page != null ? parseInt(page, 10) : undefined,
        x: x != null ? parseFloat(x) : undefined,
        y: y != null ? parseFloat(y) : undefined,
        width: width != null ? parseFloat(width) : undefined,
        height: height != null ? parseFloat(height) : undefined,
        dateStamp: dateStamp || undefined,
        annotation: annotation || undefined,
      };

      const result = await signPdf(pdfFile.path, signatureConfig);

      const fileId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

      const record = {
        id: fileId,
        originalName: pdfFile.originalname,
        outputName: path.basename(result.outputPath),
        inputPath: pdfFile.path,
        outputPath: result.outputPath,
        mimeType: result.mimeType,
        originalSize: pdfFile.size,
        outputSize: result.outputSize,
        tool: 'pdf-signature',
        options: { type, page, x, y, width, height },
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
          pageCount: result.pageCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
