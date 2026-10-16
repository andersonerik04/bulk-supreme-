import type { Settings } from '@/db/types';
import type { Totals } from '@/utils/stats';
import { clamp } from '@/utils/format';

const macros = [
  { key: 'protein', label: 'Protein', color: 'bg-protein', target: 'proteinTarget' },
  { key: 'carbs', label: 'Carbs', color: 'bg-carbs', target: 'carbsTarget' },
  { key: 'fat', label: 'Fat', color: 'bg-fat', target: 'fatTarget' },
] as const;

/** Three slim progress bars for macros vs targets. */
export function MacroBars({ totals, settings, compact = false }: { totals: Totals; settings: Settings; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-3 ${compact ? 'gap-3' : 'gap-4'}`}>
      {macros.map((m) => {
        const v = totals[m.key];
        const t = settings[m.target];
        return (
          <div key={m.key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted">{m.label}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
              <div className={`h-full rounded-full ${m.color} transition-[width] duration-1000 ease-out`} style={{ width: `${clamp(t ? v / t : 0) * 100}%` }} />
            </div>
            <p className="num mt-1.5 text-sm font-semibold">
              {Math.round(v)}
              <span className="font-normal text-muted">/{t}g</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
