import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ProcessingError } from '../utils/errors.js';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attempt to load @imgly/background-removal-node.
 * Falls back to a simplified sharp-based approach if unavailable.
 */
let imglyRemoveBackground = null;
try {
  const imgly = await import('@imgly/background-removal-node');
  imglyRemoveBackground = imgly.removeBackground || imgly.default?.removeBackground;
  // Verify the library actually works by checking if it's callable
  if (typeof imglyRemoveBackground !== 'function') {
    imglyRemoveBackground = null;
  }
} catch {
  // Library not available or broken (missing resources.json) — will use sharp-based fallback
  imglyRemoveBackground = null;
}

/**
 * Remove background from an image using AI-based removal (if available)
 * or a simplified sharp-based approach (threshold-based alpha channel).
 *
 * @param {string} inputPath - Absolute path to the source image
 * @param {object} [options]
 * @param {string} [options.replacementColor] - Hex color to replace background (e.g. '#FF0000')
 * @param {string} [options.replacementImagePath] - Path to a custom background image
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string }>}
 */
export async function removeBackground(inputPath, options = {}) {
  const { replacementColor, replacementImagePath } = options;

  try {
    const outputDir = getOutputDir();
    await ensureDir(outputDir);

    const outputFilename = `${uuidv4()}-bg-removed.png`;
    const outputPath = path.join(outputDir, outputFilename);

    let resultBuffer;

    if (imglyRemoveBackground) {
      try {
        // Use AI-based background removal
        resultBuffer = await removeBackgroundWithImgly(inputPath);
      } catch {
        // AI removal failed (missing resources, etc.) — fall back to sharp
        resultBuffer = await removeBackgroundWithSharp(inputPath);
      }
    } else {
      // Fallback: simplified sharp-based approach
      resultBuffer = await removeBackgroundWithSharp(inputPath);
    }

    // Post-processing: replace background if requested
    if (replacementColor) {
      resultBuffer = await replaceWithColor(resultBuffer, replacementColor);
    } else if (replacementImagePath) {
      resultBuffer = await replaceWithImage(resultBuffer, replacementImagePath);
    }

    // Write final output
    await sharp(resultBuffer).png().toFile(outputPath);

    const stats = fs.statSync(outputPath);

    return {
      outputPath,
      outputSize: stats.size,
      mimeType: 'image/png',
    };
  } catch (err) {
    if (err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Background removal failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}


/**
 * AI-based background removal using @imgly/background-removal-node.
 * @param {string} inputPath
 * @returns {Promise<Buffer>}
 */
async function removeBackgroundWithImgly(inputPath) {
  try {
    const imageBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([imageBuffer]);
    const resultBlob = await imglyRemoveBackground(blob);
    const arrayBuffer = await resultBlob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    throw new ProcessingError(
      `AI background removal failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }
}

/**
 * Simplified sharp-based background removal fallback.
 * Converts the image to PNG with an alpha channel. Uses a basic approach:
 * extracts the image, ensures alpha channel, and applies a simple
 * threshold-based transparency on near-white/near-uniform background pixels.
 *
 * This is a simplified placeholder — the actual AI model can be swapped in later.
 *
 * @param {string} inputPath
 * @returns {Promise<Buffer>}
 */
async function removeBackgroundWithSharp(inputPath) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Ensure we have an alpha channel by converting to PNG with ensureAlpha
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Simple threshold-based approach: sample corner pixels to estimate background color,
  // then make similar pixels transparent.
  const bgSamples = [
    getPixel(data, 0, 0, width, channels),                           // top-left
    getPixel(data, width - 1, 0, width, channels),                   // top-right
    getPixel(data, 0, height - 1, width, channels),                  // bottom-left
    getPixel(data, width - 1, height - 1, width, channels),          // bottom-right
  ];

  // Average the corner samples to get estimated background color
  const bgColor = {
    r: Math.round(bgSamples.reduce((s, p) => s + p.r, 0) / bgSamples.length),
    g: Math.round(bgSamples.reduce((s, p) => s + p.g, 0) / bgSamples.length),
    b: Math.round(bgSamples.reduce((s, p) => s + p.b, 0) / bgSamples.length),
  };

  // Threshold for color distance to consider a pixel as "background"
  const threshold = 30;
  const outputData = Buffer.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = outputData[idx];
      const g = outputData[idx + 1];
      const b = outputData[idx + 2];

      const distance = Math.sqrt(
        (r - bgColor.r) ** 2 +
        (g - bgColor.g) ** 2 +
        (b - bgColor.b) ** 2
      );

      if (distance <= threshold) {
        // Make this pixel transparent
        outputData[idx + 3] = 0;
      }
    }
  }

  return sharp(outputData, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

/**
 * Get pixel color at (x, y) from raw buffer.
 */
function getPixel(data, x, y, width, channels) {
  const idx = (y * width + x) * channels;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: channels >= 4 ? data[idx + 3] : 255,
  };
}

/**
 * Replace transparent areas with a solid color.
 * @param {Buffer} imageBuffer - PNG buffer with transparency
 * @param {string} hexColor - Hex color string (e.g. '#FF0000')
 * @returns {Promise<Buffer>}
 */
async function replaceWithColor(imageBuffer, hexColor) {
  const color = parseHexColor(hexColor);

  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const outputData = Buffer.from(data);

  for (let i = 0; i < outputData.length; i += channels) {
    const alpha = outputData[i + 3];
    if (alpha < 128) {
      // Replace transparent pixel with the solid color
      outputData[i] = color.r;
      outputData[i + 1] = color.g;
      outputData[i + 2] = color.b;
      outputData[i + 3] = 255;
    }
  }

  return sharp(outputData, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

/**
 * Replace transparent areas with a custom background image.
 * @param {Buffer} foregroundBuffer - PNG buffer with transparency
 * @param {string} backgroundImagePath - Path to the background image
 * @returns {Promise<Buffer>}
 */
async function replaceWithImage(foregroundBuffer, backgroundImagePath) {
  if (!fs.existsSync(backgroundImagePath)) {
    throw new ProcessingError(
      'Replacement background image not found',
      'FILE_NOT_FOUND'
    );
  }

  const fgMeta = await sharp(foregroundBuffer).metadata();

  // Resize background to match foreground dimensions
  const background = await sharp(backgroundImagePath)
    .resize(fgMeta.width, fgMeta.height, { fit: 'cover' })
    .png()
    .toBuffer();

  // Composite foreground over background
  return sharp(background)
    .composite([{ input: foregroundBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
}

/**
 * Parse a hex color string to RGB components.
 * @param {string} hex - e.g. '#FF0000' or 'FF0000'
 * @returns {{ r: number, g: number, b: number }}
 */
function parseHexColor(hex) {
  const cleaned = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new ProcessingError(
      `Invalid hex color: ${hex}. Expected format: #RRGGBB`,
      'INVALID_PARAMETER'
    );
  }
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

export default { removeBackground };
