import { useMemo, useState } from 'react';
import { DayNav } from '@/components/DayNav';
import { FoodList } from '@/components/FoodList';
import { Icon } from '@/components/Icon';
import { MacroBars } from '@/components/MacroBar';
import { Segmented } from '@/components/Segmented';
import { useToast } from '@/components/Toast';
import { FoodSheet } from '@/components/forms/FoodSheet';
import { PresetSheet } from '@/components/forms/PresetSheet';
import { useDay, usePresets, useRecentFoods } from '@/hooks/useData';
import { useSettings } from '@/hooks/useSettings';
import { addFood, deleteFood, favoriteFromEntry, logPreset, toggleFavorite } from '@/db/repo';
import { MEALS, MEAL_LABELS, type FoodEntry, type FoodItem, type FoodPreset, type MealType } from '@/db/types';
import { mealForTime, timestampOnDay, todayKey } from '@/utils/date';
import { fmtInt } from '@/utils/format';
import { db } from '@/db/db';

const presetCalories = (p: FoodPreset) => p.items.reduce((s, i) => s + i.calories, 0);
const itemKey = (i: FoodItem) => `${i.name.toLowerCase()}|${i.serving.toLowerCase()}`;

export function FoodTab({ initialMeal }: { initialMeal?: MealType }) {
  const settings = useSettings();
  const toast = useToast();
  const [day, setDay] = useState(todayKey());
  const [meal, setMeal] = useState<MealType>(initialMeal ?? mealForTime());
  const data = useDay(day);
  const presets = usePresets();
  const recents = useRecentFoods(15);
  const [foodSheet, setFoodSheet] = useState<{ entry?: FoodEntry; prefill?: FoodItem; meal?: MealType } | null>(null);
  const [presetSheet, setPresetSheet] = useState<{ preset?: FoodPreset } | null>(null);
  const [showAllPresets, setShowAllPresets] = useState(false);

  const favorites = useMemo(() => presets.filter((p) => p.favorite).sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)), [presets]);
  const favoriteKeys = useMemo(() => new Set(favorites.filter((p) => p.kind === 'food').map((p) => itemKey(p.items[0]))), [favorites]);
  const ts = () => timestampOnDay(day);
  const totals = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const remaining = settings.calorieTarget - totals.calories;

  async function quickPreset(p: FoodPreset) {
    const ids = await logPreset(p, meal, ts());
    navigator.vibrate?.(10);
    toast({ message: `${p.name} → ${MEAL_LABELS[meal]}`, action: { label: 'Undo', onClick: () => db.foods.bulkDelete(ids) } });
  }

  async function quickRecent(e: FoodEntry) {
    const id = await addFood(e, meal, ts());
    navigator.vibrate?.(10);
    toast({ message: `${e.name} → ${MEAL_LABELS[meal]}`, action: { label: 'Undo', onClick: () => deleteFood(id as number) } });
  }

  return (
    <div className="space-y-4">
      <DayNav day={day} onChange={setDay} />

      <section className="card">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="label">Calories</p>
            <p className="num font-display text-3xl font-bold">
              {fmtInt(totals.calories)}
              <span className="ml-1 text-base font-medium text-muted">/ {fmtInt(settings.calorieTarget)}</span>
            </p>
          </div>
          <p className={`num text-sm font-semibold ${remaining >= 0 ? 'text-food' : 'text-danger'}`}>
            {remaining >= 0 ? `${fmtInt(remaining)} left` : `${fmtInt(-remaining)} over`}
          </p>
        </div>
        <MacroBars totals={totals} settings={settings} />
      </section>

      <div className="space-y-2">
        <span className="label px-1">Logging to</span>
        <Segmented options={MEALS.map((m) => ({ value: m, label: MEAL_LABELS[m] }))} value={meal} onChange={setMeal} size="sm" accent="bg-food/25" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn bg-food text-white" onClick={() => setFoodSheet({ meal })}>
          <Icon name="plus" size={18} strokeWidth={2.4} /> New food
        </button>
        <button className="btn-ghost" onClick={() => setPresetSheet({})}>
          <Icon name="layers" size={18} /> New preset
        </button>
      </div>

      {/* Favorites */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="font-semibold">Favorites</h3>
          {presets.length > 0 && (
            <button className="text-sm font-medium text-food" onClick={() => setShowAllPresets((s) => !s)}>
              {showAllPresets ? 'Done' : 'Manage'}
            </button>
          )}
        </div>
        {favorites.length === 0 && !showAllPresets ? (
          <div className="card text-sm text-muted">
            Tap <Icon name="star" size={14} className="inline text-carbs" /> on a recent food, or create a preset, to log it here in one tap.
          </div>
        ) : !showAllPresets ? (
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {favorites.map((p) => (
              <button key={p.id} className="tap card flex w-36 shrink-0 flex-col items-start !p-3 text-left" onClick={() => quickPreset(p)}>
                <span className="mb-3 flex w-full items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-food/15 text-food">
                    <Icon name={p.kind === 'meal' ? 'layers' : 'food'} size={16} />
                  </span>
                  <Icon name="plus" size={18} className="text-muted" />
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</span>
                <span className="num mt-1 text-xs text-muted">{fmtInt(presetCalories(p))} cal{p.kind === 'meal' ? ` · ${p.items.length} items` : ''}</span>
              </button>
            ))}
          </div>
        ) : (
          <ul className="card divide-y divide-line/[0.06] !p-0">
            {presets.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                <button className="tap grid h-9 w-9 place-items-center" onClick={() => toggleFavorite(p.id!)} aria-label={p.favorite ? 'Unfavorite' : 'Favorite'}>
                  <Icon name="star" size={18} filled={!!p.favorite} className={p.favorite ? 'text-carbs' : 'text-muted'} />
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => setPresetSheet({ preset: p })}>
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.kind === 'meal' ? `Meal · ${p.items.length} items` : 'Custom food'} · {fmtInt(presetCalories(p))} cal</p>
                </button>
                <Icon name="edit" size={16} className="text-muted" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recents */}
      {recents.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 font-semibold">Recent</h3>
          <ul className="card divide-y divide-line/[0.06] !p-0">
            {recents.map((r) => {
              const fav = favoriteKeys.has(itemKey(r));
              return (
                <li key={r.id} className="flex items-center gap-1 pl-2 pr-2">
                  <button className="tap grid h-11 w-10 place-items-center" onClick={() => favoriteFromEntry(r, r.meal)} aria-label={fav ? 'Unfavorite' : 'Favorite'}>
                    <Icon name="star" size={18} filled={fav} className={fav ? 'text-carbs' : 'text-muted/60'} />
                  </button>
                  <button className="min-w-0 flex-1 py-3 text-left" onClick={() => setFoodSheet({ prefill: r, meal })}>
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="num truncate text-xs text-muted">{r.serving} · {fmtInt(r.calories)} cal</p>
                  </button>
                  <button className="tap grid h-10 w-10 place-items-center rounded-full bg-food/15 text-food" onClick={() => quickRecent(r)} aria-label={`Log ${r.name}`}>
                    <Icon name="plus" size={18} strokeWidth={2.4} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 px-1 font-semibold">Logged</h3>
        <FoodList foods={data?.foods ?? []} onEdit={(e) => setFoodSheet({ entry: e })} onAdd={(m) => setFoodSheet({ meal: m })} />
      </section>

      <FoodSheet open={!!foodSheet} onClose={() => setFoodSheet(null)} entry={foodSheet?.entry} prefill={foodSheet?.prefill} meal={foodSheet?.meal} defaultTimestamp={ts()} />
      <PresetSheet open={!!presetSheet} onClose={() => setPresetSheet(null)} preset={presetSheet?.preset} />
    </div>
  );
}
