"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  SB / UCSB news                                                     */
/* ------------------------------------------------------------------ */

const SB_NEWS = [
  "Two UCSB professors won the 2025 Nobel Prize in Physics",
  "UCSB now home to eight Nobel laureate faculty members",
  "SB Channel is a certified UNESCO Whale Heritage Area",
  "28,000 gray whales migrate through the Channel each spring",
  "Up to 50,000 dolphins spotted at once in the SB Channel",
  "UCSB ranked #25 worldwide for physics and astronomy",
  "Santa Barbara Surf Museum opened on State Street in 2025",
  "Isla Vista unveiled a brand-new welcome sign in Feb 2026",
  "Soltopia replaces Deltopia as IV's official spring festival",
  "Campus Point surf rivals Rincon when the swell is firing",
  "Rincon Classic 2026 delivered one of its greatest weekends",
  "UCSB ranked #8 best-value public college by Princeton Review",
  "Five whale species regularly spotted off the UCSB coastline",
  "The Channel Islands visible from IV on clear evenings",
  "UCSB ranked #14 public university in the nation for 2026",
];

/* ------------------------------------------------------------------ */
/*  Bird SVG                                                           */
/* ------------------------------------------------------------------ */

function BirdSvg({ size = 16, className, flapSpeed = 0.35 }: { size?: number; className?: string; flapSpeed?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 24 14"
      fill="none"
      className={className}
      style={{ overflow: "visible", "--flap-speed": `${flapSpeed}s` } as React.CSSProperties}
    >
      {/* Left wing */}
      <path
        className="bird-wing-l"
        d="M12 8 Q9 5 6 2 Q4 0.5 1 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "12px 8px" }}
      />
      {/* Right wing */}
      <path
        className="bird-wing-r"
        d="M12 8 Q15 5 18 2 Q20 0.5 23 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "12px 8px" }}
      />
      {/* Body */}
      <ellipse cx="12" cy="8.5" rx="1.8" ry="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Flock birds — lots of them, lower in the sky                       */
/* ------------------------------------------------------------------ */

interface BirdConfig {
  id: number;
  size: number;
  y: number;
  speed: number;
  delay: number;
  direction: 1 | -1;
  bobAmp: number;
  opacity: number;
}

const BIRDS: BirdConfig[] = [
  { id: 0,  size: 18, y: 32, speed: 20, delay: 0,    direction: 1,  bobAmp: 10, opacity: 0.45 },
  { id: 1,  size: 22, y: 38, speed: 16, delay: -4,   direction: -1, bobAmp: 14, opacity: 0.55 },
  { id: 2,  size: 15, y: 28, speed: 24, delay: -9,   direction: 1,  bobAmp: 8,  opacity: 0.35 },
  { id: 3,  size: 24, y: 42, speed: 14, delay: -2,   direction: 1,  bobAmp: 16, opacity: 0.6 },
  { id: 4,  size: 17, y: 35, speed: 22, delay: -7,   direction: -1, bobAmp: 11, opacity: 0.4 },
  { id: 5,  size: 13, y: 25, speed: 28, delay: -15,  direction: 1,  bobAmp: 7,  opacity: 0.3 },
  { id: 6,  size: 20, y: 44, speed: 18, delay: -5,   direction: -1, bobAmp: 13, opacity: 0.5 },
  { id: 7,  size: 14, y: 30, speed: 26, delay: -12,  direction: 1,  bobAmp: 9,  opacity: 0.35 },
  { id: 8,  size: 19, y: 40, speed: 15, delay: -1,   direction: 1,  bobAmp: 12, opacity: 0.5 },
  { id: 9,  size: 16, y: 36, speed: 21, delay: -8,   direction: -1, bobAmp: 10, opacity: 0.4 },
  { id: 10, size: 12, y: 22, speed: 30, delay: -18,  direction: 1,  bobAmp: 6,  opacity: 0.25 },
  { id: 11, size: 21, y: 46, speed: 17, delay: -3,   direction: -1, bobAmp: 14, opacity: 0.55 },
];

/* ------------------------------------------------------------------ */
/*  Dive sequence phases                                               */
/* ------------------------------------------------------------------ */

type DivePhase = "diving" | "splash" | "rising" | "showing" | "fading";

interface DiveState {
  birdId: number;
  phase: DivePhase;
  x: number;           // % horizontal position of the dive
  newsText: string;
  risingY: number;     // animated Y position during rise (%)
  driftX: number;      // horizontal drift offset (%)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface SkyBirdsProps {
  horizonPct: number;
}

export function SkyBirds({ horizonPct }: SkyBirdsProps) {
  const [dive, setDive] = useState<DiveState | null>(null);
  const newsIdxRef = useRef(Math.floor(Math.random() * SB_NEWS.length));
  const rafRef = useRef<number>(0);
  const diveStartRef = useRef(0);

  /* Animate the rising bird + news after splash, then drift */
  const animateRise = useCallback((startTime: number, x: number, newsText: string, birdId: number) => {
    const targetY = horizonPct - 22; // rise to 22% above horizon
    const riseDuration = 1200; // ms to rise
    const driftSpeed = 0.4; // % per second horizontal drift
    const driftDir = Math.random() > 0.5 ? 1 : -1;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / riseDuration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const currentY = horizonPct - eased * (horizonPct - targetY);

      // After rise completes, gently drift horizontally
      const driftElapsed = Math.max(0, elapsed - riseDuration) / 1000;
      const drift = driftElapsed * driftSpeed * driftDir;

      setDive({ birdId, phase: t < 1 ? "rising" : "showing", x, newsText, risingY: currentY, driftX: drift });

      // Keep animating for drift (until fading phase clears us)
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [horizonPct]);

  const triggerDive = useCallback(() => {
    // Don't interrupt an active dive
    if (dive && dive.phase !== "fading") return;

    const bird = BIRDS[Math.floor(Math.random() * BIRDS.length)];
    const x = 25 + Math.random() * 50;
    const idx = newsIdxRef.current;
    newsIdxRef.current = (idx + 1) % SB_NEWS.length;
    const newsText = SB_NEWS[idx];

    // Phase 1: Dive (1s)
    setDive({ birdId: bird.id, phase: "diving", x, newsText, risingY: horizonPct, driftX: 0 });

    // Phase 2: Splash (at 1s)
    setTimeout(() => {
      setDive((prev) => prev ? { ...prev, phase: "splash" } : null);
    }, 1000);

    // Phase 3: Rise with news (at 1.6s)
    setTimeout(() => {
      diveStartRef.current = performance.now();
      animateRise(performance.now(), x, newsText, bird.id);
    }, 1600);

    // Phase 4: Start fading (at 7.5s)
    setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      setDive((prev) => prev ? { ...prev, phase: "fading" } : null);
    }, 7500);

    // Phase 5: Clear (at 8.5s)
    setTimeout(() => {
      setDive(null);
    }, 8500);
  }, [dive, horizonPct, animateRise]);

  useEffect(() => {
    const first = setTimeout(triggerDive, 4000);
    const interval = setInterval(triggerDive, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [triggerDive]);

  const isDiving = dive?.phase === "diving";
  const showSplash = dive?.phase === "splash";
  const showRiser = dive && (dive.phase === "rising" || dive.phase === "showing" || dive.phase === "fading");

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ---- Flock birds ---- */}
      {BIRDS.map((bird) => {
        const thisBirdDiving = isDiving && dive?.birdId === bird.id;
        return (
          <div
            key={bird.id}
            className={cn("bird-flight", thisBirdDiving && "bird-diving")}
            style={{
              "--bird-y": `${bird.y}%`,
              "--bird-speed": `${bird.speed}s`,
              "--bird-delay": `${bird.delay}s`,
              "--bird-dir": bird.direction === 1 ? "1" : "-1",
              "--bird-bob": `${bird.bobAmp}px`,
              "--dive-target-x": dive ? `${dive.x}%` : "50%",
              "--dive-target-y": `${horizonPct}%`,
              position: "absolute",
              top: 0,
              left: 0,
              opacity: thisBirdDiving ? 0.7 : bird.opacity,
              transition: "opacity 0.3s",
            } as React.CSSProperties}
          >
            <BirdSvg size={bird.size} className="text-white" />
          </div>
        );
      })}

      {/* ---- Splash ---- */}
      {showSplash && dive && (
        <div
          className="absolute"
          style={{ left: `${dive.x}%`, top: `${horizonPct}%`, transform: "translate(-50%, -50%)" }}
        >
          <div className="splash-ring splash-ring-1" />
          <div className="splash-ring splash-ring-2" />
          <div className="splash-ring splash-ring-3" />
          <div className="splash-drop splash-drop-1" />
          <div className="splash-drop splash-drop-2" />
          <div className="splash-drop splash-drop-3" />
        </div>
      )}

      {/* ---- Rising bird carrying news ---- */}
      {showRiser && dive && (
        <div
          className={cn(
            "absolute transition-opacity",
            dive.phase === "fading" ? "duration-1000 opacity-0" : "duration-300 opacity-100",
          )}
          style={{
            left: `${dive.x + (dive.driftX || 0)}%`,
            top: `${dive.risingY}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* The bird */}
          <div className="flex justify-center">
            <BirdSvg size={22} className="text-white/70" />
          </div>

          {/* Thin string connecting bird to banner */}
          <div className="mx-auto h-5 w-px bg-gradient-to-b from-white/25 to-white/5" />

          {/* News card */}
          <div className="news-card">
            <div className="news-card-glow" />
            <p className="relative z-10 whitespace-nowrap px-4 py-2 text-[11px] font-medium tracking-wide text-white/85">
              {dive.newsText}
            </p>
            <div className="news-card-shine" />
          </div>
        </div>
      )}
    </div>
  );
}
