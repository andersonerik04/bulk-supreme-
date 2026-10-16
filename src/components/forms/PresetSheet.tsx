import { useEffect, useState } from 'react';
import { Sheet } from '../Sheet';
import { Field } from '../Field';
import { Icon } from '../Icon';
import { Segmented } from '../Segmented';
import { useToast } from '../Toast';
import { addPreset, deletePreset, updatePreset } from '@/db/repo';
import { useRecentFoods } from '@/hooks/useData';
import { MEALS, MEAL_LABELS, type FoodItem, type FoodPreset, type MealType } from '@/db/types';
import { foodRules, itemFromValues, type FoodValues } from './foodValidation';
import { hasErrors, textRule, validate } from '@/utils/validation';
import { sumFoods } from '@/utils/stats';

interface Props {
  open: boolean;
  onClose: () => void;
  preset?: FoodPreset;
}

const blankItem: FoodValues = { name: '', serving: '1 serving', calories: '', protein: '', carbs: '', fat: '' };

/** Create/edit a custom food or a multi-item meal preset. */
export function PresetSheet({ open, onClose, preset }: Props) {
  const toast = useToast();
  const recents = useRecentFoods(20);
  const [name, setName] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [meal, setMeal] = useState<MealType>('breakfast');
  const [favorite, setFavorite] = useState(true);
  const [draft, setDraft] = useState<FoodValues>(blankItem);
  const [draftErr, setDraftErr] = useState<Partial<Record<keyof FoodValues, string>>>({});
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(preset?.name ?? '');
    setItems(preset?.items ?? []);
    setMeal(preset?.defaultMeal ?? 'breakfast');
    setFavorite(preset ? !!preset.favorite : true);
    setDraft(blankItem);
    setDraftErr({});
    setErr(null);
    setAdding(!preset);
  }, [open]); // reset only when the sheet opens, not on every live-query refresh

  const totals = sumFoods(items);

  function addDraft() {
    const e = validate(draft, foodRules);
    setDraftErr(e);
    if (hasErrors(e)) return;
    setItems((xs) => [...xs, itemFromValues(draft)]);
    setDraft(blankItem);
    setAdding(false);
  }

  async function save() {
    const nameErr = textRule({ label: 'Name', required: true, max: 60 })(name);
    if (nameErr) return setErr(nameErr);
    if (!items.length) return setErr('Add at least one item');
    const data = { name, items, defaultMeal: meal, favorite: (favorite ? 1 : 0) as 0 | 1, kind: (items.length > 1 ? 'meal' : 'food') as FoodPreset['kind'] };
    if (preset?.id != null) await updatePreset(preset.id, data);
    else await addPreset(data);
    toast({ message: preset ? 'Preset updated' : `Saved “${name.trim()}”` });
    onClose();
  }

  async function remove() {
    if (preset?.id == null) return;
    const { id, ...copy } = preset;
    await deletePreset(id);
    toast({ message: 'Preset deleted', action: { label: 'Undo', onClick: () => addPreset(copy) } });
    onClose();
  }

  const setD = (k: keyof FoodValues) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Sheet open={open} onClose={onClose} title={preset ? 'Edit preset' : 'New preset'}>
      <div className="space-y-4">
        <Field label="Preset name" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="e.g. Usual breakfast" maxLength={60} />
        <div>
          <span className="label mb-1.5 block">Usually eaten at</span>
          <Segmented options={MEALS.map((x) => ({ value: x, label: MEAL_LABELS[x] }))} value={meal} onChange={setMeal} size="sm" />
        </div>

        <div className="rounded-2xl bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="label">Items</span>
            <span className="num text-xs text-muted">{totals.calories} cal · P {Math.round(totals.protein)} · C {Math.round(totals.carbs)} · F {Math.round(totals.fat)}</span>
          </div>
          {items.length === 0 && <p className="px-1 py-2 text-sm text-muted">No items yet.</p>}
          <ul className="divide-y divide-line/[0.06]">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 px-1 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted">{it.serving} · {it.calories} cal</p>
                </div>
                <button className="tap grid h-9 w-9 place-items-center rounded-full text-muted" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove ${it.name}`}>
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>

          {adding ? (
            <div className="mt-2 space-y-3 rounded-xl bg-surface p-3">
              <Field label="Food" value={draft.name} onChange={setD('name')} error={draftErr.name} maxLength={80} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Serving" value={draft.serving} onChange={setD('serving')} error={draftErr.serving} />
                <Field label="Calories" inputMode="numeric" value={draft.calories} onChange={setD('calories')} error={draftErr.calories} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Protein g" inputMode="decimal" value={draft.protein} onChange={setD('protein')} error={draftErr.protein} />
                <Field label="Carbs g" inputMode="decimal" value={draft.carbs} onChange={setD('carbs')} error={draftErr.carbs} />
                <Field label="Fat g" inputMode="decimal" value={draft.fat} onChange={setD('fat')} error={draftErr.fat} />
              </div>
              <div className="flex gap-2">
                {items.length > 0 && <button className="btn-ghost flex-1" onClick={() => setAdding(false)}>Cancel</button>}
                <button className="btn flex-1 bg-food text-white" onClick={addDraft}>Add item</button>
              </div>
            </div>
          ) : (
            <button className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line/15 py-3 text-sm font-semibold text-food" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> Add item
            </button>
          )}

          {recents.length > 0 && (
            <div className="mt-3">
              <span className="label px-1">From recent</span>
              <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto">
                {recents.map((r) => (
                  <button
                    key={r.id}
                    className="tap shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-medium"
                    onClick={() => setItems((xs) => [...xs, { name: r.name, serving: r.serving, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat }])}
                  >
                    + {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-3">
          <span className="text-sm font-medium">Show in Favorites</span>
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--food))]" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
        </label>
        {err && <p className="text-sm font-medium text-danger">{err}</p>}
      </div>
      <div className="mt-6 flex gap-3">
        {preset && <button className="btn-danger" onClick={remove}>Delete</button>}
        <button className="btn flex-1 bg-food text-white" onClick={save}>Save preset</button>
      </div>
    </Sheet>
  );
}
