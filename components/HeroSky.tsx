"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Sparkles, Sunset } from "lucide-react";
import type { ForecastDay } from "@/lib/types";
import { SkyCanvas } from "@/components/SkyCanvas";

interface HeroSkyProps {
  today: ForecastDay;
}

function heroTitle(score: number) {
  if (score >= 85) {
    return "Tonight could glow.";
  }

  if (score >= 65) {
    return "Golden hour has teeth tonight.";
  }

  if (score >= 45) {
    return "A decent Isla Vista fade is on deck.";
  }

  if (score >= 25) {
    return "The sky might tease us tonight.";
  }

  return "Tonight stays muted.";
}

function heroSubtitle(label: ForecastDay["label"]) {
  if (label === "Unreal") {
    return "Unreal chance of a vibrant sunset.";
  }

  if (label === "Great") {
    return "Great chance of a vibrant sunset.";
  }

  if (label === "Good") {
    return "Good chance of color and texture.";
  }

  if (label === "Decent") {
    return "Decent chance, but not a lock.";
  }

  return "Poor chance of a dramatic glow.";
}

export function HeroSky({ today }: HeroSkyProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      <SkyCanvas
        className="absolute inset-0"
        score={today.score}
        highCloud={today.factors.highCloud}
        midCloud={today.factors.midCloud}
        lowCloud={today.factors.lowCloud}
        totalCloud={today.factors.totalCloud}
        rain={today.factors.recentRain}
      />

      <motion.div
        className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,180,126,0.45),rgba(255,180,126,0))] blur-3xl"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, 22, 0], y: [0, -18, 0], opacity: [0.35, 0.55, 0.35] }
        }
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-14 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(124,165,255,0.34),rgba(124,165,255,0))] blur-3xl"
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, -16, 0], y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(255,193,130,0.25),transparent_40%),linear-gradient(to_bottom,rgba(5,8,20,0.08),rgba(5,8,20,0.82))]" />
      <div className="sunset-noise absolute inset-0" />

      <motion.div
        className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-24 md:px-10 md:pb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-4xl space-y-8">
          <motion.p
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-md"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <Sparkles className="h-4 w-4" />
            Tonight&apos;s sunset sentiment
          </motion.p>

          <motion.h1
            className="max-w-2xl text-5xl leading-[0.95] tracking-tight text-white md:text-7xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
          >
            {heroTitle(today.score)}
          </motion.h1>

          <motion.div
            className="grid gap-6 rounded-[1.75rem] border border-white/18 bg-black/26 p-5 text-white shadow-[0_18px_64px_rgba(2,7,24,0.35)] backdrop-blur-xl sm:grid-cols-[auto_1fr] sm:items-end sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7 }}
          >
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-white/56">Tonight score</p>
              <span className="block bg-[linear-gradient(to_bottom,#fff,#ffe2b0)] bg-clip-text text-7xl font-semibold leading-none text-transparent md:text-8xl">
                {today.score}
              </span>
              <p className="inline-flex w-fit rounded-full border border-amber-100/35 bg-amber-100/10 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-amber-100/90">
                {today.label}
              </p>
            </div>
            <div className="space-y-3 pb-1">
              <p className="text-lg text-white/92">{heroSubtitle(today.label)}</p>
              <p className="inline-flex items-center gap-2 text-sm text-white/76">
                <Sunset className="h-4 w-4" />
                Sunset at {today.sunsetTime}
              </p>
              <div className="h-px w-full bg-gradient-to-r from-white/35 via-white/18 to-transparent" />
              <p className="text-sm text-white/68">{today.explanation}</p>
            </div>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.65 }}
          >
            {today.reasonChips.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs tracking-wide text-white/92 backdrop-blur-md md:text-sm"
              >
                {reason}
              </span>
            ))}
          </motion.div>
        </div>

        <a
          href="#forecast"
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm text-white/90 backdrop-blur transition hover:bg-black/35"
        >
          Explore next days
          <ArrowDown className="h-4 w-4 transition group-hover:translate-y-0.5" />
        </a>
      </motion.div>
    </section>
  );
}
