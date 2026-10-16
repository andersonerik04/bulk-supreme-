import type { DayKey } from '@/db/types';
import { friendlyDay, shiftDay, todayKey } from '@/utils/date';
import { Icon } from './Icon';

export function DayNav({ day, onChange }: { day: DayKey; onChange: (d: DayKey) => void }) {
  const isToday = day >= todayKey();
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface p-1">
      <button className="tap grid h-10 w-10 place-items-center rounded-xl text-muted" onClick={() => onChange(shiftDay(day, -1))} aria-label="Previous day">
        <Icon name="left" />
      </button>
      <label className="relative font-semibold">
        {friendlyDay(day)}
        <input
          type="date"
          className="absolute inset-0 opacity-0"
          value={day}
          max={todayKey()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pick a date"
        />
      </label>
      <button className="tap grid h-10 w-10 place-items-center rounded-xl text-muted disabled:opacity-30" disabled={isToday} onClick={() => onChange(shiftDay(day, 1))} aria-label="Next day">
        <Icon name="right" />
      </button>
    </div>
  );
}
