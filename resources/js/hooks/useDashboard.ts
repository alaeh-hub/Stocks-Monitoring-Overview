import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError, Dashboard } from '../types';

const REFRESH_MS = 60_000;

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard${force ? '?refresh=1' : ''}`, {
        headers: { Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw (body as ApiError) ?? { message: `Request failed (${res.status})` };
      }
      setData(body as Dashboard);
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const err = e as Partial<ApiError>;
      setError({
        message: err.message ?? 'Could not load the dashboard.',
        detail: err.detail ?? 'The server did not respond. Is the app container running?',
      });
    } finally {
      if (abort.current === ctrl) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => {
      clearInterval(id);
      abort.current?.abort();
    };
  }, [load]);

  return { data, error, loading, refreshing, reload: () => load(true) };
}
