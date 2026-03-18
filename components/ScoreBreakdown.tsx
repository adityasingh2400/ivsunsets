"use client";

import { motion } from "framer-motion";
import { CloudFog, CloudRain, CloudSun, Droplets, Eye, Layers3, Sparkles, Thermometer, Wind } from "lucide-react";
import { type ComponentType } from "react";
import type { ForecastDay } from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

interface ScoreBreakdownProps {
  today: ForecastDay;
}

interface BreakdownFactor {
  title: string;
  value: number;
  impact: number;
  meterValue: number;
  isPenalty: boolean;
  Icon: ComponentType<{ className?: string }>;
  body: string;
  metricLabel: string;
}

function compassDirection(degrees: number) {
  const headings = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  return headings[Math.round(normalized / 45) % headings.length];
}

function toneFromFactor(factor: BreakdownFactor) {
  if (factor.isPenalty) {
    if (factor.impact >= 16) {
      return { label: "Hurting", color: "text-rose-200" };
    }

    if (factor.impact >= 7) {
      return { label: "Risky", color: "text-orange-100" };
    }

    return { label: "Contained", color: "text-emerald-100" };
  }

  if (factor.impact >= 14) {
    return { label: "Helping", color: "text-cyan-100" };
  }

  if (factor.impact >= 5) {
    return { label: "Contributing", color: "text-indigo-100" };
  }

  return { label: "Weak", color: "text-white/70" };
}

function impactLabel(factor: BreakdownFactor) {
  const value = roundTo(factor.impact, 1);
  return factor.isPenalty ? `-${value}` : `+${value}`;
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
  const factors: BreakdownFactor[] = [
    {
      title: "High clouds",
      value: today.factors.highCloud,
      impact: today.factorBreakdown.highCloudContribution,
      meterValue: today.factors.highCloud,
      Icon: CloudSun,
      isPenalty: false,
      body:
        today.factors.highCloud >= 25 && today.factors.highCloud <= 65
          ? "Upper wisps are in the sweet spot to catch warm light."
          : "Upper cloud coverage is outside the most photogenic range.",
      metricLabel: `${roundTo(today.factors.highCloud, 1)}% in sunset window`,
    },
    {
      title: "Mid clouds",
      value: today.factors.midCloud,
      impact: today.factorBreakdown.midCloudContribution,
      meterValue: today.factors.midCloud,
      Icon: Layers3,
      isPenalty: false,
      body:
        today.factors.midCloud >= 20 && today.factors.midCloud <= 60
          ? "Mid-level texture adds depth and layered color gradients."
          : "Mid-layer structure is limited, so depth may feel flatter.",
      metricLabel: `${roundTo(today.factors.midCloud, 1)}% in sunset window`,
    },
    {
      title: "Low clouds",
      value: today.factors.lowCloud,
      impact: today.factorBreakdown.lowCloudPenalty,
      meterValue: today.factors.lowCloud,
      Icon: CloudFog,
      isPenalty: true,
      body:
        today.factorBreakdown.lowCloudPenalty < 10
          ? "Marine layer pressure is relatively contained near the horizon."
          : "Low cloud cover can block horizon light and mute strong glow.",
      metricLabel: `${roundTo(today.factors.lowCloud, 1)}% in sunset window`,
    },
    {
      title: "Recent rain",
      value: today.factors.recentRain,
      impact: today.factorBreakdown.rainBonus,
      meterValue: clamp((today.factors.recentRain / 6) * 100, 0, 100),
      Icon: CloudRain,
      isPenalty: false,
      body:
        today.factorBreakdown.rainBonus >= 2
          ? "Recent moisture plus clearing can sharpen contrast and saturation."
          : "Rain signal is low, so this factor likely has little influence.",
      metricLabel: `${roundTo(today.factors.recentRain, 2)} mm prior rain`,
    },
    {
      title: "Saturation",
      value: today.factors.dewPointSpread,
      impact: Math.abs(today.factorBreakdown.dewPointModifier),
      meterValue: today.factorBreakdown.dewPointModifier < 0
        ? clamp(((4 - today.factors.dewPointSpread) / 4) * 100, 0, 100)
        : clamp((today.factors.dewPointSpread / 12) * 100, 0, 100),
      Icon: Droplets,
      isPenalty: today.factorBreakdown.dewPointModifier < 0,
      body:
        today.factorBreakdown.dewPointModifier < -2.5
          ? "Temperature and dew point are crowding together, which raises fog and horizon haze risk."
          : today.factorBreakdown.dewPointModifier >= 1
            ? "A healthier temperature-to-dew-point gap helps keep the low-level air from saturating."
            : "Low-level moisture looks fairly neutral right now.",
      metricLabel: `${roundTo(today.factors.dewPointSpread, 1)}°C temp/dew-point spread`,
    },
    {
      title: "Wind",
      value: today.factors.windSpeed,
      impact: Math.abs(today.factorBreakdown.windModifier),
      meterValue: clamp((today.factors.windSpeed / 28) * 100, 0, 100),
      Icon: Wind,
      isPenalty: today.factorBreakdown.windModifier < 0,
      body:
        today.factorBreakdown.windModifier >= 2.5
          ? "Offshore or cross-shore flow may help keep the marine layer pushed back from the sunset line."
          : today.factorBreakdown.windModifier <= -2.5
            ? "Onshore flow can drag marine haze and low cloud back toward the horizon."
            : "Wind direction looks mixed enough that it probably will not dominate the outcome.",
      metricLabel: `${roundTo(today.factors.windSpeed, 1)} km/h from ${compassDirection(today.factors.windDirection)}`,
    },
    {
      title: "Clarity",
      value: today.factors.visibility,
      impact: Math.abs(today.factorBreakdown.clarityModifier),
      meterValue: today.factorBreakdown.clarityModifier < 0
        ? clamp(
            ((Math.max(0, 12 - today.factors.visibility) / 12) * 45) +
              ((Math.max(0, today.factors.pm25 - 12) / 25) * 35) +
              ((Math.max(0, today.factors.aerosolOpticalDepth - 0.12) / 0.18) * 20),
            0,
            100,
          )
        : clamp(
            ((today.factors.visibility / 40) * 70) +
              ((Math.max(0, 12 - today.factors.pm25) / 12) * 30),
            0,
            100,
          ),
      Icon: Eye,
      isPenalty: today.factorBreakdown.clarityModifier < 0,
      body:
        today.factorBreakdown.clarityModifier < -2
          ? "Poor visibility or elevated particulates are likely muting color and contrast."
          : today.factorBreakdown.clarityModifier >= 2
            ? "Clean air and good visibility should help the warm tones stay crisp."
            : "Clarity looks moderate, so haze probably stays a secondary factor tonight.",
      metricLabel: `${roundTo(today.factors.visibility, 1)} km vis · PM2.5 ${roundTo(today.factors.pm25, 1)} μg/m³ · AOD ${roundTo(today.factors.aerosolOpticalDepth, 2)}`,
    },
    {
      title: "Humidity",
      value: today.factors.relativeHumidity,
      impact: Math.abs(today.factorBreakdown.humidityModifier),
      meterValue: today.factors.relativeHumidity,
      Icon: Thermometer,
      isPenalty: today.factorBreakdown.humidityModifier < 0,
      body:
        today.factorBreakdown.humidityModifier >= 2
          ? "Dry lower atmosphere keeps Rayleigh scattering pure and colors vivid."
          : today.factorBreakdown.humidityModifier <= -2
            ? "High surface humidity can wash out horizon contrast and mute warm tones."
            : "Surface moisture levels look neutral for color quality.",
      metricLabel: `${roundTo(today.factors.relativeHumidity, 0)}% relative humidity`,
    },
  ];

  const veryClearSetup =
    today.factors.highCloud < 8 &&
    today.factors.midCloud < 8 &&
    today.factors.totalCloud < 12;

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
          We evaluate the sky from 2 hours before sunset to 30 minutes after. Ring fill
          shows measured signal. The impact number shows how much each factor shifted
          tonight&apos;s score.
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
          {today.sunsetWindow.hourlyCount === 1 ? "" : "s"} near sunset
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
                    {factor.title === "Recent rain"
                      ? `${roundTo(factor.value, 1)}mm`
                      : factor.title === "Visibility"
                        ? `${roundTo(factor.value, 0)}km`
                        : `${Math.round(factor.value)}%`}
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
