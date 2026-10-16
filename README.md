# Ledger

A personal health tracker for **body weight, food and water**. It's mobile-first, installable as a PWA, and works fully offline. All data is stored on your device in IndexedDB, and there's no backend or account.

Built with React + TypeScript + Vite, Tailwind CSS, Recharts and Dexie.js.

## Features

- **Weight**: log weigh-ins with date/time and a note (lbs or kg). Shows current weight, change since the last entry, 7-day and 30-day change, and a 7-day rolling average plotted over the daily weigh-ins. You can set a goal weight to get a progress bar and a projected date, based on a linear fit of your last 28 days of trend.
- **Food**: log to Breakfast, Lunch, Dinner or Snacks with calories and optional protein, carbs and fat. Recent foods and favorites re-log in one tap. Custom foods and multi-item meals can be saved as presets. Daily totals are shown against your targets, and any entry can be edited or deleted (with undo).
- **Water**: quick-add buttons (8 / 16 / 24 oz, or 250 / 500 / 750 ml), a custom amount, an animated filling glass, and undo for the last entry.
- **Dashboard**: concentric calorie and water rings, macro donut and bars, weight summary with a sparkline, a streak counter, and a floating **+** button that reaches every log type in one or two taps.
- **Trends**: range toggle (1W, 1M, 3M, 6M, 1Y, All), weight chart with rolling average and goal line, calorie bars against your target, average daily calories, macros and water, weekly summary cards, a calendar heatmap of logging consistency, and a weight-vs-calories overlay with a weekly correlation summary.
- **History**: a day-by-day log. Tap any day to view, add, edit or delete its entries.
- **Settings**: theme (dark by default, or light), units, daily targets, goal weight, CSV and JSON export, JSON import, load or clear sample data, and reset all data.

## Getting started

Requires Node 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

To test on your iPhone over Wi-Fi, run `npm run dev -- --host` and open the printed network URL. Service workers (offline mode, installing) only work over HTTPS or on `localhost`, so use a deployed build to test installation.

### Sample data

There are two ways to preview the charts with ~60 days of realistic data:

- On first launch, tap **Try sample data** on the welcome card, or go to **Settings → Sample data → Load sample**.
- In development, run `ledger.seed()` in the browser console (`ledger.clearSample()` and `ledger.reset()` are also available).

Sample rows are tagged (`sample: 1`), so **Clear sample** removes only them and never touches entries you logged yourself. The generator lives in `src/utils/seed.ts`. It is deterministic and models energy balance, so weight responds to intake.

## Scripts

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Start the Vite dev server                                    |
| `npm run build`     | Type-check and build to `dist/` (including the service worker) |
| `npm run preview`   | Serve the production build locally (http://localhost:4173)   |
| `npm run typecheck` | Type-check only                                              |

## Deploying

The app uses hash-based routing (`/#/trends`), so it needs no server rewrites. Set `BASE_PATH` when the site is served from a sub-path.

### GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. Push to `main`, or merge this branch into it.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The workflow builds with `BASE_PATH=/<repo-name>/` and publishes. The app will be at `https://<user>.github.io/<repo-name>/`.

To build for Pages by hand: `BASE_PATH=/<repo-name>/ npm run build`, then publish `dist/`.

### Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Deploy. No environment variables are needed, because the base path defaults to `/`.

Or from the CLI: `npx vercel` and then `npx vercel --prod`.

### Install on iPhone

Open the deployed URL in **Safari**, tap **Share → Add to Home Screen**, and launch Ledger from the icon. It runs full-screen, respects the notch and home indicator, and works offline after the first load. Updates are picked up automatically the next time you open it online.

> Data lives in that browser's storage on that device. Safari can evict storage for sites you haven't visited in a long time, but installed home-screen apps are exempt. **Export a JSON backup** from Settings now and then anyway.

## Project structure

```
src/
  db/          Dexie database, typed schema (types.ts), repository functions (repo.ts)
  hooks/       Live-query hooks (useDay, useWeights, useRange, useStreak…), settings, theme, palette
  utils/       dates, unit conversion, stats (rolling avg, projection, streak, correlation),
               validation, backup (CSV/JSON export + import validation), seed data
  components/  UI building blocks: rings, sheets, tab bar, FAB, toasts, water glass, donut,
    forms/     weight / food / preset / water entry sheets
    charts/    Recharts-based weight, calorie, correlation charts and the heatmap
  pages/       Dashboard, Log (+ log/ tabs), Trends, History, DayDetail, Settings
```

### Data model

All weight is stored in **lbs** and all water in **fl oz**. Units are converted only for display and input, so switching units never rewrites data. Every entry stores an indexed `day` key (`yyyy-MM-dd`, local time) for fast day and range queries.

| Table      | Fields                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| `weights`  | `id, timestamp, day, lbs, note?`                                               |
| `foods`    | `id, timestamp, day, meal, name, serving, calories, protein?, carbs?, fat?, presetId?` |
| `water`    | `id, timestamp, day, oz`                                                       |
| `presets`  | `id, name, kind ('food' \| 'meal'), items[], favorite, defaultMeal?, createdAt, lastUsed?` |
| `settings` | single row: units, targets, goal weight, theme                                 |

JSON backups (`{ app: 'ledger', version: 1, … }`) contain every table. On import they are strictly validated before anything is replaced.

## Privacy

Nothing leaves your device. There are no analytics, no network calls, and no accounts.
