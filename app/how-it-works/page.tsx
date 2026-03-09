"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CloudSun, Database, Layers3, MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScrollyExplainer } from "@/components/ScrollyExplainer";
import { SunsetSimulator } from "@/components/SunsetSimulator";
import { fetchForecast } from "@/lib/fetchForecast";
import type { ForecastPayload } from "@/lib/types";

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-[#040610] px-6 py-24 text-white md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-6 w-96 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-[50vh] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      </div>
    </main>
  );
}

export default function HowItWorksPage() {
  const [payload, setPayload] = useState<ForecastPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const data = await fetchForecast(signal);
      setPayload(data);
    } catch {
      /* fallback will still work */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (isLoading && !payload) return <LoadingSkeleton />;

  if (!payload?.today) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#040610] px-6 text-white">
        <div className="text-center">
          <p className="mb-4 text-white/70">Could not load forecast data.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to forecast
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="overflow-x-clip bg-[#040610] text-white">
      {/* Hero header */}
      <section className="relative overflow-hidden pb-8 pt-28 md:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,180,130,0.08),transparent_40%),radial-gradient(circle_at_70%_10%,rgba(130,160,255,0.1),transparent_40%)]" />

        <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl space-y-5"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">
              Behind the index
            </p>
            <h1 className="text-5xl leading-[0.92] tracking-tight text-white md:text-7xl">
              How we predict sunset quality.
            </h1>
            <p className="max-w-2xl text-base text-white/65 md:text-lg">
              Isla Vista sits on a west-facing coastline with unobstructed ocean
              horizons — ideal for sunset watching. We use real-time weather data
              and a tuned heuristic to predict how vibrant each evening will be.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Scrollytelling chapters */}
      <ScrollyExplainer today={payload.today} />

      {/* Divider */}
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Score breakdown for tonight */}
      <ScoreBreakdown today={payload.today} />

      {/* Divider */}
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Build your own sunset */}
      <SunsetSimulator initialFactors={payload.today.factors} />

      {/* Divider */}
      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      {/* Technical / data sources section */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="mb-12 max-w-3xl space-y-4"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">
            Under the hood
          </p>
          <h2 className="text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
            Where the data comes from.
          </h2>
          <p className="text-sm text-white/65 md:text-base">
            We pull hourly forecast data from the Open-Meteo weather API, then
            run our scoring heuristic on the sunset window for each day.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 space-y-4"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0, duration: 0.45 }}
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
              <Database className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="text-xl text-white">Open-Meteo API</h3>
            <p className="text-sm leading-relaxed text-white/65">
              Free, open-source weather API. We fetch hourly <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">cloud_cover</code>,{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">cloud_cover_low</code>,{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">cloud_cover_mid</code>,{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">cloud_cover_high</code>, and{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">precipitation</code>{" "}
              along with daily sunrise/sunset times.
            </p>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 space-y-4"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08, duration: 0.45 }}
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
              <MapPin className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="text-xl text-white">Isla Vista location</h3>
            <p className="text-sm leading-relaxed text-white/65">
              Pinned to <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">34.4133°N, 119.861°W</code> in the{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">America/Los_Angeles</code> timezone.
              West-facing coastal bluffs give a clean ocean horizon — one of the
              best natural vantage points in Southern California.
            </p>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 space-y-4"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16, duration: 0.45 }}
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
              <CloudSun className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="text-xl text-white">Sunset window</h3>
            <p className="text-sm leading-relaxed text-white/65">
              We evaluate conditions from <strong className="text-white/80">2 hours before</strong> to{" "}
              <strong className="text-white/80">30 minutes after</strong> the
              official sunset time. Cloud averages and precipitation totals are
              computed across this window to capture the golden hour conditions.
            </p>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 space-y-4"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.24, duration: 0.45 }}
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
              <Layers3 className="h-5 w-5 text-white/70" />
            </div>
            <h3 className="text-xl text-white">Scoring weights</h3>
            <p className="text-sm leading-relaxed text-white/65">
              High cloud support contributes up to ~32 points, mid clouds ~24,
              texture ~14, with low clouds penalizing up to ~34 points. Recent
              rain adds a bonus up to ~8 and texture contrast up to ~6. Baseline
              is 20 points for a clear sky.
            </p>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 space-y-4 md:col-span-2 lg:col-span-2"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.32, duration: 0.45 }}
          >
            <h3 className="text-xl text-white">Score labels</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Poor", range: "0–24", color: "border-white/15 text-white/60" },
                { label: "Decent", range: "25–44", color: "border-white/20 text-white/70" },
                { label: "Good", range: "45–64", color: "border-cyan-200/25 text-cyan-100/80" },
                { label: "Great", range: "65–84", color: "border-amber-200/30 text-amber-100/80" },
                { label: "Unreal", range: "85–100", color: "border-orange-200/35 text-orange-100/90" },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1.5 text-sm ${item.color}`}
                >
                  {item.label} <span className="text-white/40">{item.range}</span>
                </span>
              ))}
            </div>
            <p className="text-sm text-white/60">
              Data refreshes every ~15 minutes with a stale-while-revalidate
              strategy. If the Open-Meteo API is unreachable, we fall back to a
              locally cached mock forecast.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-xs text-white/50 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>IV Sunsets — How it works</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/60 transition hover:text-white/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to forecast
          </Link>
        </div>
      </footer>
    </main>
  );
}
