"use client";

import { motion, useMotionValueEvent, useReducedMotion, useSpring } from "framer-motion";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Flame,
  Haze,
  Layers3,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Waves,
  Wind,
} from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SunsetInputFactors } from "@/lib/types";
import { calculateSunsetScore, effectiveTotalCloud } from "@/lib/scoreSunset";
import { cn, compassDirection, lerp, roundTo } from "@/lib/utils";
import { SkyCanvas } from "@/components/SkyCanvas";

interface SunsetSimulatorProps {
  initialFactors: SunsetInputFactors;
  bare?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Slider configuration                                               */
/* ------------------------------------------------------------------ */

interface SliderConfig {
  key: keyof SunsetInputFactors;
  label: string;
  min: number;
  max: number;
  step: number;
  Icon: ComponentType<{ className?: string }>;
  format: (value: number) => string;
}

interface SliderGroup {
  title: string;
  hint: string;
  sliders: SliderConfig[];
}

const pct = (value: number) => `${Math.round(value)}%`;

const SLIDER_GROUPS: SliderGroup[] = [
  {
    title: "Clouds",
    hint: "The canvas — and what blocks it",
    sliders: [
      { key: "highCloud", label: "High clouds", min: 0, max: 100, step: 1, Icon: CloudSun, format: pct },
      { key: "midCloud", label: "Mid clouds", min: 0, max: 100, step: 1, Icon: Layers3, format: pct },
      { key: "lowCloud", label: "Low clouds overhead", min: 0, max: 100, step: 1, Icon: CloudFog, format: pct },
      { key: "horizonLowCloud", label: "Marine layer offshore", min: 0, max: 100, step: 1, Icon: Waves, format: pct },
    ],
  },
  {
    title: "Air & light",
    hint: "How vivid the color stays",
    sliders: [
      { key: "visibility", label: "Visibility", min: 0, max: 50, step: 0.5, Icon: Eye, format: (v) => `${roundTo(v, 1)} km` },
      { key: "relativeHumidity", label: "Humidity", min: 10, max: 100, step: 1, Icon: Droplets, format: pct },
      { key: "dewPointSpread", label: "Dew point spread", min: 0, max: 15, step: 0.1, Icon: Droplets, format: (v) => `${roundTo(v, 1)}°C` },
      { key: "pm25", label: "PM2.5 (smoke)", min: 0, max: 60, step: 0.5, Icon: Haze, format: (v) => `${roundTo(v, 1)} μg/m³` },
      { key: "aerosolOpticalDepth", label: "Aerosol depth", min: 0, max: 0.6, step: 0.01, Icon: Eye, format: (v) => roundTo(v, 2).toFixed(2) },
    ],
  },
  {
    title: "Wind & rain",
    hint: "What moves the marine layer",
    sliders: [
      { key: "windSpeed", label: "Wind speed", min: 0, max: 40, step: 0.5, Icon: Wind, format: (v) => `${roundTo(v, 1)} km/h` },
      { key: "windDirection", label: "Wind direction", min: 0, max: 360, step: 1, Icon: Wind, format: (v) => `${Math.round(v)}° ${compassDirection(v)}` },
      { key: "recentRain", label: "Recent rain", min: 0, max: 8, step: 0.1, Icon: CloudRain, format: (v) => `${roundTo(v, 1)} mm` },
    ],
  },
];

const TWEENED_KEYS = SLIDER_GROUPS.flatMap((group) => group.sliders.map((s) => s.key));

/* ------------------------------------------------------------------ */
/*  Presets — classic IV skies                                         */
/* ------------------------------------------------------------------ */

interface SkyPreset {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  factors: Partial<SunsetInputFactors>;
}

const PRESETS: SkyPreset[] = [
  {
    id: "cirrus-blaze",
    label: "Cirrus blaze",
    Icon: Flame,
    factors: {
      highCloud: 42, midCloud: 28, lowCloud: 6, horizonLowCloud: 10,
      recentRain: 2.2, visibility: 35, dewPointSpread: 7, relativeHumidity: 48,
      pm25: 4, aerosolOpticalDepth: 0.07, windSpeed: 12, windDirection: 40,
    },
  },
  {
    id: "altocumulus",
    label: "Altocumulus glow",
    Icon: Cloud,
    factors: {
      highCloud: 18, midCloud: 46, lowCloud: 10, horizonLowCloud: 15,
      recentRain: 0, visibility: 22, dewPointSpread: 6, relativeHumidity: 55,
      pm25: 7, aerosolOpticalDepth: 0.1, windSpeed: 9, windDirection: 30,
    },
  },
  {
    id: "marine-layer",
    label: "Marine layer",
    Icon: CloudFog,
    factors: {
      highCloud: 12, midCloud: 10, lowCloud: 88, horizonLowCloud: 85,
      recentRain: 0, visibility: 8, dewPointSpread: 1.2, relativeHumidity: 92,
      pm25: 8, aerosolOpticalDepth: 0.1, windSpeed: 12, windDirection: 220,
    },
  },
  {
    id: "bluebird",
    label: "Bluebird clear",
    Icon: Sun,
    factors: {
      highCloud: 0, midCloud: 0, lowCloud: 0, horizonLowCloud: 0,
      recentRain: 0, visibility: 35, dewPointSpread: 9, relativeHumidity: 40,
      pm25: 4, aerosolOpticalDepth: 0.06, windSpeed: 8, windDirection: 30,
    },
  },
  {
    id: "smoke",
    label: "Smoke haze",
    Icon: Haze,
    factors: {
      highCloud: 30, midCloud: 15, lowCloud: 5, horizonLowCloud: 8,
      recentRain: 0, visibility: 5, dewPointSpread: 6, relativeHumidity: 35,
      pm25: 55, aerosolOpticalDepth: 0.5, windSpeed: 6, windDirection: 40,
    },
  },
  {
    id: "fog-risk",
    label: "Fog risk",
    Icon: CloudDrizzle,
    factors: {
      highCloud: 15, midCloud: 12, lowCloud: 45, horizonLowCloud: 50,
      recentRain: 0.2, visibility: 2.5, dewPointSpread: 0.5, relativeHumidity: 96,
      pm25: 6, aerosolOpticalDepth: 0.09, windSpeed: 5, windDirection: 240,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Animated score readout                                             */
/* ------------------------------------------------------------------ */

function AnimatedScore({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 24 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(Math.round(latest));
  });

  return <>{reduceMotion ? value : display}</>;
}

/* ------------------------------------------------------------------ */
/*  Contribution chart                                                 */
/* ------------------------------------------------------------------ */

interface ChartRow {
  label: string;
  value: number;
}

function ContributionChart({ rows }: { rows: ChartRow[] }) {
  const reduceMotion = useReducedMotion();
  const visible = rows.filter((row) => Math.abs(row.value) >= 0.3);

  if (!visible.length) {
    return (
      <p className="text-sm text-white/55">
        Nothing is moving the score much — drag a slider.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((row) => {
        const positive = row.value >= 0;
        const width = Math.min(100, (Math.abs(row.value) / 70) * 100);

        return (
          <div key={row.label} className="grid grid-cols-[7.5rem_1fr_2.6rem] items-center gap-2">
            <p className="truncate text-[11px] uppercase tracking-[0.08em] text-white/55">
              {row.label}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  positive
                    ? "bg-gradient-to-r from-amber-200/85 to-orange-400/80"
                    : "bg-gradient-to-r from-rose-400/85 to-red-500/75",
                )}
                animate={{ width: `${width}%` }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 170, damping: 26 }
                }
              />
            </div>
            <p
              className={cn(
                "text-right text-xs tabular-nums",
                positive ? "text-amber-100/90" : "text-rose-200/90",
              )}
            >
              {positive ? "+" : "−"}
              {Math.abs(roundTo(row.value, 1)).toFixed(1)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SunsetSimulator({
  initialFactors,
  bare = false,
}: SunsetSimulatorProps) {
  const [factors, setFactors] = useState<SunsetInputFactors>(initialFactors);
  const [activePreset, setActivePreset] = useState<string>("tonight");
  const tweenRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => window.cancelAnimationFrame(tweenRef.current), []);

  const result = useMemo(() => calculateSunsetScore(factors), [factors]);
  const skyCover = useMemo(
    () =>
      effectiveTotalCloud(
        factors.highCloud,
        factors.midCloud,
        factors.lowCloud,
        0,
      ),
    [factors.highCloud, factors.midCloud, factors.lowCloud],
  );

  /** Smoothly tween every slider toward a preset so the sky morphs. */
  const animateTo = useCallback(
    (target: SunsetInputFactors, presetId: string) => {
      window.cancelAnimationFrame(tweenRef.current);
      setActivePreset(presetId);

      if (reduceMotion) {
        setFactors(target);
        return;
      }

      const from = { ...factors };
      const start = performance.now();
      const duration = 750;

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);

        /*
         * Non-tweened keys (reported total cloud, variance, decay,
         * persistence) take the target value from the FIRST frame —
         * snapping them at the end caused a visible score pop after
         * every morph.
         */
        setFactors(() => {
          if (t >= 1) {
            return { ...target };
          }
          const next = { ...target };
          for (const key of TWEENED_KEYS) {
            const fromValue = from[key];
            let toValue = target[key];
            if (key === "windDirection") {
              // shortest arc so the compass never spins the long way round
              const delta = ((toValue - fromValue + 540) % 360) - 180;
              toValue = fromValue + delta;
            }
            const value = lerp(fromValue, toValue, eased);
            // keep mid-tween wind in [0,360) so a mid-morph slider grab
            // can never persist an out-of-range angle
            next[key] = key === "windDirection" ? ((value % 360) + 360) % 360 : value;
          }
          return next;
        });

        if (t < 1) {
          tweenRef.current = window.requestAnimationFrame(step);
        }
      };

      tweenRef.current = window.requestAnimationFrame(step);
    },
    [factors, reduceMotion],
  );

  const applyPreset = (preset: SkyPreset) => {
    const target: SunsetInputFactors = {
      ...initialFactors,
      ...preset.factors,
      totalCloud: 0,
      cloudVariance: 100,
      confidenceDecay: 0,
      previousDayScore: -1,
    };
    animateTo(target, preset.id);
  };

  const resetToTonight = () => {
    animateTo(initialFactors, "tonight");
  };

  const chartRows: ChartRow[] = [
    { label: "Cloud canvas", value: result.factorBreakdown.cloudCanvas },
    { label: "Clear-sky glow", value: result.factorBreakdown.clearSkyGlow },
    { label: "Air clarity", value: result.factorBreakdown.vividnessModifier },
    { label: "Marine layer", value: -result.factorBreakdown.marineLayerPenalty },
    { label: "Offshore wall", value: -result.factorBreakdown.horizonPenalty },
    { label: "Overcast", value: -result.factorBreakdown.overcastPenalty },
    { label: "Fog risk", value: -result.factorBreakdown.fogPenalty },
    { label: "Rain bonus", value: result.factorBreakdown.rainBonus },
    { label: "Wind", value: result.factorBreakdown.windModifier },
    { label: "Stability", value: result.factorBreakdown.stabilityModifier },
  ];

  const lightPathPct = Math.round(result.factorBreakdown.lightPath * 100);

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
          <div className={cn("max-w-3xl space-y-3", !bare && "mb-6")}>
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">
              Play with the sky
            </p>
            <h2 className="text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
              Build your own sunset.
            </h2>
            <p className="text-base text-white/70">
              Start from a classic IV sky, then drag the sliders — the scene,
              score, and physics react live.
            </p>
          </div>

          {/* Preset chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetToTonight}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition",
                activePreset === "tonight"
                  ? "border-amber-200/45 bg-amber-200/12 text-amber-100"
                  : "border-white/16 bg-white/[0.04] text-white/72 hover:bg-white/[0.09]",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tonight&apos;s forecast
            </button>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition",
                  activePreset === preset.id
                    ? "border-amber-200/45 bg-amber-200/12 text-amber-100"
                    : "border-white/16 bg-white/[0.04] text-white/72 hover:bg-white/[0.09]",
                )}
              >
                <preset.Icon className="h-3.5 w-3.5" />
                {preset.label}
              </button>
            ))}
          </div>

          <div className={cn("mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]", bare && "flex-1")}>
            <motion.div
              className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-black/30 shadow-[0_28px_85px_rgba(4,10,30,0.48)]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6 }}
            >
              <div className="h-full min-h-[24rem] md:min-h-[30rem]">
                <SkyCanvas
                  score={result.score}
                  highCloud={factors.highCloud}
                  midCloud={factors.midCloud}
                  lowCloud={factors.lowCloud}
                  totalCloud={skyCover}
                  rain={factors.recentRain}
                />
              </div>

              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/22 bg-black/35 p-4 backdrop-blur-md">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/58">Live score</p>
                    <p className="text-6xl leading-none text-white tabular-nums">
                      <AnimatedScore value={result.score} />
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm text-white/90">
                      {result.label}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/48">
                      Light path {lightPathPct}% open
                    </p>
                  </div>
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
              className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 shadow-[0_22px_70px_rgba(3,7,24,0.35)] backdrop-blur-xl md:p-6"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm text-white/88">
                  <SlidersHorizontal className="h-4 w-4" />
                  Sky controls
                </p>
                <p className="text-xs text-white/50">
                  Sky cover ~{Math.round(skyCover)}%
                </p>
              </div>

              <div className="space-y-5">
                {SLIDER_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/62">
                        {group.title}
                      </p>
                      <p className="text-[11px] text-white/38">{group.hint}</p>
                    </div>

                    {group.sliders.map((config) => {
                      const id = `sim-${config.key}`;
                      const value = Number(factors[config.key]);
                      const progress = ((value - config.min) / (config.max - config.min)) * 100;

                      return (
                        <div
                          key={config.key}
                          className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <label htmlFor={id} className="inline-flex items-center gap-1.5 text-white/86">
                              <config.Icon className="h-3.5 w-3.5 text-white/65" />
                              {config.label}
                            </label>
                            <span className="text-white/60 tabular-nums">
                              {config.format(value)}
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
                              window.cancelAnimationFrame(tweenRef.current);
                              setActivePreset("custom");
                              /*
                               * Once the user takes manual control, neutralize the
                               * hidden forecast-only inputs (reported total cloud,
                               * confidence decay, persistence anchor) so the score
                               * is driven entirely by the visible sliders. Without
                               * this, tonight's reported totalCloud kept gating the
                               * score invisibly after the layers were dragged away.
                               */
                              setFactors((current) => ({
                                ...current,
                                totalCloud: 0,
                                cloudVariance: 100,
                                confidenceDecay: 0,
                                previousDayScore: -1,
                                [config.key]: nextValue,
                              }));
                            }}
                            className="iv-slider"
                            style={{
                              ["--slider-progress" as string]: `${Math.max(0, Math.min(100, progress))}%`,
                            }}
                            aria-label={config.label}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-white/14 bg-white/[0.03] p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                    What&apos;s moving the score
                  </p>
                  <p className="text-[11px] text-white/40">points</p>
                </div>
                <ContributionChart rows={chartRows} />
              </div>
            </motion.aside>
          </div>
        </div>
      </div>
    </section>
  );
}
