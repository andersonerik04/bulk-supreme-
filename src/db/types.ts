/**
 * Ledger data model.
 *
 * Canonical storage units: weight in pounds, water in fluid ounces.
 * Conversion to the user's preferred units happens at the display/input edge
 * (see utils/units.ts), so stored data never changes when units are toggled.
 *
 * Every log entry carries a `day` key (local "yyyy-MM-dd") derived from its
 * timestamp. It is indexed so day/range queries don't scan the whole table.
 */

export type DayKey = string; // "yyyy-MM-dd" in local time

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealType = (typeof MEALS)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

/** 1 marks rows created by the sample-data seeder (Dexie can't index booleans). */
type SampleFlag = { sample?: 0 | 1 };

export interface WeightEntry extends SampleFlag {
  id?: number;
  timestamp: number;
  day: DayKey;
  lbs: number;
  note?: string;
}

/** Nutrition facts for a single food item (also the building block of presets). */
export interface FoodItem {
  name: string;
  serving: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodEntry extends FoodItem, SampleFlag {
  id?: number;
  timestamp: number;
  day: DayKey;
  meal: MealType;
  /** Preset this entry was logged from, if any. */
  presetId?: number;
}

export interface WaterEntry extends SampleFlag {
  id?: number;
  timestamp: number;
  day: DayKey;
  oz: number;
}

export type PresetKind = 'food' | 'meal';

/** A reusable custom food (one item) or multi-item meal. */
export interface FoodPreset extends SampleFlag {
  id?: number;
  name: string;
  kind: PresetKind;
  items: FoodItem[];
  favorite: 0 | 1;
  /** Meal the preset is usually logged as; optional hint for quick-add. */
  defaultMeal?: MealType;
  createdAt: number;
  lastUsed?: number;
}

export type WeightUnit = 'lbs' | 'kg';
export type WaterUnit = 'oz' | 'ml';
export type Theme = 'dark' | 'light';

export interface Settings {
  id: 'settings';
  weightUnit: WeightUnit;
  waterUnit: WaterUnit;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTargetOz: number;
  goalWeightLbs?: number;
  /** Weight when the goal was set — the 0% point for the progress bar. */
  goalStartLbs?: number;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  weightUnit: 'lbs',
  waterUnit: 'oz',
  calorieTarget: 2200,
  proteinTarget: 160,
  carbsTarget: 220,
  fatTarget: 70,
  waterTargetOz: 100,
  theme: 'dark',
};

/** Shape of a JSON backup file. Bump `version` on breaking changes. */
export interface BackupFile {
  app: 'ledger';
  version: 1;
  exportedAt: string;
  weights: WeightEntry[];
  foods: FoodEntry[];
  water: WaterEntry[];
  presets: FoodPreset[];
  settings: Settings;
}
