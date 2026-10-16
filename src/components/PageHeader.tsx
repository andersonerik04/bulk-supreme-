import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        {subtitle && <p className="label mb-1">{subtitle}</p>}
        <h1 className="font-display text-[32px] font-bold leading-none tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}
