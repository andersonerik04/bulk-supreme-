import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { DayNav } from '@/components/DayNav';
import { FoodList } from '@/components/FoodList';
import { Icon } from '@/components/Icon';
import { MacroBars } from '@/components/MacroBar';
import { ProgressRing } from '@/components/ProgressRing';
import { FoodSheet } from '@/components/forms/FoodSheet';
import { WaterSheet } from '@/components/forms/WaterSheet';
import { WeightSheet } from '@/components/forms/WeightSheet';
import { useDay, useWeights } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import type { FoodEntry, MealType, WaterEntry, WeightEntry } from '@/db/types';
import { friendlyDay, fromDayKey, timeLabel, timestampOnDay, todayKey } from '@/utils/date';
import { fmtInt } from '@/utils/format';
import { formatWater, formatWeight } from '@/utils/units';

export default function DayDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : todayKey();
  const settings = useSettings();
  const data = useDay(day);
  const { weights } = useWeights();
  const [food, setFood] = useState<{ entry?: FoodEntry; meal?: MealType } | null>(null);
  const [water, setWater] = useState<{ entry?: WaterEntry } | null>(null);
  const [weight, setWeight] = useState<{ entry?: WeightEntry } | null>(null);
  // Back-dated entries default to noon (or now for today) on the viewed day.
  const defaultTs = day === todayKey() ? Date.now() : timestampOnDay(day, new Date(2000, 0, 1, 12));

  const t = data?.totals;
  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <button className="tap -ml-2 grid h-10 w-10 place-items-center rounded-full text-muted" onClick={() => navigate('/history')} aria-label="Back to history">
          <Icon name="left" />
        </button>
        <div>
          <p className="label">{format(fromDayKey(day), 'EEEE, MMMM d, yyyy')}</p>
          <h1 className="font-display text-[28px] font-bold leading-none tracking-tight">{friendlyDay(day)}</h1>
        </div>
      </header>
      <div className="mb-4">
        <DayNav day={day} onChange={(d) => navigate(`/history/${d}`, { replace: true })} />
      </div>

      {data && t && (
        <div className="stagger space-y-4">
          <section className="card flex items-center gap-4">
            <ProgressRing value={t.calories / settings.calorieTarget} size={96} stroke={11} color="rgb(var(--food))">
              <div className="text-center">
                <p className="num text-base font-bold leading-none">{fmtInt(t.calories)}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted">cal</p>
              </div>
            </ProgressRing>
            <div className="flex-1">
              <MacroBars totals={t} settings={settings} compact />
            </div>
          </section>

          {/* Weight */}
          <section className="card !p-0">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h3 className="font-semibold text-weight">Weight</h3>
              <button className="tap grid h-8 w-8 place-items-center rounded-full bg-weight/15 text-weight" onClick={() => setWeight({})} aria-label="Add weigh-in">
                <Icon name="plus" size={16} strokeWidth={2.4} />
              </button>
            </div>
            {data.weights.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-muted/80">No weigh-in</p>
            ) : (
              <ul className="divide-y divide-line/[0.06]">
                {data.weights.map((w) => (
                  <li key={w.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-elevated" onClick={() => setWeight({ entry: w })}>
                      <div className="flex-1">
                        <p className="text-sm text-muted">{timeLabel(w.timestamp)}</p>
                        {w.note && <p className="text-xs text-muted/80">{w.note}</p>}
                      </div>
                      <span className="num font-semibold">{formatWeight(w.lbs, settings.weightUnit)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Food */}
          <FoodList foods={data.foods} onEdit={(e) => setFood({ entry: e })} onAdd={(m) => setFood({ meal: m })} />

          {/* Water */}
          <section className="card !p-0">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h3 className="font-semibold text-water">Water <span className="num ml-1 text-sm font-normal text-muted">{formatWater(data.waterOz, settings.waterUnit)} / {formatWater(settings.waterTargetOz, settings.waterUnit)}</span></h3>
              <button className="tap grid h-8 w-8 place-items-center rounded-full bg-water/15 text-water" onClick={() => setWater({})} aria-label="Add water">
                <Icon name="plus" size={16} strokeWidth={2.4} />
              </button>
            </div>
            {data.water.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-muted/80">No water logged</p>
            ) : (
              <ul className="divide-y divide-line/[0.06]">
                {data.water.map((w) => (
                  <li key={w.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-elevated" onClick={() => setWater({ entry: w })}>
                      <Icon name="drop" size={16} className="text-water" />
                      <span className="flex-1 text-sm text-muted">{timeLabel(w.timestamp)}</span>
                      <span className="num font-semibold">{formatWater(w.oz, settings.waterUnit)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <FoodSheet open={!!food} onClose={() => setFood(null)} entry={food?.entry} meal={food?.meal} defaultTimestamp={defaultTs} />
      <WaterSheet open={!!water} onClose={() => setWater(null)} entry={water?.entry} defaultTimestamp={defaultTs} />
      <WeightSheet open={!!weight} onClose={() => setWeight(null)} entry={weight?.entry} defaultTimestamp={defaultTs} lastLbs={weights?.at(-1)?.lbs} />
    </>
  );
}
