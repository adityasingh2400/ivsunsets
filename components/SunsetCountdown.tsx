"use client";

import { motion } from "framer-motion";
import { Clock, Share2, Check } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { ForecastDay } from "@/lib/types";

interface SunsetCountdownProps {
  today: ForecastDay;
  /** When true, strip outer section wrapper (for use inside carousel cards). */
  bare?: boolean;
}

type Phase = "pre" | "golden" | "sunset" | "past";

function getPhase(now: number, sunsetMs: number): Phase {
  const goldenStart = sunsetMs - 90 * 60 * 1000;
  const afterWindow = sunsetMs + 30 * 60 * 1000;

  if (now < goldenStart) return "pre";
  if (now < sunsetMs) return "golden";
  if (now < afterWindow) return "sunset";
  return "past";
}

function formatCountdown(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function recommendation(score: number): { verdict: string; vibe: string; color: string } {
  if (score >= 75) {
    return {
      verdict: "Yes — drop everything",
      vibe: "Tonight could be electric. Get to the bluffs.",
      color: "text-amber-200",
    };
  }
  if (score >= 55) {
    return {
      verdict: "Probably — worth a walk",
      vibe: "Good chance of color tonight. Worth checking out.",
      color: "text-amber-100/90",
    };
  }
  if (score >= 35) {
    return {
      verdict: "Maybe — keep an eye out",
      vibe: "Decent setup, but no guarantees. Glance west around sunset.",
      color: "text-white/75",
    };
  }
  return {
    verdict: "Probably not tonight",
    vibe: "Not much drama expected. Save your energy for a better evening.",
    color: "text-white/55",
  };
}

export function SunsetCountdown({ today, bare }: SunsetCountdownProps) {
  const [now, setNow] = useState(() =>
    typeof window === "undefined" ? 0 : Date.now(),
  );
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sunsetMs = Date.parse(today.sunsetISO);
  const phase = now ? getPhase(now, sunsetMs) : "pre";
  const rec = recommendation(today.score);

  const shareText = `Tonight's IV sunset score: ${today.score}/100 (${today.label}) — Sunset at ${today.sunsetTime}`;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        /* user cancelled or not supported */
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [shareText]);

  if (!now) return null;

  const timerContent = (() => {
    switch (phase) {
      case "pre":
        return (
          <>
            <span className="text-xs uppercase tracking-[0.16em] text-white/50">Golden hour in</span>
            <span className="font-mono text-2xl tabular-nums text-white md:text-3xl">
              {formatCountdown(sunsetMs - 90 * 60 * 1000 - now)}
            </span>
          </>
        );
      case "golden":
        return (
          <>
            <span className="text-xs uppercase tracking-[0.16em] text-amber-200/70">Golden hour is live</span>
            <span className="font-mono text-2xl tabular-nums text-amber-100 md:text-3xl">
              {formatCountdown(sunsetMs - now)} <span className="text-sm text-amber-200/60">to sunset</span>
            </span>
          </>
        );
      case "sunset":
        return (
          <>
            <span className="text-xs uppercase tracking-[0.16em] text-orange-200/70">Sunset just happened</span>
            <span className="text-lg text-orange-100/80">Look west — the afterglow might still be going.</span>
          </>
        );
      case "past":
        return (
          <>
            <span className="text-xs uppercase tracking-[0.16em] text-white/40">Today&apos;s sunset has passed</span>
            <span className="text-sm text-white/50">Check tomorrow&apos;s forecast below.</span>
          </>
        );
    }
  })();

  const card = (
      <div className={bare ? "flex flex-1 flex-col justify-center bg-[#040610] px-6 py-8 md:px-12 lg:px-20" : "grid gap-4 rounded-[1.75rem] border border-white/12 bg-white/[0.03] p-5 md:grid-cols-[1fr_auto_1fr] md:items-center md:p-6"}>
      <div className={bare ? "mx-auto grid w-full max-w-4xl gap-5 md:grid-cols-[1fr_auto_1fr] md:items-center" : "contents"}>
        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05]">
            <Clock className="h-5 w-5 text-white/60" />
          </div>
          <div className="flex flex-col">{timerContent}</div>
        </div>

        {/* Divider */}
        <div className="hidden h-12 w-px bg-white/10 md:block" />
        <div className="h-px bg-white/8 md:hidden" />

        {/* Recommendation + Share */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-xs uppercase tracking-[0.14em] text-white/45">Should I go?</p>
            <p className={`text-sm font-medium ${rec.color}`}>{rec.verdict}</p>
            <p className="mt-0.5 text-xs text-white/45">{rec.vibe}</p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] text-white/60 transition hover:bg-white/[0.1] hover:text-white/80"
            aria-label="Share tonight's score"
          >
            {shared ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      </div>
  );

  if (bare) return card;

  return (
    <motion.section
      className="mx-auto w-full max-w-6xl px-6 md:px-10"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {card}
    </motion.section>
  );
}
