import { useEffect, useState } from 'react';
import type { Totals } from '@/utils/stats';

const SEGMENTS = [
  { key: 'protein', label: 'Protein', kcal: 4, color: 'rgb(var(--protein))', cls: 'bg-protein' },
  { key: 'carbs', label: 'Carbs', kcal: 4, color: 'rgb(var(--carbs))', cls: 'bg-carbs' },
  { key: 'fat', label: 'Fat', kcal: 9, color: 'rgb(var(--fat))', cls: 'bg-fat' },
] as const;

/** Donut of calories-from-macros split, with a legend of grams and %. */
export function MacroDonut({ totals, size = 116 }: { totals: Totals; size?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const kcals = SEGMENTS.map((s) => totals[s.key] * s.kcal);
  const total = kcals.reduce((a, b) => a + b, 0);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 ? 3 : 0;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line) / 0.08)" strokeWidth={stroke} />
          {total > 0 &&
            SEGMENTS.map((s, i) => {
              const len = (kcals[i] / total) * c;
              const dash = Math.max(0, len - gap);
              const el = (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${ready ? dash : 0} ${c}`}
                  strokeDashoffset={-offset}
                  style={{ transition: `stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1) ${i * 120}ms` }}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-lg font-bold leading-none">{Math.round(totals.protein)}g</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">protein</p>
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-2.5">
        {SEGMENTS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${s.cls}`} />
            <span className="flex-1 text-sm text-muted">{s.label}</span>
            <span className="num text-sm font-semibold">{Math.round(totals[s.key])}g</span>
            <span className="num w-10 text-right text-xs text-muted">{total ? Math.round((kcals[i] / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
