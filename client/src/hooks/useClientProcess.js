import { useCallback } from 'react';
import useFileStore from '../stores/useFileStore.js';

export default function useClientProcess(processFn) {
  const { processing, error, result, setProcessing, setError, setResult } = useFileStore();

  const process = useCallback(
    async (input) => {
      setProcessing(true);
      setError(null);
      setResult(null);

      try {
        const data = await processFn(input);
        setResult(data);
        setProcessing(false);
        return data;
      } catch (err) {
        const message = err?.message || 'Processing failed';
        setError(message);
        setProcessing(false);
        throw err;
      }
    },
    [processFn, setProcessing, setError, setResult],
  );

  return { process, processing, error, result };
}
