import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  getContrastRatio,
  meetsWCAG,
  generatePalette,
} from './colorUtils.js';

// ============================================================
// hexToRgb
// ============================================================

describe('hexToRgb', () => {
  it('converts red', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('converts green', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });
  it('converts blue', () => {
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });
  it('converts white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('handles shorthand hex (#f00)', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('handles hex without hash', () => {
    expect(hexToRgb('ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });
  it('throws on invalid hex', () => {
    expect(() => hexToRgb('#xyz')).toThrow();
  });
});

// ============================================================
// rgbToHex
// ============================================================

describe('rgbToHex', () => {
  it('converts red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });
  it('converts green', () => {
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
  });
  it('converts blue', () => {
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });
  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });
  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });
  it('clamps out-of-range values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
  });
});

// ============================================================
// rgbToHsl
// ============================================================

describe('rgbToHsl', () => {
  it('converts red', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
  });
  it('converts green', () => {
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
  });
  it('converts blue', () => {
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 });
  });
  it('converts white', () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
  });
  it('converts black', () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
  });
  it('converts grey', () => {
    const hsl = rgbToHsl(128, 128, 128);
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });
});

// ============================================================
// hslToRgb
// ============================================================

describe('hslToRgb', () => {
  it('converts red', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('converts green', () => {
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
  });
  it('converts blue', () => {
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
  });
  it('converts white', () => {
    expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('converts black', () => {
    expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

// ============================================================
// hexToHsl / hslToHex
// ============================================================

describe('hexToHsl', () => {
  it('converts red', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
  });
  it('converts blue', () => {
    expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 });
  });
});

describe('hslToHex', () => {
  it('converts red', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });
  it('converts green', () => {
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
  });
});

// ============================================================
// getContrastRatio
// ============================================================

describe('getContrastRatio', () => {
  it('black vs white is 21', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('same color is 1', () => {
    expect(getContrastRatio('#ff0000', '#ff0000')).toBeCloseTo(1, 1);
  });
  it('is symmetric', () => {
    const ab = getContrastRatio('#336699', '#ffcc00');
    const ba = getContrastRatio('#ffcc00', '#336699');
    expect(ab).toBeCloseTo(ba, 5);
  });
});

// ============================================================
// meetsWCAG
// ============================================================

describe('meetsWCAG', () => {
  it('black on white passes AA and AAA', () => {
    const aa = meetsWCAG('#000000', '#ffffff', 'AA');
    expect(aa.normalText).toBe(true);
    expect(aa.largeText).toBe(true);
    const aaa = meetsWCAG('#000000', '#ffffff', 'AAA');
    expect(aaa.normalText).toBe(true);
    expect(aaa.largeText).toBe(true);
  });
  it('similar colors fail AA', () => {
    const result = meetsWCAG('#cccccc', '#dddddd', 'AA');
    expect(result.normalText).toBe(false);
  });
  it('defaults to AA', () => {
    const result = meetsWCAG('#000000', '#ffffff');
    expect(result.normalText).toBe(true);
  });
});

// ============================================================
// generatePalette
// ============================================================

describe('generatePalette', () => {
  it('complementary returns 2 colors', () => {
    const palette = generatePalette('#ff0000', 'complementary');
    expect(palette).toHaveLength(2);
    expect(palette[0]).toBe('#ff0000');
  });

  it('analogous returns 3 colors', () => {
    const palette = generatePalette('#ff0000', 'analogous');
    expect(palette).toHaveLength(3);
    expect(palette[1]).toBe('#ff0000');
  });

  it('triadic returns 3 colors', () => {
    const palette = generatePalette('#ff0000', 'triadic');
    expect(palette).toHaveLength(3);
    expect(palette[0]).toBe('#ff0000');
  });

  it('monochromatic returns 5 colors', () => {
    const palette = generatePalette('#3366cc', 'monochromatic');
    expect(palette).toHaveLength(5);
    expect(palette[2]).toBe('#3366cc');
  });

  it('all palette colors are valid hex', () => {
    const palette = generatePalette('#ff8800', 'triadic');
    palette.forEach((c) => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('throws on unknown type', () => {
    expect(() => generatePalette('#ff0000', 'split')).toThrow();
  });
});
