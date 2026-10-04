// src/services/settingsService.ts
// Turso-backed farm settings (single 'general' row).
import { query, execute } from '../config/turso';
import { FarmSettings } from '../types';

const KEY = 'general';

export const DEFAULT_SETTINGS: FarmSettings = {
  farmName: 'HARAPAN BROILER',
  farmAddress: 'Jln Sawang Ujung, Perum Griya Azna Indah No 73',
};

export async function getFarmSettings(): Promise<FarmSettings> {
  const rows = await query('SELECT farm_name, farm_address FROM settings WHERE key = ?', [KEY]);
  if (!rows.length) return DEFAULT_SETTINGS;
  return {
    farmName: String(rows[0].farm_name ?? DEFAULT_SETTINGS.farmName),
    farmAddress: String(rows[0].farm_address ?? DEFAULT_SETTINGS.farmAddress),
  };
}

export async function saveFarmSettings(settings: FarmSettings): Promise<void> {
  await execute(
    `INSERT INTO settings (key, farm_name, farm_address)
     VALUES (?,?,?)
     ON CONFLICT(key) DO UPDATE SET farm_name=excluded.farm_name, farm_address=excluded.farm_address`,
    [KEY, settings.farmName, settings.farmAddress]
  );
}
