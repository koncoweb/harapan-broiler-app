// src/services/syncService.ts
// Shared push logic for the offline queue. Used by SyncScreen (manual) and the
// app-wide auto-sync trigger. Kept in one place so both paths behave identically.
import { OfflineStorageService, OfflineSession } from './offlineStorage';
import { createSession, updateSession } from './weighingService';

export const MAX_SYNC_ATTEMPTS = 3;

export interface SyncResult {
  success: number;
  failed: number;
}

const isRetryable = (s: OfflineSession): boolean =>
  !s.syncStatus ||
  s.syncStatus === 'pending' ||
  (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS);

// Push a single queued session to Turso. Returns true on success.
export async function syncSingleSession(session: OfflineSession): Promise<boolean> {
  try {
    await OfflineStorageService.updateSessionSyncStatus(session.id, 'syncing');

    const { id, syncStatus, syncAttempts, lastSyncError, ...sessionData } = session;

    if (id.startsWith('offline_')) {
      // New record created while offline — insert (Turso generates the id).
      await createSession(sessionData);
    } else {
      // Edit of an existing record — update by its real id.
      await updateSession(id, sessionData);
    }

    await OfflineStorageService.removeSession(id);
    return true;
  } catch (error: any) {
    console.error(`Failed to sync session ${session.id}:`, error);
    await OfflineStorageService.updateSessionSyncStatus(
      session.id,
      'failed',
      error?.message || 'Sync gagal'
    );
    return false;
  }
}

// Push every retryable queued session. Returns counts of successes/failures.
export async function syncAllPending(): Promise<SyncResult> {
  const sessions = await OfflineStorageService.getSessions();
  const retryable = sessions.filter(isRetryable);

  let success = 0;
  let failed = 0;
  for (const session of retryable) {
    if (await syncSingleSession(session)) success++;
    else failed++;
  }

  return { success, failed };
}

export { isRetryable };
