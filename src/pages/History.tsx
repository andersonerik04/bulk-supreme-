import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { useEarliestDay, useRange } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import type { DayKey } from '@/db/types';
import { dayRange, daysAgoKey, friendlyDay, fromDayKey, todayKey } from '@/utils/date';
import { dailyWeights, totalsByDay, waterByDay } from '@/utils/stats';
import { clamp, fmtInt } from '@/utils/format';
import { formatWater, formatWeight } from '@/utils/units';

const PAGE = 30;

export default function History() {
  const settings = useSettings();
  const [count, setCount] = useState(PAGE);
  const earliest = useEarliestDay();
  const from = daysAgoKey(count - 1);
  const data = useRange(from);

  const rows = useMemo(() => {
    if (!data || earliest === undefined) return null;
    if (earliest === null) return [];
    const food = totalsByDay(data.foods);
    const water = waterByDay(data.water);
    const weights = new Map(dailyWeights(data.weights).map((w) => [w.day, w.lbs]));
    const start = earliest > from ? earliest : from;
    return dayRange(start, todayKey())
      .reverse()
      .map((day: DayKey) => ({ day, food: food.get(day), water: water.get(day), weight: weights.get(day), meals: new Set(data.foods.filter((f) => f.day === day).map((f) => f.meal)).size }));
  }, [data, earliest, from]);

  const hasMore = earliest != null && earliest < from;

  // Group rows by month for sticky headers
  const months = useMemo(() => {
    const m: { label: string; rows: NonNullable<typeof rows> }[] = [];
    for (const r of rows ?? []) {
      const label = format(fromDayKey(r.day), 'MMMM yyyy');
      if (m.at(-1)?.label !== label) m.push({ label, rows: [] });
      m.at(-1)!.rows.push(r);
    }
    return m;
  }, [rows]);

  return (
    <>
      <PageHeader title="History" subtitle="Day by day" />
      {rows && rows.length === 0 && (
        <div className="card">
          <EmptyState icon="calendar" title="Nothing logged yet" body="Every day you log will show up here. Tap any day to review or edit it." />
        </div>
      )}
      <div className="space-y-5">
        {months.map((m) => (
          <section key={m.label}>
            <h2 className="label sticky z-10 -mx-4 bg-bg/90 px-5 py-2 backdrop-blur" style={{ top: 'var(--safe-top)' }}>{m.label}</h2>
            <ul className="card divide-y divide-line/[0.06] !p-0">
              {m.rows.map((r) => {
                const empty = !r.food && !r.water && r.weight == null;
                return (
                  <li key={r.day}>
                    <Link to={`/history/${r.day}`} className="flex items-center gap-3 px-4 py-3 active:bg-elevated">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[10px] font-semibold uppercase text-muted">{format(fromDayKey(r.day), 'EEE')}</p>
                        <p className="num font-display text-xl font-bold leading-tight">{format(fromDayKey(r.day), 'd')}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        {empty ? (
                          <p className="text-sm text-muted/70">{friendlyDay(r.day) === 'Today' ? 'Nothing yet today' : 'No entries'}</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 text-sm">
                              {r.food && <span className="num font-semibold text-food">{fmtInt(r.food.calories)} cal</span>}
                              {r.weight != null && <span className="num font-semibold text-weight">{formatWeight(r.weight, settings.weightUnit)}</span>}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-food/15">
                                <div className="h-full rounded-full bg-food" style={{ width: `${clamp((r.food?.calories ?? 0) / settings.calorieTarget) * 100}%` }} />
                              </div>
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-water/15">
                                <div className="h-full rounded-full bg-water" style={{ width: `${clamp((r.water ?? 0) / settings.waterTargetOz) * 100}%` }} />
                              </div>
                            </div>
                            <p className="mt-1 text-[11px] text-muted">
                              {r.meals ? `${r.meals} meal${r.meals > 1 ? 's' : ''}` : 'No food'} · {r.water ? formatWater(r.water, settings.waterUnit) : 'no water'}
                            </p>
                          </>
                        )}
                      </div>
                      <Icon name="right" size={18} className="text-muted/60" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {hasMore && (
          <button className="btn-ghost w-full" onClick={() => setCount((c) => c + PAGE)}>Show earlier days</button>
        )}
      </div>
    </>
  );
}
