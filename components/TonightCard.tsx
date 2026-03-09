"use client";

import {
  Camera,
  Check,
  ImagePlus,
  Share2,
  Sunset,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForecastDay, SunsetRating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SkyBirds } from "./SkyBirds";

/* ------------------------------------------------------------------ */
/*  Sky palette — driven by score                                      */
/* ------------------------------------------------------------------ */

interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  sunColor: string;
  sunGlow: string;
  sunSize: number;      // vw units
  sunBlur: number;      // px
  glowOpacity: number;
}

function skyPalette(score: number): SkyPalette {
  if (score >= 85) return {
    top: "#12061e", mid: "#7a1840", horizon: "#e87020",
    sunColor: "#fcd34d", sunGlow: "rgba(252,211,77,0.4)", sunSize: 28, sunBlur: 60, glowOpacity: 0.6,
  };
  if (score >= 65) return {
    top: "#140a30", mid: "#5a2050", horizon: "#d06028",
    sunColor: "#f0a030", sunGlow: "rgba(240,160,48,0.3)", sunSize: 22, sunBlur: 50, glowOpacity: 0.45,
  };
  if (score >= 45) return {
    top: "#0e1444", mid: "#3a1e5a", horizon: "#a04848",
    sunColor: "#dba060", sunGlow: "rgba(219,160,96,0.25)", sunSize: 16, sunBlur: 40, glowOpacity: 0.3,
  };
  if (score >= 25) return {
    top: "#0a1030", mid: "#1e1845", horizon: "#604860",
    sunColor: "#c8a880", sunGlow: "rgba(200,168,128,0.15)", sunSize: 12, sunBlur: 30, glowOpacity: 0.18,
  };
  return {
    top: "#080c1e", mid: "#141830", horizon: "#2a2838",
    sunColor: "#a09888", sunGlow: "rgba(160,152,136,0.1)", sunSize: 9, sunBlur: 20, glowOpacity: 0.1,
  };
}

/* ------------------------------------------------------------------ */
/*  Cloud generation from forecast data                                */
/* ------------------------------------------------------------------ */

interface CloudShape {
  x: number; y: number; w: number; h: number;
  opacity: number; blur: number;
  color: string;
}

function generateClouds(
  highCloud: number,
  midCloud: number,
  lowCloud: number,
  score: number,
): CloudShape[] {
  const clouds: CloudShape[] = [];
  const warm = score >= 50;
  const baseColor = warm ? "255,180,120" : "180,190,220";

  // High clouds — wispy streaks in the top 30%
  const highCount = Math.ceil(highCloud / 18);
  for (let i = 0; i < highCount && highCloud > 15; i++) {
    clouds.push({
      x: 5 + (i * 100) / highCount + (i * 7) % 15,
      y: 4 + (i * 11) % 18,
      w: 25 + (i * 13) % 20,
      h: 2 + (i * 3) % 4,
      opacity: 0.08 + (highCloud / 100) * 0.2,
      blur: 20 + (i * 5) % 15,
      color: warm ? "255,200,140" : "180,200,240",
    });
  }

  // Mid clouds — softer, rounder shapes in middle
  const midCount = Math.ceil(midCloud / 22);
  for (let i = 0; i < midCount && midCloud > 12; i++) {
    clouds.push({
      x: 8 + (i * 100) / midCount + (i * 11) % 12,
      y: 22 + (i * 7) % 14,
      w: 18 + (i * 9) % 16,
      h: 6 + (i * 5) % 6,
      opacity: 0.06 + (midCloud / 100) * 0.18,
      blur: 28 + (i * 7) % 12,
      color: baseColor,
    });
  }

  // Low cloud band near the horizon
  if (lowCloud > 8) {
    clouds.push({
      x: -5, y: 48, w: 110, h: 10,
      opacity: 0.08 + (lowCloud / 100) * 0.25,
      blur: 35,
      color: warm ? "200,120,80" : "120,130,160",
    });
  }

  return clouds;
}

/* ------------------------------------------------------------------ */
/*  Hero title                                                         */
/* ------------------------------------------------------------------ */

function heroLine(score: number) {
  if (score >= 85) return "Tonight could glow.";
  if (score >= 65) return "Golden hour has teeth tonight.";
  if (score >= 45) return "A decent fade is on deck.";
  if (score >= 25) return "The sky might tease us.";
  return "Tonight stays muted.";
}

/* ------------------------------------------------------------------ */
/*  IV Horizon Silhouette                                              */
/* ------------------------------------------------------------------ */

function HorizonSilhouette() {
  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="absolute w-full"
      style={{ top: "58%", height: "12%" }}
      fill="#040610"
    >
      {/* Coastline */}
      <path d="
        M0 120 L0 68
        Q60 70 120 66
        Q180 62 220 58
        L240 56 L250 38 L254 36 L258 54
        L290 52 L310 50
        L340 48 L348 28 L351 26 L354 46
        L400 44 L420 42
        L450 24 L454 22 L458 42
        L500 40 L560 38
        L620 36
        L660 34 L668 14 L671 12 L674 32
        L720 30
        L760 28 L768 8 L772 6 L776 26
        L830 28
        L880 30
        L920 26 L928 10 L932 8 L936 24
        L1000 26
        L1060 28
        L1100 30 L1108 18 L1112 16 L1116 28
        L1200 32
        L1260 34
        L1320 38
        L1380 42
        L1440 46
        L1440 120 Z
      " />
      {/* Palm tree shapes are the upward spikes at specific x positions */}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Rating state                                                       */
/* ------------------------------------------------------------------ */

interface StoredRating {
  date: string;
  rating: SunsetRating;
  predictedScore: number;
  createdAt: string;
}

const STORAGE_KEY = "iv-glow-ratings-v1";

const RATINGS: Array<{
  id: SunsetRating;
  label: string;
  vibe: string;
}> = [
  { id: "bland", label: "Bland", vibe: "Not much color" },
  { id: "decent", label: "Decent", vibe: "Pretty, but light" },
  { id: "beautiful", label: "Beautiful", vibe: "Lovely glow" },
  { id: "unreal", label: "Unreal", vibe: "Electric" },
];

function loadRatings(): StoredRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as StoredRating[];
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface Props { today: ForecastDay; }

export function TonightCard({ today }: Props) {
  const palette = skyPalette(today.score);
  const clouds = useMemo(
    () => generateClouds(
      today.factors.highCloud,
      today.factors.midCloud,
      today.factors.lowCloud,
      today.score,
    ),
    [today.factors.highCloud, today.factors.midCloud, today.factors.lowCloud, today.score],
  );

  /* ---- Rating ---- */
  const [ratings, setRatings] = useState<StoredRating[]>(() => loadRatings());
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sunsetMs = Date.parse(today.sunsetISO);
  const canRate = Number.isFinite(sunsetMs) ? nowMs >= sunsetMs : true;

  const todaysRating = useMemo(
    () => ratings.find((e) => e.date === today.date)?.rating ?? null,
    [ratings, today.date],
  );

  const submitRating = (r: SunsetRating) => {
    if (!canRate) return;
    const entry: StoredRating = {
      date: today.date,
      rating: r,
      predictedScore: today.score,
      createdAt: new Date().toISOString(),
    };
    const next = [...ratings.filter((e) => e.date !== today.date), entry];
    setRatings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  /* ---- Photo ---- */
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(f));
  }, [photoUrl]);

  const clearPhoto = useCallback(() => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
  }, [photoUrl]);

  /* ---- Share ---- */
  const [shared, setShared] = useState(false);
  const shareText = `Tonight's IV sunset score: ${today.score}/100 (${today.label}) — Sunset at ${today.sunsetTime}`;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); return; } catch { /* noop */ }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* noop */ }
  }, [shareText]);

  /* ---- Render ---- */
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">

      {/* ============================================================ */}
      {/*  LAYER 0 — Sky gradient background                           */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.mid} 40%, ${palette.horizon} 62%, ${palette.top} 100%)`,
        }}
      />

      {/* User photo replaces sky when present */}
      {photoUrl && (
        <div className="absolute inset-0" style={{ top: 0, bottom: "40%" }}>
          <img
            src={photoUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/70 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  LAYER 1 — Cloud shapes                                       */}
      {/* ============================================================ */}
      {!photoUrl && clouds.map((c, i) => (
        <div
          key={i}
          className="pointer-events-none absolute mix-blend-screen"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.w}%`,
            height: `${c.h}%`,
            background: `radial-gradient(ellipse at center, rgba(${c.color},${c.opacity}) 0%, transparent 70%)`,
            filter: `blur(${c.blur}px)`,
          }}
        />
      ))}

      {/* ============================================================ */}
      {/*  LAYER 2 — Sun orb at horizon                                 */}
      {/* ============================================================ */}
      {!photoUrl && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: "52%",
            top: "56%",
            width: `${palette.sunSize}vw`,
            height: `${palette.sunSize}vw`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${palette.sunColor} 0%, ${palette.sunColor}88 25%, ${palette.sunGlow} 50%, transparent 70%)`,
            filter: `blur(${palette.sunBlur}px)`,
            opacity: palette.glowOpacity,
          }}
        />
      )}

      {/* Sun core (bright spot) */}
      {!photoUrl && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: "52%",
            top: "56%",
            width: `${palette.sunSize * 0.2}vw`,
            height: `${palette.sunSize * 0.2}vw`,
            transform: "translate(-50%, -50%)",
            background: palette.sunColor,
            boxShadow: `0 0 ${palette.sunSize * 2}px ${palette.sunGlow}`,
            opacity: Math.min(1, palette.glowOpacity * 1.8),
          }}
        />
      )}

      {/* ============================================================ */}
      {/*  LAYER 3 — Birds                                              */}
      {/* ============================================================ */}
      <SkyBirds horizonPct={58} />

      {/* ============================================================ */}
      {/*  LAYER 4 — IV Horizon Silhouette                              */}
      {/* ============================================================ */}
      <HorizonSilhouette />

      {/* Subtle gradient below horizon — blends sky into dark content area */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{ top: "56%", height: "44%", background: "linear-gradient(to bottom, transparent 0%, rgba(4,6,16,0.4) 20%, rgba(4,6,16,0.85) 50%, #040610 75%)" }}
      />

      {/* ============================================================ */}
      {/*  CONTENT — Score floating in the sky                          */}
      {/* ============================================================ */}
      <div className="relative z-10 flex flex-1 flex-col">

        {/* ---- Sky area: Score + Title ---- */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[44%] md:pb-[38%]">
          {/* Score */}
          <div className="flex flex-col items-center">
            <span
              className="block text-[clamp(7rem,18vw,12rem)] font-semibold leading-none"
              style={{
                background: `linear-gradient(180deg, #fff 0%, ${palette.sunColor} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 40px ${palette.sunGlow})`,
              }}
            >
              {today.score}
            </span>
            <span className="mt-2 inline-flex rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1 text-xs uppercase tracking-[0.14em] text-white/80">
              {today.label}
            </span>
          </div>

          {/* Hero line */}
          <h2 className="mt-5 max-w-md text-center text-xl leading-snug tracking-tight text-white/90 md:text-2xl">
            {heroLine(today.score)}
          </h2>

          {/* Sunset time */}
          <p className="mt-3 flex items-center gap-1.5 text-sm text-white/50">
            <Sunset className="h-3.5 w-3.5" />
            Sunset at {today.sunsetTime}
          </p>
        </div>

        {/* ---- Ground area: Rate + Photo ---- */}
        <div className="relative z-10 px-6 pb-10 pt-2 md:px-10">
          <div className="mx-auto w-full max-w-2xl space-y-5">

            {/* Section heading + share */}
            <div className="flex items-end justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">
                {canRate ? "How was tonight?" : `Rate after sunset (${today.sunsetTime})`}
              </p>
              <button
                type="button"
                onClick={handleShare}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/40 transition hover:bg-white/[0.08] hover:text-white/70"
                aria-label="Share"
              >
                {shared ? <Check className="h-3 w-3 text-emerald-300" /> : <Share2 className="h-3 w-3" />}
              </button>
            </div>

            {/* Rating track — single horizontal line with 4 selectable points */}
            <div className="relative">
              {/* Track line */}
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
              {/* Filled portion up to selection */}
              {todaysRating && (
                <div
                  className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-white/5 via-white/30 to-white/40 transition-all duration-500"
                  style={{
                    width: `${(RATINGS.findIndex((r) => r.id === todaysRating) / (RATINGS.length - 1)) * 100}%`,
                  }}
                />
              )}

              <div className="relative flex justify-between">
                {RATINGS.map((opt, i) => {
                  const active = todaysRating === opt.id;
                  const past = todaysRating ? RATINGS.findIndex((r) => r.id === todaysRating) >= i : false;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => submitRating(opt.id)}
                      disabled={!canRate}
                      className={cn(
                        "group flex flex-col items-center gap-2",
                        !canRate && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {/* Dot */}
                      <div
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300",
                          active
                            ? "border-white/40 bg-white/20 shadow-[0_0_20px_rgba(255,200,100,0.25)]"
                            : past
                              ? "border-white/20 bg-white/10"
                              : "border-white/8 bg-white/[0.03] group-hover:border-white/20 group-hover:bg-white/[0.08]",
                        )}
                      >
                        {active && (
                          <div className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                        )}
                      </div>
                      {/* Label */}
                      <span className={cn(
                        "text-[11px] font-medium transition-colors duration-300",
                        active ? "text-white/80" : "text-white/30 group-hover:text-white/55",
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo capture */}
            {!photoUrl && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => camRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/40 transition hover:bg-white/[0.07] hover:text-white/65"
                >
                  <Camera className="h-3 w-3" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/40 transition hover:bg-white/[0.07] hover:text-white/65"
                >
                  <ImagePlus className="h-3 w-3" />
                  Upload
                </button>
                <p className="ml-auto text-[10px] text-white/20">
                  Your photo becomes the sky
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
    </div>
  );
}
