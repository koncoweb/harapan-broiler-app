import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighingSession } from '../types';

const OFFLINE_STORAGE_KEY = 'offline_weighing_sessions';

export type SyncStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineSession extends WeighingSession {
  syncStatus?: SyncStatus;
  syncAttempts?: number;
  lastSyncError?: string;
}

const MAX_SYNC_ATTEMPTS = 3;

export const OfflineStorageService = {
  // Save a session locally (Upsert)
  async saveSession(session: OfflineSession): Promise<void> {
    try {
      const existingData = await this.getSessions();
      const index = existingData.findIndex(s => s.id === session.id);

      let newData;
      if (index >= 0) {
        // Update existing
        newData = [...existingData];
        newData[index] = session;
      } else {
        // Add new
        newData = [...existingData, session];
      }

      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Error saving offline session:', error);
      throw error;
    }
  },

  // Get all offline sessions
  async getSessions(): Promise<OfflineSession[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting offline sessions:', error);
      return [];
    }
  },

  // Update sync metadata for a specific session
  async updateSessionSyncStatus(
    sessionId: string,
    status: SyncStatus,
    error?: string
  ): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      if (index === -1) return;

      const updatedSession = { ...sessions[index] };
      updatedSession.syncStatus = status;

      if (status === 'syncing') {
        updatedSession.syncAttempts = (updatedSession.syncAttempts || 0) + 1;
      }

      if (status === 'failed' && error) {
        updatedSession.lastSyncError = error;
      }

      if (status === 'pending') {
        updatedSession.lastSyncError = undefined;
      }

      sessions[index] = updatedSession;
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Error updating sync status:', err);
      throw err;
    }
  },

  // Remove a specific session (after successful sync)
  async removeSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Error removing offline session:', error);
      throw error;
    }
  },

  // Clear all offline sessions
  async clearSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing offline sessions:', error);
      throw error;
    }
  },

  // Get count of pending items
  async getPendingCount(): Promise<number> {
    const sessions = await this.getSessions();
    return sessions.length;
  },

  // Get count of items that can still be retried
  async getRetryableCount(): Promise<number> {
    const sessions = await this.getSessions();
    return sessions.filter(
      s => !s.syncStatus || s.syncStatus === 'pending' ||
        (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS)
    ).length;
  },

  // Reset failed sessions to pending for retry
  async resetFailedSessions(): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const updatedSessions = sessions.map(s => {
        if (s.syncStatus === 'failed' && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS) {
          return { ...s, syncStatus: 'pending' as SyncStatus, lastSyncError: undefined };
        }
        return s;
      });
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error resetting failed sessions:', error);
      throw error;
    }
  }
};
