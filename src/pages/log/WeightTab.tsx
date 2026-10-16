import { useState } from 'react';
import { format } from 'date-fns';
import { WeightSheet } from '@/components/forms/WeightSheet';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { useWeights } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import type { WeightEntry } from '@/db/types';
import { formatWeight, formatWeightDelta } from '@/utils/units';

export function WeightTab() {
  const { weightUnit: unit } = useSettings();
  const { weights } = useWeights();
  const [sheet, setSheet] = useState<{ entry?: WeightEntry } | null>(null);
  const list = weights ? [...weights].reverse() : [];
  const latest = list[0];

  return (
    <div className="space-y-4">
      <button className="card tap flex w-full items-center gap-4 text-left" onClick={() => setSheet({})}>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-weight text-white">
          <Icon name="scale" size={26} />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-semibold">Log weigh-in</span>
          <span className="text-sm text-muted">{latest ? `Last: ${formatWeight(latest.lbs, unit)} · ${format(latest.timestamp, 'MMM d')}` : 'Start tracking your trend'}</span>
        </span>
        <Icon name="plus" className="text-weight" />
      </button>

      <section className="card !p-0">
        <h3 className="px-4 pb-1 pt-4 font-semibold">Recent weigh-ins</h3>
        {list.length === 0 ? (
          <EmptyState icon="scale" tone="text-weight" title="No weigh-ins yet" body="Weigh in at the same time each day — ideally mornings, fasted — for the cleanest trend." />
        ) : (
          <ul className="divide-y divide-line/[0.06]">
            {list.slice(0, 60).map((w, i) => {
              const prev = list[i + 1];
              const d = prev ? w.lbs - prev.lbs : null;
              return (
                <li key={w.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-elevated" onClick={() => setSheet({ entry: w })}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{format(w.timestamp, 'EEE, MMM d')} <span className="text-muted">· {format(w.timestamp, 'h:mm a')}</span></p>
                      {w.note && <p className="truncate text-xs text-muted">{w.note}</p>}
                    </div>
                    {d != null && (
                      <span className={`num text-xs font-medium ${d < 0 ? 'text-fat' : d > 0 ? 'text-food' : 'text-muted'}`}>{formatWeightDelta(d, unit, false)}</span>
                    )}
                    <span className="num w-20 text-right font-semibold">{formatWeight(w.lbs, unit)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <WeightSheet open={!!sheet} onClose={() => setSheet(null)} entry={sheet?.entry} lastLbs={latest?.lbs} />
    </div>
  );
}
