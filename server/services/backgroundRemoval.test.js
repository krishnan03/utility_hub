import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { removeBackground } from './backgroundRemoval.js';

let tmpDir;
let testPngPath;
let testJpgPath;
let bgImagePath;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-removal-test-'));

  // Create a test image with a white background and a red square in the center
  // This simulates a subject (red) on a background (white)
  const width = 100;
  const height = 100;
  const channels = 4;
  const rawData = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (x >= 30 && x < 70 && y >= 30 && y < 70) {
        // Red center square (subject)
        rawData[idx] = 255;     // R
        rawData[idx + 1] = 0;   // G
        rawData[idx + 2] = 0;   // B
        rawData[idx + 3] = 255; // A
      } else {
        // White background
        rawData[idx] = 255;     // R
        rawData[idx + 1] = 255; // G
        rawData[idx + 2] = 255; // B
        rawData[idx + 3] = 255; // A
      }
    }
  }

  testPngPath = path.join(tmpDir, 'test-subject.png');
  await sharp(rawData, { raw: { width, height, channels } })
    .png()
    .toFile(testPngPath);

  // Create a JPEG test image
  testJpgPath = path.join(tmpDir, 'test-subject.jpg');
  await sharp({
    create: { width: 50, height: 50, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .jpeg()
    .toFile(testJpgPath);

  // Create a background replacement image (blue)
  bgImagePath = path.join(tmpDir, 'bg-blue.png');
  await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
  })
    .png()
    .toFile(bgImagePath);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('backgroundRemoval.removeBackground', () => {
  it('should produce a PNG output with transparency', async () => {
    const result = await removeBackground(testPngPath);

    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('image/png');

    // Verify output is a valid PNG with alpha channel
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('png');
    expect(meta.channels).toBe(4); // RGBA = has alpha

    fs.unlinkSync(result.outputPath);
  });

  it('should make background pixels transparent (white bg test image)', async () => {
    const result = await removeBackground(testPngPath);

    // Read the output and check that some pixels are transparent
    const { data, info } = await sharp(result.outputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    let transparentCount = 0;
    let opaqueCount = 0;

    for (let i = 0; i < data.length; i += channels) {
      if (data[i + 3] === 0) {
        transparentCount++;
      } else {
        opaqueCount++;
      }
    }

    // The white background pixels should be transparent
    expect(transparentCount).toBeGreaterThan(0);
    // The red subject pixels should remain opaque
    expect(opaqueCount).toBeGreaterThan(0);

    fs.unlinkSync(result.outputPath);
  });

  it('should replace background with a solid color', async () => {
    const result = await removeBackground(testPngPath, {
      replacementColor: '#00FF00',
    });

    expect(result.outputPath).toBeTruthy();
    expect(result.mimeType).toBe('image/png');

    // Verify the output has no transparent pixels (all replaced with green)
    const { data, info } = await sharp(result.outputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { channels } = info;
    let fullyOpaque = true;
    for (let i = 0; i < data.length; i += channels) {
      if (data[i + 3] < 255) {
        fullyOpaque = false;
        break;
      }
    }
    expect(fullyOpaque).toBe(true);

    fs.unlinkSync(result.outputPath);
  });

  it('should replace background with a custom image', async () => {
    const result = await removeBackground(testPngPath, {
      replacementImagePath: bgImagePath,
    });

    expect(result.outputPath).toBeTruthy();
    expect(result.mimeType).toBe('image/png');
    expect(result.outputSize).toBeGreaterThan(0);

    // Verify output dimensions match the input
    const meta = await sharp(result.outputPath).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);

    fs.unlinkSync(result.outputPath);
  });

  it('should work with JPEG input', async () => {
    const result = await removeBackground(testJpgPath);

    expect(result.outputPath).toBeTruthy();
    expect(result.mimeType).toBe('image/png');

    const meta = await sharp(result.outputPath).metadata();
    expect(meta.format).toBe('png');

    fs.unlinkSync(result.outputPath);
  });

  it('should throw for invalid hex color', async () => {
    await expect(
      removeBackground(testPngPath, { replacementColor: 'not-a-color' })
    ).rejects.toThrow('Invalid hex color');
  });

  it('should throw for non-existent replacement image', async () => {
    await expect(
      removeBackground(testPngPath, { replacementImagePath: '/nonexistent/image.png' })
    ).rejects.toThrow('Replacement background image not found');
  });

  it('should throw for non-existent input file', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.png');
    await expect(removeBackground(badPath)).rejects.toThrow('Background removal failed');
  });

  it('should accept hex color with # prefix', async () => {
    const result = await removeBackground(testPngPath, {
      replacementColor: '#FF0000',
    });
    expect(result.outputPath).toBeTruthy();
    expect(result.mimeType).toBe('image/png');
    fs.unlinkSync(result.outputPath);
  });

  it('should accept hex color without # prefix', async () => {
    const result = await removeBackground(testPngPath, {
      replacementColor: '0000FF',
    });
    expect(result.outputPath).toBeTruthy();
    expect(result.mimeType).toBe('image/png');
    fs.unlinkSync(result.outputPath);
  });
});
