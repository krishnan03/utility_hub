/**
 * Color Conversion & Palette Utilities
 * Pure client-side — no server calls.
 */

// ─── Hex ↔ RGB ──────────────────────────────────────────────────────────────

/**
 * Parse a hex color string to { r, g, b }.
 * Accepts '#RGB', '#RRGGBB', 'RGB', 'RRGGBB'.
 */
export function hexToRgb(hex) {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Convert RGB values to a hex string '#RRGGBB'.
 */
export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── RGB ↔ HSL ──────────────────────────────────────────────────────────────

export function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h, s, l) {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; }
  else if (hp >= 2 && hp < 3) { g1 = c; b1 = x; }
  else if (hp >= 3 && hp < 4) { g1 = x; b1 = c; }
  else if (hp >= 4 && hp < 5) { r1 = x; b1 = c; }
  else if (hp >= 5 && hp <= 6) { r1 = c; b1 = x; }
  const m = ln - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ─── RGB ↔ HSV ──────────────────────────────────────────────────────────────

export function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

// ─── RGB ↔ CMYK ─────────────────────────────────────────────────────────────

export function rgbToCmyk(r, g, b) {
  if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 };
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function hexToCmyk(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToCmyk(r, g, b);
}

// ─── Luminance & Contrast ───────────────────────────────────────────────────

function relativeLuminance({ r, g, b }) {
  const linearize = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function getContrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAG(hex1, hex2, level = 'AA') {
  const ratio = getContrastRatio(hex1, hex2);
  if (level === 'AAA') return { normalText: ratio >= 7, largeText: ratio >= 4.5 };
  return { normalText: ratio >= 4.5, largeText: ratio >= 3 };
}

// ─── Palette Generation ─────────────────────────────────────────────────────

export function generatePalette(hex, type) {
  const { h, s, l } = hexToHsl(hex);

  switch (type) {
    case 'complementary':
      return [hex, hslToHex((h + 180) % 360, s, l)];

    case 'analogous':
      return [hslToHex((h + 330) % 360, s, l), hex, hslToHex((h + 30) % 360, s, l)];

    case 'triadic':
      return [hex, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)];

    case 'monochromatic':
      return [
        hslToHex(h, s, Math.max(l - 30, 0)),
        hslToHex(h, s, Math.max(l - 15, 0)),
        hex,
        hslToHex(h, s, Math.min(l + 15, 100)),
        hslToHex(h, s, Math.min(l + 30, 100)),
      ];

    case 'split-complementary':
      return [hex, hslToHex((h + 150) % 360, s, l), hslToHex((h + 210) % 360, s, l)];

    case 'tetradic':
      return [
        hex,
        hslToHex((h + 90) % 360, s, l),
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 270) % 360, s, l),
      ];

    case 'random': {
      const baseH = Math.floor(Math.random() * 360);
      const baseSat = 55 + Math.floor(Math.random() * 30);
      const baseLit = 45 + Math.floor(Math.random() * 20);
      return Array.from({ length: 5 }, (_, i) =>
        hslToHex((baseH + i * 72 + Math.floor(Math.random() * 20 - 10) + 360) % 360, baseSat + Math.floor(Math.random() * 10 - 5), baseLit + Math.floor(Math.random() * 10 - 5))
      );
    }

    default:
      throw new Error(`Unknown palette type: ${type}`);
  }
}

/** Generate a fully random 5-color palette (Coolors-style). */
export function generateRandomPalette() {
  const baseH = Math.floor(Math.random() * 360);
  return Array.from({ length: 5 }, (_, i) => {
    const h = (baseH + i * 72 + Math.floor(Math.random() * 30 - 15) + 360) % 360;
    const s = 50 + Math.floor(Math.random() * 35);
    const l = 40 + Math.floor(Math.random() * 30);
    return hslToHex(h, s, l);
  });
}

/** Generate a random hex color. */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

// ─── Palette Export Formats ─────────────────────────────────────────────────

export function exportPaletteCSS(colors) {
  return colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n');
}

export function exportPaletteTailwind(colors) {
  const entries = colors.map((c, i) => `    ${(i + 1) * 100}: '${c}'`).join(',\n');
  return `colors: {\n  brand: {\n${entries}\n  }\n}`;
}

export function exportPaletteSCSS(colors) {
  return colors.map((c, i) => `$color-${i + 1}: ${c};`).join('\n');
}

export function exportPaletteJSON(colors) {
  return JSON.stringify(colors, null, 2);
}

// ─── Color Blindness Simulation ─────────────────────────────────────────────

const BLINDNESS_MATRICES = {
  protanopia:     [0.567, 0.433, 0,     0.558, 0.442, 0,     0,     0.242, 0.758],
  deuteranopia:   [0.625, 0.375, 0,     0.7,   0.3,   0,     0,     0.3,   0.7  ],
  tritanopia:     [0.95,  0.05,  0,     0,     0.433, 0.567, 0,     0.475, 0.525],
  achromatopsia:  [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
};

export const BLINDNESS_TYPES = Object.keys(BLINDNESS_MATRICES);

export const BLINDNESS_LABELS = {
  protanopia: 'Protanopia (red-blind)',
  deuteranopia: 'Deuteranopia (green-blind)',
  tritanopia: 'Tritanopia (blue-blind)',
  achromatopsia: 'Achromatopsia (total)',
};

export function simulateColorBlindness(hex, type) {
  const { r, g, b } = hexToRgb(hex);
  const m = BLINDNESS_MATRICES[type];
  if (!m) throw new Error(`Unknown blindness type: ${type}`);
  return rgbToHex(
    Math.round(r * m[0] + g * m[1] + b * m[2]),
    Math.round(r * m[3] + g * m[4] + b * m[5]),
    Math.round(r * m[6] + g * m[7] + b * m[8])
  );
}

// ─── Image Color Extraction ─────────────────────────────────────────────────

/**
 * Extract dominant colors from an image element using canvas pixel sampling
 * and a simple median-cut quantization approach.
 */
export function extractColorsFromImage(imageElement, colorCount = 6) {
  const canvas = document.createElement('canvas');
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // Collect all pixels, skip near-white/near-black
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const brightness = (r + g + b) / 3;
    if (brightness > 245 || brightness < 10) continue;
    pixels.push([r, g, b]);
  }

  if (pixels.length === 0) {
    return Array.from({ length: colorCount }, () => '#808080');
  }

  // Median-cut quantization
  const buckets = medianCut(pixels, colorCount);
  return buckets.map((bucket) => {
    const avg = bucket.reduce(
      (acc, px) => [acc[0] + px[0], acc[1] + px[1], acc[2] + px[2]],
      [0, 0, 0]
    );
    return rgbToHex(
      Math.round(avg[0] / bucket.length),
      Math.round(avg[1] / bucket.length),
      Math.round(avg[2] / bucket.length)
    );
  });
}

function medianCut(pixels, depth) {
  if (depth <= 1 || pixels.length === 0) return [pixels];

  // Find the channel with the widest range
  let maxRange = 0, splitChannel = 0;
  for (let ch = 0; ch < 3; ch++) {
    const vals = pixels.map((p) => p[ch]);
    const range = Math.max(...vals) - Math.min(...vals);
    if (range > maxRange) { maxRange = range; splitChannel = ch; }
  }

  pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);
  const mid = Math.floor(pixels.length / 2);
  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ];
}

// ─── Gradient Utilities ─────────────────────────────────────────────────────

export const GRADIENT_PRESETS = [
  { name: 'Sunset',       stops: [{ color: '#ff512f', pos: 0 }, { color: '#f09819', pos: 100 }] },
  { name: 'Ocean',        stops: [{ color: '#2193b0', pos: 0 }, { color: '#6dd5ed', pos: 100 }] },
  { name: 'Purple Haze',  stops: [{ color: '#7b4397', pos: 0 }, { color: '#dc2430', pos: 100 }] },
  { name: 'Emerald',      stops: [{ color: '#348f50', pos: 0 }, { color: '#56b4d3', pos: 100 }] },
  { name: 'Flamingo',     stops: [{ color: '#f953c6', pos: 0 }, { color: '#b91d73', pos: 100 }] },
  { name: 'Midnight',     stops: [{ color: '#232526', pos: 0 }, { color: '#414345', pos: 100 }] },
  { name: 'Peach',        stops: [{ color: '#ed4264', pos: 0 }, { color: '#ffedbc', pos: 100 }] },
  { name: 'Aurora',       stops: [{ color: '#00c6ff', pos: 0 }, { color: '#0072ff', pos: 100 }] },
];

export function buildGradientCSS(type, angle, stops) {
  const sortedStops = [...stops].sort((a, b) => a.pos - b.pos);
  const stopsStr = sortedStops.map((s) => `${s.color} ${s.pos}%`).join(', ');
  switch (type) {
    case 'radial':
      return `radial-gradient(circle, ${stopsStr})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg, ${stopsStr})`;
    default:
      return `linear-gradient(${angle}deg, ${stopsStr})`;
  }
}
