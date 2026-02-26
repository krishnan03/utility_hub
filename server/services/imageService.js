import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ProcessingError } from '../utils/errors.js';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Map of supported output formats to their sharp format name and MIME type.
 */
const FORMAT_MAP = {
  png:  { sharp: 'png',  mime: 'image/png' },
  jpg:  { sharp: 'jpeg', mime: 'image/jpeg' },
  jpeg: { sharp: 'jpeg', mime: 'image/jpeg' },
  webp: { sharp: 'webp', mime: 'image/webp' },
  gif:  { sharp: 'gif',  mime: 'image/gif' },
  bmp:  { sharp: 'bmp',  mime: 'image/bmp' },  
  tiff: { sharp: 'tiff', mime: 'image/tiff' },
  avif: { sharp: 'avif', mime: 'image/avif' },
  ico:  { sharp: 'png',  mime: 'image/x-icon' }, // ICO output: resize to 256x256 PNG
};

export const SUPPORTED_FORMATS = Object.keys(FORMAT_MAP);

/**
 * Convert an image to a target format.
 *
 * @param {string} inputPath - Absolute path to the source image
 * @param {string} targetFormat - One of the SUPPORTED_FORMATS keys
 * @param {object} [options]
 * @param {boolean} [options.preserveMetadata=true] - Preserve EXIF metadata
 * @param {number}  [options.quality] - Quality for lossy formats (1-100)
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string }>}
 */
export async function convert(inputPath, targetFormat, options = {}) {
  const fmt = targetFormat?.toLowerCase();

  if (!fmt || !FORMAT_MAP[fmt]) {
    throw new ProcessingError(
      `Unsupported target format: ${targetFormat}. Supported: ${SUPPORTED_FORMATS.join(', ')}`,
      'CONVERSION_UNSUPPORTED'
    );
  }

  const { preserveMetadata = true, quality } = options;
  const formatInfo = FORMAT_MAP[fmt];

  try {
    const outputDir = getOutputDir();
    await ensureDir(outputDir);

    const outputExt = fmt === 'ico' ? '.ico' : `.${fmt === 'jpeg' ? 'jpg' : fmt}`;
    const outputFilename = `${uuidv4()}${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    let pipeline = sharp(inputPath);

    // Metadata preservation
    if (preserveMetadata) {
      pipeline = pipeline.keepMetadata();
    }

    // ICO: resize to 256x256
    if (fmt === 'ico') {
      pipeline = pipeline.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }

    // Apply format conversion with optional quality
    const formatOptions = {};
    if (quality !== undefined) {
      formatOptions.quality = Math.max(1, Math.min(100, quality));
    }

    pipeline = pipeline.toFormat(formatInfo.sharp, formatOptions);

    await pipeline.toFile(outputPath);

    const stats = fs.statSync(outputPath);

    return {
      outputPath,
      outputSize: stats.size,
      mimeType: formatInfo.mime,
    };
  } catch (err) {
    if (err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Image conversion failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}

/**
 * Reverse lookup: sharp format string → FORMAT_MAP key for MIME type.
 */
const SHARP_TO_FORMAT = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
  tiff: 'tiff',
  avif: 'avif',
  svg: 'png', // SVG input → treat as PNG for compression
};

/**
 * Compress an image using lossy or lossless mode.
 *
 * @param {string} inputPath - Absolute path to the source image
 * @param {number} [quality=80] - Quality level 1-100 (used in lossy mode)
 * @param {'lossy'|'lossless'} [mode='lossy'] - Compression mode
 * @returns {Promise<{ outputPath: string, outputSize: number, originalSize: number, mimeType: string }>}
 */
export async function compress(inputPath, quality = 80, mode = 'lossy') {
  const validModes = ['lossy', 'lossless'];
  if (!validModes.includes(mode)) {
    throw new ProcessingError(
      `Invalid compression mode: ${mode}. Supported: ${validModes.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  const clampedQuality = Math.max(1, Math.min(100, quality));

  try {
    const inputStats = fs.statSync(inputPath);
    const originalSize = inputStats.size;

    const metadata = await sharp(inputPath).metadata();
    const detectedFormat = metadata.format; // e.g. 'jpeg', 'png', 'webp', 'tiff', 'gif', 'avif'

    const formatKey = SHARP_TO_FORMAT[detectedFormat];
    if (!formatKey) {
      throw new ProcessingError(
        `Cannot compress format: ${detectedFormat}. Supported: ${Object.keys(SHARP_TO_FORMAT).join(', ')}`,
        'CONVERSION_UNSUPPORTED'
      );
    }

    const formatInfo = FORMAT_MAP[formatKey];
    const outputDir = getOutputDir();
    await ensureDir(outputDir);

    const outputFilename = `${uuidv4()}-compressed.${formatKey}`;
    const outputPath = path.join(outputDir, outputFilename);

    let pipeline = sharp(inputPath);

    // Build format-specific options based on mode
    const formatOptions = {};

    if (mode === 'lossless') {
      switch (detectedFormat) {
        case 'png':
          formatOptions.compressionLevel = 9;
          break;
        case 'webp':
          formatOptions.lossless = true;
          break;
        case 'tiff':
          formatOptions.compression = 'lzw';
          break;
        case 'gif':
          // GIF is inherently lossless for its palette
          break;
        case 'avif':
          formatOptions.lossless = true;
          break;
        case 'jpeg':
          // JPEG doesn't support true lossless; use max quality
          formatOptions.quality = 100;
          break;
        default:
          break;
      }
    } else {
      // Lossy mode: apply quality setting
      formatOptions.quality = clampedQuality;

      // PNG uses compressionLevel instead of quality
      if (detectedFormat === 'png') {
        delete formatOptions.quality;
        // Map quality 1-100 to compressionLevel 9-0 (lower quality = higher compression)
        formatOptions.compressionLevel = Math.round(9 - (clampedQuality / 100) * 9);
      }
    }

    pipeline = pipeline.toFormat(formatInfo.sharp, formatOptions);
    await pipeline.toFile(outputPath);

    const outputStats = fs.statSync(outputPath);

    return {
      outputPath,
      outputSize: outputStats.size,
      originalSize,
      mimeType: formatInfo.mime,
    };
  } catch (err) {
    if (err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Image compression failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}

/**
 * Social media preset dimension templates.
 */
export const PRESETS = {
  'instagram-post':    { width: 1080, height: 1080 },
  'instagram-story':   { width: 1080, height: 1920 },
  'twitter-post':      { width: 1200, height: 675 },
  'facebook-cover':    { width: 820,  height: 312 },
  'linkedin-banner':   { width: 1584, height: 396 },
  'youtube-thumbnail': { width: 1280, height: 720 },
};

/**
 * Resize an image to specified dimensions, percentage, or preset.
 *
 * @param {string} inputPath - Absolute path to the source image
 * @param {object} [options]
 * @param {number}  [options.width] - Target width in pixels
 * @param {number}  [options.height] - Target height in pixels
 * @param {number}  [options.percentage] - Percentage scale (1-1000), alternative to width/height
 * @param {boolean} [options.maintainAspectRatio=true] - Whether to maintain aspect ratio
 * @param {string}  [options.preset] - One of the PRESETS keys
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string, width: number, height: number }>}
 */
export async function resize(inputPath, options = {}) {
  const { percentage, maintainAspectRatio = true, preset } = options;
  let { width, height } = options;

  // Apply preset if specified
  if (preset) {
    const presetDims = PRESETS[preset];
    if (!presetDims) {
      throw new ProcessingError(
        `Unknown preset: ${preset}. Supported: ${Object.keys(PRESETS).join(', ')}`,
        'INVALID_PARAMETER'
      );
    }
    width = presetDims.width;
    height = presetDims.height;
  }

  try {
    const metadata = await sharp(inputPath).metadata();

    // If percentage is provided, calculate target dimensions from original
    if (percentage !== undefined) {
      const pct = Math.max(1, Math.min(1000, percentage));
      width = Math.max(1, Math.floor(metadata.width * pct / 100));
      height = Math.max(1, Math.floor(metadata.height * pct / 100));
    }

    if (!width && !height) {
      throw new ProcessingError(
        'Resize requires width, height, percentage, or preset',
        'MISSING_PARAMETER'
      );
    }

    // Determine fit strategy
    let fit;
    if (maintainAspectRatio) {
      // If both width and height given, fit inside the box preserving ratio
      // If only one dimension given, sharp auto-calculates the other
      fit = (width && height) ? 'inside' : undefined;
    } else {
      fit = 'fill';
    }

    const resizeOpts = {};
    if (width) resizeOpts.width = width;
    if (height) resizeOpts.height = height;
    if (fit) resizeOpts.fit = fit;

    const outputDir = getOutputDir();
    await ensureDir(outputDir);

    // Determine output format from input
    const detectedFormat = metadata.format;
    const formatKey = SHARP_TO_FORMAT[detectedFormat] || 'png';
    const formatInfo = FORMAT_MAP[formatKey];
    const outputExt = formatKey === 'jpeg' ? 'jpg' : formatKey;

    const outputFilename = `${uuidv4()}-resized.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    let pipeline = sharp(inputPath).resize(resizeOpts);
    pipeline = pipeline.toFormat(formatInfo.sharp);
    await pipeline.toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputMeta = await sharp(outputPath).metadata();

    return {
      outputPath,
      outputSize: outputStats.size,
      mimeType: formatInfo.mime,
      width: outputMeta.width,
      height: outputMeta.height,
    };
  } catch (err) {
    if (err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Image resize failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}


/**
 * Crop aspect ratio presets — maps preset name to width:height ratio.
 */
export const CROP_PRESETS = {
  '1:1':  { ratioW: 1, ratioH: 1 },
  '4:3':  { ratioW: 4, ratioH: 3 },
  '16:9': { ratioW: 16, ratioH: 9 },
};

/**
 * Edit an image with crop, rotate, flip, and/or watermark operations.
 * Operations are applied in order: crop → rotate → flip → watermark.
 *
 * @param {string} inputPath - Absolute path to the source image
 * @param {object} operations - Object with optional keys: crop, rotate, flip, watermark
 * @param {object} [operations.crop] - Crop config
 * @param {number} [operations.crop.left] - Left offset in pixels
 * @param {number} [operations.crop.top] - Top offset in pixels
 * @param {number} [operations.crop.width] - Crop width in pixels
 * @param {number} [operations.crop.height] - Crop height in pixels
 * @param {string} [operations.crop.preset] - One of '1:1', '4:3', '16:9'
 * @param {object} [operations.rotate] - Rotate config
 * @param {number} operations.rotate.angle - Rotation angle in degrees
 * @param {object} [operations.flip] - Flip config
 * @param {'horizontal'|'vertical'} operations.flip.direction - Flip direction
 * @param {object} [operations.watermark] - Text watermark config
 * @param {string} operations.watermark.text - Watermark text
 * @param {number} [operations.watermark.fontSize=24] - Font size in pixels
 * @param {string} [operations.watermark.color='rgba(255,255,255,0.5)'] - Text color
 * @param {number} [operations.watermark.opacity=0.5] - Opacity 0-1
 * @param {string} [operations.watermark.position='center'] - Position preset
 * @param {boolean} [operations.watermark.tiling=false] - Tile watermark across image
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string, width: number, height: number }>}
 */
export async function edit(inputPath, operations = {}) {
  if (!operations || (!operations.crop && !operations.rotate && !operations.flip && !operations.watermark)) {
    throw new ProcessingError(
      'At least one edit operation (crop, rotate, flip, watermark) is required',
      'MISSING_PARAMETER'
    );
  }

  try {
    const metadata = await sharp(inputPath).metadata();
    let pipeline = sharp(inputPath);

    // 1. CROP
    if (operations.crop) {
      const crop = operations.crop;

      if (crop.preset) {
        const presetInfo = CROP_PRESETS[crop.preset];
        if (!presetInfo) {
          throw new ProcessingError(
            `Unknown crop preset: ${crop.preset}. Supported: ${Object.keys(CROP_PRESETS).join(', ')}`,
            'INVALID_PARAMETER'
          );
        }

        const imgW = metadata.width;
        const imgH = metadata.height;
        const { ratioW, ratioH } = presetInfo;

        // Calculate largest centered crop area matching the aspect ratio
        let cropW, cropH;
        if (imgW / imgH > ratioW / ratioH) {
          // Image is wider than target ratio — constrain by height
          cropH = imgH;
          cropW = Math.floor(imgH * ratioW / ratioH);
        } else {
          // Image is taller than target ratio — constrain by width
          cropW = imgW;
          cropH = Math.floor(imgW * ratioH / ratioW);
        }

        const left = Math.floor((imgW - cropW) / 2);
        const top = Math.floor((imgH - cropH) / 2);

        pipeline = pipeline.extract({ left, top, width: cropW, height: cropH });
      } else {
        // Manual crop with explicit coordinates
        const { left = 0, top = 0, width, height } = crop;
        if (!width || !height) {
          throw new ProcessingError(
            'Crop requires width and height (or a preset)',
            'MISSING_PARAMETER'
          );
        }
        pipeline = pipeline.extract({ left, top, width, height });
      }
    }

    // 2. ROTATE
    if (operations.rotate) {
      const angle = operations.rotate.angle;
      if (angle === undefined || angle === null) {
        throw new ProcessingError(
          'Rotate requires an angle',
          'MISSING_PARAMETER'
        );
      }
      pipeline = pipeline.rotate(angle);
    }

    // 3. FLIP
    if (operations.flip) {
      const direction = operations.flip.direction;
      if (direction === 'horizontal') {
        pipeline = pipeline.flop(); // horizontal mirror
      } else if (direction === 'vertical') {
        pipeline = pipeline.flip(); // vertical mirror
      } else {
        throw new ProcessingError(
          `Invalid flip direction: ${direction}. Supported: horizontal, vertical`,
          'INVALID_PARAMETER'
        );
      }
    }

    // Determine output format
    const detectedFormat = metadata.format;
    const formatKey = SHARP_TO_FORMAT[detectedFormat] || 'png';
    const formatInfo = FORMAT_MAP[formatKey];
    const outputExt = formatKey === 'jpeg' ? 'jpg' : formatKey;

    const outputDir = getOutputDir();
    await ensureDir(outputDir);
    const outputFilename = `${uuidv4()}-edited.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);

    // 4. WATERMARK — needs compositing, so we must write intermediate then composite
    if (operations.watermark) {
      const wm = operations.watermark;
      if (!wm.text) {
        throw new ProcessingError(
          'Watermark requires text',
          'MISSING_PARAMETER'
        );
      }

      // First, write the pipeline result so far to a temp buffer
      const intermediateBuffer = await pipeline.toFormat(formatInfo.sharp).toBuffer();
      const intermediateMeta = await sharp(intermediateBuffer).metadata();
      const imgW = intermediateMeta.width;
      const imgH = intermediateMeta.height;

      const fontSize = wm.fontSize || 24;
      const color = wm.color || 'rgba(255,255,255,0.5)';
      const opacity = Math.max(0, Math.min(1, wm.opacity !== undefined ? wm.opacity : 0.5));
      const position = wm.position || 'center';
      const tiling = wm.tiling || false;

      // Build SVG watermark overlay
      const svgOverlay = buildWatermarkSvg(wm.text, imgW, imgH, fontSize, color, opacity, position, tiling);

      const result = await sharp(intermediateBuffer)
        .composite([{ input: Buffer.from(svgOverlay), gravity: 'northwest' }])
        .toFormat(formatInfo.sharp)
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      const outputMeta = await sharp(outputPath).metadata();

      return {
        outputPath,
        outputSize: outputStats.size,
        mimeType: formatInfo.mime,
        width: outputMeta.width,
        height: outputMeta.height,
      };
    }

    // No watermark — write directly
    pipeline = pipeline.toFormat(formatInfo.sharp);
    await pipeline.toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputMeta = await sharp(outputPath).metadata();

    return {
      outputPath,
      outputSize: outputStats.size,
      mimeType: formatInfo.mime,
      width: outputMeta.width,
      height: outputMeta.height,
    };
  } catch (err) {
    if (err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Image edit failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}

/**
 * Build an SVG text watermark overlay.
 * @param {string} text - Watermark text
 * @param {number} imgW - Image width
 * @param {number} imgH - Image height
 * @param {number} fontSize - Font size in pixels
 * @param {string} color - Text fill color
 * @param {number} opacity - Opacity 0-1
 * @param {string} position - Position preset
 * @param {boolean} tiling - Whether to tile the watermark
 * @returns {string} SVG string
 */
function buildWatermarkSvg(text, imgW, imgH, fontSize, color, opacity, position, tiling) {
  // Escape XML special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  if (tiling) {
    // Create a tiled pattern of watermark text
    const spacingX = Math.max(fontSize * text.length * 0.7, 100);
    const spacingY = Math.max(fontSize * 2, 60);
    let textElements = '';
    for (let y = fontSize; y < imgH; y += spacingY) {
      for (let x = 0; x < imgW; x += spacingX) {
        textElements += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" opacity="${opacity}" font-family="sans-serif" transform="rotate(-30, ${x}, ${y})">${escaped}</text>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">${textElements}</svg>`;
  }

  // Single watermark at specified position
  let x, y, anchor;
  switch (position) {
    case 'top-left':
      x = fontSize / 2;
      y = fontSize;
      anchor = 'start';
      break;
    case 'top-right':
      x = imgW - fontSize / 2;
      y = fontSize;
      anchor = 'end';
      break;
    case 'bottom-left':
      x = fontSize / 2;
      y = imgH - fontSize / 2;
      anchor = 'start';
      break;
    case 'bottom-right':
      x = imgW - fontSize / 2;
      y = imgH - fontSize / 2;
      anchor = 'end';
      break;
    case 'center':
    default:
      x = imgW / 2;
      y = imgH / 2;
      anchor = 'middle';
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}"><text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" opacity="${opacity}" font-family="sans-serif" text-anchor="${anchor}">${escaped}</text></svg>`;
}

export default { convert, compress, resize, edit, SUPPORTED_FORMATS, PRESETS, CROP_PRESETS };

