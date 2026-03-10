"use client";

import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircularCarousel,
  type CarouselSection,
} from "@/components/CircularCarousel";
import { ForecastGrid } from "@/components/ForecastGrid";
import { SunsetCountdown } from "@/components/SunsetCountdown";
import { SunsetSimulator } from "@/components/SunsetSimulator";
import { SunsetSpots } from "@/components/SunsetSpots";
import { TonightCard } from "@/components/TonightCard";
import { fetchForecast } from "@/lib/fetchForecast";
import type { ForecastPayload } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Loading / error states                                             */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040610] text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
    </main>
  );
}

function ErrorScreen({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#040610] px-6 text-white">
      <div className="max-w-lg rounded-3xl border border-rose-300/25 bg-rose-200/10 p-6 text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-rose-100">
          <AlertCircle className="h-4 w-4" />
          Forecast unavailable
        </p>
        <p className="mb-4 text-sm text-white/70">
          We could not load the sunset forecast right now.
          {error ? ` (${error})` : ""}
        </p>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          onClick={onRetry}
        >
          Try again
        </button>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [payload, setPayload] = useState<ForecastPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const next = await fetchForecast(signal);
      setPayload(next);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load forecast right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadForecast(ac.signal);
    return () => ac.abort();
  }, [loadForecast]);

  const bestDayDate = useMemo(() => {
    if (!payload?.days?.length) return null;
    return payload.days.reduce((b, d) => (d.score > b.score ? d : b)).date;
  }, [payload]);

  /* ---------- Guards ---------- */
  if (isLoading && !payload) return <LoadingSkeleton />;
  if (!payload?.today)
    return <ErrorScreen error={error} onRetry={() => loadForecast()} />;

  /* ---------- Carousel sections ---------- */
  const sections: CarouselSection[] = [
    {
      id: "tonight",
      label: "Tonight's sunset",
      glowColor: "rgba(255,160,100,0.07)",
      content: <TonightCard today={payload.today} pulse={payload.localPulse.items} />,
    },
    {
      id: "countdown",
      label: "Should I go?",
      glowColor: "rgba(255,196,136,0.12)",
      content: <SunsetCountdown today={payload.today} bare />,
    },
    {
      id: "forecast",
      label: "6-day outlook",
      glowColor: "rgba(142,188,255,0.12)",
      content: (
        <ForecastGrid days={payload.days} bestDate={bestDayDate} />
      ),
    },
    {
      id: "simulator",
      label: "Sunset lab",
      glowColor: "rgba(255,156,146,0.12)",
      content: <SunsetSimulator initialFactors={payload.today.factors} bare />,
    },
    {
      id: "spots",
      label: "Where to watch",
      glowColor: "rgba(106,170,255,0.12)",
      content: <SunsetSpots bare today={payload.today} />,
    },
  ];

  return (
    <main className="overflow-x-clip bg-[#040610] text-white">
      <CircularCarousel sections={sections} />

      <footer className="border-t border-white/10 px-6 py-8 text-xs text-white/55 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>
            IV Sunsets | Source:{" "}
            {payload.source === "open-meteo" ? "Open-Meteo" : "Fallback model"}
          </p>
          <p>
            Updated {new Date(payload.generatedAt).toLocaleString("en-US")}
          </p>
        </div>
      </footer>
    </main>
  );
}
