import { format } from 'date-fns';

/** Tick label format appropriate for the visible span. */
export function tickFormatter(spanDays: number) {
  const f = spanDays <= 8 ? 'EEE' : spanDays <= 100 ? 'MMM d' : spanDays <= 400 ? 'MMM' : 'MMM yy';
  return (ts: number) => format(ts, f);
}

export const DAY_MS = 86_400_000;
