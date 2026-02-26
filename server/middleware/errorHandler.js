import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/errors.js';

/**
 * Middleware that attaches a unique request ID to every incoming request.
 * The ID is available as `req.requestId` for downstream logging.
 */
export function requestIdMiddleware(req, _res, next) {
  req.requestId = uuidv4();
  next();
}

/**
 * Map Multer error codes to our application error codes and HTTP statuses.
 */
const MULTER_ERROR_MAP = {
  LIMIT_FILE_SIZE: { status: 400, code: 'FILE_TOO_LARGE', message: 'File exceeds the maximum allowed size' },
  LIMIT_FILE_COUNT: { status: 400, code: 'BATCH_LIMIT_EXCEEDED', message: 'Batch exceeds the maximum number of files' },
  LIMIT_UNEXPECTED_FILE: { status: 400, code: 'INVALID_PARAMETER', message: 'Unexpected file field' },
  LIMIT_FIELD_KEY: { status: 400, code: 'INVALID_PARAMETER', message: 'Field name too long' },
  LIMIT_FIELD_VALUE: { status: 400, code: 'INVALID_PARAMETER', message: 'Field value too long' },
  LIMIT_FIELD_COUNT: { status: 400, code: 'INVALID_PARAMETER', message: 'Too many fields' },
  LIMIT_PART_COUNT: { status: 400, code: 'INVALID_PARAMETER', message: 'Too many parts' },
};

/**
 * Global Express error handler.
 * Must be registered AFTER all routes (4-argument signature tells Express this is an error handler).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || 'unknown';

  // --- Multer errors ---
  if (err.name === 'MulterError') {
    const mapped = MULTER_ERROR_MAP[err.code] || {
      status: 400,
      code: 'INVALID_PARAMETER',
      message: err.message,
    };

    console.error(`[${requestId}] MulterError: ${err.code} – ${err.message}`);

    return res.status(mapped.status).json({
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        details: { field: err.field || undefined },
      },
    });
  }

  // --- Application errors (our custom classes) ---
  if (err instanceof AppError) {
    console.error(`[${requestId}] ${err.name}: ${err.code} – ${err.message}`);

    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // --- Unexpected / unknown errors ---
  // If the error has a status and code (e.g. from validate middleware), respect them
  if (err.status && err.status >= 400 && err.status < 500) {
    console.error(`[${requestId}] ${err.code || 'Error'}: ${err.message}`);
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code || 'INVALID_PARAMETER',
        message: err.message,
        details: {},
      },
    });
  }

  console.error(`[${requestId}] UnhandledError:`, err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: {},
    },
  });
}

export default errorHandler;
