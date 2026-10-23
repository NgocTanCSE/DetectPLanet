import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client';

/**
 * Tải dữ liệu GET và tự huỷ kết quả cũ khi tham số đổi.
 * Trả về { data, loading, error, reload, setData }.
 */
export function useApi(path, query, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const key = JSON.stringify(query || {});

  const load = useCallback(
    async (silent = false) => {
      if (!enabled) return;
      const id = ++seq.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await api.get(path, query);
        if (id === seq.current) setData(result);
      } catch (err) {
        if (id === seq.current) setError({ message: errorMessage(err), status: err.status });
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, key, enabled],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

/** Giá trị trễ để tránh gọi API mỗi lần gõ phím. */
export function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
