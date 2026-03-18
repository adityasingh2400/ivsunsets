"use client";

import { motion } from "framer-motion";
import { Cloud, CloudFog, CloudRain, CloudSun, Droplets, Eye, Layers3, RotateCcw, SlidersHorizontal, Wind } from "lucide-react";
import { type ComponentType, useMemo, useState } from "react";
import type { SunsetInputFactors } from "@/lib/types";
import { calculateSunsetScore } from "@/lib/scoreSunset";
import { cn, roundTo } from "@/lib/utils";
import { SkyCanvas } from "@/components/SkyCanvas";

interface SunsetSimulatorProps {
  initialFactors: SunsetInputFactors;
  bare?: boolean;
}

interface SliderConfig {
  key: keyof SunsetInputFactors;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  Icon: ComponentType<{ className?: string }>;
}

const sliderConfig: SliderConfig[] = [
  { key: "highCloud", label: "High clouds", min: 0, max: 100, step: 1, unit: "%", Icon: CloudSun },
  { key: "midCloud", label: "Mid clouds", min: 0, max: 100, step: 1, unit: "%", Icon: Layers3 },
  { key: "lowCloud", label: "Low clouds", min: 0, max: 100, step: 1, unit: "%", Icon: CloudFog },
  { key: "totalCloud", label: "Total cloudiness", min: 0, max: 100, step: 1, unit: "%", Icon: Cloud },
  { key: "recentRain", label: "Recent rain", min: 0, max: 8, step: 0.1, unit: "mm", Icon: CloudRain },
  { key: "dewPointSpread", label: "Dew point spread", min: 0, max: 15, step: 0.1, unit: "°C", Icon: Droplets },
  { key: "relativeHumidity", label: "Relative humidity", min: 10, max: 100, step: 1, unit: "%", Icon: Droplets },
  { key: "visibility", label: "Visibility", min: 0, max: 50, step: 0.5, unit: "km", Icon: Eye },
  { key: "windSpeed", label: "Wind speed", min: 0, max: 40, step: 0.5, unit: "km/h", Icon: Wind },
  { key: "windDirection", label: "Wind direction", min: 0, max: 360, step: 1, unit: "°", Icon: Wind },
  { key: "pm25", label: "PM2.5", min: 0, max: 60, step: 0.5, unit: "μg/m³", Icon: Cloud },
  { key: "aerosolOpticalDepth", label: "Aerosol depth", min: 0, max: 0.6, step: 0.01, unit: "", Icon: Eye },
];

function sliderValueLabel(key: keyof SunsetInputFactors, value: number) {
  if (key === "recentRain") {
    return `${roundTo(value, 1)} mm`;
  }

  if (key === "visibility") {
    return `${roundTo(value, 1)} km`;
  }

  if (key === "windSpeed") {
    return `${roundTo(value, 1)} km/h`;
  }

  if (key === "dewPointSpread") {
    return `${roundTo(value, 1)}°C`;
  }

  if (key === "windDirection") {
    return `${Math.round(value)}°`;
  }

  if (key === "pm25") {
    return `${roundTo(value, 1)} μg/m³`;
  }

  if (key === "aerosolOpticalDepth") {
    return roundTo(value, 2).toFixed(2);
  }

  if (key === "relativeHumidity") {
    return `${Math.round(value)}%`;
  }

  return `${Math.round(value)}%`;
}

export function SunsetSimulator({
  initialFactors,
  bare = false,
}: SunsetSimulatorProps) {
  const [factors, setFactors] = useState<SunsetInputFactors>(initialFactors);

  const result = useMemo(() => calculateSunsetScore(factors), [factors]);

  const reset = () => {
    setFactors(initialFactors);
  };

  return (
    <section
      id={bare ? undefined : "simulator"}
      className={cn(
        "relative overflow-hidden bg-[#040610]",
        bare ? "flex h-full min-h-[100dvh] w-full flex-1 flex-col" : "mx-auto w-full max-w-6xl px-6 py-24 md:px-10",
      )}
    >
      <div className="pointer-events-none absolute left-10 top-6 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,175,122,0.16),rgba(255,175,122,0))] blur-2xl" />
      <div className="pointer-events-none absolute right-[-4rem] top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(120,162,255,0.18),rgba(120,162,255,0))] blur-3xl" />
      <div className="sunset-noise absolute inset-0 opacity-[0.08]" />

      <div className={cn("relative z-10", bare ? "px-5 py-6 md:px-10 md:py-8" : "")}>
        <div className={cn("mx-auto w-full max-w-6xl", bare && "flex flex-1 flex-col")}>
          <div className={cn("max-w-3xl space-y-4", !bare && "mb-10")}>
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">
              Play with the sky
            </p>
            <h2 className="text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
              Build your own sunset.
            </h2>
            <p className="text-base text-white/70">
              Move the sliders and watch the scene and score react instantly.
            </p>
          </div>

          <div className={cn("grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", bare && "flex-1 pt-5")}>
        <motion.div
          className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-black/30 shadow-[0_28px_85px_rgba(4,10,30,0.48)]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <div className="h-[24rem] md:h-[30rem]">
            <SkyCanvas
              score={result.score}
              highCloud={factors.highCloud}
              midCloud={factors.midCloud}
              lowCloud={factors.lowCloud}
              totalCloud={factors.totalCloud}
              rain={factors.recentRain}
            />
          </div>

          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/22 bg-black/35 p-4 backdrop-blur-md">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">Live score</p>
                <motion.p
                  key={result.score}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-6xl leading-none text-white"
                >
                  {result.score}
                </motion.p>
              </div>
              <p className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white/90">
                {result.label}
              </p>
            </div>
            <p className="mt-2 text-sm text-white/74">{result.explanation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.reasonChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/24 bg-white/8 px-2.5 py-1 text-xs text-white/82"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.aside
          className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-6 shadow-[0_22px_70px_rgba(3,7,24,0.35)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm text-white/88">
              <SlidersHorizontal className="h-4 w-4" />
              Sky controls
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-5">
            {sliderConfig.map((config) => {
              const id = `sim-${config.key}`;
              const value = factors[config.key];
              const progress = ((Number(value) - config.min) / (config.max - config.min)) * 100;

              return (
                <div
                  key={config.key}
                  className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor={id} className="inline-flex items-center gap-1.5 text-white/86">
                      <config.Icon className="h-3.5 w-3.5 text-white/65" />
                      {config.label}
                    </label>
                    <span className="text-white/60">
                      {sliderValueLabel(config.key, Number(value))}
                    </span>
                  </div>

                  <input
                    id={id}
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setFactors((current) => ({
                        ...current,
                        [config.key]: nextValue,
                      }));
                    }}
                    className="iv-slider"
                    style={{
                      ["--slider-progress" as string]: `${progress}%`,
                    }}
                    aria-label={config.label}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-7 space-y-2 rounded-2xl border border-white/14 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">Factor blend</p>
            <p className="text-sm text-white/70">
              High: +{result.factorBreakdown.highCloudContribution.toFixed(1)} | Mid: +
              {result.factorBreakdown.midCloudContribution.toFixed(1)} | Low: -
              {result.factorBreakdown.lowCloudPenalty.toFixed(1)}
            </p>
            <p className="text-sm text-white/70">
              Texture: +{result.factorBreakdown.textureContribution.toFixed(1)} | Rain: +
              {result.factorBreakdown.rainBonus.toFixed(1)} | Contrast: +
              {result.factorBreakdown.contrastBonus.toFixed(1)}
            </p>
            <p className="text-sm text-white/70">
              Dew: {result.factorBreakdown.dewPointModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.dewPointModifier.toFixed(1)} | Wind: {result.factorBreakdown.windModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.windModifier.toFixed(1)} | Clarity: {result.factorBreakdown.clarityModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.clarityModifier.toFixed(1)}
            </p>
            <p className="text-sm text-white/70">
              Humidity: {result.factorBreakdown.humidityModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.humidityModifier.toFixed(1)} | Radiation: {result.factorBreakdown.radiationModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.radiationModifier.toFixed(1)} | Stability: {result.factorBreakdown.stabilityModifier >= 0 ? "+" : ""}
              {result.factorBreakdown.stabilityModifier.toFixed(1)}
            </p>
          </div>
        </motion.aside>
      </div>
        </div>
      </div>
    </section>
  );
}
