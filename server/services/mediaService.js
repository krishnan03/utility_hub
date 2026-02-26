import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingError, ValidationError } from '../utils/errors.js';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';

/**
 * Supported audio formats and their MIME types.
 */
const AUDIO_FORMATS = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
};

/**
 * Supported video formats and their MIME types.
 */
const VIDEO_FORMATS = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
};

/**
 * Valid audio bitrate values.
 */
const VALID_BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k'];

/**
 * Valid video resolution values.
 */
const VALID_RESOLUTIONS = [
  '3840x2160', '2560x1440', '1920x1080', '1280x720',
  '854x480', '640x480', '640x360', '426x240', '320x240',
];

/**
 * Check if ffmpeg is available on the system.
 * @returns {Promise<boolean>}
 */
function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = ffmpeg();
    proc._getFfmpegPath((err, ffmpegPath) => {
      if (err || !ffmpegPath) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Probe a media file to get its duration.
 * @param {string} filePath
 * @returns {Promise<number>} Duration in seconds
 */
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new ProcessingError(
          `Failed to probe media file: ${err.message}`,
          'PROCESSING_FAILED'
        ));
        return;
      }
      resolve(metadata?.format?.duration ?? 0);
    });
  });
}

/**
 * Convert an audio file to a target format.
 *
 * @param {string} inputPath - Absolute path to the input audio file
 * @param {string} targetFormat - Target format: 'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'
 * @param {object} [options={}]
 * @param {string} [options.bitrate] - Audio bitrate (e.g., '128k', '192k', '320k')
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string, duration: number }>}
 */
export async function convertAudio(inputPath, targetFormat, options = {}) {
  // Validate inputs
  if (!inputPath) {
    throw new ValidationError('Input file path is required', 'MISSING_PARAMETER');
  }

  const target = targetFormat?.toLowerCase();
  if (!target || !AUDIO_FORMATS[target]) {
    throw new ValidationError(
      `Unsupported audio format: ${targetFormat}. Supported: ${Object.keys(AUDIO_FORMATS).join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  if (options.bitrate && !VALID_BITRATES.includes(options.bitrate)) {
    throw new ValidationError(
      `Invalid bitrate: ${options.bitrate}. Supported: ${VALID_BITRATES.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  if (!fs.existsSync(inputPath)) {
    throw new ValidationError('Input file not found', 'FILE_NOT_FOUND');
  }

  // Check ffmpeg availability
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    throw new ProcessingError(
      'ffmpeg is not installed or not available on this system. Audio conversion requires ffmpeg.',
      'PROCESSING_FAILED'
    );
  }

  const outputDir = getOutputDir();
  await ensureDir(outputDir);
  const outputFilename = `${uuidv4()}.${target}`;
  const outputPath = path.join(outputDir, outputFilename);

  // Run ffmpeg conversion
  await new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    if (options.bitrate) {
      command = command.audioBitrate(options.bitrate);
    }

    // Format-specific codec settings
    if (target === 'ogg') {
      command = command.audioCodec('libvorbis');
    } else if (target === 'aac' || target === 'm4a') {
      command = command.audioCodec('aac');
    }

    command
      .toFormat(target === 'm4a' ? 'ipod' : target)
      .on('error', (err) => {
        reject(new ProcessingError(
          `Audio conversion failed: ${err.message}`,
          'PROCESSING_FAILED'
        ));
      })
      .on('end', () => resolve())
      .save(outputPath);
  });

  // Get output file info
  const stats = fs.statSync(outputPath);
  let duration = 0;
  try {
    duration = await probeFile(outputPath);
  } catch {
    // Duration probe is best-effort
  }

  return {
    outputPath,
    outputSize: stats.size,
    mimeType: AUDIO_FORMATS[target],
    duration,
  };
}

/**
 * Convert a video file to a target format.
 *
 * @param {string} inputPath - Absolute path to the input video file
 * @param {string} targetFormat - Target format: 'mp4', 'webm', 'avi', 'mov', 'mkv'
 * @param {object} [options={}]
 * @param {string} [options.resolution] - Video resolution (e.g., '1920x1080', '1280x720')
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string, duration: number }>}
 */
export async function convertVideo(inputPath, targetFormat, options = {}) {
  // Validate inputs
  if (!inputPath) {
    throw new ValidationError('Input file path is required', 'MISSING_PARAMETER');
  }

  const target = targetFormat?.toLowerCase();
  if (!target || !VIDEO_FORMATS[target]) {
    throw new ValidationError(
      `Unsupported video format: ${targetFormat}. Supported: ${Object.keys(VIDEO_FORMATS).join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  if (options.resolution && !VALID_RESOLUTIONS.includes(options.resolution)) {
    throw new ValidationError(
      `Invalid resolution: ${options.resolution}. Supported: ${VALID_RESOLUTIONS.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  if (!fs.existsSync(inputPath)) {
    throw new ValidationError('Input file not found', 'FILE_NOT_FOUND');
  }

  // Check ffmpeg availability
  const ffmpegAvailable = await checkFfmpeg();
  if (!ffmpegAvailable) {
    throw new ProcessingError(
      'ffmpeg is not installed or not available on this system. Video conversion requires ffmpeg.',
      'PROCESSING_FAILED'
    );
  }

  const outputDir = getOutputDir();
  await ensureDir(outputDir);
  const outputFilename = `${uuidv4()}.${target}`;
  const outputPath = path.join(outputDir, outputFilename);

  // Run ffmpeg conversion
  await new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);

    if (options.resolution) {
      const [width, height] = options.resolution.split('x');
      command = command.size(`${width}x${height}`);
    }

    // Format-specific codec settings
    if (target === 'webm') {
      command = command.videoCodec('libvpx').audioCodec('libvorbis');
    } else if (target === 'mp4') {
      command = command.videoCodec('libx264').audioCodec('aac');
    } else if (target === 'mkv') {
      command = command.videoCodec('libx264').audioCodec('aac');
    }

    command
      .toFormat(target === 'mkv' ? 'matroska' : target)
      .on('error', (err) => {
        reject(new ProcessingError(
          `Video conversion failed: ${err.message}`,
          'PROCESSING_FAILED'
        ));
      })
      .on('end', () => resolve())
      .save(outputPath);
  });

  // Get output file info
  const stats = fs.statSync(outputPath);
  let duration = 0;
  try {
    duration = await probeFile(outputPath);
  } catch {
    // Duration probe is best-effort
  }

  return {
    outputPath,
    outputSize: stats.size,
    mimeType: VIDEO_FORMATS[target],
    duration,
  };
}

export { AUDIO_FORMATS, VIDEO_FORMATS, VALID_BITRATES, VALID_RESOLUTIONS };
