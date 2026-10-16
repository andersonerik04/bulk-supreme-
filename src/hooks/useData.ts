import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { DayKey, FoodEntry, FoodPreset, WaterEntry, WeightEntry } from '@/db/types';
import { recentFoods } from '@/db/repo';
import { computeStreak, dailyWeights, sumFoods, sumWater } from '@/utils/stats';

const sortTs = <T extends { timestamp: number }>(xs: T[]) => xs.sort((a, b) => a.timestamp - b.timestamp);

/** Everything logged on one day, plus totals. `undefined` while loading. */
export function useDay(day: DayKey) {
  const data = useLiveQuery(async () => {
    const [weights, foods, water] = await Promise.all([
      db.weights.where('day').equals(day).toArray(),
      db.foods.where('day').equals(day).toArray(),
      db.water.where('day').equals(day).toArray(),
    ]);
    return { weights: sortTs(weights), foods: sortTs(foods), water: sortTs(water) };
  }, [day]);
  return useMemo(() => {
    if (!data) return undefined;
    return { ...data, totals: sumFoods(data.foods), waterOz: sumWater(data.water) };
  }, [data]);
}

/** All weigh-ins ascending (weight data is small, so we load it whole for trend math). */
export function useWeights() {
  const weights = useLiveQuery(() => db.weights.orderBy('timestamp').toArray(), []);
  const daily = useMemo(() => (weights ? dailyWeights(weights) : undefined), [weights]);
  return { weights, daily };
}

/** Food + water entries with day >= `from` (or all when `from` is undefined). */
export function useRange(from: DayKey | undefined) {
  return useLiveQuery(async () => {
    const [foods, water, weights] = await Promise.all([
      from ? db.foods.where('day').aboveOrEqual(from).toArray() : db.foods.toArray(),
      from ? db.water.where('day').aboveOrEqual(from).toArray() : db.water.toArray(),
      from ? db.weights.where('day').aboveOrEqual(from).toArray() : db.weights.toArray(),
    ]);
    return { foods, water, weights } as { foods: FoodEntry[]; water: WaterEntry[]; weights: WeightEntry[] };
  }, [from]);
}

/** Set of every day that has at least one log entry of any kind. */
export function useLoggedDays() {
  return useLiveQuery(async () => {
    const [a, b, c] = await Promise.all([
      db.weights.orderBy('day').uniqueKeys(),
      db.foods.orderBy('day').uniqueKeys(),
      db.water.orderBy('day').uniqueKeys(),
    ]);
    return new Set([...a, ...b, ...c] as DayKey[]);
  }, []);
}

/** Day → number of categories (weight, food, water) logged that day, across all history. */
export function useDayLevels() {
  return useLiveQuery(async () => {
    const sets = await Promise.all([
      db.weights.orderBy('day').uniqueKeys(),
      db.foods.orderBy('day').uniqueKeys(),
      db.water.orderBy('day').uniqueKeys(),
    ]);
    const m = new Map<DayKey, number>();
    for (const keys of sets) for (const k of keys as DayKey[]) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  }, []);
}

export function useStreak() {
  const days = useLoggedDays();
  return useMemo(() => (days ? computeStreak(days) : undefined), [days]);
}

export function usePresets() {
  return useLiveQuery(() => db.presets.toArray(), [], [] as FoodPreset[]);
}

export function useRecentFoods(limit = 12) {
  return useLiveQuery(() => recentFoods(limit), [limit], [] as FoodEntry[]);
}

export function useEarliestDay() {
  return useLiveQuery(async () => {
    const [w, f, h] = await Promise.all([
      db.weights.orderBy('day').first(),
      db.foods.orderBy('day').first(),
      db.water.orderBy('day').first(),
    ]);
    const days = [w?.day, f?.day, h?.day].filter(Boolean) as DayKey[];
    return days.length ? days.sort()[0] : null;
  }, []);
}
