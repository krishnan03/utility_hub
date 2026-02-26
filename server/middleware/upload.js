import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const inputDir = path.join(config.uploadDir, 'input');
ensureDir(inputDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(inputDir);
    cb(null, inputDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

/**
 * Factory that returns configured multer middleware.
 * @param {object} [options]
 * @param {number} [options.maxFileSize] - Override default max file size in bytes
 * @param {string[]} [options.allowedMimeTypes] - Restrict to specific MIME types
 * @returns {multer.Multer}
 */
export function createUpload(options = {}) {
  const maxFileSize = options.maxFileSize ?? config.maxFileSize;
  const allowedMimeTypes = options.allowedMimeTypes ?? null;

  const fileFilter = (_req, file, cb) => {
    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      const err = new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(', ')}`
      );
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  };

  return multer({
    storage,
    limits: { fileSize: maxFileSize },
    fileFilter,
  });
}

/** Default upload instance with 100MB limit and no MIME restriction */
const defaultUpload = createUpload();

/** Single file upload middleware (field name: "file") */
export const uploadSingle = defaultUpload.single('file');

/** Array file upload middleware (field name: "files", max 20) */
export const uploadArray = defaultUpload.array('files', 20);

export default { createUpload, uploadSingle, uploadArray };
