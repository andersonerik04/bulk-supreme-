import type { ReactNode } from 'react';

/** Shared tooltip shell; Recharts passes `active`/`payload`, we render rows via `render`. */
export function TooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line/10 bg-elevated/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </p>
  );
}
