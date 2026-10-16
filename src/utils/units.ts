import type { WaterUnit, WeightUnit } from '@/db/types';

const LBS_PER_KG = 2.2046226218;
const ML_PER_OZ = 29.5735295625;

export const lbsToKg = (lbs: number) => lbs / LBS_PER_KG;
export const kgToLbs = (kg: number) => kg * LBS_PER_KG;
export const ozToMl = (oz: number) => oz * ML_PER_OZ;
export const mlToOz = (ml: number) => ml / ML_PER_OZ;

/** Canonical lbs → number in display unit, rounded to 0.1 */
export const weightToDisplay = (lbs: number, unit: WeightUnit) =>
  Math.round((unit === 'kg' ? lbsToKg(lbs) : lbs) * 10) / 10;
export const weightFromDisplay = (v: number, unit: WeightUnit) => (unit === 'kg' ? kgToLbs(v) : v);

export const waterToDisplay = (oz: number, unit: WaterUnit) =>
  unit === 'ml' ? Math.round(ozToMl(oz)) : Math.round(oz * 10) / 10;
export const waterFromDisplay = (v: number, unit: WaterUnit) => (unit === 'ml' ? mlToOz(v) : v);

export const formatWeight = (lbs: number, unit: WeightUnit, withUnit = true) =>
  `${weightToDisplay(lbs, unit).toFixed(1)}${withUnit ? ` ${unit}` : ''}`;

export function formatWater(oz: number, unit: WaterUnit, withUnit = true) {
  const v = Math.round(waterToDisplay(oz, unit)).toLocaleString();
  return withUnit ? `${v} ${unit}` : v;
}

/** Signed delta, e.g. "−1.4 lbs" / "+0.6 lbs" (true minus sign for typography). */
export function formatWeightDelta(deltaLbs: number, unit: WeightUnit, withUnit = true) {
  const v = weightToDisplay(Math.abs(deltaLbs), unit);
  const sign = v === 0 ? '±' : deltaLbs < 0 ? '−' : '+';
  return `${sign}${v.toFixed(1)}${withUnit ? ` ${unit}` : ''}`;
}

/** Quick-add sizes shown on the water screen (stored as oz). */
export function waterQuickSizes(unit: WaterUnit): { oz: number; label: string }[] {
  if (unit === 'ml') {
    return [250, 500, 750].map((ml) => ({ oz: mlToOz(ml), label: `${ml} ml` }));
  }
  return [8, 16, 24].map((oz) => ({ oz, label: `${oz} oz` }));
}
