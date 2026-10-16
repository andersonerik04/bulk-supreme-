import { format } from 'date-fns';
import { DEFAULT_SETTINGS, MEALS, type BackupFile, type FoodEntry, type FoodItem, type FoodPreset, type Settings, type WaterEntry, type WeightEntry } from '@/db/types';
import { toDayKey } from './date';

/* ---------- Export ---------- */

const csvCell = (v: unknown) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One flat CSV of every log entry, sorted by time, suitable for spreadsheets. */
export function toCSV(b: BackupFile): string {
  const header = ['type', 'date', 'time', 'meal', 'name', 'serving', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'weight_lbs', 'water_oz', 'note'];
  type Row = { ts: number; cells: unknown[] };
  const rows: Row[] = [
    ...b.weights.map((w) => ({ ts: w.timestamp, cells: ['weight', '', '', '', '', '', '', '', '', '', w.lbs, '', w.note] })),
    ...b.foods.map((f) => ({ ts: f.timestamp, cells: ['food', '', '', f.meal, f.name, f.serving, f.calories, f.protein, f.carbs, f.fat, '', '', ''] })),
    ...b.water.map((w) => ({ ts: w.timestamp, cells: ['water', '', '', '', '', '', '', '', '', '', '', Math.round(w.oz * 100) / 100, ''] })),
  ].sort((a, b) => a.ts - b.ts);
  for (const r of rows) {
    r.cells[1] = format(r.ts, 'yyyy-MM-dd');
    r.cells[2] = format(r.ts, 'HH:mm');
  }
  return [header, ...rows.map((r) => r.cells)].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** Save a file: share sheet on iOS (lets you "Save to Files"), download link elsewhere. */
export async function saveFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const file = new File([blob], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Import validation ---------- */

export class BackupError extends Error {}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const optNum = (v: unknown) => (v == null ? undefined : isNum(v) && v >= 0 ? v : bad('macro value'));
function bad(what: string): never {
  throw new BackupError(`Invalid ${what} in backup file`);
}
const arr = (v: unknown, what: string): unknown[] => (Array.isArray(v) ? v : bad(what));
const obj = (v: unknown, what: string) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : bad(what));

function item(v: unknown): FoodItem {
  const o = obj(v, 'food item');
  if (!isStr(o.name) || !o.name.trim()) bad('food name');
  if (!isNum(o.calories) || o.calories < 0) bad('calories');
  return { name: o.name, serving: isStr(o.serving) ? o.serving : '1 serving', calories: o.calories, protein: optNum(o.protein), carbs: optNum(o.carbs), fat: optNum(o.fat) };
}
const ts = (v: unknown) => (isNum(v) && v > 0 ? v : bad('timestamp'));
const sample = (v: unknown) => (v === 1 ? (1 as const) : undefined);

/** Parse and strictly validate a JSON backup; ids are dropped and day keys recomputed. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('File is not valid JSON');
  }
  const o = obj(raw, 'file');
  if (o.app !== 'ledger') throw new BackupError('This doesn’t look like a Ledger backup');
  if (o.version !== 1) throw new BackupError(`Unsupported backup version: ${String(o.version)}`);

  const weights: WeightEntry[] = arr(o.weights, 'weights').map((v) => {
    const w = obj(v, 'weight entry');
    const t = ts(w.timestamp);
    if (!isNum(w.lbs) || w.lbs <= 0 || w.lbs > 1500) bad('weight');
    return { timestamp: t, day: toDayKey(t), lbs: w.lbs, note: isStr(w.note) ? w.note : undefined, sample: sample(w.sample) };
  });
  const foods: FoodEntry[] = arr(o.foods, 'foods').map((v) => {
    const f = obj(v, 'food entry');
    const t = ts(f.timestamp);
    if (!MEALS.includes(f.meal as never)) bad('meal');
    return { ...item(f), timestamp: t, day: toDayKey(t), meal: f.meal as FoodEntry['meal'], sample: sample(f.sample) };
  });
  const water: WaterEntry[] = arr(o.water, 'water').map((v) => {
    const w = obj(v, 'water entry');
    const t = ts(w.timestamp);
    if (!isNum(w.oz) || w.oz <= 0) bad('water amount');
    return { timestamp: t, day: toDayKey(t), oz: w.oz, sample: sample(w.sample) };
  });
  const presets: FoodPreset[] = arr(o.presets ?? [], 'presets').map((v) => {
    const p = obj(v, 'preset');
    if (!isStr(p.name)) bad('preset name');
    const items = arr(p.items, 'preset items').map(item);
    if (!items.length) bad('preset items');
    return {
      name: p.name,
      kind: p.kind === 'meal' ? 'meal' : 'food',
      items,
      favorite: p.favorite ? 1 : 0,
      defaultMeal: MEALS.includes(p.defaultMeal as never) ? (p.defaultMeal as FoodPreset['defaultMeal']) : undefined,
      createdAt: isNum(p.createdAt) ? p.createdAt : Date.now(),
      lastUsed: isNum(p.lastUsed) ? p.lastUsed : undefined,
      sample: sample(p.sample),
    };
  });

  const s = o.settings ? obj(o.settings, 'settings') : {};
  const pos = (v: unknown, d: number) => (isNum(v) && v >= 0 ? v : d);
  const settings: Settings = {
    id: 'settings',
    weightUnit: s.weightUnit === 'kg' ? 'kg' : 'lbs',
    waterUnit: s.waterUnit === 'ml' ? 'ml' : 'oz',
    calorieTarget: pos(s.calorieTarget, DEFAULT_SETTINGS.calorieTarget),
    proteinTarget: pos(s.proteinTarget, DEFAULT_SETTINGS.proteinTarget),
    carbsTarget: pos(s.carbsTarget, DEFAULT_SETTINGS.carbsTarget),
    fatTarget: pos(s.fatTarget, DEFAULT_SETTINGS.fatTarget),
    waterTargetOz: pos(s.waterTargetOz, DEFAULT_SETTINGS.waterTargetOz),
    goalWeightLbs: isNum(s.goalWeightLbs) ? s.goalWeightLbs : undefined,
    goalStartLbs: isNum(s.goalStartLbs) ? s.goalStartLbs : undefined,
    theme: s.theme === 'light' ? 'light' : 'dark',
  };

  return { app: 'ledger', version: 1, exportedAt: isStr(o.exportedAt) ? o.exportedAt : '', weights, foods, water, presets, settings };
}
