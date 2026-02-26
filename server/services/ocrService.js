import Tesseract from 'tesseract.js';
import path from 'path';
import { writeFile, stat } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';
import { ValidationError, ProcessingError } from '../utils/errors.js';

/**
 * Supported OCR languages mapped to Tesseract language codes.
 */
export const SUPPORTED_LANGUAGES = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  por: 'Portuguese',
  chi_sim: 'Chinese (Simplified)',
  jpn: 'Japanese',
  kor: 'Korean',
  hin: 'Hindi',
  ara: 'Arabic',
};

/**
 * Valid image MIME types accepted for OCR.
 */
export const VALID_OCR_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'image/gif',
];

/**
 * Extract text from an image using Tesseract.js OCR.
 *
 * @param {string} inputPath - Path to the image file
 * @param {string} [language='eng'] - Tesseract language code
 * @returns {Promise<{text: string, outputPath: string, outputSize: number, mimeType: string, confidence: number}>}
 */
export async function extractText(inputPath, language = 'eng') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new ValidationError('Input file path is required', 'MISSING_PARAMETER');
  }

  const lang = language || 'eng';
  if (!SUPPORTED_LANGUAGES[lang]) {
    throw new ValidationError(
      `Unsupported language: ${lang}. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  const outputDir = getOutputDir();
  await ensureDir(outputDir);

  let result;
  try {
    result = await Tesseract.recognize(inputPath, lang);
  } catch (err) {
    throw new ProcessingError(
      `OCR processing failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }

  const text = result.data.text || '';
  const confidence = result.data.confidence ?? 0;

  // Save extracted text to a .txt file
  const outputPath = path.join(outputDir, `${uuidv4()}-ocr.txt`);
  await writeFile(outputPath, text, 'utf-8');
  const stats = await stat(outputPath);

  return {
    text,
    outputPath,
    outputSize: stats.size,
    mimeType: 'text/plain',
    confidence: Math.round(confidence * 100) / 100,
  };
}
