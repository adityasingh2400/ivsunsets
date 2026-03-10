"use client";

import { motion } from "framer-motion";
import {
  Check,
  Clock3,
  Navigation,
  Share2,
  Sparkles,
  Sunset,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SkyCanvas } from "@/components/SkyCanvas";
import { resolveScenePalette } from "@/components/hero/islaVistaPalette";
import type { ForecastDay } from "@/lib/types";
import { clamp, cn } from "@/lib/utils";

interface SunsetCountdownProps {
  today: ForecastDay;
  bare?: boolean;
}

type Phase = "pre" | "golden" | "sunset" | "past";

function getPhase(now: number, sunsetMs: number): Phase {
  const goldenStart = sunsetMs - 90 * 60 * 1000;
  const afterglowEnd = sunsetMs + 35 * 60 * 1000;

  if (now < goldenStart) return "pre";
  if (now < sunsetMs) return "golden";
  if (now < afterglowEnd) return "sunset";
  return "past";
}

function formatCountdown(diffMs: number) {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatShortTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function recommendation(score: number) {
  if (score >= 80) {
    return {
      verdict: "Go. Protect this one.",
      vibe: "The model sees enough structure for a real cliffside payoff tonight.",
      tone: "from-amber-100/90 via-orange-100/80 to-pink-200/75",
      accent: "text-amber-100",
      confidence: "High confidence",
    };
  }

  if (score >= 60) {
    return {
      verdict: "Yes, it is worth the walk.",
      vibe: "Strong enough setup that a west-facing bluff could absolutely deliver color.",
      tone: "from-amber-50/90 via-rose-100/75 to-cyan-100/70",
      accent: "text-amber-50",
      confidence: "Solid setup",
    };
  }

  if (score >= 40) {
    return {
      verdict: "Maybe. Stay opportunistic.",
      vibe: "There is some texture to work with, but tonight probably rewards convenience over a full mission.",
      tone: "from-white/90 via-white/75 to-cyan-100/70",
      accent: "text-white/88",
      confidence: "Mixed signals",
    };
  }

  return {
    verdict: "Probably skip the big outing.",
    vibe: "The setup feels soft and low-drama. Catch it nearby if you happen to be out already.",
    tone: "from-white/80 via-white/60 to-slate-200/60",
    accent: "text-white/78",
    confidence: "Low urgency",
  };
}

function actionPlan(phase: Phase, score: number) {
  if (phase === "pre") {
    return {
      move: score >= 60 ? "Aim to be outside before golden hour starts." : "No need to rush yet.",
      timing:
        score >= 60
          ? "Get yourself moving 20-30 minutes before the first warm light."
          : "Check back closer to sunset and stay flexible.",
      kit:
        score >= 70
          ? "Bring a camera and expect the best color after the sun touches the horizon."
          : "A short bluff walk and your phone camera are probably enough.",
    };
  }

  if (phase === "golden") {
    return {
      move: score >= 45 ? "Now is the moment to go." : "Only go if the bluff is close.",
      timing: "Golden hour is live, so every extra minute indoors costs color.",
      kit: "Head west, face the horizon, and stay for the afterglow rather than leaving at sunset.",
    };
  }

  if (phase === "sunset") {
    return {
      move: "Stay put if you already have a horizon view.",
      timing: "The afterglow window is often where the strongest IV color shows up.",
      kit: "Keep shooting for another 15-20 minutes while the low sky lingers.",
    };
  }

  return {
    move: "Call it for tonight and look ahead.",
    timing: "The prime window has passed, so tomorrow's setup matters more now.",
    kit: "Use the forecast slide to protect the next promising evening.",
  };
}

export function SunsetCountdown({ today, bare = false }: SunsetCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sunsetMs = Date.parse(today.sunsetISO);
  const goldenStartMs = sunsetMs - 90 * 60 * 1000;
  const afterglowEndMs = sunsetMs + 35 * 60 * 1000;
  const phase = now ? getPhase(now, sunsetMs) : "pre";
  const palette = resolveScenePalette(today.score, null);
  const rec = recommendation(today.score);
  const plan = actionPlan(phase, today.score);

  const shareText = `Tonight's IV sunset score: ${today.score}/100 (${today.label}) — Sunset at ${today.sunsetTime}`;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        /* no-op */
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {
      /* no-op */
    }
  }, [shareText]);

  const phaseLabel =
    phase === "pre"
      ? "Golden hour in"
      : phase === "golden"
        ? "Sunset in"
        : phase === "sunset"
          ? "Afterglow live"
          : "Window closed";

  const timerValue =
    phase === "pre"
      ? formatCountdown(goldenStartMs - now)
      : phase === "golden"
        ? formatCountdown(sunsetMs - now)
        : phase === "sunset"
          ? formatCountdown(afterglowEndMs - now)
          : "00:00";

  const progress = clamp(
    (now - goldenStartMs) / (afterglowEndMs - goldenStartMs),
    0,
    1,
  );

  const checkpoints = [
    { label: "Golden", time: goldenStartMs, position: 0 },
    {
      label: "Sunset",
      time: sunsetMs,
      position: ((sunsetMs - goldenStartMs) / (afterglowEndMs - goldenStartMs)) * 100,
    },
    { label: "Afterglow", time: afterglowEndMs, position: 100 },
  ];

  const content = (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[#040610]",
        bare ? "flex h-full min-h-[100dvh] flex-1 flex-col" : "rounded-[2rem]",
      )}
    >
      <SkyCanvas
        className="absolute inset-0"
        score={today.score}
        highCloud={today.factors.highCloud}
        midCloud={today.factors.midCloud}
        lowCloud={today.factors.lowCloud}
        totalCloud={today.factors.totalCloud}
        rain={today.factors.recentRain}
        colorIntensity={0.9}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 18%, ${palette.glowAura} 0%, transparent 34%),
            radial-gradient(circle at 82% 20%, rgba(134,165,255,0.14) 0%, transparent 30%),
            linear-gradient(180deg, rgba(4,6,16,0.14) 0%, rgba(4,6,16,0.42) 52%, rgba(4,6,16,0.88) 100%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(255,212,164,0.18),transparent_26%)]" />
      <div className="sunset-noise absolute inset-0 opacity-[0.1]" />

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col",
          bare ? "px-5 py-6 md:px-10 md:py-8" : "px-6 py-8 md:px-8 md:py-10",
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <motion.div
            className="flex flex-col justify-between gap-5"
            initial={bare ? false : { opacity: 0, y: 18 }}
            animate={bare ? undefined : { opacity: 1, y: 0 }}
            transition={bare ? undefined : { duration: 0.45 }}
          >
            <div className="max-w-2xl space-y-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/48">
                Decision deck
              </p>
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/20 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/68 backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" />
                  {rec.confidence}
                </p>
                <h2
                  className="max-w-2xl bg-gradient-to-b from-white via-white to-white/78 bg-clip-text text-4xl leading-[0.92] tracking-tight text-transparent md:text-[3.35rem]"
                  style={{
                    textShadow: `0 0 36px ${palette.glowAura}`,
                  }}
                >
                  {rec.verdict}
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-white/72 md:text-lg">
                  {rec.vibe}
                </p>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(9,13,26,0.42),rgba(9,13,26,0.18))] p-5 shadow-[0_24px_80px_rgba(2,5,16,0.32)] backdrop-blur-xl">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/48">
                    {phaseLabel}
                  </p>
                  <div className="flex items-end gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/68 md:h-14 md:w-14">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-[clamp(2.5rem,7vw,4.7rem)] leading-none tabular-nums text-white">
                        {timerValue}
                      </p>
                      <p className="mt-2 text-sm text-white/58">
                        Sunset lands at {today.sunsetTime}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-w-sm rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                    Current read
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-xl font-medium md:text-2xl",
                      rec.accent,
                    )}
                  >
                    {today.label} setup
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/62">
                    {today.explanation}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${rec.tone}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="relative">
                  {checkpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.label}
                      className="absolute top-0 -translate-x-1/2"
                      style={{ left: `${checkpoint.position}%` }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full border border-white/25 bg-[#050915]" />
                      <div className="mt-2 min-w-max text-center">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">
                          {checkpoint.label}
                        </p>
                        <p className="text-[11px] text-white/58">
                          {formatShortTime(checkpoint.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div
                    className="absolute top-0 -translate-x-1/2"
                    style={{ left: `${progress * 100}%` }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,244,220,0.7)]" />
                    <p className="mt-2 min-w-max text-[10px] uppercase tracking-[0.16em] text-white/68">
                      Live
                    </p>
                  </div>
                </div>
                <div className="h-10" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  Tonight score
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {today.score}
                </p>
                <p className="mt-1 text-sm text-white/58">{today.label}</p>
              </div>
              <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  Best arrival
                </p>
                <p className="mt-2 text-xl font-medium text-white">
                  {formatShortTime(goldenStartMs)}
                </p>
                <p className="mt-1 text-sm text-white/58">
                  Catch the build before the horizon warms.
                </p>
              </div>
              <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  Stay through
                </p>
                <p className="mt-2 text-xl font-medium text-white">
                  {formatShortTime(afterglowEndMs)}
                </p>
                <p className="mt-1 text-sm text-white/58">
                  The afterglow often outperforms the actual sunset.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="grid content-start gap-4"
            initial={bare ? false : { opacity: 0, y: 18 }}
            animate={bare ? undefined : { opacity: 1, y: 0 }}
            transition={bare ? undefined : { duration: 0.45, delay: 0.08 }}
          >
            <div className="rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,13,28,0.52),rgba(8,13,28,0.22))] p-5 shadow-[0_24px_80px_rgba(2,5,16,0.32)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">
                    Action plan
                  </p>
                  <h3 className="mt-2 text-2xl text-white">
                    Move with the sky.
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                  aria-label="Share tonight's score"
                >
                  {shared ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  {
                    title: "Move",
                    body: plan.move,
                    Icon: Navigation,
                  },
                  {
                    title: "Timing",
                    body: plan.timing,
                    Icon: Clock3,
                  },
                  {
                    title: "Stay for",
                    body: plan.kit,
                    Icon: Sunset,
                  },
                ].map(({ title, body, Icon }) => (
                  <div
                    key={title}
                    className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4"
                  >
                    <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                      <Icon className="h-3.5 w-3.5" />
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/72">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,13,28,0.5),rgba(8,13,28,0.18))] p-5 shadow-[0_24px_80px_rgba(2,5,16,0.28)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/42">
                Why tonight reads this way
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {today.reasonChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/74"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/18 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  Practical read
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/66">
                  If you only have energy for one move tonight, make it a clean
                  west-facing horizon and stay later than you think.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (bare) return content;

  return (
    <motion.section
      className="mx-auto w-full max-w-6xl px-6 md:px-10"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      {content}
    </motion.section>
  );
}
