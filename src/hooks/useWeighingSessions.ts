// src/hooks/useWeighingSessions.ts
// Turso-backed list of weighing sessions with pagination, pull-to-refresh, and
// an optional server-side search pushdown. Replaces the previous Firestore
// `onSnapshot` listener that streamed ALL rows on every app open (the main
// source of the reported slowness).
import { useCallback, useEffect, useRef, useState } from 'react';
import { listSessions, ListParams } from '../services/weighingService';
import { SessionCache } from '../services/sessionCache';
import { WeighingSession } from '../types';

interface UseWeighingSessionsOptions {
  /** initial page size (default 100 recent rows) */
  pageSize?: number;
  /** free-text server-side search (buyer/driver/date/notes) */
  search?: string;
  onError?: (error: Error) => void;
}

export const useWeighingSessions = (options?: UseWeighingSessionsOptions) => {
  const pageSize = options?.pageSize ?? 100;
  const search = options?.search?.trim() || undefined;

  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  // True when the current rows came from the offline cache instead of Turso.
  const [fromCache, setFromCache] = useState(false);
  const offsetRef = useRef(0);

  // Keep latest error callback without re-triggering the fetch effect.
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const params: ListParams = { limit: pageSize, offset };
        if (search) params.search = search;
        const res = await listSessions(params);
        setSessions((prev) => (replace ? res.sessions : [...prev, ...res.sessions]));
        setTotal(res.total);
        offsetRef.current = offset + res.sessions.length;
        setError(null);
        setFromCache(false);
        // Snapshot the first page of the unfiltered browse view for offline use.
        if (replace && offset === 0 && !search) {
          void SessionCache.save(res.sessions, res.total);
        }
      } catch (err) {
        console.error('Error fetching weighing sessions:', err);
        // Offline / server hiccup: serve the last cached list if we have one.
        const cached = !search ? await SessionCache.load() : null;
        if (cached && cached.sessions.length) {
          setSessions(cached.sessions);
          setTotal(cached.total);
          offsetRef.current = cached.sessions.length;
          setFromCache(true);
          setError(null);
        } else {
          setFromCache(false);
          setError(err as Error);
          onErrorRef.current?.(err as Error);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize, search]
  );

  // Reload first page whenever the server-side search changes / on mount.
  useEffect(() => {
    offsetRef.current = 0;
    fetchPage(0, true);
  }, [fetchPage]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    return fetchPage(0, true);
  }, [fetchPage]);

  const hasMore = sessions.length < total;
  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    return fetchPage(offsetRef.current, false);
  }, [fetchPage, loadingMore, loading, hasMore]);

  return { sessions, loading, loadingMore, error, total, hasMore, fromCache, refresh, loadMore };
};
