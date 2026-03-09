"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ForecastDay, SunsetRating } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SpotlightFeatureProps {
  today: ForecastDay;
  bare?: boolean;
}

interface StoredRating {
  date: string;
  rating: SunsetRating;
  predictedScore: number;
  createdAt: string;
}

const STORAGE_KEY = "iv-glow-ratings-v1";

const ratingOptions: Array<{ id: SunsetRating; label: string; vibe: string }> = [
  { id: "bland", label: "Bland", vibe: "Not much color." },
  { id: "decent", label: "Decent", vibe: "Pretty, but light." },
  { id: "beautiful", label: "Beautiful", vibe: "Lovely glow and depth." },
  { id: "unreal", label: "Unreal", vibe: "Absolutely electric." },
];

function loadRatings() {
  if (typeof window === "undefined") {
    return [] as StoredRating[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredRating[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SpotlightFeature({ today, bare }: SpotlightFeatureProps) {
  const [ratings, setRatings] = useState<StoredRating[]>(() => loadRatings());
  const [nowMillis, setNowMillis] = useState<number>(0);

  useEffect(() => {
    const initialTimerId = window.setTimeout(() => {
      setNowMillis(Date.now());
    }, 0);

    const intervalId = window.setInterval(() => {
      setNowMillis(Date.now());
    }, 60_000);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
    };
  }, []);

  const sunsetMillis = Date.parse(today.sunsetISO);
  const canRate = Number.isFinite(sunsetMillis)
    ? nowMillis >= sunsetMillis
    : true;

  const todaysRating = useMemo(() => {
    return ratings.find((entry) => entry.date === today.date)?.rating ?? null;
  }, [ratings, today.date]);

  const submitRating = (rating: SunsetRating) => {
    if (!canRate) {
      return;
    }

    const nextEntry: StoredRating = {
      date: today.date,
      rating,
      predictedScore: today.score,
      createdAt: new Date().toISOString(),
    };

    const nextRatings = [...ratings.filter((entry) => entry.date !== today.date), nextEntry];
    setRatings(nextRatings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRatings));
  };

  return (
    <section className={bare ? "flex w-full flex-1 flex-col bg-[#040610]" : "mx-auto w-full max-w-6xl px-6 pb-28 pt-20 md:px-10"} id="feedback">
      <motion.div
        className={bare ? "relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-8 md:px-12 lg:px-20" : "relative overflow-hidden rounded-[2rem] border border-white/14 bg-white/[0.04] p-6 md:p-8"}
        initial={bare ? false : { opacity: 0, y: 22 }}
        whileInView={bare ? undefined : { opacity: 1, y: 0 }}
        viewport={bare ? undefined : { once: true, amount: 0.35 }}
        transition={bare ? undefined : { duration: 0.55 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,180,133,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(126,161,255,0.15),transparent_35%)]" />

        <div className="relative mx-auto w-full max-w-5xl space-y-6">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-white/56">How was it actually?</p>
            <h2 className="text-3xl leading-tight text-white md:text-5xl">
              Rate tonight after sunset.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              We&apos;re learning what really makes IV glow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ratingOptions.map((option) => {
              const isSelected = todaysRating === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => submitRating(option.id)}
                  disabled={!canRate}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    isSelected
                      ? "border-amber-100/40 bg-amber-100/10"
                      : "border-white/14 bg-white/[0.02] hover:bg-white/[0.08]",
                    !canRate && "cursor-not-allowed opacity-60",
                  )}
                >
                  <p className="mb-1 flex items-center justify-between text-white">
                    <span>{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </p>
                  <p className="text-xs text-white/65">{option.vibe}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white/72">
            <p>
              {canRate
                ? "Ratings are open for tonight."
                : `Ratings unlock after sunset (${today.sunsetTime}).`}
            </p>
            <p className="inline-flex items-center gap-1.5 text-white/60">
              <Sparkles className="h-4 w-4" />
              {ratings.length} local rating{ratings.length === 1 ? "" : "s"} logged
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
