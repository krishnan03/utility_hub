import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUpload } from '../middleware/upload.js';
import { sanitize } from '../middleware/sanitize.js';
import { generateFavicons } from '../services/faviconService.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
];

const imageUpload = createUpload({ allowedMimeTypes: IMAGE_MIME_TYPES });

/**
 * POST /api/favicon/generate
 * Accepts a single image file (field: 'file').
 * Returns a ProcessResponse with a ZIP download containing all favicon sizes + HTML snippet.
 */
router.post(
  '/generate',
  (req, res, next) => {
    const upload = imageUpload.single('file');
    upload(req, res, (err) => {
      if (err) {
        if (!err.status) err.status = 400;
        return next(err);
      }
      // Normalize for sanitize middleware
      if (req.file) {
        req.files = [req.file];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new ValidationError(
          'No file uploaded. Use field "file" to upload an image.',
          'MISSING_PARAMETER'
        ));
      }

      const result = await generateFavicons(req.file.path);
      const fileId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

      const record = {
        id: fileId,
        originalName: req.file.originalname,
        outputName: 'favicons.zip',
        inputPath: req.file.path,
        outputPath: result.outputPath,
        mimeType: result.mimeType,
        originalSize: req.file.size,
        outputSize: result.outputSize,
        tool: 'favicon-generate',
        options: {},
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
          sizes: result.sizes,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
