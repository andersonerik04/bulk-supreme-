/**
 * Small, dependency-free validators for form input. Each returns an error
 * message string or null when valid, so forms can render messages inline.
 */

export type Validator = (raw: string) => string | null;

export function parseNum(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function numberRule(opts: { label: string; min?: number; max?: number; required?: boolean; integer?: boolean }): Validator {
  return (raw) => {
    const n = parseNum(raw);
    if (n === null) return opts.required ? `${opts.label} is required` : null;
    if (Number.isNaN(n)) return `${opts.label} must be a number`;
    if (opts.integer && !Number.isInteger(n)) return `${opts.label} must be a whole number`;
    if (opts.min != null && n < opts.min) return `${opts.label} must be at least ${opts.min}`;
    if (opts.max != null && n > opts.max) return `${opts.label} must be at most ${opts.max}`;
    return null;
  };
}

export function textRule(opts: { label: string; required?: boolean; max?: number }): Validator {
  return (raw) => {
    const s = raw.trim();
    if (!s) return opts.required ? `${opts.label} is required` : null;
    if (opts.max && s.length > opts.max) return `${opts.label} must be under ${opts.max} characters`;
    return null;
  };
}

/** Run validators over a field map; returns only fields with errors. */
export function validate<K extends string>(values: Record<K, string>, rules: Partial<Record<K, Validator>>) {
  const errors: Partial<Record<K, string>> = {};
  for (const k of Object.keys(rules) as K[]) {
    const err = rules[k]!(values[k] ?? '');
    if (err) errors[k] = err;
  }
  return errors;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;

/** Optional numeric field → number | undefined */
export const optNum = (raw: string) => {
  const n = parseNum(raw);
  return n === null || Number.isNaN(n) ? undefined : n;
};
