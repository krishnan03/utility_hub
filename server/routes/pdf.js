import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUpload } from '../middleware/upload.js';
import { sanitize } from '../middleware/sanitize.js';
import { convertToPdf, convertFromPdf, merge, split, compress, protect, unlock, reorder, rotate, watermark, managePage, editPdf, ocrPdf, flattenPdf } from '../services/pdfService.js';
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
  'image/avif',
];

const PDF_MIME_TYPES = ['application/pdf'];

const ALL_ALLOWED = [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES];

const pdfUpload = createUpload({ allowedMimeTypes: ALL_ALLOWED });

/**
 * Build a ProcessResponse for PDF conversion results.
 */
function buildPdfResponse(fileId, originalFiles, result, sessionId, tool) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.fileExpiryHours * 60 * 60 * 1000);

  const firstName = Array.isArray(originalFiles)
    ? originalFiles[0].originalname
    : originalFiles.originalname;
  const firstSize = Array.isArray(originalFiles)
    ? originalFiles.reduce((sum, f) => sum + f.size, 0)
    : originalFiles.size;

  const record = {
    id: fileId,
    originalName: firstName,
    outputName: path.basename(result.outputPath),
    inputPath: Array.isArray(originalFiles) ? originalFiles[0].path : originalFiles.path,
    outputPath: result.outputPath,
    mimeType: result.mimeType,
    originalSize: firstSize,
    outputSize: result.outputSize,
    tool,
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
      pageCount: result.pageCount,
    },
  };
}


/**
 * POST /api/pdf/convert
 * Accepts files and a `direction` param ('to-pdf' or 'from-pdf').
 * For to-pdf: accepts multiple image files, converts to single PDF.
 * For from-pdf: accepts single PDF file, converts to target format.
 */
router.post(
  '/convert',
  (req, res, next) => {
    const upload = pdfUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 20 },
    ]);

    upload(req, res, (err) => {
      if (err) {
        if (!err.status) err.status = 400;
        return next(err);
      }
      // Normalize req.files to a flat array
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
      const direction = req.body.direction;
      const allFiles = req.files || [];

      if (!direction) {
        return next(new ValidationError(
          'Missing required parameter: direction (to-pdf or from-pdf)',
          'MISSING_PARAMETER'
        ));
      }

      if (allFiles.length === 0) {
        return next(new ValidationError(
          'No files uploaded. Use field "file" for single or "files" for batch.',
          'MISSING_PARAMETER'
        ));
      }

      if (direction === 'to-pdf') {
        // Convert images to PDF
        if (allFiles.length > 20) {
          return next(new ValidationError(
            'Batch size exceeds maximum of 20 files',
            'BATCH_LIMIT_EXCEEDED'
          ));
        }

        const inputPaths = allFiles.map((f) => f.path);
        const result = await convertToPdf(inputPaths);
        const fileId = uuidv4();
        const response = buildPdfResponse(fileId, allFiles, result, req.sessionId, 'pdf-convert-to');

        return res.json(response);
      }

      if (direction === 'from-pdf') {
        // Convert PDF to target format
        const targetFormat = req.body.targetFormat;
        if (!targetFormat) {
          return next(new ValidationError(
            'Missing required parameter: targetFormat (png, jpg, or text)',
            'MISSING_PARAMETER'
          ));
        }

        const pdfFile = allFiles[0];
        if (pdfFile.mimetype !== 'application/pdf') {
          return next(new ValidationError(
            'from-pdf direction requires a PDF file',
            'INVALID_FILE_TYPE'
          ));
        }

        const result = await convertFromPdf(pdfFile.path, targetFormat);
        const fileId = uuidv4();
        const response = buildPdfResponse(fileId, pdfFile, result, req.sessionId, 'pdf-convert-from');

        return res.json(response);
      }

      return next(new ValidationError(
        `Invalid direction: ${direction}. Must be "to-pdf" or "from-pdf"`,
        'INVALID_PARAMETER'
      ));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/merge
 * Accepts multiple PDF files (field: 'files'), merges in upload order.
 * Returns ProcessResponse with pageCount.
 */
router.post(
  '/merge',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).array('files', 20);
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
      const files = req.files || [];

      if (files.length < 2) {
        return next(new ValidationError(
          'At least two PDF files are required for merging. Use field "files".',
          'MISSING_PARAMETER'
        ));
      }

      const pdfPaths = files.map((f) => f.path);
      const result = await merge(pdfPaths);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, files, result, req.sessionId, 'pdf-merge');

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/split
 * Accepts single PDF file (field: 'file') and `ranges` body param.
 * ranges format: "1-3,5,7-9" (comma-separated, 1-indexed)
 * Returns ProcessResponse (single range) or array of ProcessResponses (multiple ranges).
 */
router.post(
  '/split',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const ranges = req.body.ranges;
      if (!ranges) {
        return next(new ValidationError(
          'Missing required parameter: ranges (e.g. "1-3,5,7-9")',
          'MISSING_PARAMETER'
        ));
      }

      const results = await split(file.path, ranges);

      const responses = results.map((result) => {
        const fileId = uuidv4();
        return buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-split');
      });

      // Return single object if only one range, array otherwise
      return res.json(responses.length === 1 ? responses[0] : responses);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/compress
 * Accepts a single PDF file (field: 'file'), re-saves it with pdf-lib optimizations.
 * Returns ProcessResponse with originalSize and outputSize in metadata.
 */
router.post(
  '/compress',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const result = await compress(file.path);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-compress');

      // Override originalSize with the value from the compress service
      response.metadata.originalSize = result.originalSize;

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/protect
 * Accepts a single PDF file (field: 'file'), a password, and an action ('protect' or 'unlock').
 * For 'protect': adds password protection to the PDF.
 * For 'unlock': removes password protection from the PDF.
 * Returns ProcessResponse.
 */
router.post(
  '/protect',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { action, password } = req.body;

      if (!action || !['protect', 'unlock'].includes(action)) {
        return next(new ValidationError(
          'Missing or invalid action parameter. Must be "protect" or "unlock".',
          'INVALID_PARAMETER'
        ));
      }

      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        return next(new ValidationError(
          'Password is required.',
          'MISSING_PARAMETER'
        ));
      }

      let result;
      if (action === 'protect') {
        result = await protect(file.path, password);
      } else {
        result = await unlock(file.path, password);
      }

      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, `pdf-${action}`);

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/reorder
 * Accepts a single PDF file (field: 'file') and a pageOrder body param (JSON array of 0-indexed page numbers).
 * Returns ProcessResponse with reordered PDF.
 */
router.post(
  '/reorder',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      let pageOrder = req.body.pageOrder;
      if (typeof pageOrder === 'string') {
        try {
          pageOrder = JSON.parse(pageOrder);
        } catch {
          return next(new ValidationError(
            'pageOrder must be a valid JSON array of page indices.',
            'INVALID_PARAMETER'
          ));
        }
      }

      if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
        return next(new ValidationError(
          'Missing or invalid pageOrder. Must be a JSON array of 0-indexed page numbers.',
          'INVALID_PARAMETER'
        ));
      }

      pageOrder = pageOrder.map(Number);

      const result = await reorder(file.path, pageOrder);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-reorder');

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/rotate
 * Accepts a single PDF file (field: 'file'), pages (JSON array of 0-indexed), and angle (90/180/270).
 * Returns ProcessResponse with rotated PDF.
 */
router.post(
  '/rotate',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      let pages = req.body.pages;
      if (typeof pages === 'string') {
        if (pages.toLowerCase() === 'all') {
          pages = 'all';
        } else {
          try {
            pages = JSON.parse(pages);
          } catch {
            return next(new ValidationError(
              'pages must be a valid JSON array of page indices or "all".',
              'INVALID_PARAMETER'
            ));
          }
        }
      }

      if (pages !== 'all' && (!Array.isArray(pages) || pages.length === 0)) {
        return next(new ValidationError(
          'Missing or invalid pages. Must be a JSON array of 0-indexed page numbers or "all".',
          'INVALID_PARAMETER'
        ));
      }

      if (pages === 'all') {
        // Read PDF to get page count and create array of all page indices
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = (await import('fs')).default.readFileSync(file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pages = Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i);
      } else {
        pages = pages.map(Number);
      }

      const angle = parseInt(req.body.angle || req.body.degrees, 10);
      if (!angle || ![90, 180, 270].includes(angle)) {
        return next(new ValidationError(
          'Missing or invalid angle. Must be 90, 180, or 270.',
          'INVALID_PARAMETER'
        ));
      }

      const result = await rotate(file.path, pages, angle);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-rotate');

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/watermark
 * Accepts a single PDF file (field: 'file') and watermark config: text, fontSize, opacity, position.
 * Returns ProcessResponse with watermarked PDF.
 */
router.post(
  '/watermark',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { text, fontSize, opacity, position } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return next(new ValidationError(
          'Watermark text is required.',
          'MISSING_PARAMETER'
        ));
      }

      const wmConfig = {
        text,
        fontSize: fontSize ? parseInt(fontSize, 10) : undefined,
        opacity: opacity != null ? parseFloat(opacity) : undefined,
        position: position || undefined,
      };

      const result = await watermark(file.path, wmConfig);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-watermark');

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/pages
 * Accepts a single PDF file (field: 'file'), action (add/delete/extract), and pageNum (0-indexed).
 * Returns ProcessResponse with modified PDF.
 */
router.post(
  '/pages',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { action, pageNum } = req.body;

      if (!action || !['add', 'delete', 'extract'].includes(action)) {
        return next(new ValidationError(
          'Missing or invalid action. Must be "add", "delete", or "extract".',
          'INVALID_PARAMETER'
        ));
      }

      const parsedPageNum = pageNum != null ? parseInt(pageNum, 10) : undefined;

      const result = await managePage(file.path, action, parsedPageNum);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, `pdf-pages-${action}`);

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/edit
 * Accepts a single PDF file (field: 'file') and annotations JSON (field: 'annotations').
 * Applies text, drawing, highlight, rectangle, and image annotations to the PDF.
 * Returns ProcessResponse with the annotated PDF.
 */
router.post(
  '/edit',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      let annotations = {};
      if (req.body.annotations) {
        try {
          annotations = JSON.parse(req.body.annotations);
        } catch {
          return next(new ValidationError(
            'annotations must be valid JSON',
            'INVALID_PARAMETER'
          ));
        }
      }

      const canvasWidth = parseInt(req.body.canvasWidth, 10) || 800;
      const canvasHeight = parseInt(req.body.canvasHeight, 10) || 700;
      const result = await editPdf(file.path, annotations, { width: canvasWidth, height: canvasHeight });
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-edit');

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/ocr
 * Accepts a single PDF file (field: 'file') and optional language param.
 * Runs OCR on each page and returns extracted text with confidence scores.
 */
router.post(
  '/ocr',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const language = req.body.language || 'eng';
      const result = await ocrPdf(file.path, language);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-ocr');

      // Add OCR-specific metadata
      response.metadata.confidence = result.confidence;
      response.metadata.pageTexts = result.pageTexts;
      response.metadata.text = result.text;

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/pdf/flatten
 * Accepts a single PDF file (field: 'file').
 * Removes form fields and interactive elements, returning a static PDF.
 */
router.post(
  '/flatten',
  (req, res, next) => {
    const upload = createUpload({ allowedMimeTypes: PDF_MIME_TYPES }).single('file');
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
          'A PDF file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const result = await flattenPdf(file.path);
      const fileId = uuidv4();
      const response = buildPdfResponse(fileId, file, result, req.sessionId, 'pdf-flatten');

      response.metadata.fieldsFlattened = result.fieldsFlattened;

      return res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
