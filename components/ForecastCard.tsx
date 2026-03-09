"use client";

import { motion } from "framer-motion";
import { Sparkles, Sunset } from "lucide-react";
import type { ForecastDay } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ForecastCardProps {
  day: ForecastDay;
  isBest?: boolean;
  index: number;
}

function previewBackground(day: ForecastDay) {
  const topHue = 224 + day.preview.hueShift;
  const lowerHue = 18 + day.preview.warmth * 30;

  return `linear-gradient(180deg, hsl(${topHue} 62% 18%) 0%, hsl(${topHue + 18} 64% 30%) 45%, hsl(${lowerHue} 92% ${38 + day.preview.glow * 20}%) 100%)`;
}

export function ForecastCard({ day, isBest = false, index }: ForecastCardProps) {
  return (
    <motion.article
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] p-4 shadow-[0_20px_50px_rgba(3,6,18,0.45)] backdrop-blur-xl",
        isBest &&
          "border-amber-200/40 bg-gradient-to-b from-amber-200/8 via-white/[0.06] to-white/[0.04] shadow-[0_24px_70px_rgba(250,180,120,0.18)]",
      )}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.06 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
    >
      <div className="pointer-events-none absolute -right-16 -top-14 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,186,137,0.26),rgba(255,186,137,0))] blur-2xl transition-opacity duration-300 group-hover:opacity-90" />

      {isBest ? (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-100/35 bg-amber-100/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] text-amber-100">
          <Sparkles className="h-3.5 w-3.5" />
          Best chance
        </p>
      ) : null}

      <div className="relative mb-4 h-24 overflow-hidden rounded-2xl border border-white/12">
        <div className="absolute inset-0" style={{ background: previewBackground(day) }} />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,rgba(7,9,20,0.7),rgba(7,9,20,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(255,196,148,0.28),transparent_40%)]" />
        <span className="absolute bottom-4 left-[46%] h-2.5 w-2.5 rounded-full bg-amber-100/85 blur-[0.5px]" />

        <div className="absolute inset-x-0 top-0 h-full">
          {Array.from({ length: 5 }).map((_, cloudIndex) => {
            const cloudWidth = 28 + day.preview.texture * 32 + cloudIndex * 2;
            const cloudHeight = 10 + day.preview.lowCloudBand * 16;

            return (
              <span
                key={`${day.date}-cloud-${cloudIndex}`}
                className="absolute rounded-full bg-white/20 blur-[1px]"
                style={{
                  width: `${cloudWidth}%`,
                  height: `${cloudHeight}%`,
                  left: `${cloudIndex * 18 - 8}%`,
                  top: `${14 + cloudIndex * 11 + day.preview.lowCloudBand * 16}%`,
                  opacity: 0.15 + day.preview.texture * 0.3,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl leading-none text-white">{day.dayName}</h3>
          <p className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/80">
            {day.label}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <p className="text-4xl font-semibold leading-none text-white">{day.score}</p>
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-white/65">
            <Sunset className="h-3.5 w-3.5" />
            {day.sunsetTime}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-white/72">{day.explanation}</p>

        <div className="pt-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <span
              className={cn(
                "block h-full rounded-full bg-gradient-to-r from-cyan-200 via-pink-200 to-amber-200",
                isBest && "from-amber-100 via-orange-200 to-pink-200",
              )}
              style={{ width: `${day.score}%` }}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
