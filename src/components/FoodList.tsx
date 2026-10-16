import { MEALS, MEAL_LABELS, type FoodEntry, type MealType } from '@/db/types';
import { fmtInt } from '@/utils/format';
import { Icon } from './Icon';

interface Props {
  foods: FoodEntry[];
  onEdit: (e: FoodEntry) => void;
  onAdd?: (meal: MealType) => void;
  showEmptyMeals?: boolean;
}

/** Entries grouped by meal with per-meal calorie subtotals. */
export function FoodList({ foods, onEdit, onAdd, showEmptyMeals = true }: Props) {
  return (
    <div className="space-y-3">
      {MEALS.map((meal) => {
        const items = foods.filter((f) => f.meal === meal);
        if (!items.length && !showEmptyMeals) return null;
        const cal = items.reduce((s, f) => s + f.calories, 0);
        return (
          <section key={meal} className="card !p-0">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h3 className="font-semibold">{MEAL_LABELS[meal]}</h3>
              <div className="flex items-center gap-2">
                <span className="num text-sm text-muted">{fmtInt(cal)} cal</span>
                {onAdd && (
                  <button className="tap grid h-8 w-8 place-items-center rounded-full bg-food/15 text-food" onClick={() => onAdd(meal)} aria-label={`Add to ${MEAL_LABELS[meal]}`}>
                    <Icon name="plus" size={16} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            </div>
            {items.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-muted/80">Nothing logged</p>
            ) : (
              <ul className="divide-y divide-line/[0.06]">
                {items.map((f) => (
                  <li key={f.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-elevated" onClick={() => onEdit(f)}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="truncate text-xs text-muted">
                          {f.serving}
                          {f.protein != null && ` · P ${Math.round(f.protein)}g`}
                          {f.carbs != null && ` · C ${Math.round(f.carbs)}g`}
                          {f.fat != null && ` · F ${Math.round(f.fat)}g`}
                        </p>
                      </div>
                      <span className="num font-semibold">{fmtInt(f.calories)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
