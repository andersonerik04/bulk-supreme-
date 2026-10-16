import { useMemo, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { EmptyState } from '@/components/EmptyState';
import { WeightChart } from '@/components/charts/WeightChart';
import { CaloriesChart, weekLabel } from '@/components/charts/CaloriesChart';
import { CorrelationChart } from '@/components/charts/CorrelationChart';
import { Heatmap } from '@/components/charts/Heatmap';
import { useDayLevels, useEarliestDay, useRange, useWeights } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import type { DayKey } from '@/db/types';
import { dayRange, daysAgoKey, fromDayKey, shiftDay, toDayKey, todayKey } from '@/utils/date';
import { mean, pearson, totalsByDay, waterByDay } from '@/utils/stats';
import { fmtInt } from '@/utils/format';
import { formatWater, formatWeightDelta, weightToDisplay } from '@/utils/units';

const RANGES = [
  { value: '1W', label: '1W', days: 7 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: 'All', label: 'All', days: 0 },
] as const;
type Range = (typeof RANGES)[number]['value'];

const RANGE_KEY = 'ledger-trends-range';
const ts = (d: DayKey) => fromDayKey(d).getTime();
const weekStart = (d: DayKey) => toDayKey(startOfWeek(fromDayKey(d), { weekStartsOn: 1 }));

function Card({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function Trends() {
  const settings = useSettings();
  const [range, setRangeState] = useState<Range>(() => {
    try {
      const v = localStorage.getItem(RANGE_KEY) as Range | null;
      return v && RANGES.some((r) => r.value === v) ? v : '1M';
    } catch {
      return '1M';
    }
  });
  const setRange = (r: Range) => {
    setRangeState(r);
    try { localStorage.setItem(RANGE_KEY, r); } catch { /* ignore */ }
  };

  const earliest = useEarliestDay();
  const spec = RANGES.find((r) => r.value === range)!;
  const today = todayKey();
  const from: DayKey = spec.days ? daysAgoKey(spec.days - 1) : earliest ?? today;
  const data = useRange(from);
  const { daily } = useWeights();
  const dayLevels = useDayLevels();
  const unit = settings.weightUnit;

  const view = useMemo(() => {
    if (!data || !daily) return null;
    const days = dayRange(from, today);
    const domain: [number, number] = [ts(from), ts(today)];
    const food = totalsByDay(data.foods);
    const water = waterByDay(data.water);
    const weightDays = new Set(data.weights.map((w) => w.day));

    // Weight series (rolling avg computed over full history, so the line starts warm)
    const wpts = daily.filter((d) => d.day >= from);
    const weightData = wpts.map((d) => ({ ts: ts(d.day), weight: weightToDisplay(d.lbs, unit), avg: d.avg != null ? weightToDisplay(d.avg, unit) : undefined }));

    // Calories — daily for ≤ 3 months, weekly averages beyond that
    const weekly = days.length > 92;
    const foodDays = days.filter((d) => food.has(d));
    let calData: { ts: number; calories: number; label: string }[];
    if (!weekly) {
      calData = foodDays.map((d) => ({ ts: ts(d), calories: Math.round(food.get(d)!.calories), label: format(fromDayKey(d), 'EEE, MMM d') }));
    } else {
      const byWeek = new Map<DayKey, number[]>();
      for (const d of foodDays) {
        const w = weekStart(d);
        byWeek.set(w, [...(byWeek.get(w) ?? []), food.get(d)!.calories]);
      }
      calData = [...byWeek.entries()].map(([w, xs]) => ({ ts: ts(w), calories: Math.round(mean(xs)), label: weekLabel(ts(w)) }));
    }

    // Averages over logged days
    const ft = foodDays.map((d) => food.get(d)!);
    const waterDays = days.filter((d) => water.has(d));
    const averages = {
      calories: mean(ft.map((t) => t.calories)),
      protein: mean(ft.map((t) => t.protein)),
      carbs: mean(ft.map((t) => t.carbs)),
      fat: mean(ft.map((t) => t.fat)),
      water: mean(waterDays.map((d) => water.get(d)!)),
      foodDays: foodDays.length,
    };

    // Weekly summaries (newest first)
    const weeks = new Map<DayKey, DayKey[]>();
    for (const d of days) weeks.set(weekStart(d), [...(weeks.get(weekStart(d)) ?? []), d]);
    const weekCards = [...weeks.entries()]
      .map(([w, ds]) => {
        const wts = wpts.filter((p) => ds.includes(p.day)).map((p) => p.lbs);
        const cals = ds.filter((d) => food.has(d)).map((d) => food.get(d)!.calories);
        const wat = ds.filter((d) => water.has(d)).map((d) => water.get(d)!);
        const logged = ds.filter((d) => food.has(d) || water.has(d) || weightDays.has(d)).length;
        return { week: w, weight: wts.length ? mean(wts) : null, calories: cals.length ? mean(cals) : null, water: wat.length ? mean(wat) : null, logged, total: ds.length };
      })
      .reverse();

    // Heatmap always shows at least 12 weeks so short ranges still read as a pattern
    const heatFrom = days.length < 84 ? daysAgoKey(83) : from;

    // Correlation: daily weight trend vs 7-day avg calories
    const avgByDay = new Map(daily.map((d) => [d.day, d.avg]));
    const corrData = days.map((d) => {
      const win = dayRange(shiftDay(d, -6), d).filter((x) => food.has(x));
      const w = avgByDay.get(d);
      return {
        ts: ts(d),
        weight: w != null ? weightToDisplay(w, unit) : undefined,
        calories: win.length >= 3 ? Math.round(mean(win.map((x) => food.get(x)!.calories))) : undefined,
      };
    });
    // Weekly: avg calories in week N vs change in trend weight across week N.
    const pairs: { cal: number; dW: number }[] = [];
    for (const wc of [...weekCards].reverse()) {
      const endDay = shiftDay(wc.week, 6) > today ? today : shiftDay(wc.week, 6);
      const startAvg = daily.filter((p) => p.day <= shiftDay(wc.week, -1)).at(-1);
      const endAvg = daily.filter((p) => p.day <= endDay).at(-1);
      if (wc.calories != null && startAvg?.avg != null && endAvg?.avg != null && endAvg.day >= wc.week && startAvg.day >= shiftDay(wc.week, -7)) {
        pairs.push({ cal: wc.calories, dW: endAvg.avg - startAvg.avg });
      }
    }
    const r = pearson(pairs.map((p) => p.cal), pairs.map((p) => p.dW));
    const fit = pairs.length >= 3 ? pairs : [];
    const lowCal = fit.filter((p) => p.cal < settings.calorieTarget);
    const highCal = fit.filter((p) => p.cal >= settings.calorieTarget);

    const weightChange = wpts.length > 1 ? (wpts.at(-1)!.avg ?? wpts.at(-1)!.lbs) - (wpts[0].avg ?? wpts[0].lbs) : null;

    return {
      domain, weightData, weightChange, calData, weekly, averages, weekCards, heatFrom, corrData,
      correlation: { r, weeks: pairs.length, lowCal: lowCal.length ? mean(lowCal.map((p) => p.dW)) : null, highCal: highCal.length ? mean(highCal.map((p) => p.dW)) : null },
    };
  }, [data, daily, from, today, unit, settings.calorieTarget]);

  const goal = settings.goalWeightLbs != null ? weightToDisplay(settings.goalWeightLbs, unit) : undefined;
  const hasAny = view && (view.weightData.length || view.calData.length || view.averages.water);
  const corrText = (r: number) =>
    Math.abs(r) < 0.2 ? 'Weak relationship' : r > 0 ? (r > 0.5 ? 'Strong: more calories → weight up' : 'Moderate: more calories → weight up') : 'Unusual: more calories → weight down';

  return (
    <>
      <PageHeader title="Trends" subtitle="Insights" />
      <div className="mb-5">
        <Segmented options={RANGES} value={range} onChange={setRange} size="sm" />
      </div>

      {!view ? (
        <div className="h-[60vh]" />
      ) : !hasAny ? (
        <div className="card">
          <EmptyState icon="chart" title="No data in this range" body="Log weight, food or water for a few days and your trends will appear here. You can also load sample data in Settings." />
        </div>
      ) : (
        <div key={range} className="stagger space-y-4">
          <Card
            title="Weight"
            subtitle="Daily weigh-ins · 7-day rolling average"
            right={
              view.weightChange != null && (
                <span className={`num rounded-full px-2.5 py-1 text-xs font-semibold ${view.weightChange <= 0 ? 'bg-fat/15 text-fat' : 'bg-food/15 text-food'}`}>
                  {formatWeightDelta(view.weightChange, unit)}
                </span>
              )
            }
          >
            {view.weightData.length ? (
              <WeightChart data={view.weightData} unit={unit} goal={goal} domain={view.domain} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">No weigh-ins in this range.</p>
            )}
          </Card>

          <Card title="Calories" subtitle={view.weekly ? 'Weekly average per logged day' : 'Per day vs target'}>
            {view.calData.length ? (
              <CaloriesChart data={view.calData} target={settings.calorieTarget} weekly={view.weekly} domain={view.domain} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">No food logged in this range.</p>
            )}
          </Card>

          <section>
            <h2 className="mb-2 px-1 font-semibold">Daily averages</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calories', value: fmtInt(view.averages.calories), unit: 'cal', color: 'text-food', target: settings.calorieTarget },
                { label: 'Protein', value: fmtInt(view.averages.protein), unit: 'g', color: 'text-protein', target: settings.proteinTarget },
                { label: 'Carbs', value: fmtInt(view.averages.carbs), unit: 'g', color: 'text-carbs', target: settings.carbsTarget },
                { label: 'Fat', value: fmtInt(view.averages.fat), unit: 'g', color: 'text-fat', target: settings.fatTarget },
              ].map((s) => (
                <div key={s.label} className="card !p-3.5">
                  <p className={`label ${s.color}`}>{s.label}</p>
                  <p className="num mt-1 font-display text-2xl font-bold">{s.value}<span className="ml-0.5 text-sm font-medium text-muted">{s.unit}</span></p>
                  <p className="num text-[11px] text-muted">target {fmtInt(s.target)}{s.unit === 'g' ? 'g' : ''}</p>
                </div>
              ))}
              <div className="card col-span-2 flex items-center justify-between !p-3.5">
                <div>
                  <p className="label text-water">Water</p>
                  <p className="num mt-1 font-display text-2xl font-bold">{formatWater(view.averages.water, settings.waterUnit)}</p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold">{Math.round((view.averages.water / settings.waterTargetOz) * 100) || 0}%</p>
                  <p className="text-[11px] text-muted">of daily goal</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-1 font-semibold">Weekly summary</h2>
            <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {view.weekCards.map((w) => (
                <div key={w.week} className="card w-44 shrink-0 snap-start !p-3.5">
                  <p className="text-xs font-semibold">{format(fromDayKey(w.week), 'MMM d')} – {format(fromDayKey(shiftDay(w.week, 6)), 'MMM d')}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">Weight</dt><dd className="num font-semibold text-weight">{w.weight != null ? weightToDisplay(w.weight, unit).toFixed(1) : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Calories</dt><dd className="num font-semibold text-food">{w.calories != null ? fmtInt(w.calories) : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Water</dt><dd className="num font-semibold text-water">{w.water != null ? formatWater(w.water, settings.waterUnit) : '—'}</dd></div>
                  </dl>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: 7 }, (_, i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i < w.logged ? 'bg-fat' : 'bg-line/10'}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">{w.logged}/{w.total} days logged</p>
                </div>
              ))}
            </div>
          </section>

          <Card title="Consistency" subtitle="Weight, food and water logged per day">
            <Heatmap from={view.heatFrom} levels={dayLevels ?? new Map()} />
          </Card>

          <Card title="Weight vs calories" subtitle="Weight trend overlaid on 7-day average intake">
            <CorrelationChart data={view.corrData} unit={unit} domain={view.domain} />
            <div className="mt-3 rounded-2xl bg-elevated p-3 text-sm">
              {view.correlation.r == null ? (
                <p className="text-muted">Need at least 3 weeks of food and weight data to measure the relationship.</p>
              ) : (
                <>
                  <p className="font-semibold">{corrText(view.correlation.r)} <span className="num font-normal text-muted">(r = {view.correlation.r.toFixed(2)}, {view.correlation.weeks} weeks)</span></p>
                  <p className="mt-1 text-xs text-muted">
                    {view.correlation.lowCal != null && <>Weeks under {fmtInt(settings.calorieTarget)} cal: <span className="num font-semibold text-ink">{formatWeightDelta(view.correlation.lowCal, unit)}/wk</span>. </>}
                    {view.correlation.highCal != null && <>Weeks at or over: <span className="num font-semibold text-ink">{formatWeightDelta(view.correlation.highCal, unit)}/wk</span>.</>}
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
