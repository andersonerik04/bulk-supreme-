import { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { Field } from '../Field';
import { useToast } from '../Toast';
import { useSettings } from '@/hooks/useSettings';
import { addWeight, deleteWeight, updateWeight } from '@/db/repo';
import type { WeightEntry } from '@/db/types';
import { fromDateTimeInput, toDateTimeInput } from '@/utils/date';
import { weightFromDisplay, weightToDisplay } from '@/utils/units';
import { hasErrors, numberRule, parseNum, textRule, validate } from '@/utils/validation';

const NOTE_CHIPS = ['Morning, fasted', 'Post-workout', 'Evening', 'After meal'];

interface Props {
  open: boolean;
  onClose: () => void;
  entry?: WeightEntry; // edit mode when present
  lastLbs?: number; // prefill for new entries
  defaultTimestamp?: number;
}

export function WeightSheet({ open, onClose, entry, lastLbs, defaultTimestamp }: Props) {
  const { weightUnit: unit } = useSettings();
  const toast = useToast();
  const [weight, setWeight] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const base = entry?.lbs ?? lastLbs;
    setWeight(base != null ? String(weightToDisplay(base, unit)) : '');
    setWhen(toDateTimeInput(entry?.timestamp ?? defaultTimestamp ?? Date.now()));
    setNote(entry?.note ?? '');
    setErrors({});
  }, [open, entry, lastLbs, unit, defaultTimestamp]);

  const [min, max] = unit === 'kg' ? [20, 320] : [45, 700];

  const bump = (d: number) => {
    const n = parseNum(weight);
    const v = n == null || Number.isNaN(n) ? 0 : n;
    setWeight(String(Math.round((v + d) * 10) / 10));
  };

  async function save() {
    const e = validate(
      { weight, when, note },
      {
        weight: numberRule({ label: 'Weight', min, max, required: true }),
        when: (v) => (v && !Number.isNaN(fromDateTimeInput(v)) ? null : 'Pick a valid date and time'),
        note: textRule({ label: 'Note', max: 120 }),
      },
    );
    setErrors(e as Record<string, string>);
    if (hasErrors(e)) return;
    const lbs = weightFromDisplay(parseNum(weight)!, unit);
    const ts = fromDateTimeInput(when);
    if (entry?.id != null) {
      await updateWeight(entry.id, { lbs, timestamp: ts, note });
      toast({ message: 'Weigh-in updated' });
    } else {
      const id = await addWeight(lbs, ts, note);
      toast({ message: `Logged ${weight} ${unit}`, action: { label: 'Undo', onClick: () => deleteWeight(id as number) } });
    }
    navigator.vibrate?.(10);
    onClose();
  }

  async function remove() {
    if (entry?.id == null) return;
    const copy = { ...entry };
    await deleteWeight(entry.id);
    toast({ message: 'Weigh-in deleted', action: { label: 'Undo', onClick: () => addWeight(copy.lbs, copy.timestamp, copy.note) } });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit weigh-in' : 'Log weight'}>
      <div className="mb-5 flex items-center justify-center gap-4">
        <button className="tap grid h-12 w-12 place-items-center rounded-full bg-elevated text-2xl font-light" onClick={() => bump(-0.1)} aria-label="Decrease">−</button>
        <div className="text-center">
          <input
            inputMode="decimal"
            className={`num w-40 bg-transparent text-center font-display text-6xl font-bold tracking-tight text-weight outline-none ${errors.weight ? 'text-danger' : ''}`}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            aria-label={`Weight in ${unit}`}
            autoFocus={!entry}
          />
          <p className="label mt-1">{unit}</p>
        </div>
        <button className="tap grid h-12 w-12 place-items-center rounded-full bg-elevated text-2xl font-light" onClick={() => bump(0.1)} aria-label="Increase">+</button>
      </div>
      {errors.weight && <p className="-mt-2 mb-4 text-center text-xs font-medium text-danger">{errors.weight}</p>}

      <div className="space-y-4">
        <Field label="Date & time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={errors.when} />
        <div>
          <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. morning, fasted" maxLength={120} error={errors.note} />
          <div className="scrollbar-none -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
            {NOTE_CHIPS.map((c) => (
              <button key={c} onClick={() => setNote(c)} className={`tap shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${note === c ? 'bg-weight text-white' : 'bg-elevated text-muted'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {entry && (
          <button className="btn-danger" onClick={remove} aria-label="Delete">Delete</button>
        )}
        <button className="btn flex-1 bg-weight text-white" onClick={save}>
          {entry ? 'Save changes' : 'Log weight'}
        </button>
      </div>
    </Sheet>
  );
}
