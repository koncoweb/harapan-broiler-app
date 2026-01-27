import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeighingSession } from '../types';

const OFFLINE_STORAGE_KEY = 'offline_weighing_sessions';

export const OfflineStorageService = {
  // Save a session locally (Upsert)
  async saveSession(session: WeighingSession): Promise<void> {
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
  async getSessions(): Promise<WeighingSession[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting offline sessions:', error);
      return [];
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
  }
};
