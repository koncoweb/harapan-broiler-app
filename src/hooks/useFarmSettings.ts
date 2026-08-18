// src/hooks/useFarmSettings.ts
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { FarmSettings } from '../types';

const DEFAULT_SETTINGS: FarmSettings = {
  farmName: 'Asya Berkah',
  farmAddress: 'Jln Sawang Ujung, Perum Griya Azna Indah No 73',
};

export const useFarmSettings = () => {
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as FarmSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, setSettings, loading, defaultSettings: DEFAULT_SETTINGS };
};
