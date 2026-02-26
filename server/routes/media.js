import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createUpload } from '../middleware/upload.js';
import { sanitize } from '../middleware/sanitize.js';
import { convertAudio, convertVideo } from '../services/mediaService.js';
import { addFile } from '../services/fileStore.js';
import { ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/x-wav',
  'audio/x-flac',
  'audio/webm',
];

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-matroska',
  'video/avi',
];

// 100MB max for media files
const MEDIA_MAX_SIZE = 100 * 1024 * 1024;

const audioUpload = createUpload({
  maxFileSize: MEDIA_MAX_SIZE,
  allowedMimeTypes: AUDIO_MIME_TYPES,
});

const videoUpload = createUpload({
  maxFileSize: MEDIA_MAX_SIZE,
  allowedMimeTypes: VIDEO_MIME_TYPES,
});

/**
 * POST /api/media/convert-audio
 * Accepts a single audio file (field: 'file'), targetFormat, and optional bitrate.
 * Returns ProcessResponse with converted audio.
 */
router.post(
  '/convert-audio',
  (req, res, next) => {
    const upload = audioUpload.single('file');
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
          'An audio file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { targetFormat, bitrate } = req.body;
      if (!targetFormat) {
        return next(new ValidationError(
          'Missing required parameter: targetFormat (mp3, wav, ogg, flac, aac, m4a)',
          'MISSING_PARAMETER'
        ));
      }

      const options = {};
      if (bitrate) options.bitrate = bitrate;

      const result = await convertAudio(file.path, targetFormat, options);

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
        tool: 'audio-convert',
        options: { targetFormat, bitrate: bitrate || null },
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
          duration: result.duration,
          expiresAt: record.expiresAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/media/convert-video
 * Accepts a single video file (field: 'file'), targetFormat, and optional resolution.
 * Returns ProcessResponse with converted video.
 */
router.post(
  '/convert-video',
  (req, res, next) => {
    const upload = videoUpload.single('file');
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
          'A video file is required. Use field "file".',
          'MISSING_PARAMETER'
        ));
      }

      const { targetFormat, resolution } = req.body;
      if (!targetFormat) {
        return next(new ValidationError(
          'Missing required parameter: targetFormat (mp4, webm, avi, mov, mkv)',
          'MISSING_PARAMETER'
        ));
      }

      const options = {};
      if (resolution) options.resolution = resolution;

      const result = await convertVideo(file.path, targetFormat, options);

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
        tool: 'video-convert',
        options: { targetFormat, resolution: resolution || null },
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
          duration: result.duration,
          expiresAt: record.expiresAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
