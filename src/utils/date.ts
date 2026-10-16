import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import type { DayKey } from '@/db/types';

export const toDayKey = (d: Date | number): DayKey => format(d, 'yyyy-MM-dd');
export const todayKey = (): DayKey => toDayKey(new Date());
export const fromDayKey = (k: DayKey): Date => parseISO(k);

export const shiftDay = (k: DayKey, delta: number): DayKey => toDayKey(addDays(fromDayKey(k), delta));

/** Inclusive list of day keys from `start` to `end`. */
export function dayRange(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const s = fromDayKey(start);
  const n = differenceInCalendarDays(fromDayKey(end), s);
  for (let i = 0; i <= n; i++) out.push(toDayKey(addDays(s, i)));
  return out;
}

export function daysAgoKey(n: number): DayKey {
  return toDayKey(subDays(startOfDay(new Date()), n));
}

/** "Today", "Yesterday", or e.g. "Mon, Oct 14". */
export function friendlyDay(k: DayKey): string {
  const diff = differenceInCalendarDays(new Date(), fromDayKey(k));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const d = fromDayKey(k);
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
}

export const timeLabel = (ts: number) => format(ts, 'h:mm a');

/** Value for <input type="datetime-local"> */
export const toDateTimeInput = (ts: number) => format(ts, "yyyy-MM-dd'T'HH:mm");
export const fromDateTimeInput = (v: string) => new Date(v).getTime();

/** Keep the time-of-day of `now` but move it onto `day` (for back-dated logging). */
export function timestampOnDay(day: DayKey, now = new Date()): number {
  const d = fromDayKey(day);
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return d.getTime();
}

export function mealForTime(d = new Date()) {
  const h = d.getHours();
  if (h < 10.5) return 'breakfast' as const;
  if (h < 15) return 'lunch' as const;
  if (h < 21) return 'dinner' as const;
  return 'snacks' as const;
}
