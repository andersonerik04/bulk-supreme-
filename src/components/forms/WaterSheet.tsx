import { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { Field } from '../Field';
import { useToast } from '../Toast';
import { useSettings } from '@/hooks/useSettings';
import { addWater, deleteWater, updateWater } from '@/db/repo';
import type { WaterEntry } from '@/db/types';
import { fromDateTimeInput, toDateTimeInput } from '@/utils/date';
import { waterFromDisplay, waterToDisplay } from '@/utils/units';
import { hasErrors, numberRule, parseNum, validate } from '@/utils/validation';

interface Props {
  open: boolean;
  onClose: () => void;
  entry?: WaterEntry;
  defaultTimestamp?: number;
}

export function WaterSheet({ open, onClose, entry, defaultTimestamp }: Props) {
  const { waterUnit: unit } = useSettings();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [when, setWhen] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAmount(entry ? String(waterToDisplay(entry.oz, unit)) : '');
    setWhen(toDateTimeInput(entry?.timestamp ?? defaultTimestamp ?? Date.now()));
    setErrors({});
  }, [open]); // reset only when the sheet opens, not on every live-query refresh

  async function save() {
    const e = validate({ amount, when }, {
      amount: numberRule({ label: 'Amount', required: true, min: unit === 'ml' ? 10 : 0.5, max: unit === 'ml' ? 5000 : 170 }),
      when: (x) => (x && !Number.isNaN(fromDateTimeInput(x)) ? null : 'Pick a valid date and time'),
    });
    setErrors(e as Record<string, string>);
    if (hasErrors(e)) return;
    const oz = waterFromDisplay(parseNum(amount)!, unit);
    const ts = fromDateTimeInput(when);
    if (entry?.id != null) {
      await updateWater(entry.id, { oz, timestamp: ts });
      toast({ message: 'Water updated' });
    } else {
      const id = await addWater(oz, ts);
      toast({ message: `Added ${amount} ${unit}`, action: { label: 'Undo', onClick: () => deleteWater(id as number) } });
    }
    navigator.vibrate?.(10);
    onClose();
  }

  async function remove() {
    if (entry?.id == null) return;
    await deleteWater(entry.id);
    toast({ message: 'Water entry deleted', action: { label: 'Undo', onClick: () => addWater(entry.oz, entry.timestamp) } });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit water' : 'Custom amount'}>
      <div className="space-y-4">
        <Field label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} suffix={unit} error={errors.amount} autoFocus={!entry} placeholder="0" />
        <Field label="Date & time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={errors.when} />
      </div>
      <div className="mt-6 flex gap-3">
        {entry && <button className="btn-danger" onClick={remove}>Delete</button>}
        <button className="btn flex-1 bg-water text-white" onClick={save}>{entry ? 'Save changes' : 'Add water'}</button>
      </div>
    </Sheet>
  );
}
