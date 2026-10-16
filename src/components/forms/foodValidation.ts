import type { FoodItem } from '@/db/types';
import { numberRule, optNum, parseNum, textRule, type Validator } from '@/utils/validation';

export interface FoodValues {
  name: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const foodRules: Record<keyof FoodValues, Validator> = {
  name: textRule({ label: 'Name', required: true, max: 80 }),
  serving: textRule({ label: 'Serving', required: true, max: 40 }),
  calories: numberRule({ label: 'Calories', required: true, min: 0, max: 10000 }),
  protein: numberRule({ label: 'Protein', min: 0, max: 1000 }),
  carbs: numberRule({ label: 'Carbs', min: 0, max: 1000 }),
  fat: numberRule({ label: 'Fat', min: 0, max: 1000 }),
};

export const itemFromValues = (v: FoodValues): FoodItem => ({
  name: v.name.trim(),
  serving: v.serving.trim(),
  calories: Math.round(parseNum(v.calories) ?? 0),
  protein: optNum(v.protein),
  carbs: optNum(v.carbs),
  fat: optNum(v.fat),
});
