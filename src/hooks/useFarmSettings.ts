// src/hooks/useFarmSettings.ts
import { useCallback, useEffect, useState } from 'react';
import { getFarmSettings, saveFarmSettings } from '../services/settingsService';
import { FarmSettings } from '../types';

const DEFAULT_SETTINGS: FarmSettings = {
  farmName: 'HARAPAN BROILER',
  farmAddress: 'Jln Sawang Ujung, Perum Griya Azna Indah No 73',
};

export const useFarmSettings = () => {
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const s = await getFarmSettings();
      setSettings(s);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (next: FarmSettings) => {
    setSettings(next); // optimistic
    try {
      await saveFarmSettings(next);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }, []);

  return { settings, setSettings, save, reload, loading, defaultSettings: DEFAULT_SETTINGS };
};
