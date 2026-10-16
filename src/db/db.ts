import Dexie, { type EntityTable } from 'dexie';
import type { FoodEntry, FoodPreset, Settings, WaterEntry, WeightEntry } from './types';

export class LedgerDB extends Dexie {
  weights!: EntityTable<WeightEntry, 'id'>;
  foods!: EntityTable<FoodEntry, 'id'>;
  water!: EntityTable<WaterEntry, 'id'>;
  presets!: EntityTable<FoodPreset, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('ledger');
    this.version(1).stores({
      weights: '++id, timestamp, day, sample',
      foods: '++id, timestamp, day, [day+meal], name, sample',
      water: '++id, timestamp, day, sample',
      presets: '++id, name, favorite, lastUsed, sample',
      settings: 'id',
    });
  }
}

export const db = new LedgerDB();
