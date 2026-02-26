import { useCallback } from 'react';
import useFileStore from '../stores/useFileStore.js';
import api from '../lib/api.js';

export default function useServerProcess(endpoint, options = {}) {
  const { processing, progress, error, result, setProcessing, setProgress, setError, setResult } =
    useFileStore();

  const process = useCallback(
    async (files, processOptions = {}) => {
      setProcessing(true);
      setProgress(0);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();

        const fileArray = Array.isArray(files) ? files : [files];
        fileArray.forEach((f) => {
          // Support both raw File objects and store file entries
          const file = f.file || f;
          formData.append('files', file);
        });

        // Append options as JSON
        const mergedOptions = { ...options, ...processOptions };
        Object.entries(mergedOptions).forEach(([key, value]) => {
          if (key !== 'onProgress') {
            formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        });

        const data = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) {
              const pct = Math.round((event.loaded * 100) / event.total);
              setProgress(pct);
            }
          },
        });

        setResult(data);
        setProcessing(false);
        return data;
      } catch (err) {
        const message = err?.error?.message || err?.message || 'Processing failed';
        setError(message);
        setProcessing(false);
        throw err;
      }
    },
    [endpoint, options, setProcessing, setProgress, setError, setResult],
  );

  return { process, processing, progress, error, result };
}
