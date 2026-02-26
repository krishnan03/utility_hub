import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';

/**
 * Create a directory recursively if it does not exist.
 * @param {string} dirPath - Absolute or relative directory path
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Delete a file safely.
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} true if deleted, false if file was not found
 * @throws {Error} Re-throws errors other than ENOENT
 */
export async function safeUnlink(filePath) {
  try {
    await unlink(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * Get the absolute path to the output directory.
 * @returns {string}
 */
export function getOutputDir() {
  return path.join(config.uploadDir, 'output');
}

/**
 * Get the absolute path to the input directory.
 * @returns {string}
 */
export function getInputDir() {
  return path.join(config.uploadDir, 'input');
}
