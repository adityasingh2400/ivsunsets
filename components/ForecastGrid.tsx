"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Sparkles,
  Sunset,
  TrendingUp,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SkyCanvas } from "@/components/SkyCanvas";
import { resolveScenePalette } from "@/components/hero/islaVistaPalette";
import type { ForecastDay } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";

interface Props {
  days: ForecastDay[];
  bestDate: string | null;
}

function miniGradient(day: ForecastDay) {
  const topHue = 224 + day.preview.hueShift;
  const lowHue = 18 + day.preview.warmth * 30;
  return `linear-gradient(180deg, hsl(${topHue} 58% 20%) 0%, hsl(${lowHue} 88% ${40 + day.preview.glow * 16}%) 100%)`;
}

function trendPath(days: ForecastDay[]) {
  if (days.length <= 1) return "";

  return days
    .map((day, index) => {
      const x = (index / (days.length - 1)) * 100;
      const y = 100 - clamp(day.score, 0, 100);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function ForecastGrid({ days, bestDate }: Props) {
  const [selectedDate, setSelectedDate] = useState(bestDate ?? days[0]?.date ?? "");

  const selected =
    days.find((day) => day.date === selectedDate) ??
    days.find((day) => day.date === bestDate) ??
    days[0];

  const summary = useMemo(() => {
    if (!days.length) {
      return {
        average: 0,
        best: null as ForecastDay | null,
        swing: 0,
      };
    }

    const total = days.reduce((sum, day) => sum + day.score, 0);
    const best = days.reduce((currentBest, day) =>
      day.score > currentBest.score ? day : currentBest,
    );
    const scores = days.map((day) => day.score);

    return {
      average: Math.round(total / days.length),
      best,
      swing: Math.max(...scores) - Math.min(...scores),
    };
  }, [days]);

  if (!selected) return null;

  const palette = resolveScenePalette(selected.score, null);
  const path = trendPath(days);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#040610]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 16% 18%, ${palette.glowAura} 0%, transparent 34%),
            radial-gradient(circle at 82% 16%, rgba(129,160,255,0.16) 0%, transparent 30%),
            linear-gradient(180deg, rgba(5,7,16,0.16) 0%, rgba(5,7,16,0.54) 55%, rgba(5,7,16,0.94) 100%)
          `,
        }}
      />
      <div className="sunset-noise absolute inset-0 opacity-[0.11]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 py-6 md:px-10 md:py-8 lg:grid lg:grid-cols-[1.02fr_0.98fr] lg:gap-6">
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/48">
              6-day outlook
            </p>
            <h2 className="max-w-2xl text-4xl leading-[0.92] tracking-tight text-white md:text-[3.35rem]">
              Which evening is worth protecting?
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-white/66">
              Browse the week like a scouting board. Each day carries a quick sky
              preview, then opens into a full read with the factor mix behind it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Best night
              </p>
              <p className="mt-2 text-2xl font-medium text-white">
                {summary.best?.dayName ?? "--"}
              </p>
              <p className="mt-1 text-sm text-white/58">
                {summary.best?.score ?? 0}/100
              </p>
            </div>
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Weekly average
              </p>
              <p className="mt-2 text-2xl font-medium text-white">
                {summary.average}
              </p>
              <p className="mt-1 text-sm text-white/58">
                Overall sunset climate
              </p>
            </div>
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Score swing
              </p>
              <p className="mt-2 text-2xl font-medium text-white">
                {summary.swing}
              </p>
              <p className="mt-1 text-sm text-white/58">
                Spread across the week
              </p>
            </div>
          </div>

          <div className="relative min-h-[23rem] overflow-hidden rounded-[2rem] border border-white/14 bg-black/18 shadow-[0_26px_90px_rgba(2,5,16,0.36)] backdrop-blur-xl md:min-h-[28rem]">
            <SkyCanvas
              className="absolute inset-0"
              score={selected.score}
              highCloud={selected.factors.highCloud}
              midCloud={selected.factors.midCloud}
              lowCloud={selected.factors.lowCloud}
              totalCloud={selected.factors.totalCloud}
              rain={selected.factors.recentRain}
              colorIntensity={0.95}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,9,20,0.08),rgba(6,9,20,0.32)_52%,rgba(6,9,20,0.82)_100%)]" />
            <div className="absolute left-5 top-5 rounded-full border border-white/14 bg-black/22 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/68 backdrop-blur-md">
              Featured forecast
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
              <div className="rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(10,14,28,0.42),rgba(10,14,28,0.18))] p-5 backdrop-blur-xl">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/46">
                      {selected.dayName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-3xl text-white md:text-[2.65rem]">
                        {selected.score}
                      </h3>
                      <span className="rounded-full border border-white/16 bg-white/[0.07] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/80">
                        {selected.label}
                      </span>
                      {selected.date === bestDate ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/22 bg-amber-100/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-amber-100/88">
                          <Sparkles className="h-3.5 w-3.5" />
                          Best bet
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
                      <Sunset className="h-3.5 w-3.5" />
                      Sunset at {selected.sunsetTime}
                    </p>
                  </div>

                  <div className="max-w-sm">
                    <p className="text-base text-white/88">{selected.explanation}</p>
                    <p className="mt-2 text-sm text-white/58">
                      High cloud {Math.round(selected.factors.highCloud)}% | Mid cloud{" "}
                      {Math.round(selected.factors.midCloud)}% | Low cloud{" "}
                      {Math.round(selected.factors.lowCloud)}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {selected.reasonChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-[1.15rem] border border-white/10 bg-black/18 px-3.5 py-3 text-sm text-white/72"
                    >
                      {chip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex min-h-0 flex-col gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,13,28,0.52),rgba(8,13,28,0.22))] p-5 shadow-[0_24px_80px_rgba(2,5,16,0.32)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">
                  Score trend
                </p>
                <h3 className="mt-2 text-2xl text-white">
                  The week at a glance.
                </h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/58">
                <TrendingUp className="h-3.5 w-3.5" />
                Select any day
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
              <svg
                viewBox="0 0 100 100"
                className="h-28 w-full overflow-visible"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="forecastLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#b9d7ff" stopOpacity="0.75" />
                    <stop offset="55%" stopColor="#ffc59d" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#ff90ad" stopOpacity="0.82" />
                  </linearGradient>
                </defs>
                <path
                  d={path}
                  fill="none"
                  stroke="url(#forecastLine)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {days.map((day, index) => {
                  const x = days.length > 1 ? (index / (days.length - 1)) * 100 : 50;
                  const y = 100 - clamp(day.score, 0, 100);

                  return (
                    <g key={day.date}>
                      <circle
                        cx={x}
                        cy={y}
                        r={day.date === selected.date ? 3.8 : 2.4}
                        fill={day.date === selected.date ? "#fff1da" : "rgba(255,255,255,0.7)"}
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {days.map((day) => (
                  <div key={day.date} className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                      {day.dayName}
                    </p>
                    <p className="mt-1 text-sm text-white/68">{day.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
            {days.map((day, index) => {
              const isSelected = day.date === selected.date;
              const isBest = day.date === bestDate;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    "group relative overflow-hidden rounded-[1.55rem] border p-3.5 text-left transition duration-300",
                    isSelected
                      ? "border-white/24 bg-white/[0.08] shadow-[0_18px_54px_rgba(2,5,16,0.26)]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.06]",
                  )}
                >
                  <div
                    className="mb-3 h-20 rounded-[1.15rem]"
                    style={{ background: miniGradient(day) }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                        Day {index + 1}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <h4 className="text-lg text-white">{day.dayName}</h4>
                        {isBest ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-amber-100/82">
                            <Sparkles className="h-3 w-3" />
                            Top
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-white/56">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Sunset {day.sunsetTime}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-semibold leading-none text-white">
                        {day.score}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/45">
                        {day.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {day.reasonChips.slice(0, 2).map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/10 bg-black/16 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/60"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Glow",
                        value: `${Math.round(day.preview.glow * 100)}%`,
                        Icon: Sparkles,
                      },
                      {
                        label: "Warmth",
                        value: `${Math.round(day.preview.warmth * 100)}%`,
                        Icon: Sunset,
                      },
                      {
                        label: "Texture",
                        value: `${Math.round(day.preview.texture * 100)}%`,
                        Icon: Waves,
                      },
                    ].map(({ label, value, Icon }) => (
                      <div
                        key={label}
                        className="rounded-[1rem] border border-white/8 bg-black/14 px-2.5 py-2"
                      >
                        <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-white/42">
                          <Icon className="h-3 w-3" />
                          {label}
                        </p>
                        <p className="mt-1 text-sm text-white/76">{value}</p>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
