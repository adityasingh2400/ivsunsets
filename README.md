# IV Sunsets

Premium Isla Vista sunset forecast experience built with Next.js, TypeScript, Tailwind, Framer Motion, Lenis, and a custom illustrated shoreline hero.

Live site: [https://iv-sunsets.vercel.app](https://iv-sunsets.vercel.app)

![Score labels: Poor → Decent → Good → Great → Unreal](https://img.shields.io/badge/score_range-0_to_100-orange)

## Overview

IV Sunsets answers a simple question:

`Is tonight's Isla Vista sunset worth going out for?`

Instead of a generic weather dashboard, the app presents the forecast as a cinematic product-style experience with:

- a full-screen hero for tonight's outlook
- a messenger gull animation that loops across the shoreline
- a "Should I go?" countdown section
- a 6-day sunset forecast
- an interactive sunset lab
- curated viewing spots
- a lightweight local pulse feed paired with the hero

## Live Product

- Production URL: [https://iv-sunsets.vercel.app](https://iv-sunsets.vercel.app)
- Forecast API route: [https://iv-sunsets.vercel.app/api/forecast](https://iv-sunsets.vercel.app/api/forecast)
- Forced fallback test route: [https://iv-sunsets.vercel.app/api/forecast?forceFallback=1](https://iv-sunsets.vercel.app/api/forecast?forceFallback=1)

## Current Experience

### Homepage

The homepage is a scroll / swipe driven carousel with five sections:

1. `Tonight's sunset`
2. `Should I go?`
3. `6-day outlook`
4. `Sunset lab`
5. `Where to watch`

### Hero

The current hero uses:

- a custom SVG shoreline illustration
- a dominant opaque foreground bluff on the left
- a distant right coastline / headland
- a restrained ocean reflection system
- a messenger gull that dives, lifts a local note, and returns to its perch

Only atmosphere is translucent:

- sky bloom
- marine haze
- sun glow
- softened water reflections

The land itself is intentionally rendered as solid mass.

### Forecasting

The app defaults to Isla Vista, California:

- Latitude: `34.4133`
- Longitude: `-119.861`
- Timezone: `America/Los_Angeles`

The forecast shows today plus the next 5 days.

## Data Sources

Weather data is fetched from:

- [Open-Meteo Forecast API](https://open-meteo.com/)
- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)

Local pulse content is fetched separately in the server route and attached to the forecast payload.

No API keys are required.

## Forecast Model

The scoring model is heuristic, opinionated, and tuned for coastal California rather than claiming meteorological precision.

### Inputs

Hourly inputs used in the scoring window:

- `cloud_cover`
- `cloud_cover_low`
- `cloud_cover_mid`
- `cloud_cover_high`
- `precipitation`
- `visibility`
- `temperature_2m`
- `dew_point_2m`
- `wind_speed_10m`
- `wind_direction_10m`
- `pm2_5`
- `aerosol_optical_depth`

Daily inputs used:

- `sunrise`
- `sunset`
- `precipitation_sum`

### Scoring Window

- Sunset window: `2 hours before sunset` to `30 minutes after sunset`
- Rain lookback: prior `6 to 24 hours`

### Output

Each day returns:

- score `0–100`
- label
- explanation
- reason chips
- factor breakdown
- normalized sunset window snapshot
- preview values for mini visual rendering

### Labels

- `0–24` → `Poor`
- `25–44` → `Decent`
- `45–64` → `Good`
- `65–84` → `Great`
- `85–100` → `Unreal`

### Major Scoring Factors

Implemented in [lib/scoreSunset.ts](/Users/aditya/Desktop/IVSunsets/lib/scoreSunset.ts).

- high cloud support
- mid cloud support
- texture support
- low cloud penalty
- recent rain bonus
- contrast bonus
- dew point spread modifier
- wind modifier
- clarity / haze modifier
- baseline score

## API Behavior

Forecast data is served from [app/api/forecast/route.ts](/Users/aditya/Desktop/IVSunsets/app/api/forecast/route.ts).

Behavior:

- primary source is Open-Meteo
- air-quality data is fetched in parallel
- local pulse data is attached to the payload
- API responses are normalized into a shared frontend shape
- fallback forecast data is returned if upstream fetches fail
- `forceFallback=1` can be used to test fallback mode explicitly

Client fetching is handled in [lib/fetchForecast.ts](/Users/aditya/Desktop/IVSunsets/lib/fetchForecast.ts).

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lenis
- Lucide React
- Leaflet for map-based sunset spots
- `d3-shape` for the current shoreline SVG path generation
- Playwright for smoke tests

## Project Structure

```text
app/
  api/forecast/route.ts       Server forecast endpoint
  how-it-works/page.tsx       Secondary explainer page
  page.tsx                    Main homepage carousel

components/
  CircularCarousel.tsx        Main section navigation shell
  ForecastCard.tsx            Single forecast day card
  ForecastGrid.tsx            6-day forecast section
  HeroShoreline.tsx           SVG shoreline illustration for the hero
  HeroSky.tsx                 Shared hero visual utility
  Navbar.tsx                  Top-level navigation
  ScoreBreakdown.tsx          Factor explanation UI
  ScrollyExplainer.tsx        Scroll narrative section
  SkyBirds.tsx                Messenger gull + background bird animation
  SkyCanvas.tsx               Canvas sky rendering
  SmoothScrollProvider.tsx    Smooth scroll wrapper
  SpotlightFeature.tsx        Supporting spotlight UI
  SunsetCountdown.tsx         "Should I go?" section
  SunsetMap.tsx               Map rendering for spots
  SunsetSimulator.tsx         Interactive simulator / lab
  SunsetSpots.tsx             Viewing spots section
  TonightCard.tsx             Main hero card and shoreline composition

lib/
  fetchForecast.ts            Client fetch wrapper
  localPulse.ts               Local pulse fetch / shaping
  normalizeForecast.ts        Open-Meteo normalization + fallback data
  scoreSunset.ts              Sunset scoring heuristic
  types.ts                    Shared payload and domain types
  utils.ts                    General helpers

scripts/
  smoke-test.mjs              Playwright smoke coverage
```

## Running It

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Next.js will print the local development URL in your terminal.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run smoke
```

## Validation

Current verification flow:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

`npm run smoke` checks the main flows:

- homepage loads
- desktop viewport renders
- mobile viewport renders
- reduced motion mode works
- messenger gull loop appears
- carousel navigation works
- no obvious runtime console errors appear

## Notes

- The forecast model is intentionally heuristic.
- The visual design has been iterated heavily toward a premium editorial coastal illustration rather than a dashboard.
- The current production deployment is Vercel-backed and GitHub-connected.
