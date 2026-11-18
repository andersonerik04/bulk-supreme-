# Anabolic

A bulk tracker for **body weight, food and water**, with **AI food scanning**: photograph a nutrition label or your plate and the calories and macros fill themselves in. It's mobile-first, installable as a PWA, and works offline (scanning needs a connection). All data is stored on your device in IndexedDB, and there's no backend or account.

Built with React + TypeScript + Vite, Tailwind CSS, Recharts, Dexie.js and the Anthropic TypeScript SDK. Formerly called Ledger.

## Features

- **Weight**: log weigh-ins with date/time and a note (lbs or kg). Shows current weight, change since the last entry, 7-day and 30-day change, and a 7-day rolling average plotted over the daily weigh-ins. You can set a goal weight to get a progress bar and a projected date, based on a linear fit of your last 28 days of trend.
- **Scan food**: tap **Scan food** (Food tab or the **+** button), take a photo, review what Claude read, then add it. A nutrition label gives one item with its printed values, and you pick how many servings you ate. A photo of a meal gives one estimated item per food, with a portion multiplier. Every number can be edited before logging. See [AI food scanning](#ai-food-scanning).
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
- In development, run `anabolic.seed()` in the browser console (`anabolic.clearSample()` and `anabolic.reset()` are also available).

Sample rows are tagged (`sample: 1`), so **Clear sample** removes only them and never touches entries you logged yourself. The generator lives in `src/utils/seed.ts`. It is deterministic and models energy balance, so weight responds to intake.

## AI food scanning

Scanning sends the photo to Claude (model `claude-opus-5-5`) and asks for structured JSON back: whether it's a label or a meal, and each food's serving, calories, protein, carbs and fat. The call goes straight from your phone to `api.anthropic.com`, because there's no server, so it uses **your own Anthropic API key**.

1. Create a key at [console.anthropic.com](https://console.anthropic.com) (**API keys → Create key**) and add a little credit under **Billing**.
2. In the app, go to **Settings → AI food scanning**, paste the key, and tap **Save key**. It's checked right away.
3. Tap **Scan food** on the Food tab.

**Cost.** Each scan is a single request, roughly 2–5 cents, billed to your Anthropic account. There's no subscription.

**Privacy.** The key is stored only in this browser's local storage on your phone, and it is never included in JSON or CSV exports. Photos you scan are sent to Anthropic to be analyzed; nothing else leaves the device. Anyone with access to your unlocked phone could read the key, so use a key with a spending limit set in the Anthropic Console.

**Accuracy.** Labels are read almost exactly. Meal photos are estimates: check portions before adding, and use the portion multiplier if your plate was bigger or smaller.

The photo is shrunk on the phone to at most 1568 px on its long edge before upload. The scanner code (`src/ai/`) and the SDK only download the first time you scan, so they don't slow down app startup.

## Scripts

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Start the Vite dev server                                    |
| `npm run build`     | Type-check and build to `dist/` (including the service worker) |
| `npm run preview`   | Serve the production build locally (http://localhost:4173)   |
| `npm run typecheck` | Type-check only                                              |

## Deploying

Production builds use the base path **`/bulk-supreme-/`** (set in `vite.config.ts`), because GitHub Pages serves this repo from `https://andersonerik04.github.io/bulk-supreme-/`. Every script, stylesheet, icon, the manifest's `start_url`/`scope`, and the service worker's fallback live under that path. Routing uses hashes (`/#/trends`), so no server rewrites are needed. To serve from a domain root instead (e.g. Vercel), build with `BASE_PATH=/`.

### GitHub Pages

The workflow `.github/workflows/deploy.yml` builds the app and publishes `dist/`. It runs on every push to `main` and can be started by hand from **Actions → Deploy to GitHub Pages → Run workflow**.

One-time setup: in the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Don't use "Deploy from a branch", which would serve the raw source files instead of the built app.

The site is then at **https://andersonerik04.github.io/bulk-supreme-/**. Note the trailing dash, which is part of the repo name.

### Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add the environment variable **`BASE_PATH` = `/`**, so the app is served from the domain root.
4. Deploy.

### Install on iPhone

Open the deployed URL in **Safari**, tap **Share → Add to Home Screen**, and launch Anabolic from the icon. It runs full-screen, respects the notch and home indicator, and works offline after the first load. Updates are picked up automatically the next time you open it online.

> If Anabolic shows "Safari isn't letting Anabolic store data", go to **Settings → Apps → Safari** and turn off **Block All Cookies**. That switch also blocks the on-device database the app needs.

> Data lives in that browser's storage on that device. Safari can evict storage for sites you haven't visited in a long time, but installed home-screen apps are exempt. **Export a JSON backup** from Settings now and then anyway.

## Project structure

```
src/
  ai/          Food scanning: API key storage, photo downscaling, Claude request + JSON schema
  db/          Dexie database, typed schema (types.ts), repository functions (repo.ts)
  hooks/       Live-query hooks (useDay, useWeights, useRange, useStreak…), settings, theme, palette
  utils/       dates, unit conversion, stats (rolling avg, projection, streak, correlation),
               validation, backup (CSV/JSON export + import validation), seed data
  components/  UI building blocks: rings, sheets, tab bar, FAB, toasts, water glass, donut,
    forms/     weight / food / preset / water entry sheets and the scan review sheet
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

Nothing leaves your device except photos you choose to scan, which go to Anthropic. There are no analytics and no accounts.
