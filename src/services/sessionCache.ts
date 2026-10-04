// src/services/sessionCache.ts
// Persists the most recent successful server list so Home can still browse
// (read-only) when the device is offline. Turso is HTTP-only with no local
// replica, so we keep a lightweight snapshot in AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighingSession } from '../types';

const CACHE_KEY = 'cache_weighing_list';

// Cap the snapshot so we never blow past AsyncStorage's practical size limit.
const MAX_CACHED_ROWS = 500;

export interface CachedList {
  sessions: WeighingSession[];
  total: number;
  cachedAt: number;
}

export const SessionCache = {
  async save(sessions: WeighingSession[], total: number): Promise<void> {
    try {
      const payload: CachedList = {
        sessions: sessions.slice(0, MAX_CACHED_ROWS),
        total,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Cache is best-effort; never block the UI over it.
      console.warn('SessionCache.save failed:', error);
    }
  },

  async load(): Promise<CachedList | null> {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEY);
      return json ? (JSON.parse(json) as CachedList) : null;
    } catch (error) {
      console.warn('SessionCache.load failed:', error);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
  },
};
