import { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { MacroDonut } from '@/components/MacroDonut';
import { MacroBars } from '@/components/MacroBar';
import { WeightSummary } from '@/components/WeightSummary';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { WeightSheet } from '@/components/forms/WeightSheet';
import { useDay, useStreak, useWeights } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { addWater, deleteWater } from '@/db/repo';
import { todayKey } from '@/utils/date';
import { fmtInt, plural } from '@/utils/format';
import { formatWater, waterQuickSizes } from '@/utils/units';
import { seedSampleData } from '@/utils/seed';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const settings = useSettings();
  const today = useDay(todayKey());
  const { weights, daily } = useWeights();
  const streak = useStreak();
  const toast = useToast();
  const [weightOpen, setWeightOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  if (!today || !weights || !streak) return <div className="h-[60vh]" />;

  const t = today.totals;
  const calP = settings.calorieTarget ? t.calories / settings.calorieTarget : 0;
  const waterP = settings.waterTargetOz ? today.waterOz / settings.waterTargetOz : 0;
  const remaining = settings.calorieTarget - t.calories;
  const brandNew = weights.length === 0 && streak.count === 0 && !today.foods.length && !today.water.length;

  async function quickWater(oz: number, label: string) {
    const id = await addWater(oz);
    navigator.vibrate?.(10);
    toast({ message: `Added ${label}`, action: { label: 'Undo', onClick: () => deleteWater(id as number) } });
  }

  async function loadSample() {
    setSeeding(true);
    await seedSampleData();
    setSeeding(false);
    toast({ message: 'Loaded 60 days of sample data' });
  }

  return (
    <>
      <PageHeader
        title={greeting()}
        subtitle={format(new Date(), 'EEEE, MMMM d')}
        right={
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${streak.count ? 'bg-food/15 text-food' : 'bg-elevated text-muted'}`} title="Consecutive days logged">
            <Icon name="flame" size={18} filled={streak.count > 0} strokeWidth={1.5} />
            <span className="num">{streak.count}</span>
            <span className="text-xs font-medium opacity-80">day{streak.count === 1 ? '' : 's'}</span>
          </div>
        }
      />

      <div className="stagger space-y-4">
        {brandNew && (
          <section className="card overflow-hidden bg-gradient-to-br from-weight/25 via-surface to-water/20">
            <p className="label mb-2 text-weight">Welcome to Ledger</p>
            <h2 className="font-display text-2xl font-bold leading-tight">Your health, logged beautifully.</h2>
            <p className="mt-2 text-sm text-muted">Track weight, food and water — everything stays private on this device and works offline.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn bg-weight text-white" onClick={() => setWeightOpen(true)}>First weigh-in</button>
              <button className="btn-ghost" onClick={loadSample} disabled={seeding}>{seeding ? 'Loading…' : 'Try sample data'}</button>
            </div>
          </section>
        )}

        {/* Hero rings */}
        <section className="card">
          <div className="flex items-center gap-5">
            <div className="relative">
              <ProgressRing value={calP} size={148} stroke={16} color="rgb(var(--food))" label={`Calories ${Math.round(calP * 100)}% of target`}>
                <span />
              </ProgressRing>
              <div className="absolute inset-[22px]">
                <ProgressRing value={waterP} size={104} stroke={14} color="rgb(var(--water))" label={`Water ${Math.round(waterP * 100)}% of goal`}>
                  <div className="text-center">
                    <p className="num font-display text-xl font-bold leading-none">{fmtInt(t.calories)}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">cal</p>
                  </div>
                </ProgressRing>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="label flex items-center gap-1.5 text-food"><span className="h-2 w-2 rounded-full bg-food" />Calories</p>
                <p className="num mt-1 text-xl font-bold">{fmtInt(t.calories)}<span className="text-sm font-medium text-muted"> / {fmtInt(settings.calorieTarget)}</span></p>
                <p className={`text-xs ${remaining >= 0 ? 'text-muted' : 'text-danger'}`}>{remaining >= 0 ? `${fmtInt(remaining)} remaining` : `${fmtInt(-remaining)} over target`}</p>
              </div>
              <div>
                <p className="label flex items-center gap-1.5 text-water"><span className="h-2 w-2 rounded-full bg-water" />Water</p>
                <p className="num mt-1 text-xl font-bold">{formatWater(today.waterOz, settings.waterUnit, false)}<span className="text-sm font-medium text-muted"> / {formatWater(settings.waterTargetOz, settings.waterUnit)}</span></p>
                <p className="text-xs text-muted">{Math.round(waterP * 100)}% of goal</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {waterQuickSizes(settings.waterUnit).map((q) => (
              <button key={q.label} className="tap flex items-center justify-center gap-1 rounded-2xl bg-water/10 py-2.5 text-sm font-semibold text-water" onClick={() => quickWater(q.oz, q.label)}>
                <Icon name="drop" size={14} /> +{q.label}
              </button>
            ))}
          </div>
        </section>

        {/* Macros */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <p className="label">Macros today</p>
            <Link to="/log?tab=food" className="text-sm font-medium text-food">Log food</Link>
          </div>
          {t.calories > 0 ? (
            <>
              <MacroDonut totals={t} />
              <div className="mt-5 border-t border-line/[0.06] pt-4">
                <MacroBars totals={t} settings={settings} compact />
              </div>
            </>
          ) : (
            <EmptyState icon="food" tone="text-food" title="No food logged today" body="Add breakfast to see your macro split." action={<Link to="/log?tab=food" className="btn bg-food text-white">Log a meal</Link>} />
          )}
        </section>

        {/* Weight */}
        {daily && daily.length > 0 ? (
          <WeightSummary daily={daily} settings={settings} onLog={() => setWeightOpen(true)} />
        ) : (
          <section className="card">
            <EmptyState icon="scale" tone="text-weight" title="No weigh-ins yet" body="Log your weight to see your trend, rolling average and goal projection." action={<button className="btn bg-weight text-white" onClick={() => setWeightOpen(true)}>Log weight</button>} />
          </section>
        )}

        {streak.count > 0 && !streak.loggedToday && (
          <p className="px-2 text-center text-sm text-muted">Log something today to keep your {plural(streak.count, 'day')} streak alive 🔥</p>
        )}
      </div>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} lastLbs={weights[weights.length - 1]?.lbs} />
    </>
  );
}
