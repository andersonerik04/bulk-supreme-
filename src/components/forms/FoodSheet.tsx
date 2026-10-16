import { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { Field } from '../Field';
import { Segmented } from '../Segmented';
import { useToast } from '../Toast';
import { addFood, addPreset, deleteFood, updateFood } from '@/db/repo';
import { MEALS, MEAL_LABELS, type FoodEntry, type FoodItem, type MealType } from '@/db/types';
import { fromDateTimeInput, mealForTime, toDateTimeInput } from '@/utils/date';
import { foodRules, itemFromValues, type FoodValues } from './foodValidation';
import { hasErrors, validate } from '@/utils/validation';

interface Props {
  open: boolean;
  onClose: () => void;
  entry?: FoodEntry; // edit mode
  prefill?: FoodItem; // new entry pre-populated (e.g. from a recent food)
  meal?: MealType;
  defaultTimestamp?: number;
}

const blank: FoodValues = { name: '', serving: '1 serving', calories: '', protein: '', carbs: '', fat: '' };
const toValues = (i: FoodItem): FoodValues => ({
  name: i.name,
  serving: i.serving,
  calories: String(i.calories),
  protein: i.protein != null ? String(i.protein) : '',
  carbs: i.carbs != null ? String(i.carbs) : '',
  fat: i.fat != null ? String(i.fat) : '',
});

export function FoodSheet({ open, onClose, entry, prefill, meal, defaultTimestamp }: Props) {
  const toast = useToast();
  const [v, setV] = useState<FoodValues>(blank);
  const [m, setM] = useState<MealType>('breakfast');
  const [when, setWhen] = useState('');
  const [savePreset, setSavePreset] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FoodValues | 'when', string>>>({});

  useEffect(() => {
    if (!open) return;
    const src = entry ?? prefill;
    setV(src ? toValues(src) : blank);
    setM(entry?.meal ?? meal ?? mealForTime());
    setWhen(toDateTimeInput(entry?.timestamp ?? defaultTimestamp ?? Date.now()));
    setSavePreset(false);
    setErrors({});
  }, [open]); // reset only when the sheet opens, not on every live-query refresh

  const set = (k: keyof FoodValues) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    const e = validate({ ...v, when }, {
      ...foodRules,
      when: (x) => (x && !Number.isNaN(fromDateTimeInput(x)) ? null : 'Pick a valid date and time'),
    });
    setErrors(e);
    if (hasErrors(e)) return;
    const item = itemFromValues(v);
    const ts = fromDateTimeInput(when);
    if (entry?.id != null) {
      await updateFood(entry.id, { ...item, meal: m, timestamp: ts });
      toast({ message: 'Entry updated' });
    } else {
      const id = await addFood(item, m, ts);
      if (savePreset) await addPreset({ name: item.name, kind: 'food', items: [item], favorite: 1, defaultMeal: m });
      toast({ message: `Added ${item.name} · ${item.calories} cal`, action: { label: 'Undo', onClick: () => deleteFood(id as number) } });
    }
    navigator.vibrate?.(10);
    onClose();
  }

  async function remove() {
    if (entry?.id == null) return;
    const { id, ...copy } = entry;
    await deleteFood(id);
    toast({ message: 'Entry deleted', action: { label: 'Undo', onClick: () => addFood(copy, copy.meal, copy.timestamp, copy.presetId) } });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Edit food' : 'Add food'}>
      <div className="space-y-4">
        <Segmented options={MEALS.map((x) => ({ value: x, label: MEAL_LABELS[x] }))} value={m} onChange={setM} size="sm" />
        <Field label="Food" value={v.name} onChange={set('name')} placeholder="e.g. Greek yogurt" error={errors.name} autoFocus={!entry && !prefill} maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serving" value={v.serving} onChange={set('serving')} placeholder="1 cup" error={errors.serving} maxLength={40} />
          <Field label="Calories" inputMode="numeric" value={v.calories} onChange={set('calories')} placeholder="0" suffix="cal" error={errors.calories} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Protein" inputMode="decimal" value={v.protein} onChange={set('protein')} placeholder="—" suffix="g" error={errors.protein} />
          <Field label="Carbs" inputMode="decimal" value={v.carbs} onChange={set('carbs')} placeholder="—" suffix="g" error={errors.carbs} />
          <Field label="Fat" inputMode="decimal" value={v.fat} onChange={set('fat')} placeholder="—" suffix="g" error={errors.fat} />
        </div>
        <Field label="Date & time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={errors.when} />
        {!entry && (
          <label className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-3">
            <span className="text-sm font-medium">Save as custom food & favorite</span>
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--food))]" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} />
          </label>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        {entry && <button className="btn-danger" onClick={remove}>Delete</button>}
        <button className="btn flex-1 bg-food text-white" onClick={save}>{entry ? 'Save changes' : 'Add to ' + MEAL_LABELS[m]}</button>
      </div>
    </Sheet>
  );
}
