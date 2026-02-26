import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getFile, deleteFile } from '../services/fileStore.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

const router = Router();

/**
 * Verify the file exists in the store and belongs to the requesting session.
 * Throws NotFoundError or ForbiddenError as appropriate.
 */
function resolveAndAuthorize(id, sessionId) {
  const record = getFile(id);
  if (!record) {
    throw new NotFoundError();
  }
  if (record.sessionId !== sessionId) {
    throw new ForbiddenError();
  }
  return record;
}

/**
 * Compute remaining seconds before a file expires.
 * Returns 0 when the file has already expired.
 */
function remainingSeconds(expiresAt) {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(diff, 0);
}

/**
 * GET /api/files/:id/info
 * Return file metadata including remaining time before expiry.
 */
router.get('/:id/info', (req, res, next) => {
  try {
    const record = resolveAndAuthorize(req.params.id, req.sessionId);
    const remaining = remainingSeconds(record.expiresAt);

    res.json({
      success: true,
      file: {
        id: record.id,
        originalName: record.originalName,
        outputName: record.outputName,
        mimeType: record.mimeType,
        originalSize: record.originalSize,
        outputSize: record.outputSize,
        tool: record.tool,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        remainingSeconds: remaining,
        status: record.status,
      },
    });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/files/:id/download
 * Stream the processed file for download.
 * Sets Content-Disposition, X-Expires-At, and X-Remaining-Seconds headers.
 */
router.get('/:id/download', (req, res, next) => {
  try {
    const record = resolveAndAuthorize(req.params.id, req.sessionId);

    // Ensure the physical file exists on disk
    if (!record.outputPath || !fs.existsSync(record.outputPath)) {
      throw new NotFoundError('Processed file not found on disk');
    }

    const remaining = remainingSeconds(record.expiresAt);

    res.set({
      'Content-Disposition': `attachment; filename="${encodeURIComponent(record.outputName || record.originalName)}"`,
      'Content-Type': record.mimeType || 'application/octet-stream',
      'X-Expires-At': record.expiresAt,
      'X-Remaining-Seconds': String(remaining),
    });

    const stream = fs.createReadStream(record.outputPath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/:id
 * Delete the file from disk and remove metadata from the store.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const record = resolveAndAuthorize(req.params.id, req.sessionId);

    // Remove physical files (input + output), ignoring missing-file errors
    for (const filePath of [record.inputPath, record.outputPath]) {
      if (filePath) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // file may already be gone — that's fine
        }
      }
    }

    deleteFile(record.id);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
