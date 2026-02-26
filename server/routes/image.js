import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { createUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { sanitize } from '../middleware/sanitize.js';
import { convert, compress, resize, edit, SUPPORTED_FORMATS } from '../services/imageService.js';
import { removeBackground } from '../services/backgroundRemoval.js';
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
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/avif',
  'image/svg+xml',
];

const imageUpload = createUpload({ allowedMimeTypes: IMAGE_MIME_TYPES });

/**
 * Build a ProcessResponse object from a conversion result and file metadata.
 */
function buildResponse(fileId, originalFile, result, sessionId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const record = {
    id: fileId,
    originalName: originalFile.originalname,
    outputName: `${path.parse(originalFile.originalname).name}-converted${path.extname(result.outputPath)}`,
    inputPath: originalFile.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: originalFile.size,
    outputSize: result.outputSize,
    tool: 'image-convert',
    options: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
    status: 'completed',
  };

  addFile(record);

  return {
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
  };
}

/**
 * POST /api/image/convert
 * Accepts single file (field: 'file') or batch (field: 'files', max 20).
 */
router.post(
  '/convert',
  // Try batch first, fall back to single
  (req, res, next) => {
    const upload = imageUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        // Ensure all upload errors have a status for the error handler
        if (!err.status) {
          err.status = 400;
        }
        return next(err);
      }
      // Normalize req.files for sanitize middleware — it expects an array
      if (req.files && !Array.isArray(req.files)) {
        const singleFiles = req.files.file || [];
        const batchFiles = req.files.files || [];
        req._originalFiles = req.files;
        req.files = [...singleFiles, ...batchFiles];
      }
      next();
    });
  },
  sanitize,
  validate({ requiredParams: ['targetFormat'] }),
  async (req, res, next) => {
    try {
      const { targetFormat, preserveMetadata } = req.body;
      const shouldPreserve = preserveMetadata !== 'false';

      // Files are already normalized to an array by the upload middleware
      const allFiles = req.files || [];

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length > 20) {
        return next(new ValidationError(
          'Batch size exceeds maximum of 20 files',
          'BATCH_LIMIT_EXCEEDED'
        ));
      }

      const options = {
        preserveMetadata: shouldPreserve,
      };

      if (req.body.quality) {
        options.quality = parseInt(req.body.quality, 10);
      }

      // Process all files
      const results = [];
      for (const file of allFiles) {
        const result = await convert(file.path, targetFormat, options);
        const fileId = uuidv4();
        results.push(buildResponse(fileId, file, result, req.sessionId));
      }

      // Single file: return object directly. Batch: return array.
      if (allFiles.length === 1) {
        return res.json(results[0]);
      }

      return res.json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Build a ProcessResponse for compress results (includes originalSize in metadata).
 */
function buildCompressResponse(fileId, originalFile, result, sessionId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const record = {
    id: fileId,
    originalName: originalFile.originalname,
    outputName: `${path.parse(originalFile.originalname).name}-compressed${path.extname(result.outputPath)}`,
    inputPath: originalFile.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: result.originalSize,
    outputSize: result.outputSize,
    tool: 'image-compress',
    options: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
    status: 'completed',
  };

  addFile(record);

  return {
    success: true,
    fileId: record.id,
    downloadUrl: `/api/files/${record.id}/download`,
    metadata: {
      originalName: record.originalName,
      outputName: record.outputName,
      originalSize: result.originalSize,
      outputSize: result.outputSize,
      mimeType: record.mimeType,
      expiresAt: record.expiresAt,
    },
  };
}

/**
 * POST /api/image/compress
 * Accepts single file (field: 'file') or batch (field: 'files', max 20).
 * Body params: quality (optional, default 80), mode (optional, default 'lossy')
 */
router.post(
  '/compress',
  (req, res, next) => {
    const upload = imageUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) {
          err.status = 400;
        }
        return next(err);
      }
      if (req.files && !Array.isArray(req.files)) {
        const singleFiles = req.files.file || [];
        const batchFiles = req.files.files || [];
        req._originalFiles = req.files;
        req.files = [...singleFiles, ...batchFiles];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const allFiles = req.files || [];

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length > 20) {
        return next(new ValidationError(
          'Batch size exceeds maximum of 20 files',
          'BATCH_LIMIT_EXCEEDED'
        ));
      }

      const quality = req.body.quality ? parseInt(req.body.quality, 10) : 80;
      const mode = req.body.mode || 'lossy';

      const results = [];
      for (const file of allFiles) {
        const result = await compress(file.path, quality, mode);
        const fileId = uuidv4();
        results.push(buildCompressResponse(fileId, file, result, req.sessionId));
      }

      if (allFiles.length === 1) {
        return res.json(results[0]);
      }

      return res.json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Build a ProcessResponse for resize results (includes width/height in metadata).
 */
function buildResizeResponse(fileId, originalFile, result, sessionId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const record = {
    id: fileId,
    originalName: originalFile.originalname,
    outputName: `${path.parse(originalFile.originalname).name}-resized${path.extname(result.outputPath)}`,
    inputPath: originalFile.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: originalFile.size,
    outputSize: result.outputSize,
    tool: 'image-resize',
    options: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
    status: 'completed',
  };

  addFile(record);

  return {
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
      width: result.width,
      height: result.height,
    },
  };
}

/**
 * POST /api/image/resize
 * Accepts single file (field: 'file') or batch (field: 'files', max 20).
 * Body params: width, height, percentage, maintainAspectRatio (default 'true'), preset
 */
router.post(
  '/resize',
  (req, res, next) => {
    const upload = imageUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) {
          err.status = 400;
        }
        return next(err);
      }
      if (req.files && !Array.isArray(req.files)) {
        const singleFiles = req.files.file || [];
        const batchFiles = req.files.files || [];
        req._originalFiles = req.files;
        req.files = [...singleFiles, ...batchFiles];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const allFiles = req.files || [];

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length > 20) {
        return next(new ValidationError(
          'Batch size exceeds maximum of 20 files',
          'BATCH_LIMIT_EXCEEDED'
        ));
      }

      const resizeOptions = {};

      if (req.body.width) resizeOptions.width = parseInt(req.body.width, 10);
      if (req.body.height) resizeOptions.height = parseInt(req.body.height, 10);
      if (req.body.percentage) resizeOptions.percentage = parseFloat(req.body.percentage);
      if (req.body.preset) resizeOptions.preset = req.body.preset;

      // Default maintainAspectRatio to true
      resizeOptions.maintainAspectRatio = req.body.maintainAspectRatio !== 'false';

      const results = [];
      for (const file of allFiles) {
        const result = await resize(file.path, resizeOptions);
        const fileId = uuidv4();
        results.push(buildResizeResponse(fileId, file, result, req.sessionId));
      }

      if (allFiles.length === 1) {
        return res.json(results[0]);
      }

      return res.json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Build a ProcessResponse for edit results (includes width/height in metadata).
 */
function buildEditResponse(fileId, originalFile, result, sessionId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const record = {
    id: fileId,
    originalName: originalFile.originalname,
    outputName: `${path.parse(originalFile.originalname).name}-edited${path.extname(result.outputPath)}`,
    inputPath: originalFile.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: originalFile.size,
    outputSize: result.outputSize,
    tool: 'image-edit',
    options: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
    status: 'completed',
  };

  addFile(record);

  return {
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
      width: result.width,
      height: result.height,
    },
  };
}

/**
 * POST /api/image/edit
 * Accepts single file (field: 'file') or batch (field: 'files', max 20).
 * Body params: operations (JSON string with crop/rotate/flip/watermark config)
 */
router.post(
  '/edit',
  (req, res, next) => {
    const upload = imageUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) {
          err.status = 400;
        }
        return next(err);
      }
      if (req.files && !Array.isArray(req.files)) {
        const singleFiles = req.files.file || [];
        const batchFiles = req.files.files || [];
        req._originalFiles = req.files;
        req.files = [...singleFiles, ...batchFiles];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const allFiles = req.files || [];

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length > 20) {
        return next(new ValidationError(
          'Batch size exceeds maximum of 20 files',
          'BATCH_LIMIT_EXCEEDED'
        ));
      }

      // Parse operations from JSON string or object
      let operations;
      try {
        operations = typeof req.body.operations === 'string'
          ? JSON.parse(req.body.operations)
          : req.body.operations;
      } catch {
        return next(new ValidationError(
          'Invalid operations JSON',
          'INVALID_PARAMETER'
        ));
      }

      if (!operations) {
        return next(new ValidationError(
          'operations parameter is required',
          'MISSING_PARAMETER'
        ));
      }

      const results = [];
      for (const file of allFiles) {
        const result = await edit(file.path, operations);
        const fileId = uuidv4();
        results.push(buildEditResponse(fileId, file, result, req.sessionId));
      }

      if (allFiles.length === 1) {
        return res.json(results[0]);
      }

      return res.json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Build a ProcessResponse for background removal results.
 */
function buildBgRemovalResponse(fileId, originalFile, result, sessionId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const record = {
    id: fileId,
    originalName: originalFile.originalname,
    outputName: `${path.parse(originalFile.originalname).name}-bg-removed.png`,
    inputPath: originalFile.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: originalFile.size,
    outputSize: result.outputSize,
    tool: 'image-remove-bg',
    options: {},
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sessionId,
    status: 'completed',
  };

  addFile(record);

  return {
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
  };
}

/**
 * POST /api/image/remove-bg
 * Accepts single file (field: 'file') or batch (field: 'files', max 10).
 * Optional second file field: 'replacementImage' for custom background.
 * Body params: replacementColor (optional hex string)
 */
router.post(
  '/remove-bg',
  (req, res, next) => {
    const upload = imageUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 10 },
      { name: 'replacementImage', maxCount: 1 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) {
          err.status = 400;
        }
        return next(err);
      }
      if (req.files && !Array.isArray(req.files)) {
        const singleFiles = req.files.file || [];
        const batchFiles = req.files.files || [];
        req._replacementImage = req.files.replacementImage?.[0] || null;
        req._originalFiles = req.files;
        req.files = [...singleFiles, ...batchFiles];
      }
      next();
    });
  },
  sanitize,
  async (req, res, next) => {
    try {
      const allFiles = req.files || [];

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length > 10) {
        return next(new ValidationError(
          'Batch size exceeds maximum of 10 files for background removal',
          'BATCH_LIMIT_EXCEEDED'
        ));
      }

      const options = {};
      if (req.body.replacementColor) {
        options.replacementColor = req.body.replacementColor;
      }
      if (req._replacementImage) {
        options.replacementImagePath = req._replacementImage.path;
      }

      const results = [];
      for (const file of allFiles) {
        const result = await removeBackground(file.path, options);
        const fileId = uuidv4();
        results.push(buildBgRemovalResponse(fileId, file, result, req.sessionId));
      }

      if (allFiles.length === 1) {
        return res.json(results[0]);
      }

      return res.json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
