import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUpload } from '../middleware/upload.js';
import { sanitize } from '../middleware/sanitize.js';
import { convert } from '../services/documentService.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

const DOCUMENT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
];

const docUpload = createUpload({ allowedMimeTypes: DOCUMENT_MIME_TYPES });

/**
 * POST /api/document/convert
 * Accepts a single document file (field: 'file') and a targetFormat body param.
 * Returns ProcessResponse with converted document.
 */
router.post(
  '/convert',
  (req, res, next) => {
    const upload = docUpload.single('file');
    upload(req, res, (err) => {
      if (err) {
        if (!err.status) err.status = 400;
        return next(err);
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const file = req.file;

      if (!file) {
        return next(new ValidationError(
          'A document file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { targetFormat } = req.body;
      if (!targetFormat) {
        return next(new ValidationError(
          'Missing required parameter: targetFormat (md, html, txt, csv)',
          'MISSING_PARAMETER'
        ));
      }

      const result = await convert(file.path, targetFormat);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);
      const fileId = uuidv4();

      const record = {
        id: fileId,
        originalName: file.originalname,
        outputName: path.basename(result.outputPath),
        inputPath: file.path,
        outputPath: result.outputPath,
        mimeType: result.mimeType,
        originalSize: file.size,
        outputSize: result.outputSize,
        tool: 'document-convert',
        options: { targetFormat },
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
  }
);

export default router;
