"use client";

import Image from "next/image";
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
/*  IV bluff scene                                                     */
/* ------------------------------------------------------------------ */

function OceanPlane({ palette }: { palette: SkyPalette }) {
  const waveBands = Array.from({ length: 22 }, (_, index) => {
    const progress = index / 21;
    return {
      top: 8 + Math.pow(progress, 1.28) * 69,
      width: 58 + Math.pow(progress, 0.92) * 42,
      height: 0.24 + progress * 1.15,
      opacity: 0.018 + progress * 0.05,
      blur: progress > 0.8 ? 0.2 : 0.7,
      rotate: (index % 2 === 0 ? -0.18 : 0.18) * (1 - progress),
      background:
        index % 4 === 0
          ? "linear-gradient(90deg, transparent 0%, rgba(120,148,216,0.04) 16%, rgba(255,214,168,0.16) 50%, rgba(126,150,225,0.04) 84%, transparent 100%)"
          : "linear-gradient(90deg, transparent 0%, rgba(86,112,188,0.025) 14%, rgba(255,193,148,0.1) 50%, rgba(80,108,182,0.03) 86%, transparent 100%)",
    };
  });
  const reflectionStrips = Array.from({ length: 8 }, (_, index) => {
    const progress = index / 7;
    return {
      top: 5 + Math.pow(progress, 1.35) * 58,
      width: 5 + progress * 18,
      height: 1.1 + progress * 5.2,
      opacity: 0.2 - progress * 0.075,
      blur: 4 + progress * 8,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[43%] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(0 14%, 100% 2%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(180deg, rgba(38,44,82,0.62) 0%, rgba(15,24,56,0.86) 24%, rgba(6,14,34,0.96) 58%, rgba(3,8,21,0.99) 100%)",
        }}
      />

      <div
        className="absolute left-1/2 top-[4%] h-[70%] w-[28%] -translate-x-1/2 rounded-[999px] blur-3xl"
        style={{
          background: `radial-gradient(ellipse at center, ${palette.sunGlow} 0%, rgba(255,205,155,0.14) 26%, rgba(91,106,164,0.08) 62%, transparent 80%)`,
          opacity: 0.92,
        }}
      />

      <div
        className="absolute inset-x-0 top-[1.3%] h-[14%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,236,204,0.08) 0%, rgba(255,236,204,0.02) 45%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-[10%] h-[55%]"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,232,210,0.022) 0 1px, transparent 1px 18px)",
          opacity: 0.6,
        }}
      />

      <div
        className="absolute left-1/2 top-[6%] h-[72%] w-[12%] -translate-x-1/2 rounded-[999px] blur-[36px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,223,190,0.18) 0%, rgba(255,193,146,0.16) 26%, rgba(120,134,196,0.07) 58%, transparent 100%)",
        }}
      />

      {reflectionStrips.map((strip, index) => (
        <div
          key={index}
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            top: `${strip.top}%`,
            width: `${strip.width}%`,
            height: `${strip.height}%`,
            opacity: strip.opacity,
            filter: `blur(${strip.blur}px)`,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,228,196,0.06) 10%, rgba(255,210,156,0.28) 50%, rgba(152,179,255,0.08) 90%, transparent 100%)",
          }}
        />
      ))}

      {waveBands.map((band, index) => (
        <div
          key={`wave-${index}`}
          className="absolute left-1/2 rounded-[999px]"
          style={{
            top: `${band.top}%`,
            width: `${band.width}%`,
            height: `${band.height}%`,
            opacity: band.opacity,
            filter: `blur(${band.blur}px)`,
            background: band.background,
            transform: `translateX(-50%) rotate(${band.rotate}deg)`,
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-[10%] h-[54%] w-[52%] -translate-x-1/2 blur-[44px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,184,130,0.12) 0%, rgba(255,184,130,0.04) 38%, transparent 72%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-[18%] h-[20%] bg-gradient-to-t from-[#021020]/0 via-[#021020]/18 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#020611] via-[#020611]/80 to-transparent" />
    </div>
  );
}

function DistantCoastline({ palette }: { palette: SkyPalette }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 blur-xl"
        style={{
          top: "53.6%",
          height: "5.8%",
          clipPath:
            "polygon(0 88%, 7% 84%, 15% 78%, 24% 69%, 34% 63%, 47% 58%, 60% 61%, 73% 66%, 86% 70%, 100% 76%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(180deg, rgba(121,114,146,0.28) 0%, rgba(67,70,96,0.18) 68%, rgba(22,28,44,0.08) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[-1%]"
        style={{
          top: "55.4%",
          height: "4.5%",
          width: "29%",
          clipPath:
            "polygon(0 90%, 13% 84%, 26% 74%, 38% 62%, 50% 54%, 62% 50%, 74% 54%, 86% 61%, 100% 70%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(180deg, rgba(66,61,83,0.42) 0%, rgba(20,22,36,0.74) 100%)",
          filter: "blur(0.8px)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[-2%]"
        style={{
          top: "55%",
          height: "8.8%",
          width: "29%",
          clipPath:
            "polygon(0 82%, 13% 72%, 28% 58%, 44% 43%, 59% 28%, 74% 14%, 88% 8%, 100% 18%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(180deg, rgba(43,45,70,0.42) 0%, rgba(13,17,31,0.82) 100%)",
          filter: "blur(0.8px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 h-[8%] w-[48%] -translate-x-1/2 blur-2xl"
        style={{
          top: "51.8%",
          background: `radial-gradient(ellipse at center, ${palette.sunGlow} 0%, rgba(255,202,156,0.06) 38%, transparent 72%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: "56.15%",
          height: "0.55%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,211,170,0.18) 44%, rgba(255,211,170,0.28) 50%, rgba(255,211,170,0.18) 56%, transparent 100%)",
        }}
      />
    </>
  );
}

function ForegroundCliffs({ palette }: { palette: SkyPalette }) {
  const strata = [
    { bottom: "31.6%", left: "4%", width: "28%", rotate: -10, opacity: 0.18 },
    { bottom: "29.2%", left: "7%", width: "24%", rotate: -12, opacity: 0.12 },
    { bottom: "26.7%", left: "11%", width: "18%", rotate: -14, opacity: 0.1 },
  ];

  return (
    <>
      <div
        className="pointer-events-none absolute bottom-[-2%] left-[-8%] h-[52%] w-[47%]"
        style={{
          clipPath:
            "polygon(0 18%, 10% 14%, 20% 11%, 29% 7%, 37% 4%, 46% 1%, 56% 2%, 64% 7%, 72% 16%, 79% 28%, 84% 40%, 88% 53%, 93% 67%, 98% 85%, 92% 100%, 0 100%)",
          background:
            "linear-gradient(155deg, rgba(13,16,24,0.98) 0%, rgba(24,26,36,0.98) 30%, rgba(7,9,14,0.99) 100%)",
          boxShadow: "30px -22px 110px rgba(0,0,0,0.46)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-[-4%] h-[47%] w-[40%]"
        style={{
          clipPath:
            "polygon(0 28%, 10% 23%, 20% 18%, 30% 13%, 40% 9%, 49% 8%, 58% 13%, 66% 22%, 73% 34%, 79% 47%, 83% 60%, 85% 74%, 83% 100%, 0 100%)",
          background:
            "linear-gradient(160deg, rgba(96,71,55,0.88) 0%, rgba(56,46,40,0.92) 34%, rgba(22,24,32,0.98) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[-1%] h-[5.4%] w-[24%]"
        style={{
          bottom: "36.4%",
          clipPath:
            "polygon(0 86%, 13% 82%, 26% 77%, 39% 70%, 53% 60%, 67% 45%, 80% 26%, 91% 8%, 98% 0, 100% 4%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(90deg, rgba(43,63,49,0.94) 0%, rgba(72,94,70,0.78) 56%, rgba(105,128,100,0.08) 100%)",
          filter: "blur(0.25px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[4%] h-px w-[17%]"
        style={{
          bottom: "36.9%",
          transform: "rotate(-11deg)",
          background:
            "linear-gradient(90deg, rgba(255,231,203,0.18) 0%, rgba(255,231,203,0.04) 88%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[18.3%] left-[2%] h-[18%] w-[20%]"
        style={{
          clipPath:
            "polygon(0 72%, 16% 58%, 34% 42%, 54% 24%, 76% 8%, 100% 0, 100% 100%, 0 100%)",
          background:
            "linear-gradient(150deg, rgba(81,62,50,0.52) 0%, rgba(30,28,34,0.76) 36%, rgba(9,12,18,0.96) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[31.8%] left-[7%] h-px w-[22%]"
        style={{
          transform: "rotate(-12deg)",
          background:
            "linear-gradient(90deg, rgba(255,225,193,0.26) 0%, rgba(255,225,193,0.08) 72%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[24.2%] left-[11%] h-px w-[15%]"
        style={{
          transform: "rotate(-15deg)",
          background:
            "linear-gradient(90deg, rgba(255,210,170,0.18) 0%, rgba(255,210,170,0.04) 82%, transparent 100%)",
        }}
      />
      {strata.map((line) => (
        <div
          key={`${line.bottom}-${line.left}`}
          className="pointer-events-none absolute h-px"
          style={{
            bottom: line.bottom,
            left: line.left,
            width: line.width,
            opacity: line.opacity,
            transform: `rotate(${line.rotate}deg)`,
            background:
              "linear-gradient(90deg, rgba(255,232,205,0.9) 0%, rgba(255,206,158,0.24) 24%, rgba(255,206,158,0.04) 100%)",
          }}
        />
      ))}
      <div
        className="pointer-events-none absolute bottom-[26%] left-[8%] h-[16%] w-[18%] rounded-full blur-[44px]"
        style={{ background: `radial-gradient(circle, ${palette.sunGlow} 0%, transparent 72%)` }}
      />
      <div
        className="pointer-events-none absolute bottom-[12%] right-[-3%] h-[23%] w-[29%]"
        style={{
          clipPath:
            "polygon(0 76%, 12% 66%, 24% 56%, 39% 42%, 54% 24%, 70% 8%, 84% 0, 100% 14%, 100% 100%, 0 100%)",
          background:
            "linear-gradient(180deg, rgba(22,28,44,0.78) 0%, rgba(8,12,22,0.98) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[16.5%] right-[7%] h-[12%] w-[17%]"
        style={{
          clipPath:
            "polygon(0 82%, 20% 60%, 42% 36%, 66% 14%, 100% 0, 100% 100%, 0 100%)",
          background:
            "linear-gradient(155deg, rgba(56,53,66,0.38) 0%, rgba(17,18,28,0.86) 100%)",
          filter: "blur(0.4px)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[17.8%] right-[6%] h-px w-[18%]"
        style={{
          transform: "rotate(-6deg)",
          background:
            "linear-gradient(90deg, rgba(255,214,182,0.2) 0%, rgba(255,214,182,0.06) 68%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[20.4%] right-[4%] h-[12%] w-[20%] rounded-full blur-[36px]"
        style={{ background: "rgba(255,196,146,0.05)" }}
      />
    </>
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
    const kickoff = window.setTimeout(() => setNowMs(Date.now()), 0);
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(id);
    };
  }, []);

  const sunsetMs = Date.parse(today.sunsetISO);
  const canRate = Number.isFinite(sunsetMs) ? nowMs >= sunsetMs : true;

  const todaysRating = useMemo(
    () => ratings.find((e) => e.date === today.date)?.rating ?? null,
    [ratings, today.date],
  );
  const todaysRatingIndex = todaysRating
    ? RATINGS.findIndex((rating) => rating.id === todaysRating)
    : -1;

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
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.mid} 40%, ${palette.horizon} 62%, ${palette.top} 100%)`,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 72%, rgba(255,196,146,0.16) 0%, rgba(255,196,146,0.02) 28%, transparent 58%), radial-gradient(circle at 14% 18%, rgba(112,132,255,0.18) 0%, transparent 34%)",
        }}
      />

      {photoUrl && (
        <div className="absolute inset-x-0 top-0 bottom-[37%]">
          <Image
            src={photoUrl}
            alt="Uploaded sunset reference"
            fill
            unoptimized
            className="object-cover"
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

      {!photoUrl && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: "52%",
            top: "54.8%",
            width: `${palette.sunSize}vw`,
            height: `${palette.sunSize}vw`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, rgba(255,248,230,0.92) 0%, ${palette.sunColor} 22%, ${palette.sunColor}88 44%, ${palette.sunGlow} 62%, transparent 78%)`,
            filter: `blur(${palette.sunBlur}px)`,
            opacity: palette.glowOpacity,
          }}
        />
      )}

      {!photoUrl && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: "52%",
            top: "55.1%",
            width: `${palette.sunSize * 1.4}vw`,
            height: `${palette.sunSize * 0.42}vw`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(ellipse at center, ${palette.sunGlow} 0%, rgba(255,214,172,0.12) 48%, transparent 82%)`,
            filter: "blur(18px)",
            opacity: Math.min(0.92, palette.glowOpacity * 1.45),
          }}
        />
      )}

      {/* Sun core (bright spot) */}
      {!photoUrl && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: "52%",
            top: "54.8%",
            width: `${palette.sunSize * 0.18}vw`,
            height: `${palette.sunSize * 0.175}vw`,
            transform: "translate(-50%, -50%) scaleY(0.94)",
            background: `linear-gradient(180deg, rgba(255,249,230,0.98) 0%, ${palette.sunColor} 68%, rgba(255,181,120,0.86) 100%)`,
            boxShadow: `0 0 ${palette.sunSize * 2}px ${palette.sunGlow}`,
            opacity: Math.min(1, palette.glowOpacity * 1.8),
          }}
        />
      )}

      <OceanPlane palette={palette} />
      <DistantCoastline palette={palette} />
      <ForegroundCliffs palette={palette} />
      <SkyBirds horizonPct={56.5} />

      <div className="relative z-10 flex h-full flex-1 flex-col px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center pt-[8vh] text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">
            Isla Vista cliffline outlook
          </p>

          <div className="mt-2 flex flex-col items-center">
            <span
              className="block text-[clamp(7rem,18vw,12rem)] font-semibold leading-none"
              style={{
                background: `linear-gradient(180deg, #fff 0%, ${palette.sunColor} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 48px ${palette.sunGlow})`,
              }}
            >
              {today.score}
            </span>
            <span className="mt-2 inline-flex rounded-full border border-white/18 bg-white/[0.08] px-3.5 py-1 text-xs uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
              {today.label}
            </span>
          </div>

          <h2 className="mt-5 max-w-xl text-balance text-center text-2xl leading-[1.08] tracking-tight text-white/94 md:text-[2rem]">
            {heroLine(today.score)}
          </h2>

          <p className="mt-3 flex items-center gap-1.5 text-sm text-white/54">
            <Sunset className="h-3.5 w-3.5" />
            Sunset at {today.sunsetTime}
          </p>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-[18%] h-[22%]"
          style={{
            background:
              "radial-gradient(circle at 50% 70%, rgba(255,189,138,0.14) 0%, rgba(255,189,138,0.06) 26%, transparent 68%)",
          }}
        />

        <div className="absolute inset-x-5 bottom-[4.5rem] z-20 mx-auto flex max-w-6xl flex-col gap-3 md:bottom-20 md:flex-row md:items-end md:justify-between md:gap-5">
          <div className="w-full max-w-sm rounded-[1.65rem] border border-white/12 bg-[linear-gradient(180deg,rgba(16,21,38,0.36),rgba(12,18,34,0.18))] px-5 py-4 shadow-[0_20px_70px_rgba(3,6,18,0.28)] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
              Scene guide
            </p>
            <h3 className="mt-2 text-lg font-medium text-white/90">
              Follow the messenger gull.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/66">
              It drops to the channel, skims a local note off the water, then climbs back
              over the bluff. The loop repeats automatically.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/54">
              <span className="h-2 w-2 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(255,204,146,0.65)]" />
              Live shoreline loop
            </div>
          </div>

          <div className="w-full max-w-[32rem] rounded-[1.75rem] border border-white/12 bg-[linear-gradient(180deg,rgba(10,14,30,0.44),rgba(10,14,30,0.2))] px-4 py-4 shadow-[0_24px_80px_rgba(3,7,18,0.34)] backdrop-blur-xl md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                  {canRate ? "How was tonight?" : `Rating unlocks at ${today.sunsetTime}`}
                </p>
                <p className="mt-1 text-sm text-white/64">
                  {canRate
                    ? "Tap the read that matched the sky from the bluff."
                    : "Save your take once the sun is down."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] text-white/58 transition hover:bg-white/[0.1] hover:text-white/82"
              >
                {shared ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                {shared ? "Copied" : "Share score"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((opt, index) => {
                const active = todaysRating === opt.id;
                const past = todaysRatingIndex >= index && todaysRatingIndex !== -1;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => submitRating(opt.id)}
                    disabled={!canRate}
                    className={cn(
                      "rounded-[1.15rem] border px-3 py-3 text-left transition duration-300",
                      active
                        ? "border-white/28 bg-[linear-gradient(180deg,rgba(255,216,179,0.18),rgba(255,255,255,0.08))] shadow-[0_0_32px_rgba(255,188,128,0.16)]"
                        : past
                          ? "border-white/14 bg-white/[0.07]"
                          : "border-white/8 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.06]",
                      !canRate && "cursor-not-allowed opacity-55",
                    )}
                  >
                    <span className="text-sm font-medium text-white/84">{opt.label}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-white/45">
                      {opt.vibe}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!photoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-[11px] text-white/56 transition hover:bg-white/[0.1] hover:text-white/78"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Take photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-[11px] text-white/56 transition hover:bg-white/[0.1] hover:text-white/78"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Upload photo
                  </button>
                </>
              ) : (
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                  Your photo is now steering the sky scene.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
    </div>
  );
}
