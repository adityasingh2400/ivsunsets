"use client";

import { Sparkles, Sunset } from "lucide-react";
import type { ForecastDay } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  days: ForecastDay[];
  bestDate: string | null;
}

function miniGradient(day: ForecastDay) {
  const topHue = 224 + day.preview.hueShift;
  const lowHue = 18 + day.preview.warmth * 30;
  return `linear-gradient(180deg, hsl(${topHue} 58% 20%) 0%, hsl(${lowHue} 88% ${40 + day.preview.glow * 16}%) 100%)`;
}

export function ForecastGrid({ days, bestDate }: Props) {
  return (
    <div className="flex flex-1 flex-col justify-center bg-[#040610] p-6 md:p-10 lg:p-16">
      <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/50">
            6-day outlook
          </p>
          <h2 className="text-3xl leading-tight tracking-tight text-white md:text-5xl">
            Sunset forecast.
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => {
          const isBest = bestDate === day.date;
          return (
            <div
              key={day.date}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3",
                isBest && "border-amber-200/30 bg-amber-200/[0.04]",
              )}
            >
              {/* Mini sky preview */}
              <div
                className="mb-2.5 h-10 rounded-xl"
                style={{ background: miniGradient(day) }}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium leading-none text-white">
                      {day.dayName}
                    </h3>
                    {isBest && (
                      <Sparkles className="h-3 w-3 text-amber-200/80" />
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-white/45">
                    <Sunset className="h-3 w-3" />
                    {day.sunsetTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold leading-none text-white">
                    {day.score}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/45">
                    {day.label}
                  </p>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-cyan-200/80 via-pink-200/80 to-amber-200/80",
                    isBest &&
                      "from-amber-100/90 via-orange-200/90 to-pink-200/90",
                  )}
                  style={{ width: `${day.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
