# IV Sunsets

Predicts how vibrant tonight's Isla Vista sunset will be — scored 0–100 with a full visual breakdown of why.

Built with Next.js, Canvas animations, and real-time weather data.

![Score labels: Poor → Decent → Good → Great → Unreal](https://img.shields.io/badge/score_range-0_to_100-orange)

## What it does

- **Real-time sunset scoring** for Isla Vista, CA using live weather forecasts
- **6-day outlook** with per-day scores, explanations, and reason chips
- **Animated sky visualizations** on HTML5 Canvas that respond to forecast data
- **Interactive simulator** — drag sliders and watch the sky and score react live
- **Scrollytelling explainer** teaching the science behind great sunsets
- **Post-sunset feedback** stored locally to calibrate future predictions

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys needed — all data sources are free and public.

## Data sources

All weather data comes from the [Open-Meteo API](https://open-meteo.com/) (free, no key required).

| Parameter | What it tells us |
|-----------|-----------------|
| `cloud_cover_high` | Cirrus wisps that catch warm light |
| `cloud_cover_mid` | Altocumulus texture and depth |
| `cloud_cover_low` | Marine layer / fog that blocks the horizon |
| `cloud_cover` | Overall cloud coverage |
| `precipitation` | Rain intensity + prior-rain clearing signal |
| `relative_humidity_2m` | Moisture for atmospheric scattering |
| `visibility` | Horizon clarity (haze detection) |
| `sunrise` / `sunset` | Defines the scoring window |

**Location:** Isla Vista, CA (34.4133°N, 119.861°W)
**Scoring window:** 2 hours before sunset → 30 minutes after
**Rain lookback:** 6–24 hours before sunset

If the API is unreachable, the app serves fallback forecasts so it never breaks.

## How scoring works

Implemented in `lib/scoreSunset.ts`. Each day gets a 0–100 score:

| Factor | Max impact | What it rewards |
|--------|-----------|-----------------|
| High cloud support | +32 pts | Cirrus in the 26–62% sweet spot |
| Mid cloud support | +24 pts | Altocumulus texture, 20–58% |
| Cloud texture | +14 pts | Overall coverage 30–72%, penalized if overcast |
| Low cloud penalty | −34 pts | Marine layer blocking the horizon |
| Rain bonus | +8 pts | Post-rain clearing with open sky |
| Texture contrast | +6 pts | High/mid clouds vs. low cloud differential |
| Humidity bonus | +4 pts | Moderate moisture (40–75%) enhancing scattering |
| Visibility modifier | −5 to +3 pts | Haze penalty or clear-horizon boost |
| Baseline | 20 pts | Starting score for any sunset |

**Labels:** Poor (0–24) · Decent (25–44) · Good (45–64) · Great (65–84) · Unreal (85–100)

## Project structure

```
app/
  page.tsx                  → Main page, data loading
  api/forecast/route.ts     → Open-Meteo fetch, normalization, fallback
  how-it-works/             → Explainer page
components/
  HeroSky.tsx               → Full-screen animated hero
  SkyCanvas.tsx             → Reusable Canvas sky renderer
  ForecastCard.tsx          → Day card with mini sky preview
  ScoreBreakdown.tsx        → Factor-by-factor breakdown
  SunsetSimulator.tsx       → Interactive build-your-own-sunset
  ScrollyExplainer.tsx      → Scroll-driven educational chapters
  SpotlightFeature.tsx      → Post-sunset rating UI
lib/
  scoreSunset.ts            → Scoring algorithm
  normalizeForecast.ts      → Sunset window extraction + data shaping
  types.ts                  → Shared TypeScript interfaces
  skyRenderer.ts            → Canvas drawing primitives
  utils.ts                  → General helpers
scripts/
  smoke-test.mjs            → Playwright e2e smoke tests
```

## Commands

```bash
npm run dev         # Development server
npm run build       # Production build
npm run lint        # ESLint
npm run typecheck   # TypeScript check
npm run smoke       # Playwright smoke tests
```

## Stack

- **Next.js 16** (App Router + Turbopack)
- **React 19** + TypeScript
- **Tailwind CSS 4**
- **Framer Motion** for scroll/viewport animations
- **Lenis** for smooth scrolling
- **HTML5 Canvas** for all sky visualizations
- **Open-Meteo** for weather data (no API key)
