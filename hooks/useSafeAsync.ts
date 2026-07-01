
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * MARCLYN PRODUCTION SHIELD - useSafeAsync
 * Garante que apenas uma execução ocorra por vez e limpa memória ao desmontar.
 */
export function useSafeAsync<T>(asyncFn: () => Promise<T>, immediate = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  
  const isMounted = useRef(true);
  const isExecuting = useRef(false);

  const execute = useCallback(async () => {
    if (isExecuting.current) return;
    
    isExecuting.current = true;
    if (isMounted.current) setLoading(true);
    if (isMounted.current) setError(null);

    try {
      const result = await asyncFn();
      if (isMounted.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err: any) {
      if (isMounted.current) setError(err);
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isExecuting.current = false;
      }
    }
  }, [asyncFn]);

  useEffect(() => {
    isMounted.current = true;
    if (immediate) {
      execute().catch(() => {});
    }
    return () => {
      isMounted.current = false;
    };
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}
