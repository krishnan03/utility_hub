import { useState, useCallback } from 'react';
import useFileStore from '../stores/useFileStore.js';

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export default function useFileUpload({ allowedTypes, maxSize = DEFAULT_MAX_SIZE } = {}) {
  const { files, addFiles: storeAddFiles, removeFile, clearFiles } = useFileStore();
  const [validationErrors, setValidationErrors] = useState([]);

  const addFiles = useCallback(
    (fileList) => {
      const errors = [];
      const valid = [];

      Array.from(fileList).forEach((file) => {
        if (allowedTypes && allowedTypes.length > 0) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          const typeMatch =
            allowedTypes.some((t) => file.type === t) ||
            allowedTypes.some((t) => t.startsWith('.') && `.${ext}` === t.toLowerCase());
          if (!typeMatch) {
            errors.push({ file: file.name, message: `Unsupported file type: ${file.type || ext}` });
            return;
          }
        }

        if (file.size > maxSize) {
          const limitMB = Math.round(maxSize / (1024 * 1024));
          errors.push({ file: file.name, message: `File exceeds ${limitMB}MB limit` });
          return;
        }

        valid.push(file);
      });

      setValidationErrors(errors);

      if (valid.length > 0) {
        storeAddFiles(valid);
      }

      return { added: valid.length, errors };
    },
    [allowedTypes, maxSize, storeAddFiles],
  );

  return { files, addFiles, removeFile, clearFiles, validationErrors };
}
