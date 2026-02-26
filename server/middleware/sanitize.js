import path from 'path';

/**
 * Map of MIME types to their expected file extensions.
 * Used to verify that a file's declared MIME type matches its extension.
 */
const MIME_TO_EXTENSIONS = {
  // Images
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/x-icon': ['.ico'],
  'image/vnd.microsoft.icon': ['.ico'],
  'image/avif': ['.avif'],
  'image/svg+xml': ['.svg'],
  // PDF
  'application/pdf': ['.pdf'],
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/flac': ['.flac'],
  'audio/aac': ['.aac'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  // Video
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/quicktime': ['.mov'],
  'video/x-matroska': ['.mkv'],
  // Documents
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
  'application/x-yaml': ['.yaml', '.yml'],
  'text/yaml': ['.yaml', '.yml'],
};

/**
 * Extensions that could indicate executable or script content.
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.csh', '.ksh',
  '.js', '.vbs', '.wsf', '.wsh', '.ps1',
  '.php', '.py', '.rb', '.pl', '.cgi',
  '.jar', '.class',
  '.dll', '.so', '.dylib',
];

/**
 * Checks whether a file's MIME type is consistent with its extension.
 * @param {string} mimetype
 * @param {string} originalname
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMimeExtension(mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (!ext) {
    return { valid: false, reason: 'File has no extension' };
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: `Potentially dangerous file type: ${ext}` };
  }

  const allowedExtensions = MIME_TO_EXTENSIONS[mimetype];

  // If we don't recognize the MIME type, allow it through (other middleware can restrict)
  if (!allowedExtensions) {
    return { valid: true };
  }

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      reason: `MIME type ${mimetype} does not match extension ${ext}. Expected: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Express middleware that sanitizes uploaded files:
 * - Validates MIME type matches file extension
 * - Rejects files with dangerous extensions
 *
 * Should be used after multer upload middleware.
 */
export function sanitize(req, _res, next) {
  const files = req.files ?? (req.file ? [req.file] : []);

  for (const file of files) {
    const result = validateMimeExtension(file.mimetype, file.originalname);
    if (!result.valid) {
      const err = new Error(result.reason);
      err.status = 400;
      err.code = 'INVALID_FILE_TYPE';
      return next(err);
    }
  }

  next();
}

export default sanitize;
