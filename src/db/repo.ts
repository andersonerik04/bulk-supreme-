import { db } from './db';
import {
  DEFAULT_SETTINGS,
  type BackupFile,
  type FoodEntry,
  type FoodItem,
  type FoodPreset,
  type MealType,
  type Settings,
  type WaterEntry,
  type WeightEntry,
} from './types';
import { toDayKey } from '@/utils/date';

/* ---------- Settings ---------- */

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>) {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: 'settings' });
}

/* ---------- Weight ---------- */

export function addWeight(lbs: number, timestamp = Date.now(), note?: string) {
  return db.weights.add({ lbs, timestamp, day: toDayKey(timestamp), note: note?.trim() || undefined });
}

export function updateWeight(id: number, patch: Partial<Pick<WeightEntry, 'lbs' | 'timestamp' | 'note'>>) {
  const p: Partial<WeightEntry> = { ...patch };
  if (patch.timestamp != null) p.day = toDayKey(patch.timestamp);
  if ('note' in patch) p.note = patch.note?.trim() || undefined;
  return db.weights.update(id, p);
}

export const deleteWeight = (id: number) => db.weights.delete(id);

/* ---------- Food ---------- */

export function addFood(item: FoodItem, meal: MealType, timestamp = Date.now(), presetId?: number) {
  return db.foods.add({ ...cleanItem(item), meal, timestamp, day: toDayKey(timestamp), presetId });
}

export function updateFood(id: number, patch: Partial<Omit<FoodEntry, 'id' | 'day'>>) {
  const p: Partial<FoodEntry> = { ...patch };
  if (patch.timestamp != null) p.day = toDayKey(patch.timestamp);
  return db.foods.update(id, p);
}

export const deleteFood = (id: number) => db.foods.delete(id);

/** Log every item of a preset into `meal`; returns the new entry ids. */
export async function logPreset(preset: FoodPreset, meal: MealType, timestamp = Date.now()) {
  return db.transaction('rw', db.foods, db.presets, async () => {
    const ids = await db.foods.bulkAdd(
      preset.items.map((it) => ({ ...cleanItem(it), meal, timestamp, day: toDayKey(timestamp), presetId: preset.id })),
      { allKeys: true },
    );
    if (preset.id != null) await db.presets.update(preset.id, { lastUsed: Date.now() });
    return ids as number[];
  });
}

function cleanItem(it: FoodItem): FoodItem {
  return {
    name: it.name.trim(),
    serving: it.serving.trim(),
    calories: Math.round(it.calories),
    protein: it.protein != null ? round1(it.protein) : undefined,
    carbs: it.carbs != null ? round1(it.carbs) : undefined,
    fat: it.fat != null ? round1(it.fat) : undefined,
  };
}
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Most recently logged distinct foods (by name + serving). */
export async function recentFoods(limit = 12): Promise<FoodEntry[]> {
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  await db.foods
    .orderBy('timestamp')
    .reverse()
    .until(() => out.length >= limit)
    .each((e) => {
      const key = `${e.name.toLowerCase()}|${e.serving.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(e);
      }
    });
  return out;
}

/* ---------- Presets ---------- */

export function addPreset(p: Omit<FoodPreset, 'id' | 'createdAt'>) {
  return db.presets.add({ ...p, items: p.items.map(cleanItem), name: p.name.trim(), createdAt: Date.now() });
}

export function updatePreset(id: number, patch: Partial<Omit<FoodPreset, 'id'>>) {
  const p = { ...patch };
  if (p.items) p.items = p.items.map(cleanItem);
  if (p.name) p.name = p.name.trim();
  return db.presets.update(id, p);
}

export const deletePreset = (id: number) => db.presets.delete(id);

export async function toggleFavorite(id: number) {
  const p = await db.presets.get(id);
  if (p) await db.presets.update(id, { favorite: p.favorite ? 0 : 1 });
}

/** Favorite a food from the log: reuse a matching single-item preset or create one. */
export async function favoriteFromEntry(e: FoodItem, meal?: MealType) {
  const existing = await db.presets
    .where('name')
    .equalsIgnoreCase(e.name.trim())
    .filter((p) => p.kind === 'food' && p.items[0]?.serving.toLowerCase() === e.serving.trim().toLowerCase())
    .first();
  if (existing?.id != null) {
    await db.presets.update(existing.id, { favorite: existing.favorite ? 0 : 1 });
    return existing.id;
  }
  return addPreset({ name: e.name, kind: 'food', items: [e], favorite: 1, defaultMeal: meal });
}

/* ---------- Water ---------- */

export function addWater(oz: number, timestamp = Date.now()) {
  return db.water.add({ oz, timestamp, day: toDayKey(timestamp) });
}

export const deleteWater = (id: number) => db.water.delete(id);

export function updateWater(id: number, patch: Partial<Pick<WaterEntry, 'oz' | 'timestamp'>>) {
  const p: Partial<WaterEntry> = { ...patch };
  if (patch.timestamp != null) p.day = toDayKey(patch.timestamp);
  return db.water.update(id, p);
}

/** Remove the most recent water entry for `day`. Returns the removed entry. */
export async function undoLastWater(day: string): Promise<WaterEntry | undefined> {
  const entries = await db.water.where('day').equals(day).sortBy('timestamp');
  const last = entries[entries.length - 1];
  if (last?.id != null) await db.water.delete(last.id);
  return last;
}

/* ---------- Bulk ---------- */

export async function exportAll(): Promise<BackupFile> {
  const [weights, foods, water, presets, settings] = await Promise.all([
    db.weights.toArray(),
    db.foods.toArray(),
    db.water.toArray(),
    db.presets.toArray(),
    getSettings(),
  ]);
  return { app: 'ledger', version: 1, exportedAt: new Date().toISOString(), weights, foods, water, presets, settings };
}

/** Replace all data with a backup. Validation happens in utils/backup.ts before calling. */
export async function importAll(b: BackupFile) {
  await db.transaction('rw', [db.weights, db.foods, db.water, db.presets, db.settings], async () => {
    await Promise.all([db.weights.clear(), db.foods.clear(), db.water.clear(), db.presets.clear(), db.settings.clear()]);
    await db.weights.bulkAdd(b.weights);
    await db.foods.bulkAdd(b.foods);
    await db.water.bulkAdd(b.water);
    await db.presets.bulkAdd(b.presets);
    await db.settings.put({ ...DEFAULT_SETTINGS, ...b.settings, id: 'settings' });
  });
}

export async function resetAll() {
  await db.transaction('rw', [db.weights, db.foods, db.water, db.presets, db.settings], async () => {
    await Promise.all([db.weights.clear(), db.foods.clear(), db.water.clear(), db.presets.clear(), db.settings.clear()]);
  });
}

export async function hasSampleData() {
  return (await db.weights.where('sample').equals(1).count()) > 0 || (await db.foods.where('sample').equals(1).count()) > 0;
}

export async function clearSampleData() {
  await db.transaction('rw', [db.weights, db.foods, db.water, db.presets], async () => {
    await Promise.all([
      db.weights.where('sample').equals(1).delete(),
      db.foods.where('sample').equals(1).delete(),
      db.water.where('sample').equals(1).delete(),
      db.presets.where('sample').equals(1).delete(),
    ]);
  });
}
