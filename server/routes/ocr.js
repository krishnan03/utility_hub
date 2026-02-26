import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { extractText, SUPPORTED_LANGUAGES, VALID_OCR_MIMES } from '../services/ocrService.js';
import { createUpload } from '../middleware/upload.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

const ocrUpload = createUpload({
  allowedMimeTypes: VALID_OCR_MIMES,
});

/**
 * Multer error handling wrapper — catches file filter and size limit errors
 * and converts them to ValidationErrors before reaching the route handler.
 */
function handleUpload(req, res, next) {
  const upload = ocrUpload.single('file');
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'INVALID_FILE_TYPE' || err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError(err.message, err.code));
      }
      return next(err);
    }
    next();
  });
}

/**
 * POST /api/ocr/extract
 * Extract text from an uploaded image using OCR.
 *
 * Multipart: file (single image), optional body field: language
 * Returns: ProcessResponse with extracted text in metadata
 */
router.post('/extract', handleUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ValidationError(
        'Missing required file. Upload an image for OCR text extraction.',
        'MISSING_PARAMETER'
      ));
    }

    const language = req.body.language || 'eng';

    if (!SUPPORTED_LANGUAGES[language]) {
      return next(new ValidationError(
        `Unsupported language: ${language}. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
        'INVALID_PARAMETER'
      ));
    }

    const result = await extractText(req.file.path, language);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);
    const fileId = uuidv4();

    const record = {
      id: fileId,
      originalName: req.file.originalname,
      outputName: path.basename(result.outputPath),
      inputPath: req.file.path,
      outputPath: result.outputPath,
      mimeType: result.mimeType,
      originalSize: req.file.size,
      outputSize: result.outputSize,
      tool: 'ocr-extract',
      options: { language },
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
        text: result.text,
        confidence: result.confidence,
        language,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
