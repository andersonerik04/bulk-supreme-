import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { DEFAULT_SETTINGS, type Settings } from '@/db/types';

/** Live settings; falls back to defaults until the first save. */
export function useSettings(): Settings {
  return useLiveQuery(async () => (await db.settings.get('settings')) ?? DEFAULT_SETTINGS, [], DEFAULT_SETTINGS);
}
