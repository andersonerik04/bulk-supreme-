import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/Segmented';
import { Field } from '@/components/Field';
import { Icon, type IconName } from '@/components/Icon';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { useToast } from '@/components/Toast';
import { useSettings } from '@/hooks/useSettings';
import { useWeights } from '@/hooks/useData';
import { clearSampleData, exportAll, hasSampleData, importAll, resetAll, updateSettings } from '@/db/repo';
import type { BackupFile, Settings, WaterUnit, WeightUnit } from '@/db/types';
import { BackupError, parseBackup, saveFile, toCSV } from '@/utils/backup';
import { seedSampleData } from '@/utils/seed';
import { hasErrors, numberRule, parseNum, validate } from '@/utils/validation';
import { waterFromDisplay, waterToDisplay, weightFromDisplay, weightToDisplay } from '@/utils/units';
import { format } from 'date-fns';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="label mb-2 px-1">{title}</h2>
      <div className="card space-y-4">{children}</div>
    </section>
  );
}

function ActionRow({ icon, label, detail, onClick, tone = 'text-ink', disabled }: { icon: IconName; label: string; detail?: string; onClick: () => void; tone?: string; disabled?: boolean }) {
  return (
    <button className={`tap -mx-1 flex w-[calc(100%+8px)] items-center gap-3 rounded-2xl px-1 py-1 text-left disabled:opacity-40 ${tone}`} onClick={onClick} disabled={disabled}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-elevated"><Icon name={icon} size={20} /></span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {detail && <span className="block text-xs text-muted">{detail}</span>}
      </span>
      <Icon name="right" size={18} className="text-muted/60" />
    </button>
  );
}

type TargetForm = { calories: string; protein: string; carbs: string; fat: string; water: string; goal: string };

function toForm(s: Settings): TargetForm {
  return {
    calories: String(s.calorieTarget),
    protein: String(s.proteinTarget),
    carbs: String(s.carbsTarget),
    fat: String(s.fatTarget),
    water: String(waterToDisplay(s.waterTargetOz, s.waterUnit)),
    goal: s.goalWeightLbs != null ? String(weightToDisplay(s.goalWeightLbs, s.weightUnit)) : '',
  };
}

export default function SettingsPage() {
  const s = useSettings();
  const toast = useToast();
  const { weights } = useWeights();
  const sample = useLiveQuery(hasSampleData, [], false);
  const [form, setForm] = useState<TargetForm>(() => toForm(s));
  const [errors, setErrors] = useState<Partial<Record<keyof TargetForm, string>>>({});
  const [confirm, setConfirm] = useState<null | 'reset' | 'clearSample' | { kind: 'import'; backup: BackupFile }>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Re-sync the form when settings load or units change.
  useEffect(() => setForm(toForm(s)), [s]);

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(s));
  const set = (k: keyof TargetForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function saveTargets() {
    const e = validate(form, {
      calories: numberRule({ label: 'Calories', required: true, min: 500, max: 10000, integer: true }),
      protein: numberRule({ label: 'Protein', required: true, min: 0, max: 600 }),
      carbs: numberRule({ label: 'Carbs', required: true, min: 0, max: 1500 }),
      fat: numberRule({ label: 'Fat', required: true, min: 0, max: 600 }),
      water: numberRule({ label: 'Water', required: true, min: s.waterUnit === 'ml' ? 250 : 8, max: s.waterUnit === 'ml' ? 10000 : 340 }),
      goal: numberRule({ label: 'Goal weight', min: s.weightUnit === 'kg' ? 20 : 45, max: s.weightUnit === 'kg' ? 320 : 700 }),
    });
    setErrors(e);
    if (hasErrors(e)) return;
    const goal = parseNum(form.goal);
    const goalLbs = goal != null ? weightFromDisplay(goal, s.weightUnit) : undefined;
    const goalChanged = goalLbs == null ? s.goalWeightLbs != null : s.goalWeightLbs == null || Math.abs(goalLbs - s.goalWeightLbs) > 0.05;
    await updateSettings({
      calorieTarget: parseNum(form.calories)!,
      proteinTarget: parseNum(form.protein)!,
      carbsTarget: parseNum(form.carbs)!,
      fatTarget: parseNum(form.fat)!,
      waterTargetOz: waterFromDisplay(parseNum(form.water)!, s.waterUnit),
      goalWeightLbs: goalLbs,
      // Starting point for goal progress = latest weigh-in when the goal is (re)set.
      goalStartLbs: goalChanged ? (goalLbs != null ? weights?.at(-1)?.lbs : undefined) : s.goalStartLbs,
    });
    toast({ message: 'Targets saved' });
  }

  async function exportJSON() {
    const b = await exportAll();
    await saveFile(`ledger-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, JSON.stringify(b, null, 2), 'application/json');
  }
  async function exportCSV() {
    const b = await exportAll();
    await saveFile(`ledger-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, toCSV(b), 'text/csv');
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      setConfirm({ kind: 'import', backup });
    } catch (err) {
      toast({ message: err instanceof BackupError ? err.message : 'Could not read that file', duration: 4500 });
    }
  }

  async function loadSample() {
    setBusy(true);
    const r = await seedSampleData();
    setBusy(false);
    toast({ message: `Added ${r.weights} weigh-ins, ${r.foods} foods, ${r.water} drinks` });
  }

  const pendingImport = confirm && typeof confirm === 'object' ? confirm.backup : null;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="stagger space-y-6">
        <Group title="Appearance">
          <Segmented
            options={[{ value: 'dark', label: '🌙  Dark' }, { value: 'light', label: '☀️  Light' }] as const}
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </Group>

        <Group title="Units">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Weight</span>
            <div className="w-40"><Segmented options={[{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }] as const} value={s.weightUnit} onChange={(weightUnit: WeightUnit) => updateSettings({ weightUnit })} size="sm" /></div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Water</span>
            <div className="w-40"><Segmented options={[{ value: 'oz', label: 'oz' }, { value: 'ml', label: 'ml' }] as const} value={s.waterUnit} onChange={(waterUnit: WaterUnit) => updateSettings({ waterUnit })} size="sm" /></div>
          </div>
        </Group>

        <Group title="Daily targets">
          <Field label="Calories" inputMode="numeric" value={form.calories} onChange={set('calories')} suffix="cal" error={errors.calories} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Protein" inputMode="decimal" value={form.protein} onChange={set('protein')} suffix="g" error={errors.protein} />
            <Field label="Carbs" inputMode="decimal" value={form.carbs} onChange={set('carbs')} suffix="g" error={errors.carbs} />
            <Field label="Fat" inputMode="decimal" value={form.fat} onChange={set('fat')} suffix="g" error={errors.fat} />
          </div>
          <p className="-mt-2 text-xs text-muted">
            Macros add up to {Math.round((parseNum(form.protein) || 0) * 4 + (parseNum(form.carbs) || 0) * 4 + (parseNum(form.fat) || 0) * 9).toLocaleString()} cal
          </p>
          <Field label="Water" inputMode="decimal" value={form.water} onChange={set('water')} suffix={s.waterUnit} error={errors.water} />
          <Field label="Goal weight (optional)" inputMode="decimal" value={form.goal} onChange={set('goal')} suffix={s.weightUnit} placeholder="None" error={errors.goal} />
          <button className="btn-primary w-full" onClick={saveTargets} disabled={!dirty}>Save targets</button>
        </Group>

        <Group title="Your data">
          <ActionRow icon="download" label="Export JSON backup" detail="Full backup you can re-import" onClick={exportJSON} />
          <ActionRow icon="download" label="Export CSV" detail="All entries, spreadsheet-friendly" onClick={exportCSV} />
          <ActionRow icon="upload" label="Import JSON backup" detail="Replaces everything on this device" onClick={() => fileInput.current?.click()} />
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </Group>

        <Group title="Sample data">
          <p className="text-sm text-muted">Preview the charts with ~60 days of realistic entries. Sample rows are tagged, so clearing them never touches your own logs.</p>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={loadSample} disabled={busy || sample}>{busy ? 'Loading…' : 'Load sample'}</button>
            <button className="btn-ghost" onClick={() => setConfirm('clearSample')} disabled={!sample}>Clear sample</button>
          </div>
        </Group>

        <Group title="Danger zone">
          <ActionRow icon="trash" label="Reset all data" detail="Deletes every entry, preset and setting" tone="text-danger" onClick={() => setConfirm('reset')} />
        </Group>

        <p className="pb-4 text-center text-xs text-muted">
          Ledger v1.0 · All data stays on this device (IndexedDB). <br />Add to Home Screen from Safari’s share menu to install.
        </p>
      </div>

      <ConfirmSheet
        open={confirm === 'reset'}
        title="Reset all data?"
        body="This permanently deletes all weigh-ins, food, water, presets and settings on this device. Export a backup first if you might want it back."
        confirmLabel="Reset everything"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await resetAll();
          toast({ message: 'All data reset' });
        }}
      />
      <ConfirmSheet
        open={confirm === 'clearSample'}
        title="Clear sample data?"
        body="Removes every sample entry and preset. Anything you logged yourself is kept."
        confirmLabel="Clear sample"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await clearSampleData();
          toast({ message: 'Sample data cleared' });
        }}
      />
      <ConfirmSheet
        open={!!pendingImport}
        title="Replace all data?"
        body={
          pendingImport
            ? `Import ${pendingImport.weights.length} weigh-ins, ${pendingImport.foods.length} food entries, ${pendingImport.water.length} water entries and ${pendingImport.presets.length} presets${pendingImport.exportedAt && !Number.isNaN(Date.parse(pendingImport.exportedAt)) ? ` from ${format(new Date(pendingImport.exportedAt), 'MMM d, yyyy')}` : ''}. Current data on this device will be replaced.`
            : ''
        }
        confirmLabel="Import"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!pendingImport) return;
          await importAll(pendingImport);
          toast({ message: 'Backup imported' });
        }}
      />
    </>
  );
}
