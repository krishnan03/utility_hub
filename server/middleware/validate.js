/**
 * Middleware factory for validating request parameters.
 *
 * @param {object} rules
 * @param {string[]} [rules.requiredParams] - Body params that must be present
 * @param {string[]} [rules.allowedFileTypes] - Allowed MIME types for uploaded files
 * @param {number}   [rules.maxBatchSize]    - Max number of files in a batch upload
 * @returns {import('express').RequestHandler}
 */
export function validate(rules = {}) {
  const { requiredParams = [], allowedFileTypes = [], maxBatchSize } = rules;

  return (req, _res, next) => {
    // Check required body params
    for (const param of requiredParams) {
      const value = req.body?.[param];
      if (value === undefined || value === null || value === '') {
        const err = new Error(`Missing required parameter: ${param}`);
        err.status = 400;
        err.code = 'MISSING_PARAMETER';
        return next(err);
      }
    }

    // Validate file types (for already-uploaded files via multer)
    const files = req.files ?? (req.file ? [req.file] : []);

    if (allowedFileTypes.length > 0) {
      for (const file of files) {
        if (!allowedFileTypes.includes(file.mimetype)) {
          const err = new Error(
            `Unsupported file type: ${file.mimetype}. Allowed: ${allowedFileTypes.join(', ')}`
          );
          err.status = 400;
          err.code = 'INVALID_FILE_TYPE';
          return next(err);
        }
      }
    }

    // Validate batch size
    if (maxBatchSize !== undefined && files.length > maxBatchSize) {
      const err = new Error(
        `Batch size ${files.length} exceeds maximum of ${maxBatchSize} files`
      );
      err.status = 400;
      err.code = 'BATCH_LIMIT_EXCEEDED';
      return next(err);
    }

    next();
  };
}

export default validate;
