import QRCode from 'qrcode';
import path from 'path';
import { writeFile, stat } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';
import { ValidationError, ProcessingError } from '../utils/errors.js';

/**
 * Valid QR error correction levels.
 */
const VALID_EC_LEVELS = ['L', 'M', 'Q', 'H'];

/**
 * Supported barcode formats.
 */
const SUPPORTED_BARCODE_FORMATS = ['CODE128', 'EAN13', 'UPCA'];

/**
 * Generate a QR code image from the provided data.
 *
 * @param {string} data - Text, URL, or contact data to encode
 * @param {object} [options]
 * @param {string} [options.color='#000000'] - Foreground color (hex)
 * @param {string} [options.background='#ffffff'] - Background color (hex)
 * @param {number} [options.size=400] - Image width in pixels
 * @param {string} [options.errorCorrection='M'] - Error correction level (L|M|Q|H)
 * @returns {Promise<{outputPath: string, outputSize: number, mimeType: string}>}
 */
export async function generateQr(data, options = {}) {
  if (!data || typeof data !== 'string' || data.trim().length === 0) {
    throw new ValidationError('QR data is required and must be a non-empty string', 'MISSING_PARAMETER');
  }

  const color = options.color || '#000000';
  const background = options.background || '#ffffff';
  const size = Math.min(Math.max(parseInt(options.size, 10) || 400, 100), 2000);
  const errorCorrection = (options.errorCorrection || 'M').toUpperCase();

  if (!VALID_EC_LEVELS.includes(errorCorrection)) {
    throw new ValidationError(
      `Invalid error correction level: ${errorCorrection}. Must be one of: ${VALID_EC_LEVELS.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  const outputDir = getOutputDir();
  await ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${uuidv4()}-qr.png`);

  try {
    const buffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: background,
      },
      errorCorrectionLevel: errorCorrection,
    });

    await writeFile(outputPath, buffer);
    const stats = await stat(outputPath);

    return {
      outputPath,
      outputSize: stats.size,
      mimeType: 'image/png',
    };
  } catch (err) {
    throw new ProcessingError(`QR code generation failed: ${err.message}`, 'PROCESSING_FAILED');
  }
}


/**
 * Generate a barcode image as SVG.
 *
 * Uses a simple SVG rendering approach for Code 128, EAN-13, and UPC-A.
 *
 * @param {string} data - Data to encode in the barcode
 * @param {string} [format='CODE128'] - Barcode format (CODE128, EAN13, UPCA)
 * @param {object} [options]
 * @param {number} [options.width=2] - Bar width multiplier
 * @param {number} [options.height=100] - Barcode height in pixels
 * @returns {Promise<{outputPath: string, outputSize: number, mimeType: string}>}
 */
export async function generateBarcode(data, format = 'CODE128', options = {}) {
  if (!data || typeof data !== 'string' || data.trim().length === 0) {
    throw new ValidationError('Barcode data is required and must be a non-empty string', 'MISSING_PARAMETER');
  }

  const upperFormat = (format || 'CODE128').toUpperCase();
  if (!SUPPORTED_BARCODE_FORMATS.includes(upperFormat)) {
    throw new ValidationError(
      `Unsupported barcode format: ${format}. Supported: ${SUPPORTED_BARCODE_FORMATS.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  // Validate data for specific formats
  if (upperFormat === 'EAN13') {
    if (!/^\d{12,13}$/.test(data.trim())) {
      throw new ValidationError(
        'EAN-13 requires exactly 12 or 13 digits',
        'INVALID_PARAMETER'
      );
    }
  } else if (upperFormat === 'UPCA') {
    if (!/^\d{11,12}$/.test(data.trim())) {
      throw new ValidationError(
        'UPC-A requires exactly 11 or 12 digits',
        'INVALID_PARAMETER'
      );
    }
  }

  const barWidth = Math.min(Math.max(parseInt(options.width, 10) || 2, 1), 5);
  const barHeight = Math.min(Math.max(parseInt(options.height, 10) || 100, 50), 300);

  const outputDir = getOutputDir();
  await ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${uuidv4()}-barcode.svg`);

  try {
    const svg = renderBarcodeSvg(data.trim(), upperFormat, barWidth, barHeight);
    await writeFile(outputPath, svg, 'utf-8');
    const stats = await stat(outputPath);

    return {
      outputPath,
      outputSize: stats.size,
      mimeType: 'image/svg+xml',
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ProcessingError(`Barcode generation failed: ${err.message}`, 'PROCESSING_FAILED');
  }
}

/**
 * Render a simple SVG barcode using Code 128 encoding.
 * For EAN-13 and UPC-A, we also use a simplified bar pattern approach.
 *
 * @param {string} data
 * @param {string} format
 * @param {number} barWidth
 * @param {number} barHeight
 * @returns {string} SVG markup
 */
function renderBarcodeSvg(data, format, barWidth, barHeight) {
  let pattern;

  if (format === 'CODE128') {
    pattern = encodeCode128(data);
  } else if (format === 'EAN13') {
    pattern = encodeEAN13(data);
  } else if (format === 'UPCA') {
    pattern = encodeUPCA(data);
  }

  const totalWidth = pattern.length * barWidth;
  const svgHeight = barHeight + 30; // extra space for text label

  let bars = '';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      bars += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="#000"/>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${svgHeight}" viewBox="0 0 ${totalWidth} ${svgHeight}">
  <rect width="${totalWidth}" height="${svgHeight}" fill="#fff"/>
  ${bars}
  <text x="${totalWidth / 2}" y="${barHeight + 20}" text-anchor="middle" font-family="monospace" font-size="14">${escapeXml(data)}</text>
</svg>`;
}

/**
 * Escape special XML characters.
 */
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Code 128B encoding — encodes ASCII 32–127.
 * Returns a binary string of 1s and 0s.
 */
function encodeCode128(data) {
  const CODE128B_START = 104;
  const STOP = '1100011101011';

  // Code 128 patterns (each is 11 modules wide, except stop which is 13)
  const PATTERNS = [
    '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
    '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
    '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
    '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
    '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
    '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
    '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
    '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
    '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
    '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
    '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
    '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
    '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
    '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
    '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
    '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
    '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
    '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
    '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
    '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
    '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
    '11010011100', '1100011101011',
  ];

  let checksum = CODE128B_START;
  let result = PATTERNS[CODE128B_START]; // Start Code B

  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i);
    const value = charCode - 32;
    if (value < 0 || value > 95) continue; // skip non-encodable chars
    result += PATTERNS[value];
    checksum += value * (i + 1);
  }

  result += PATTERNS[checksum % 103]; // checksum character
  result += STOP;

  return result;
}

/**
 * Simplified EAN-13 encoding.
 * Returns a binary string.
 */
function encodeEAN13(data) {
  // Ensure 13 digits (compute check digit if 12 provided)
  let digits = data.replace(/\D/g, '');
  if (digits.length === 12) {
    digits += computeEANCheckDigit(digits);
  }

  const L_PATTERNS = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011',
  ];
  const G_PATTERNS = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111',
  ];
  const R_PATTERNS = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100',
  ];
  const PARITY = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
  ];

  const firstDigit = parseInt(digits[0], 10);
  const parityPattern = PARITY[firstDigit];

  let result = '101'; // start guard

  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 1], 10);
    result += parityPattern[i] === 'L' ? L_PATTERNS[digit] : G_PATTERNS[digit];
  }

  result += '01010'; // center guard

  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 7], 10);
    result += R_PATTERNS[digit];
  }

  result += '101'; // end guard

  return result;
}

/**
 * Simplified UPC-A encoding (UPC-A is a subset of EAN-13 with leading 0).
 */
function encodeUPCA(data) {
  let digits = data.replace(/\D/g, '');
  if (digits.length === 11) {
    digits += computeUPCACheckDigit(digits);
  }
  // UPC-A is EAN-13 with a leading 0
  return encodeEAN13('0' + digits);
}

/**
 * Compute EAN-13 check digit from first 12 digits.
 */
function computeEANCheckDigit(digits) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Compute UPC-A check digit from first 11 digits.
 */
function computeUPCACheckDigit(digits) {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}
