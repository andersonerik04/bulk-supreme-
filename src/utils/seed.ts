/**
 * Sample data generator: ~60 days of realistic weigh-ins, meals and water.
 * Every generated row is flagged `sample: 1` so it can be removed later
 * without touching real entries (see clearSampleData in db/repo.ts).
 */
import { db } from '@/db/db';
import type { FoodEntry, FoodItem, FoodPreset, MealType, WaterEntry, WeightEntry } from '@/db/types';
import { getSettings, updateSettings } from '@/db/repo';
import { daysAgoKey, fromDayKey, toDayKey } from './date';

// Deterministic PRNG so previews look the same every time.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (name: string, serving: string, calories: number, protein: number, carbs: number, fat: number): FoodItem => ({ name, serving, calories, protein, carbs, fat });

const LIBRARY: Record<MealType, FoodItem[][]> = {
  breakfast: [
    [f('Overnight oats', '1 cup', 310, 12, 52, 7), f('Whey protein shake', '1 scoop', 120, 24, 3, 1.5), f('Banana', '1 medium', 105, 1.3, 27, 0.4)],
    [f('Scrambled eggs', '3 large', 270, 19, 2, 20), f('Sourdough toast', '1 slice', 120, 4, 23, 1), f('Avocado', '½ fruit', 120, 1.5, 6, 11)],
    [f('Greek yogurt', '200 g', 146, 20, 8, 4), f('Granola', '⅓ cup', 160, 4, 24, 6), f('Blueberries', '½ cup', 42, 0.5, 11, 0.2)],
    [f('Protein pancakes', '3 pancakes', 360, 28, 40, 9), f('Maple syrup', '1 tbsp', 52, 0, 13, 0)],
    [f('Egg white omelette', '1 omelette', 190, 26, 6, 6), f('Coffee with milk', '12 oz', 60, 3, 5, 3)],
  ],
  lunch: [
    [f('Chicken & rice bowl', '1 bowl', 620, 48, 70, 14)],
    [f('Turkey sandwich', '1 sandwich', 430, 32, 44, 13), f('Apple', '1 medium', 95, 0.5, 25, 0.3)],
    [f('Chipotle burrito bowl', '1 bowl', 705, 44, 72, 25)],
    [f('Salmon poke bowl', '1 bowl', 580, 34, 66, 18)],
    [f('Grilled chicken salad', '1 large', 420, 42, 18, 20), f('Pita chips', '1 oz', 130, 3, 19, 5)],
    [f('Tuna wrap', '1 wrap', 460, 36, 38, 17)],
  ],
  dinner: [
    [f('Salmon fillet', '6 oz', 350, 38, 0, 21), f('Roasted sweet potato', '1 medium', 160, 3, 37, 0.3), f('Broccoli', '1 cup', 55, 4, 11, 0.6)],
    [f('Steak', '8 oz', 540, 56, 0, 34), f('Baked potato', '1 medium', 160, 4, 37, 0.2), f('Side salad', '1 bowl', 90, 2, 8, 6)],
    [f('Chicken stir-fry', '2 cups', 520, 42, 48, 16), f('Jasmine rice', '1 cup', 205, 4, 45, 0.4)],
    [f('Spaghetti bolognese', '1 plate', 680, 34, 82, 22)],
    [f('Turkey chili', '2 cups', 480, 40, 42, 15), f('Cornbread', '1 piece', 170, 3, 28, 5)],
    [f('Margherita pizza', '3 slices', 810, 33, 96, 30)],
    [f('Shrimp tacos', '3 tacos', 540, 34, 54, 20)],
  ],
  snacks: [
    [f('Protein bar', '1 bar', 210, 20, 23, 7)],
    [f('Almonds', '1 oz', 164, 6, 6, 14)],
    [f('Apple', '1 medium', 95, 0.5, 25, 0.3), f('Peanut butter', '1 tbsp', 95, 3.5, 3, 8)],
    [f('Cottage cheese', '1 cup', 180, 25, 8, 5)],
    [f('Dark chocolate', '2 squares', 120, 1.5, 9, 9)],
    [f('Beef jerky', '1 oz', 80, 13, 3, 1)],
    [f('Ice cream', '1 cup', 280, 5, 32, 15)],
  ],
};

const MEAL_HOURS: Record<MealType, [number, number]> = {
  breakfast: [7, 9],
  lunch: [12, 13.5],
  dinner: [18, 20],
  snacks: [15, 21.5],
};

const NOTES = ['Morning, fasted', 'Morning, fasted', 'After workout', 'Slept badly', 'Post-travel', undefined];

export async function seedSampleData(days = 60) {
  const rand = mulberry32(20261016);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const gauss = () => {
    // Box–Muller
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const now = Date.now();
  const weights: WeightEntry[] = [];
  const foods: FoodEntry[] = [];
  const water: WaterEntry[] = [];

  const startLbs = 192.4;
  let trueWeight = startLbs;

  for (let i = days; i >= 0; i--) {
    const day = daysAgoKey(i);
    const date = fromDayKey(day);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    const at = (h: number) => {
      const d = new Date(date);
      d.setHours(Math.floor(h), Math.floor((h % 1) * 60) + Math.floor(rand() * 10), Math.floor(rand() * 60));
      return d.getTime();
    };

    // A few completely missed days for a realistic heatmap.
    if (i > 0 && rand() < 0.05) continue;

    // Underlying trend: steady loss with a plateau in the middle third.
    const phase = (days - i) / days;
    const dailyLoss = phase > 0.4 && phase < 0.55 ? 0.01 : 0.13;
    trueWeight -= dailyLoss + gauss() * 0.04;

    // Weigh-in (~88% of days), noisy around the trend with weekend water-weight bumps.
    const weighTime = at(6.5 + rand() * 1.5);
    if (rand() < 0.88 && weighTime < now) {
      const bump = dow === 1 ? 0.9 : dow === 0 ? 0.5 : 0;
      weights.push({
        timestamp: weighTime,
        day,
        lbs: Math.round((trueWeight + bump + gauss() * 0.55) * 10) / 10,
        note: rand() < 0.25 ? pick(NOTES) : undefined,
        sample: 1,
      });
    }

    // Meals
    for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]) {
      if (meal === 'breakfast' && rand() < 0.08) continue; // skipped breakfast
      if (meal === 'snacks' && rand() < (weekend ? 0.1 : 0.35)) continue;
      const [h0, h1] = MEAL_HOURS[meal];
      const ts = at(h0 + rand() * (h1 - h0));
      if (ts > now) continue;
      const combos = meal === 'snacks' && weekend ? [pick(LIBRARY.snacks), pick(LIBRARY.snacks)] : [pick(LIBRARY[meal])];
      for (const combo of combos) {
        for (const item of combo) {
          // Portion variance ±12%
          const k = 1 + (rand() - 0.5) * 0.24;
          foods.push({
            ...item,
            calories: Math.round(item.calories * k),
            protein: item.protein != null ? Math.round(item.protein * k * 10) / 10 : undefined,
            carbs: item.carbs != null ? Math.round(item.carbs * k * 10) / 10 : undefined,
            fat: item.fat != null ? Math.round(item.fat * k * 10) / 10 : undefined,
            meal,
            timestamp: ts,
            day,
            sample: 1,
          });
        }
      }
    }

    // Water: 5–9 drinks spread through the day
    const drinks = 5 + Math.floor(rand() * 5);
    for (let d = 0; d < drinks; d++) {
      const ts = at(7 + (d / drinks) * 14 + rand());
      if (ts > now) continue;
      water.push({ timestamp: ts, day, oz: pick([8, 8, 12, 16, 16, 20, 24]), sample: 1 });
    }
  }

  const presets: Omit<FoodPreset, 'id'>[] = [
    { name: 'Usual breakfast', kind: 'meal', items: LIBRARY.breakfast[0], favorite: 1, defaultMeal: 'breakfast', createdAt: now, lastUsed: now - 1000, sample: 1 },
    { name: 'Chicken & rice bowl', kind: 'food', items: LIBRARY.lunch[0], favorite: 1, defaultMeal: 'lunch', createdAt: now, lastUsed: now - 2000, sample: 1 },
    { name: 'Salmon dinner', kind: 'meal', items: LIBRARY.dinner[0], favorite: 1, defaultMeal: 'dinner', createdAt: now, lastUsed: now - 3000, sample: 1 },
    { name: 'Protein bar', kind: 'food', items: LIBRARY.snacks[0], favorite: 1, defaultMeal: 'snacks', createdAt: now, lastUsed: now - 4000, sample: 1 },
    { name: 'Greek yogurt bowl', kind: 'meal', items: LIBRARY.breakfast[2], favorite: 0, defaultMeal: 'breakfast', createdAt: now, sample: 1 },
  ];

  await db.transaction('rw', [db.weights, db.foods, db.water, db.presets], async () => {
    await db.weights.bulkAdd(weights);
    await db.foods.bulkAdd(foods);
    await db.water.bulkAdd(water);
    await db.presets.bulkAdd(presets as FoodPreset[]);
  });

  // Give the goal/projection UI something to show if no goal is set yet.
  const s = await getSettings();
  if (s.goalWeightLbs == null) await updateSettings({ goalWeightLbs: 180, goalStartLbs: startLbs });

  return { weights: weights.length, foods: foods.length, water: water.length, firstDay: toDayKey(fromDayKey(daysAgoKey(days))) };
}
