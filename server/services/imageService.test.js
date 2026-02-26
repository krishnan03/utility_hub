import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { convert, compress, resize, edit, SUPPORTED_FORMATS, PRESETS, CROP_PRESETS } from './imageService.js';

let tmpDir;
let testPngPath;
let testJpgPath;
let testWebpPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-test-'));

  // Create a small 10x10 red PNG test image
  testPngPath = path.join(tmpDir, 'test.png');
  await sharp({
    create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
  })
    .png()
    .toFile(testPngPath);

  // Create a small JPEG test image with EXIF-like metadata
  testJpgPath = path.join(tmpDir, 'test.jpg');
  await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { ImageDescription: 'test image' } } })
    .toFile(testJpgPath);

  // Create a small WebP test image for compress tests
  testWebpPath = path.join(tmpDir, 'test.webp');
  await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .webp()
    .toFile(testWebpPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('imageService.convert', () => {
  it('should convert PNG to JPEG', async () => {
    const result = await convert(testPngPath, 'jpg');
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/jpeg');
    // Verify the output is a valid JPEG
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('jpeg');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert PNG to WEBP', async () => {
    const result = await convert(testPngPath, 'webp');
    expect(result.mimeType).toBe('image/webp');
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('webp');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert PNG to TIFF', async () => {
    const result = await convert(testPngPath, 'tiff');
    expect(result.mimeType).toBe('image/tiff');
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('tiff');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert PNG to AVIF', async () => {
    const result = await convert(testPngPath, 'avif');
    expect(result.mimeType).toBe('image/avif');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert PNG to GIF', async () => {
    const result = await convert(testPngPath, 'gif');
    expect(result.mimeType).toBe('image/gif');
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('gif');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert to ICO (256x256 PNG)', async () => {
    const result = await convert(testPngPath, 'ico');
    expect(result.mimeType).toBe('image/x-icon');
    // ICO is stored as PNG internally
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
    fs.unlinkSync(result.outputPath);
  });

  it('should accept quality option for lossy formats', async () => {
    const highQ = await convert(testPngPath, 'jpg', { quality: 95 });
    const lowQ = await convert(testPngPath, 'jpg', { quality: 10 });
    // Low quality should generally be smaller
    expect(lowQ.outputSize).toBeLessThanOrEqual(highQ.outputSize);
    fs.unlinkSync(highQ.outputPath);
    fs.unlinkSync(lowQ.outputPath);
  });

  it('should preserve metadata when preserveMetadata is true', async () => {
    const result = await convert(testJpgPath, 'jpg', { preserveMetadata: true });
    const meta = await sharp(result.outputPath).metadata();
    // EXIF buffer should be present
    expect(meta.exif).toBeTruthy();
    fs.unlinkSync(result.outputPath);
  });

  it('should strip metadata when preserveMetadata is false', async () => {
    const result = await convert(testJpgPath, 'png', { preserveMetadata: false });
    const meta = await sharp(result.outputPath).metadata();
    // EXIF should be absent or empty
    expect(meta.exif).toBeFalsy();
    fs.unlinkSync(result.outputPath);
  });

  it('should throw ProcessingError for unsupported format', async () => {
    await expect(convert(testPngPath, 'xyz')).rejects.toThrow('Unsupported target format');
  });

  it('should throw ProcessingError for invalid input file', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.png');
    await expect(convert(badPath, 'jpg')).rejects.toThrow('Image conversion failed');
  });

  it('should export SUPPORTED_FORMATS with all expected formats', () => {
    const expected = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'ico'];
    for (const fmt of expected) {
      expect(SUPPORTED_FORMATS).toContain(fmt);
    }
  });
});

describe('imageService.compress', () => {
  it('should compress a JPEG in lossy mode and return sizes', async () => {
    const result = await compress(testJpgPath, 50, 'lossy');
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/jpeg');
    // Verify output is valid JPEG
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('jpeg');
    fs.unlinkSync(result.outputPath);
  });

  it('should compress a PNG in lossy mode', async () => {
    const result = await compress(testPngPath, 60, 'lossy');
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/png');
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('png');
    fs.unlinkSync(result.outputPath);
  });

  it('should compress a WebP in lossy mode', async () => {
    const result = await compress(testWebpPath, 50, 'lossy');
    expect(result.mimeType).toBe('image/webp');
    expect(result.originalSize).toBeGreaterThan(0);
    fs.unlinkSync(result.outputPath);
  });

  it('should compress a JPEG in lossless mode', async () => {
    const result = await compress(testJpgPath, 80, 'lossless');
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/jpeg');
    fs.unlinkSync(result.outputPath);
  });

  it('should compress a PNG in lossless mode with compressionLevel 9', async () => {
    const result = await compress(testPngPath, 80, 'lossless');
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/png');
    fs.unlinkSync(result.outputPath);
  });

  it('should compress a WebP in lossless mode', async () => {
    const result = await compress(testWebpPath, 80, 'lossless');
    expect(result.mimeType).toBe('image/webp');
    fs.unlinkSync(result.outputPath);
  });

  it('should default to quality 80 and lossy mode', async () => {
    const result = await compress(testJpgPath);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/jpeg');
    fs.unlinkSync(result.outputPath);
  });

  it('should clamp quality to valid range', async () => {
    const resultLow = await compress(testJpgPath, -5, 'lossy');
    expect(resultLow.outputSize).toBeGreaterThan(0);
    fs.unlinkSync(resultLow.outputPath);

    const resultHigh = await compress(testJpgPath, 200, 'lossy');
    expect(resultHigh.outputSize).toBeGreaterThan(0);
    fs.unlinkSync(resultHigh.outputPath);
  });

  it('should throw for invalid compression mode', async () => {
    await expect(compress(testJpgPath, 80, 'invalid')).rejects.toThrow('Invalid compression mode');
  });

  it('should throw for invalid input file', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.png');
    await expect(compress(badPath, 80, 'lossy')).rejects.toThrow('Image compression failed');
  });
});

let testLargePngPath;

beforeAll(async () => {
  // Create a larger image (100x80) for resize tests
  testLargePngPath = path.join(tmpDir, 'test-large.png');
  await sharp({
    create: { width: 100, height: 80, channels: 4, background: { r: 128, g: 64, b: 200, alpha: 1 } },
  })
    .png()
    .toFile(testLargePngPath);
});

describe('imageService.resize', () => {
  it('should resize to exact pixel dimensions with aspect ratio off', async () => {
    const result = await resize(testLargePngPath, { width: 50, height: 50, maintainAspectRatio: false });
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/png');
    fs.unlinkSync(result.outputPath);
  });

  it('should resize with aspect ratio maintained (inside fit) when both dimensions given', async () => {
    const result = await resize(testLargePngPath, { width: 50, height: 50, maintainAspectRatio: true });
    // Original is 100x80 (5:4 ratio). Fitting inside 50x50 → 50x40
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
    fs.unlinkSync(result.outputPath);
  });

  it('should resize with only width specified (auto height, aspect ratio preserved)', async () => {
    const result = await resize(testLargePngPath, { width: 50 });
    // Original 100x80 → width 50, height should be 40
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
    fs.unlinkSync(result.outputPath);
  });

  it('should resize with only height specified (auto width, aspect ratio preserved)', async () => {
    const result = await resize(testLargePngPath, { height: 40 });
    // Original 100x80 → height 40, width should be 50
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
    fs.unlinkSync(result.outputPath);
  });

  it('should resize by percentage', async () => {
    const result = await resize(testLargePngPath, { percentage: 50 });
    // 100x80 at 50% → 50x40
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
    fs.unlinkSync(result.outputPath);
  });

  it('should resize by percentage (200%)', async () => {
    const result = await resize(testLargePngPath, { percentage: 200 });
    // 100x80 at 200% → 200x160
    expect(result.width).toBe(200);
    expect(result.height).toBe(160);
    fs.unlinkSync(result.outputPath);
  });

  it('should clamp percentage to 1-1000 range', async () => {
    const result = await resize(testLargePngPath, { percentage: 0 });
    // Clamped to 1% → floor(100*1/100)=1, floor(80*1/100)=0 → clamped to 1
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
    fs.unlinkSync(result.outputPath);
  });

  it('should apply preset dimensions (instagram-post)', async () => {
    const result = await resize(testLargePngPath, { preset: 'instagram-post', maintainAspectRatio: false });
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1080);
    fs.unlinkSync(result.outputPath);
  });

  it('should apply preset dimensions (youtube-thumbnail)', async () => {
    const result = await resize(testLargePngPath, { preset: 'youtube-thumbnail', maintainAspectRatio: false });
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    fs.unlinkSync(result.outputPath);
  });

  it('should export all expected presets', () => {
    const expectedPresets = ['instagram-post', 'instagram-story', 'twitter-post', 'facebook-cover', 'linkedin-banner', 'youtube-thumbnail'];
    for (const p of expectedPresets) {
      expect(PRESETS[p]).toBeDefined();
      expect(PRESETS[p].width).toBeGreaterThan(0);
      expect(PRESETS[p].height).toBeGreaterThan(0);
    }
  });

  it('should throw for unknown preset', async () => {
    await expect(resize(testLargePngPath, { preset: 'tiktok-cover' })).rejects.toThrow('Unknown preset');
  });

  it('should throw when no dimensions, percentage, or preset provided', async () => {
    await expect(resize(testLargePngPath, {})).rejects.toThrow('Resize requires width, height, percentage, or preset');
  });

  it('should throw for invalid input file', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.png');
    await expect(resize(badPath, { width: 50 })).rejects.toThrow('Image resize failed');
  });

  it('should default maintainAspectRatio to true', async () => {
    const result = await resize(testLargePngPath, { width: 50, height: 50 });
    // With aspect ratio maintained, 100x80 inside 50x50 → 50x40
    expect(result.width).toBe(50);
    expect(result.height).toBe(40);
    fs.unlinkSync(result.outputPath);
  });
});

describe('imageService.edit', () => {
  // Use testLargePngPath (100x80) for edit tests

  describe('crop', () => {
    it('should crop with explicit coordinates', async () => {
      const result = await edit(testLargePngPath, {
        crop: { left: 10, top: 10, width: 50, height: 40 },
      });
      expect(result.width).toBe(50);
      expect(result.height).toBe(40);
      expect(result.outputSize).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/png');
      fs.unlinkSync(result.outputPath);
    });

    it('should crop with 1:1 preset (center crop)', async () => {
      // 100x80 image, 1:1 → crop 80x80 centered
      const result = await edit(testLargePngPath, {
        crop: { preset: '1:1' },
      });
      expect(result.width).toBe(80);
      expect(result.height).toBe(80);
      fs.unlinkSync(result.outputPath);
    });

    it('should crop with 4:3 preset', async () => {
      // 100x80 image, 4:3 ratio → constrained by width: 100x75
      const result = await edit(testLargePngPath, {
        crop: { preset: '4:3' },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(75);
      fs.unlinkSync(result.outputPath);
    });

    it('should crop with 16:9 preset', async () => {
      // 100x80 image, 16:9 ratio → constrained by width: 100x56
      const result = await edit(testLargePngPath, {
        crop: { preset: '16:9' },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(56);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw for unknown crop preset', async () => {
      await expect(edit(testLargePngPath, {
        crop: { preset: '3:2' },
      })).rejects.toThrow('Unknown crop preset');
    });

    it('should throw when crop has no width/height and no preset', async () => {
      await expect(edit(testLargePngPath, {
        crop: { left: 0, top: 0 },
      })).rejects.toThrow('Crop requires width and height');
    });
  });

  describe('rotate', () => {
    it('should rotate by 90 degrees', async () => {
      const result = await edit(testLargePngPath, {
        rotate: { angle: 90 },
      });
      // 100x80 rotated 90° → 80x100
      expect(result.width).toBe(80);
      expect(result.height).toBe(100);
      fs.unlinkSync(result.outputPath);
    });

    it('should rotate by 180 degrees', async () => {
      const result = await edit(testLargePngPath, {
        rotate: { angle: 180 },
      });
      // 180° rotation preserves dimensions
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      fs.unlinkSync(result.outputPath);
    });

    it('should rotate by 270 degrees', async () => {
      const result = await edit(testLargePngPath, {
        rotate: { angle: 270 },
      });
      expect(result.width).toBe(80);
      expect(result.height).toBe(100);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw when angle is missing', async () => {
      await expect(edit(testLargePngPath, {
        rotate: {},
      })).rejects.toThrow('Rotate requires an angle');
    });
  });

  describe('flip', () => {
    it('should flip horizontally and produce same dimensions', async () => {
      const result = await edit(testLargePngPath, {
        flip: { direction: 'horizontal' },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      expect(result.outputSize).toBeGreaterThan(0);
      fs.unlinkSync(result.outputPath);
    });

    it('should flip vertically and produce same dimensions', async () => {
      const result = await edit(testLargePngPath, {
        flip: { direction: 'vertical' },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw for invalid flip direction', async () => {
      await expect(edit(testLargePngPath, {
        flip: { direction: 'diagonal' },
      })).rejects.toThrow('Invalid flip direction');
    });
  });

  describe('watermark', () => {
    it('should apply a centered text watermark', async () => {
      const result = await edit(testLargePngPath, {
        watermark: { text: 'Test', position: 'center', opacity: 0.5 },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      expect(result.outputSize).toBeGreaterThan(0);
      fs.unlinkSync(result.outputPath);
    });

    it('should apply watermark at bottom-right', async () => {
      const result = await edit(testLargePngPath, {
        watermark: { text: 'Copyright', position: 'bottom-right', fontSize: 12, opacity: 0.8 },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      fs.unlinkSync(result.outputPath);
    });

    it('should apply tiled watermark', async () => {
      const result = await edit(testLargePngPath, {
        watermark: { text: 'DRAFT', tiling: true, opacity: 0.3 },
      });
      expect(result.width).toBe(100);
      expect(result.height).toBe(80);
      fs.unlinkSync(result.outputPath);
    });

    it('should throw when watermark text is missing', async () => {
      await expect(edit(testLargePngPath, {
        watermark: { position: 'center' },
      })).rejects.toThrow('Watermark requires text');
    });
  });

  describe('combined operations', () => {
    it('should apply crop then rotate', async () => {
      const result = await edit(testLargePngPath, {
        crop: { left: 0, top: 0, width: 60, height: 40 },
        rotate: { angle: 90 },
      });
      // Crop to 60x40, then rotate 90° → 40x60
      expect(result.width).toBe(40);
      expect(result.height).toBe(60);
      fs.unlinkSync(result.outputPath);
    });

    it('should apply crop, rotate, and flip together', async () => {
      const result = await edit(testLargePngPath, {
        crop: { left: 0, top: 0, width: 80, height: 60 },
        rotate: { angle: 180 },
        flip: { direction: 'horizontal' },
      });
      // Crop to 80x60, rotate 180° → 80x60, flip → 80x60
      expect(result.width).toBe(80);
      expect(result.height).toBe(60);
      fs.unlinkSync(result.outputPath);
    });
  });

  describe('validation', () => {
    it('should throw when no operations provided', async () => {
      await expect(edit(testLargePngPath, {})).rejects.toThrow('At least one edit operation');
    });

    it('should throw for invalid input file', async () => {
      const badPath = path.join(tmpDir, 'nonexistent.png');
      await expect(edit(badPath, { rotate: { angle: 90 } })).rejects.toThrow('Image edit failed');
    });

    it('should export CROP_PRESETS with expected keys', () => {
      expect(CROP_PRESETS['1:1']).toBeDefined();
      expect(CROP_PRESETS['4:3']).toBeDefined();
      expect(CROP_PRESETS['16:9']).toBeDefined();
    });
  });
});
