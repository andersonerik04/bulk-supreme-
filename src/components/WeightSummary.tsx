import { format } from 'date-fns';
import type { Settings } from '@/db/types';
import { changeOver, projectGoal, type DailyWeight } from '@/utils/stats';
import { formatWeight, formatWeightDelta, weightToDisplay } from '@/utils/units';
import { clamp } from '@/utils/format';
import { Icon } from './Icon';
import { Sparkline } from './Sparkline';
import { usePalette } from '@/hooks/usePalette';

function Delta({ label, value, unit }: { label: string; value: number | null; unit: Settings['weightUnit'] }) {
  return (
    <div className="rounded-2xl bg-elevated px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={`num mt-0.5 font-semibold ${value == null ? 'text-muted' : value < 0 ? 'text-fat' : value > 0 ? 'text-food' : ''}`}>
        {value == null ? '—' : formatWeightDelta(value, unit)}
      </p>
    </div>
  );
}

export function WeightSummary({ daily, settings, onLog }: { daily: DailyWeight[]; settings: Settings; onLog: () => void }) {
  const unit = settings.weightUnit;
  const c = usePalette();
  const last = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  const sinceLast = last && prev ? last.lbs - prev.lbs : null;
  const spark = daily.slice(-30).map((d) => ({ day: d.day, v: weightToDisplay(d.avg ?? d.lbs, unit) }));
  const goal = settings.goalWeightLbs;
  const proj = projectGoal(daily, goal);
  const start = settings.goalStartLbs ?? daily[0]?.lbs;
  const progress = goal != null && start != null && last && start !== goal ? clamp((start - last.lbs) / (start - goal)) : null;

  return (
    <section className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="label text-weight">Weight</p>
          <p className="num mt-1 font-display text-4xl font-bold tracking-tight">
            {weightToDisplay(last.lbs, unit).toFixed(1)}
            <span className="ml-1 text-base font-semibold text-muted">{unit}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {format(new Date(last.day + 'T00:00'), 'MMM d')}
            {last.avg != null && ` · 7-day avg ${formatWeight(last.avg, unit)}`}
          </p>
        </div>
        <button className="tap grid h-10 w-10 place-items-center rounded-full bg-weight/15 text-weight" onClick={onLog} aria-label="Log weight">
          <Icon name="plus" size={20} strokeWidth={2.4} />
        </button>
      </div>

      {spark.length > 1 && (
        <div className="-mx-1 mt-2 h-16">
          <Sparkline values={spark.map((p) => p.v)} color={c.weight} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Delta label="Since last" value={sinceLast} unit={unit} />
        <Delta label="7 days" value={changeOver(daily, 7)} unit={unit} />
        <Delta label="30 days" value={changeOver(daily, 30)} unit={unit} />
      </div>

      {goal != null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-medium text-muted">
              Goal <span className="num font-semibold text-ink">{formatWeight(goal, unit)}</span>
            </span>
            <span className="num font-semibold text-weight">{progress != null ? `${Math.round(progress * 100)}%` : ''}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-weight/15">
            <div className="h-full rounded-full bg-gradient-to-r from-weight/70 to-weight transition-[width] duration-1000 ease-out" style={{ width: `${(progress ?? 0) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {proj?.daysToGoal === 0
              ? 'You’re at your goal 🎉'
              : proj?.eta
                ? <>At {formatWeightDelta(proj.ratePerWeek, unit)}/week, projected <span className="font-semibold text-ink">{format(proj.eta, 'MMM d, yyyy')}</span></>
                : proj
                  ? `Current trend ${formatWeightDelta(proj.ratePerWeek, unit)}/week — not yet heading toward goal`
                  : 'Log a few more weigh-ins to project your goal date'}
          </p>
        </div>
      )}
    </section>
  );
}
