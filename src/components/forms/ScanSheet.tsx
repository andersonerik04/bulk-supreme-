import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import { Segmented } from '../Segmented';
import { useToast } from '../Toast';
import { addFood, addPreset } from '@/db/repo';
import { db } from '@/db/db';
import { MEALS, MEAL_LABELS, type FoodItem, type MealType } from '@/db/types';
import { getApiKey } from '@/ai/apiKey';
import { photoToJpeg } from '@/ai/image';
import type { ScanResult } from '@/ai/scan';
import { mealForTime } from '@/utils/date';
import { fmtInt } from '@/utils/format';
import { parseNum } from '@/utils/validation';

type Row = { name: string; serving: string; calories: string; protein: string; carbs: string; fat: string };
type Phase =
  | { step: 'no_key' }
  | { step: 'analyzing'; preview: string }
  | { step: 'error'; preview?: string; message: string; kind: string }
  | { step: 'review'; preview: string; result: ScanResult };

const toRow = (i: ScanResult['items'][number]): Row => ({
  name: i.name,
  serving: i.serving,
  calories: String(Math.round(i.calories)),
  protein: String(Math.round(i.protein_g * 10) / 10),
  carbs: String(Math.round(i.carbs_g * 10) / 10),
  fat: String(Math.round(i.fat_g * 10) / 10),
});
const n = (s: string) => {
  const v = parseNum(s);
  return v == null || Number.isNaN(v) ? NaN : v;
};
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Wraps any trigger: tapping it opens the camera (or photo library), then the
 * photo goes to Claude and the results appear for review before logging.
 */
export function ScanLauncher({ children, meal, defaultTimestamp }: { children: (open: () => void) => ReactNode; meal?: MealType; defaultTimestamp?: () => number }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Must run synchronously inside the tap, or iOS won't open the camera.
  const open = () => {
    if (!getApiKey()) return setPhase({ step: 'no_key' });
    input.current?.click();
  };

  async function analyze(file: File) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    let preview: string | undefined;
    try {
      const jpeg = await photoToJpeg(file);
      preview = jpeg.dataUrl;
      setPhase({ step: 'analyzing', preview });
      const { scanFood } = await import('@/ai/scan');
      const result = await scanFood(jpeg.base64, getApiKey() ?? '', ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (result.kind === 'not_food' || result.items.length === 0) {
        setPhase({ step: 'error', preview, kind: 'not_food', message: result.note || 'No food or nutrition label found in this photo.' });
      } else {
        setPhase({ step: 'review', preview, result });
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const err = e as Error & { kind?: string };
      setPhase({ step: 'error', preview, kind: err.kind ?? 'other', message: err.message });
    }
  }

  const close = () => {
    abort.current?.abort();
    setPhase(null);
  };

  return (
    <>
      {children(open)}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void analyze(f);
        }}
      />
      <Sheet open={!!phase} onClose={close} title={phase?.step === 'review' ? 'Review scan' : 'Scan food'}>
        {phase?.step === 'no_key' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Scanning sends the photo to Claude, which reads nutrition labels and estimates macros from a photo of your meal. It uses your own Anthropic API key, stored only on this phone.
            </p>
            <Link to="/settings#ai" className="btn-primary w-full" onClick={close}>Add API key in Settings</Link>
          </div>
        )}
        {phase?.step === 'analyzing' && <Analyzing preview={phase.preview} />}
        {phase?.step === 'error' && (
          <div className="space-y-4">
            {phase.preview && <img src={phase.preview} alt="" className="h-40 w-full rounded-2xl object-cover opacity-60" />}
            <p className="font-medium">{phase.message}</p>
            <div className="grid grid-cols-2 gap-3">
              {phase.kind === 'bad_key' || phase.kind === 'no_key' ? (
                <Link to="/settings#ai" className="btn-ghost" onClick={close}>Open Settings</Link>
              ) : (
                <button className="btn-ghost" onClick={close}>Cancel</button>
              )}
              <button className="btn-primary" onClick={() => input.current?.click()}>Retake</button>
            </div>
          </div>
        )}
        {phase?.step === 'review' && (
          <Review result={phase.result} preview={phase.preview} meal={meal} defaultTimestamp={defaultTimestamp} onDone={close} onRetake={() => input.current?.click()} />
        )}
      </Sheet>
    </>
  );
}

function Analyzing({ preview }: { preview: string }) {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl">
        <img src={preview} alt="Your photo" className="h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="scan-line absolute inset-x-0 h-24" />
      </div>
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line/15 border-t-food" />
        <p className="font-medium">Reading your food…</p>
      </div>
      <p className="text-xs text-muted">Usually takes 5–15 seconds.</p>
    </div>
  );
}

function Review({ result, preview, meal: initialMeal, defaultTimestamp, onDone, onRetake }: { result: ScanResult; preview: string; meal?: MealType; defaultTimestamp?: () => number; onDone: () => void; onRetake: () => void }) {
  const toast = useToast();
  const isLabel = result.kind === 'nutrition_label';
  const [rows, setRows] = useState<Row[]>(() => result.items.map(toRow));
  const [mult, setMult] = useState(1);
  const [meal, setMeal] = useState<MealType>(initialMeal ?? mealForTime());
  const [savePreset, setSavePreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
  }, [rows]);

  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const valid = rows.every((r) => r.name.trim() && [r.calories, r.protein, r.carbs, r.fat].every((x) => n(x) >= 0));
  const total = rows.reduce((t, r) => ({ cal: t.cal + (n(r.calories) || 0), p: t.p + (n(r.protein) || 0), c: t.c + (n(r.carbs) || 0), f: t.f + (n(r.fat) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
  const steps = [0.5, 1, 1.5, 2, 3];

  async function log() {
    if (!rows.length) return setError('Nothing left to add.');
    if (!valid) return setError('Every item needs a name, and numbers can’t be negative.');
    const ts = defaultTimestamp?.() ?? Date.now();
    const items: FoodItem[] = rows.map((r) => ({
      name: r.name.trim(),
      serving: mult === 1 ? r.serving.trim() || '1 serving' : `${mult} × ${r.serving.trim() || 'serving'}`,
      calories: Math.round(n(r.calories) * mult),
      protein: r1(n(r.protein) * mult),
      carbs: r1(n(r.carbs) * mult),
      fat: r1(n(r.fat) * mult),
    }));
    const ids = await db.transaction('rw', db.foods, db.presets, async () => {
      const out: number[] = [];
      for (const it of items) out.push((await addFood(it, meal, ts)) as number);
      if (savePreset) {
        await addPreset({ name: items.length === 1 ? items[0].name : `${MEAL_LABELS[meal]} (scanned)`, kind: items.length > 1 ? 'meal' : 'food', items, favorite: 1, defaultMeal: meal });
      }
      return out;
    });
    navigator.vibrate?.(10);
    toast({ message: `Added ${fmtInt(total.cal * mult)} cal to ${MEAL_LABELS[meal]}`, action: { label: 'Undo', onClick: () => db.foods.bulkDelete(ids) } });
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-food px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-accent">{isLabel ? 'Label' : 'Meal estimate'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${result.confidence === 'high' ? 'bg-line/10 text-ink' : 'bg-line/10 text-muted'}`}>{result.confidence} confidence</span>
          </div>
          {result.note && <p className="mt-1 text-xs text-muted">{result.note}</p>}
        </div>
        <button className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-elevated text-muted" onClick={onRetake} aria-label="Retake photo">
          <Icon name="camera" size={18} />
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="rounded-2xl border border-line/10 p-3">
            <div className="flex items-center gap-2">
              <input className="min-w-0 flex-1 bg-transparent font-semibold outline-none" value={r.name} onChange={(e) => set(i, 'name', e.target.value)} aria-label="Food name" maxLength={80} />
              {rows.length > 1 && (
                <button className="tap grid h-8 w-8 place-items-center rounded-full text-muted" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Remove ${r.name}`}>
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
            <input className="mt-0.5 w-full bg-transparent text-xs text-muted outline-none" value={r.serving} onChange={(e) => set(i, 'serving', e.target.value)} aria-label="Serving" maxLength={40} />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {([['calories', 'Cal'], ['protein', 'Protein g'], ['carbs', 'Carbs g'], ['fat', 'Fat g']] as const).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
                  <input
                    inputMode="decimal"
                    className={`num w-full bg-transparent text-lg font-bold outline-none ${n(r[k]) >= 0 ? '' : 'text-danger'}`}
                    value={r[k]}
                    onChange={(e) => set(i, k, e.target.value)}
                    aria-label={`${label} for ${r.name}`}
                  />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="label">{isLabel ? 'Servings eaten' : 'Portion'}</span>
          {isLabel && result.servings_per_container != null && <span className="text-xs text-muted">{result.servings_per_container} per container</span>}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {steps.map((s) => (
            <button key={s} className={`tap rounded-xl py-2 text-sm font-semibold ${mult === s ? 'bg-ink text-bg' : 'bg-elevated text-muted'}`} onClick={() => setMult(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-line/10 pt-3">
        <div>
          <p className="label">Total</p>
          <p className="num font-num text-[42px] font-semibold">{fmtInt(total.cal * mult)}<span className="ml-1 text-sm font-medium text-muted">cal</span></p>
        </div>
        <p className="num text-right text-sm text-muted">
          P <b className="text-ink">{Math.round(total.p * mult)}g</b> · C <b className="text-ink">{Math.round(total.c * mult)}g</b> · F <b className="text-ink">{Math.round(total.f * mult)}g</b>
        </p>
      </div>

      <Segmented options={MEALS.map((m) => ({ value: m, label: MEAL_LABELS[m] }))} value={meal} onChange={setMeal} size="sm" />
      <label className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-3">
        <span className="text-sm font-medium">Save to Favorites</span>
        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--food))]" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} />
      </label>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
      <button className="btn w-full bg-food text-on-accent" onClick={log}>Add to {MEAL_LABELS[meal]}</button>
      <p className="text-center text-[11px] text-muted">AI estimates can be off — check the numbers before adding.</p>
    </div>
  );
}
