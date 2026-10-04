// src/hooks/useAutoSync.ts
// App-wide background sync: whenever the device (re)connects or the app returns
// to the foreground, push any queued offline notes to Turso automatically so the
// operator doesn't have to open the Sync screen manually.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { OfflineStorageService } from '../services/offlineStorage';
import { syncAllPending } from '../services/syncService';
import { getCurrentUser } from '../services/authService';

export function useAutoSync(onSynced?: (success: number) => void) {
  const busy = useRef(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    const run = async () => {
      if (busy.current) return;
      try {
        // Only sync for a signed-in device owner.
        const user = await getCurrentUser();
        if (!user) return;

        const pending = await OfflineStorageService.getPendingCount();
        if (pending === 0) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) return;

        busy.current = true;
        const { success } = await syncAllPending();
        if (success > 0) onSyncedRef.current?.(success);
      } catch (error) {
        console.warn('Auto-sync failed:', error);
      } finally {
        busy.current = false;
      }
    };

    // Kick off once on mount (e.g., cold start while already online).
    void run();

    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected) void run();
    });
    const unsubscribeApp = AppState.addEventListener('change', status => {
      if (status === 'active') void run();
    });

    return () => {
      unsubscribeNet();
      unsubscribeApp.remove();
    };
  }, []);
}
