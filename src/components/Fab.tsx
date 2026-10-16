import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { WeightSheet } from './forms/WeightSheet';
import { WaterSheet } from './forms/WaterSheet';
import { useSettings } from '@/hooks/useSettings';
import { useWeights } from '@/hooks/useData';
import { addWater, deleteWater } from '@/db/repo';
import { waterQuickSizes } from '@/utils/units';
import { mealForTime } from '@/utils/date';
import { MEAL_LABELS } from '@/db/types';

/** Floating "+" — every log type reachable in one or two taps. */
export function Fab() {
  const [open, setOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const { waterUnit } = useSettings();
  const { weights } = useWeights();
  const navigate = useNavigate();
  const toast = useToast();
  const lastLbs = weights?.[weights.length - 1]?.lbs;
  const meal = mealForTime();

  async function quickWater(oz: number, label: string) {
    const id = await addWater(oz);
    navigator.vibrate?.(10);
    setOpen(false);
    toast({ message: `Added ${label} water`, action: { label: 'Undo', onClick: () => deleteWater(id as number) } });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick log"
        className="tap fixed right-5 z-40 grid h-16 w-16 place-items-center rounded-full bg-ink text-bg shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] transition-transform active:scale-90"
        style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        <Icon name="plus" size={30} strokeWidth={2.4} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Quick log">
        <div className="grid grid-cols-2 gap-3">
          <button className="tap flex flex-col items-start gap-6 rounded-3xl bg-weight/15 p-4 text-left" onClick={() => { setOpen(false); setWeightOpen(true); }}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-weight text-white"><Icon name="scale" /></span>
            <span><span className="block font-semibold">Weight</span><span className="text-xs text-muted">Log a weigh-in</span></span>
          </button>
          <button className="tap flex flex-col items-start gap-6 rounded-3xl bg-food/15 p-4 text-left" onClick={() => { setOpen(false); navigate(`/log?tab=food&meal=${meal}`); }}>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-food text-white"><Icon name="food" /></span>
            <span><span className="block font-semibold">Food</span><span className="text-xs text-muted">Add to {MEAL_LABELS[meal]}</span></span>
          </button>
        </div>
        <div className="mt-3 rounded-3xl bg-water/15 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-water text-white"><Icon name="drop" /></span>
            <span><span className="block font-semibold">Water</span><span className="text-xs text-muted">One tap to log</span></span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {waterQuickSizes(waterUnit).map((s) => (
              <button key={s.label} className="tap rounded-2xl bg-surface py-3 text-sm font-semibold text-water" onClick={() => quickWater(s.oz, s.label)}>
                {s.label}
              </button>
            ))}
            <button className="tap rounded-2xl bg-surface py-3 text-sm font-semibold text-muted" onClick={() => { setOpen(false); setWaterOpen(true); }}>Custom</button>
          </div>
        </div>
      </Sheet>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} lastLbs={lastLbs} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} />
    </>
  );
}
