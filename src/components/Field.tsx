import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  suffix?: ReactNode;
}

export function Field({ label, error, suffix, className = '', id, ...rest }: Props) {
  const fid = id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={fid} className={`block ${className}`}>
      <span className="label mb-1.5 block">{label}</span>
      <span className="relative block">
        <input id={fid} className={`input ${suffix ? 'pr-11' : ''} ${error ? 'input-error' : ''}`} aria-invalid={!!error} {...rest} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">{suffix}</span>}
      </span>
      {error && <span className="mt-1 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}
