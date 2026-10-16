import { useState } from 'react';
import { WaterGlass } from '@/components/WaterGlass';
import { WaterSheet } from '@/components/forms/WaterSheet';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useDay } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { addWater, deleteWater, undoLastWater } from '@/db/repo';
import type { WaterEntry } from '@/db/types';
import { timeLabel, todayKey } from '@/utils/date';
import { formatWater, waterQuickSizes } from '@/utils/units';

export function WaterTab() {
  const s = useSettings();
  const day = todayKey();
  const data = useDay(day);
  const toast = useToast();
  const [sheet, setSheet] = useState<{ entry?: WaterEntry } | null>(null);
  const [pulse, setPulse] = useState(0);
  const oz = data?.waterOz ?? 0;
  const p = s.waterTargetOz ? oz / s.waterTargetOz : 0;
  const entries = data ? [...data.water].reverse() : [];

  async function quick(amount: number, label: string) {
    const id = await addWater(amount);
    setPulse((x) => x + 1);
    navigator.vibrate?.(10);
    toast({ message: `Added ${label}`, action: { label: 'Undo', onClick: () => deleteWater(id as number) } });
  }

  async function undo() {
    const removed = await undoLastWater(day);
    if (removed) toast({ message: `Removed ${formatWater(removed.oz, s.waterUnit)}`, action: { label: 'Redo', onClick: () => addWater(removed.oz, removed.timestamp) } });
  }

  return (
    <div className="space-y-4">
      <section className="card flex flex-col items-center pt-6">
        <div key={pulse} className={pulse ? 'animate-pop' : ''}>
          <WaterGlass value={p} height={210} />
        </div>
        <p className="num mt-4 font-display text-4xl font-bold text-water">{formatWater(oz, s.waterUnit, false)}<span className="ml-1 text-lg font-semibold text-muted">/ {formatWater(s.waterTargetOz, s.waterUnit)}</span></p>
        <p className="mt-1 text-sm text-muted">
          {p >= 1 ? 'Goal reached — nicely done 💧' : `${formatWater(Math.max(0, s.waterTargetOz - oz), s.waterUnit)} to go · ${Math.round(p * 100)}%`}
        </p>

        <div className="mt-5 grid w-full grid-cols-4 gap-2">
          {waterQuickSizes(s.waterUnit).map((q) => (
            <button key={q.label} className="tap rounded-2xl bg-water/15 py-4 font-semibold text-water" onClick={() => quick(q.oz, q.label)}>
              +{q.label.split(' ')[0]}
              <span className="block text-[10px] font-medium opacity-70">{s.waterUnit}</span>
            </button>
          ))}
          <button className="tap rounded-2xl bg-elevated py-4 text-sm font-semibold text-muted" onClick={() => setSheet({})}>Custom</button>
        </div>
        <button className="tap mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted disabled:opacity-40" onClick={undo} disabled={!entries.length}>
          <Icon name="undo" size={16} /> Undo last
        </button>
      </section>

      <section className="card !p-0">
        <h3 className="px-4 pb-1 pt-4 font-semibold">Today</h3>
        {entries.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted">No water logged yet. Tap a size above to start.</p>
        ) : (
          <ul className="divide-y divide-line/[0.06]">
            {entries.map((w) => (
              <li key={w.id}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-elevated" onClick={() => setSheet({ entry: w })}>
                  <Icon name="drop" size={18} className="text-water" />
                  <span className="flex-1 text-muted">{timeLabel(w.timestamp)}</span>
                  <span className="num font-semibold">{formatWater(w.oz, s.waterUnit)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WaterSheet open={!!sheet} onClose={() => setSheet(null)} entry={sheet?.entry} />
    </div>
  );
}
