"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react";
import { type ComponentType } from "react";
import type { ForecastDay } from "@/lib/types";
import { clamp, compassDirection, roundTo } from "@/lib/utils";

interface ScoreBreakdownProps {
  today: ForecastDay;
}

interface BreakdownFactor {
  title: string;
  centerLabel: string;
  impact: number;
  meterValue: number;
  isPenalty: boolean;
  Icon: ComponentType<{ className?: string }>;
  body: string;
  metricLabel: string;
}

function toneFromFactor(factor: BreakdownFactor) {
  const magnitude = Math.abs(factor.impact);

  if (factor.isPenalty) {
    if (magnitude >= 16) {
      return { label: "Hurting", color: "text-rose-200" };
    }

    if (magnitude >= 7) {
      return { label: "Risky", color: "text-orange-100" };
    }

    return { label: "Contained", color: "text-emerald-100" };
  }

  if (magnitude >= 14) {
    return { label: "Helping", color: "text-cyan-100" };
  }

  if (magnitude >= 5) {
    return { label: "Contributing", color: "text-indigo-100" };
  }

  return { label: "Weak", color: "text-white/70" };
}

function impactLabel(factor: BreakdownFactor) {
  const value = roundTo(Math.abs(factor.impact), 1);
  return factor.isPenalty || factor.impact < 0 ? `-${value}` : `+${value}`;
}

function ringStyle(factor: BreakdownFactor) {
  const amount = clamp(factor.meterValue, 0, 100);
  const degrees = Math.round(amount * 3.6);

  if (factor.isPenalty) {
    return {
      background: `conic-gradient(rgba(255,126,143,0.95) 0deg ${degrees}deg, rgba(255,255,255,0.11) ${degrees}deg 360deg)`,
    };
  }

  return {
    background: `conic-gradient(rgba(130,226,255,0.95) 0deg ${degrees}deg, rgba(255,255,255,0.11) ${degrees}deg 360deg)`,
  };
}

export function ScoreBreakdown({ today }: ScoreBreakdownProps) {
  const bd = today.factorBreakdown;
  const f = today.factors;

  const factors: BreakdownFactor[] = [
    {
      title: "Cloud canvas",
      centerLabel: `${Math.round(bd.canvas * 100)}%`,
      impact: bd.cloudCanvas,
      meterValue: bd.canvas * 100,
      Icon: CloudSun,
      isPenalty: false,
      body:
        bd.canvas >= 0.55
          ? "Plenty of high and mid cloud to catch the post-sunset light — the show has a stage."
          : bd.canvas >= 0.2
            ? "Some paintable cloud overhead, but the canvas is thin in places."
            : "Very little high or mid cloud — color has almost nothing to land on.",
      metricLabel: `${roundTo(f.highCloud, 1)}% high · ${roundTo(f.midCloud, 1)}% mid in sunset window`,
    },
    {
      title: "Marine layer overhead",
      centerLabel: `${Math.round(f.lowCloud)}%`,
      impact: bd.marineLayerPenalty,
      meterValue: f.lowCloud,
      Icon: CloudFog,
      isPenalty: true,
      body:
        bd.marineLayerPenalty < 8
          ? "Low cloud over the bluffs is contained — the horizon line should stay visible."
          : "Low cloud over IV itself is blocking the horizon, and no upper sky can fix that.",
      metricLabel: `${roundTo(f.lowCloud, 1)}% low cloud in sunset window`,
    },
    {
      title: "Offshore light path",
      centerLabel: `${Math.round(f.horizonLowCloud)}%`,
      impact: bd.horizonPenalty,
      meterValue: f.horizonLowCloud,
      Icon: Waves,
      isPenalty: true,
      body:
        bd.horizonPenalty < 6
          ? "The water west of IV looks open, so sunset light can travel in under the clouds."
          : "A marine layer offshore sits on the light path — color may die over the channel before reaching IV.",
      metricLabel: `${roundTo(f.horizonLowCloud, 1)}% low cloud ~30 km west of IV`,
    },
    {
      title: "Overcast ceiling",
      centerLabel: `${Math.round(f.totalCloud)}%`,
      impact: bd.overcastPenalty,
      meterValue: f.totalCloud,
      Icon: Cloud,
      isPenalty: true,
      body:
        bd.overcastPenalty < 6
          ? "Total cover leaves gaps for light to thread through."
          : "The deck is close to solid — even good cloud texture goes dark under a sealed ceiling.",
      metricLabel: `${roundTo(f.totalCloud, 1)}% total cloud in sunset window`,
    },
    {
      title: "Fog & saturation",
      centerLabel: `${roundTo(f.dewPointSpread, 1)}°C`,
      impact: bd.fogPenalty,
      meterValue: clamp(((4.5 - f.dewPointSpread) / 4.5) * 100, 0, 100),
      Icon: Droplets,
      isPenalty: true,
      body:
        bd.fogPenalty < 4
          ? "The air has a healthy temperature-to-dew-point gap, so fog risk is low."
          : "Temperature and dew point are crowding together — fog and horizon murk are a real threat.",
      metricLabel: `${roundTo(f.dewPointSpread, 1)}°C spread · ${roundTo(f.relativeHumidity, 0)}% RH · ${roundTo(f.visibility, 1)} km vis`,
    },
    {
      title: "Air vividness",
      centerLabel: `${roundTo(f.visibility, 0)}km`,
      impact: bd.vividnessModifier,
      meterValue:
        bd.vividnessModifier < 0
          ? clamp(
              ((Math.max(0, 11 - f.visibility) / 11) * 40) +
                ((Math.max(0, f.pm25 - 15) / 25) * 40) +
                ((Math.max(0, f.aerosolOpticalDepth - 0.28) / 0.27) * 20),
              0,
              100,
            )
          : clamp(((f.visibility / 35) * 60) + ((Math.max(0, 12 - f.pm25) / 12) * 40), 0, 100),
      Icon: Eye,
      isPenalty: bd.vividnessModifier < 0,
      body:
        bd.vividnessModifier <= -3
          ? "Haze, smoke or muggy air is muting saturation — colors will look washed."
          : bd.vividnessModifier >= 2
            ? "Clean air with just enough aerosol to deepen the reds — color should stay crisp."
            : "Air clarity is roughly neutral tonight.",
      metricLabel: `${roundTo(f.visibility, 1)} km vis · PM2.5 ${roundTo(f.pm25, 1)} μg/m³ · AOD ${roundTo(f.aerosolOpticalDepth, 2)}`,
    },
    {
      title: "Wind",
      centerLabel: `${roundTo(f.windSpeed, 0)}km/h`,
      impact: bd.windModifier,
      meterValue: clamp((f.windSpeed / 28) * 100, 0, 100),
      Icon: Wind,
      isPenalty: bd.windModifier < 0,
      body:
        bd.windModifier >= 2.5
          ? "Offshore (sundowner-style) flow is helping push the marine layer off the horizon."
          : bd.windModifier <= -2.5
            ? "Onshore flow can drag marine haze and low cloud back toward the sunset line."
            : "Wind looks mixed enough that it probably will not decide the outcome.",
      metricLabel: `${roundTo(f.windSpeed, 1)} km/h from ${compassDirection(f.windDirection)}`,
    },
    {
      title: "Rain clearing",
      centerLabel: `${roundTo(f.recentRain, 1)}mm`,
      impact: bd.rainBonus,
      meterValue: clamp((f.recentRain / 6) * 100, 0, 100),
      Icon: CloudRain,
      isPenalty: false,
      body:
        bd.rainBonus >= 2
          ? "Recent rain has scrubbed the air — post-storm clearing is the classic IV banger setup."
          : "Rain signal is low, so this factor likely has little influence tonight.",
      metricLabel: `${roundTo(f.recentRain, 2)} mm in the day before sunset`,
    },
  ];

  const veryClearSetup =
    f.highCloud < 8 && f.midCloud < 8 && f.totalCloud < 12;

  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-24 md:px-10" id="breakdown">
      <div className="pointer-events-none absolute -right-24 top-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,170,123,0.14),rgba(255,170,123,0))] blur-3xl" />

      <motion.div
        className="mb-10 max-w-4xl"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
      >
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-white/58">
          Why tonight looks like this
        </p>
        <h2 className="text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
          A clear read on what&apos;s helping or hurting.
        </h2>
        <p className="mt-5 max-w-3xl text-sm text-white/70 md:text-base">
          We evaluate the sky from 2 hours before sunset to 30 minutes after —
          including the air over the water west of IV, where the sunset light
          actually travels. Ring fill shows measured signal; the number shows
          how many points each factor moved tonight&apos;s score.
        </p>
      </motion.div>

      <motion.div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/12 bg-white/[0.035] px-4 py-3 text-sm text-white/68"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.45 }}
      >
        <p>
          Data quality: {today.sunsetWindow.hourlyCount} hourly sample
          {today.sunsetWindow.hourlyCount === 1 ? "" : "s"} near sunset · light
          path {Math.round(bd.lightPath * 100)}% open
        </p>
        <p className="inline-flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          {today.label} setup ({today.score}/100)
        </p>
      </motion.div>

      {veryClearSetup ? (
        <div className="mb-6 rounded-2xl border border-cyan-200/20 bg-cyan-100/8 px-4 py-3 text-sm text-cyan-100/90">
          Sky signals are near-zero because tonight looks unusually clear, not because data is missing.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {factors.map((factor, index) => {
          const tone = toneFromFactor(factor);

          return (
            <motion.article
              key={factor.title}
              className="rounded-3xl border border-white/12 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(2,6,18,0.35)] backdrop-blur-xl"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
            >
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div
                  className="relative h-20 w-20 rounded-full p-[5px]"
                  style={ringStyle(factor)}
                  aria-hidden="true"
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#070d1f] text-[11px] uppercase tracking-[0.14em] text-white/65">
                    {factor.centerLabel}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-base text-white/92">
                      <factor.Icon className="h-4 w-4 text-white/72" />
                      {factor.title}
                    </p>
                    <div className="text-right leading-tight">
                      <p className={`text-xs uppercase tracking-[0.16em] ${tone.color}`}>
                        {tone.label}
                      </p>
                      <p className="text-2xl font-semibold text-white">{impactLabel(factor)}</p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-white/70">{factor.body}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/52">
                    {factor.metricLabel}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
