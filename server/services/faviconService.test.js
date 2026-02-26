import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateFavicons, FAVICON_SIZES } from './faviconService.js';

let tmpDir;
let testPngPath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'favicon-test-'));

  // Create a 200x200 test PNG image
  testPngPath = path.join(tmpDir, 'test-icon.png');
  await sharp({
    create: { width: 200, height: 200, channels: 4, background: { r: 66, g: 133, b: 244, alpha: 1 } },
  })
    .png()
    .toFile(testPngPath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('faviconService.generateFavicons', () => {
  it('should generate a ZIP archive from a valid image', async () => {
    const result = await generateFavicons(testPngPath);

    expect(result.outputPath).toBeTruthy();
    expect(result.outputPath.endsWith('.zip')).toBe(true);
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/zip');
    expect(fs.existsSync(result.outputPath)).toBe(true);

    fs.unlinkSync(result.outputPath);
  });

  it('should return all expected favicon sizes in the sizes array', async () => {
    const result = await generateFavicons(testPngPath);

    expect(result.sizes).toHaveLength(FAVICON_SIZES.length);
    const expectedSizes = [16, 32, 48, 64, 128, 180, 192, 512];
    for (const s of expectedSizes) {
      expect(result.sizes.find((e) => e.size === s)).toBeDefined();
    }

    fs.unlinkSync(result.outputPath);
  });

  it('should include apple-touch-icon and android-chrome entries', async () => {
    const result = await generateFavicons(testPngPath);

    const names = result.sizes.map((s) => s.name);
    expect(names).toContain('apple-touch-icon');
    expect(names).toContain('android-chrome-192x192');
    expect(names).toContain('android-chrome-512x512');

    fs.unlinkSync(result.outputPath);
  });

  it('should handle non-square input images', async () => {
    const rectPath = path.join(tmpDir, 'rect.png');
    await sharp({
      create: { width: 300, height: 150, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toFile(rectPath);

    const result = await generateFavicons(rectPath);

    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/zip');

    fs.unlinkSync(result.outputPath);
    fs.unlinkSync(rectPath);
  });

  it('should throw ProcessingError for nonexistent input file', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.png');
    await expect(generateFavicons(badPath)).rejects.toThrow('Input image file not found');
  });

  it('should throw ProcessingError for invalid/corrupted image', async () => {
    const badFile = path.join(tmpDir, 'bad.png');
    fs.writeFileSync(badFile, 'not an image');

    await expect(generateFavicons(badFile)).rejects.toThrow('Invalid or corrupted image file');

    fs.unlinkSync(badFile);
  });

  it('should throw ProcessingError when inputPath is empty', async () => {
    await expect(generateFavicons('')).rejects.toThrow('Input image file not found');
  });
});

describe('FAVICON_SIZES', () => {
  it('should export all 8 required sizes', () => {
    expect(FAVICON_SIZES).toHaveLength(8);
  });

  it('should include all required pixel sizes', () => {
    const sizes = FAVICON_SIZES.map((s) => s.size);
    expect(sizes).toContain(16);
    expect(sizes).toContain(32);
    expect(sizes).toContain(48);
    expect(sizes).toContain(64);
    expect(sizes).toContain(128);
    expect(sizes).toContain(180);
    expect(sizes).toContain(192);
    expect(sizes).toContain(512);
  });
});
