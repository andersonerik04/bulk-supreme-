import { differenceInCalendarDays } from 'date-fns';
import type { DayKey, FoodEntry, FoodItem, WaterEntry, WeightEntry } from '@/db/types';
import { fromDayKey, shiftDay, todayKey } from './date';

export interface DailyWeight {
  day: DayKey;
  lbs: number; // mean of that day's weigh-ins
  avg?: number; // 7-day rolling average ending that day
}

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const emptyTotals = (): Totals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

export function sumFoods(entries: FoodItem[]): Totals {
  const t = emptyTotals();
  for (const e of entries) {
    t.calories += e.calories;
    t.protein += e.protein ?? 0;
    t.carbs += e.carbs ?? 0;
    t.fat += e.fat ?? 0;
  }
  return t;
}

export const sumWater = (entries: WaterEntry[]) => entries.reduce((s, e) => s + e.oz, 0);

export function totalsByDay(entries: FoodEntry[]): Map<DayKey, Totals> {
  const m = new Map<DayKey, Totals>();
  for (const e of entries) {
    const t = m.get(e.day) ?? emptyTotals();
    t.calories += e.calories;
    t.protein += e.protein ?? 0;
    t.carbs += e.carbs ?? 0;
    t.fat += e.fat ?? 0;
    m.set(e.day, t);
  }
  return m;
}

export function waterByDay(entries: WaterEntry[]): Map<DayKey, number> {
  const m = new Map<DayKey, number>();
  for (const e of entries) m.set(e.day, (m.get(e.day) ?? 0) + e.oz);
  return m;
}

/** One point per day with weigh-ins, sorted ascending, with a calendar-based 7-day rolling mean. */
export function dailyWeights(entries: WeightEntry[], window = 7): DailyWeight[] {
  const byDay = new Map<DayKey, { sum: number; n: number }>();
  for (const e of entries) {
    const v = byDay.get(e.day) ?? { sum: 0, n: 0 };
    v.sum += e.lbs;
    v.n += 1;
    byDay.set(e.day, v);
  }
  const days = [...byDay.keys()].sort();
  const pts: DailyWeight[] = days.map((day) => {
    const v = byDay.get(day)!;
    return { day, lbs: v.sum / v.n };
  });
  // Two-pointer sliding window over calendar days (handles skipped days).
  let lo = 0;
  let sum = 0;
  for (let hi = 0; hi < pts.length; hi++) {
    sum += pts[hi].lbs;
    const minDay = shiftDay(pts[hi].day, -(window - 1));
    while (pts[lo].day < minDay) sum -= pts[lo++].lbs;
    pts[hi].avg = sum / (hi - lo + 1);
  }
  return pts;
}

/** Latest point at or before `day`. Assumes ascending sort. */
export function pointOnOrBefore(pts: DailyWeight[], day: DayKey): DailyWeight | undefined {
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i].day <= day) return pts[i];
  return undefined;
}

/** Change in weight over the last `days` days (latest weigh-in vs the one closest to N days before). */
export function changeOver(pts: DailyWeight[], days: number): number | null {
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const ref = pointOnOrBefore(pts, shiftDay(last.day, -days)) ?? pts[0];
  if (ref === last) return null;
  return last.lbs - ref.lbs;
}

export function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) {
    sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y;
  }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  return { slope, intercept: (sy - slope * sx) / n };
}

export interface Projection {
  /** lbs per week, negative = losing */
  ratePerWeek: number;
  /** Projected date of reaching goal, or null if the trend isn't heading there. */
  eta: Date | null;
  daysToGoal: number | null;
}

/** Fit the last `lookback` days of rolling-average weight and extrapolate to the goal. */
export function projectGoal(pts: DailyWeight[], goalLbs: number | undefined, lookback = 28): Projection | null {
  if (pts.length < 5) return null;
  const last = pts[pts.length - 1];
  const from = shiftDay(last.day, -lookback);
  const origin = fromDayKey(last.day);
  const recent = pts
    .filter((p) => p.day >= from)
    .map((p) => ({ x: differenceInCalendarDays(fromDayKey(p.day), origin), y: p.avg ?? p.lbs }));
  const fit = linearRegression(recent);
  if (!fit) return null;
  const ratePerWeek = fit.slope * 7;
  if (goalLbs == null) return { ratePerWeek, eta: null, daysToGoal: null };
  const current = fit.intercept; // fitted value at x = 0 (latest day)
  const remaining = goalLbs - current;
  if (Math.abs(remaining) < 0.25) return { ratePerWeek, eta: origin, daysToGoal: 0 };
  // Need a meaningful slope in the right direction (> ~0.05 lb/week).
  if (Math.abs(fit.slope) < 0.007 || Math.sign(fit.slope) !== Math.sign(remaining)) {
    return { ratePerWeek, eta: null, daysToGoal: null };
  }
  const daysToGoal = Math.ceil(remaining / fit.slope);
  if (daysToGoal > 365 * 3) return { ratePerWeek, eta: null, daysToGoal: null };
  const eta = new Date(origin);
  eta.setDate(eta.getDate() + daysToGoal);
  return { ratePerWeek, eta, daysToGoal };
}

/**
 * Consecutive logged days ending today. If today has nothing yet the streak
 * is still "alive" and counts back from yesterday.
 */
export function computeStreak(loggedDays: Set<DayKey>, today = todayKey()): { count: number; loggedToday: boolean } {
  const loggedToday = loggedDays.has(today);
  let day = loggedToday ? today : shiftDay(today, -1);
  let count = 0;
  while (loggedDays.has(day)) {
    count++;
    day = shiftDay(day, -1);
  }
  return { count, loggedToday };
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
