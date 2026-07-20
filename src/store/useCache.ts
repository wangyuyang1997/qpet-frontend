/** 前端数据缓存层 — key → data，stale-while-revalidate */
import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  fetching: boolean;
}

const store = new Map<string, CacheEntry<any>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  return entry?.data ?? null;
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now(), fetching: false });
}

export async function cacheFetch<T>(key: string, fetcher: () => Promise<T>, staleMs = 0): Promise<T> {
  const entry = store.get(key);
  // 缓存有效且不需要刷新 → 立即返回
  if (entry && (staleMs === 0 || Date.now() - entry.fetchedAt < staleMs)) {
    return entry.data;
  }
  // 正在请求中 → 返回旧数据（如果有）
  if (entry?.fetching) {
    return entry.data;
  }
  // 发起请求
  store.set(key, { data: entry?.data, fetchedAt: entry?.fetchedAt ?? 0, fetching: true });
  try {
    const data = await fetcher();
    store.set(key, { data, fetchedAt: Date.now(), fetching: false });
    return data;
  } catch {
    if (entry) store.set(key, { ...entry, fetching: false });
    throw null;
  }
}

/** React hook: 返回 [data, refresh] */
export function useCache<T>(key: string | null, fetcher: () => Promise<T>, staleMs = 0) {
  const keyRef = useRef(key);
  keyRef.current = key;
  const fetchRef = useRef<Promise<T>>();

  const refresh = useCallback(async (): Promise<T> => {
    if (!keyRef.current) throw null;
    fetchRef.current = cacheFetch(keyRef.current, fetcher, staleMs);
    return fetchRef.current;
  }, []); // eslint-disable-line

  const get = useCallback((): T | null => {
    if (!keyRef.current) return null;
    return cacheGet(keyRef.current);
  }, []); // eslint-disable-line

  return { get, refresh };
}
