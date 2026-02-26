/**
 * Custom error classes for consistent API error handling.
 * Each class carries an HTTP status code and a machine-readable error code.
 */

export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} status - HTTP status code
   * @param {string} code - Machine-readable error code (e.g. INVALID_FILE_TYPE)
   * @param {object} [details] - Optional additional context
   */
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** 400 — bad request / validation failures */
export class ValidationError extends AppError {
  constructor(message, code = 'INVALID_PARAMETER', details = {}) {
    super(message, 400, code, details);
  }
}

/** 422 — file processing / conversion failures */
export class ProcessingError extends AppError {
  constructor(message, code = 'PROCESSING_FAILED', details = {}) {
    super(message, 422, code, details);
  }
}

/** 404 — resource not found / expired */
export class NotFoundError extends AppError {
  constructor(message = 'File not found or has expired', code = 'FILE_NOT_FOUND', details = {}) {
    super(message, 404, code, details);
  }
}

/** 403 — session mismatch / access denied */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied to this resource', code = 'SESSION_FORBIDDEN', details = {}) {
    super(message, 403, code, details);
  }
}
