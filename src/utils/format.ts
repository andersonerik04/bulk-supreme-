export const fmtInt = (n: number) => Math.round(n).toLocaleString();
export const fmtG = (n: number | undefined) => `${Math.round(n ?? 0)}g`;
export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const pct = (v: number, target: number) => (target > 0 ? v / target : 0);
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
