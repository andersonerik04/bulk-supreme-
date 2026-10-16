import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { WeightTab } from './log/WeightTab';
import { FoodTab } from './log/FoodTab';
import { WaterTab } from './log/WaterTab';
import { MEALS, type MealType } from '@/db/types';

const TABS = [
  { value: 'weight', label: 'Weight' },
  { value: 'food', label: 'Food' },
  { value: 'water', label: 'Water' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const accent: Record<Tab, string> = { weight: 'bg-weight/25', food: 'bg-food/25', water: 'bg-water/25' };

export default function Log() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'food') as Tab;
  const mealParam = params.get('meal') as MealType | null;
  const meal = mealParam && MEALS.includes(mealParam) ? mealParam : undefined;

  return (
    <>
      <PageHeader title="Log" subtitle="What did you track?" />
      <div className="mb-5">
        <Segmented options={TABS} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} accent={accent[tab]} />
      </div>
      <div key={tab} className="animate-fade-up">
        {tab === 'weight' && <WeightTab />}
        {tab === 'food' && <FoodTab initialMeal={meal} />}
        {tab === 'water' && <WaterTab />}
      </div>
    </>
  );
}
