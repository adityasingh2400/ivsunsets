"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LocalPulseItem } from "@/lib/types";
import { clamp, cn, lerp } from "@/lib/utils";

interface BirdNewsItem {
  title: string;
  source: string;
}

const FALLBACK_NOTES: BirdNewsItem[] = [
  { title: "Pardall and Del Playa usually telegraph the IV vibe before the rest of campus catches up.", source: "IV fallback" },
  { title: "The bluff, Campus Point, and UCen foot traffic are the best tells for whether tonight feels alive.", source: "IV fallback" },
  { title: "The live IV pulse is temporarily rebuilding from public feeds.", source: "IV fallback" },
];

function BirdSvg({
  size = 16,
  className,
  flapSpeed = 0.8,
  style,
}: {
  size?: number;
  className?: string;
  flapSpeed?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 24 14"
      fill="none"
      className={className}
      style={{ ...(style ?? {}), overflow: "visible", "--flap-speed": `${flapSpeed}s` } as BirdStyleVars}
    >
      <path
        className="bird-wing-l"
        d="M12 8.1 Q9.2 6.9 6.1 5.5 Q3.7 4.6 1.2 4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "12px 8px" }}
      />
      <path
        className="bird-wing-r"
        d="M12 8.1 Q14.8 6.9 17.9 5.5 Q20.3 4.6 22.8 4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "12px 8px" }}
      />
      <ellipse cx="12" cy="8.5" rx="1.8" ry="1" fill="currentColor" opacity="0.52" />
    </svg>
  );
}

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

type BirdStyleVars = CSSProperties & Record<`--${string}`, string>;
type MessengerPhase = "idle" | "diving" | "returning";

interface MessengerRenderState {
  phase: MessengerPhase;
  x: number;
  y: number;
  rotation: number;
  cardOpacity: number;
  diveProgress: number;
  newsItem: BirdNewsItem;
}

interface DiveMotion {
  startMs: number;
  startX: number;
  startY: number;
  startVx: number;
  targetX: number;
  targetY: number;
  accelX: number;
  durationMs: number;
  newsItem: BirdNewsItem;
}

interface ReturnMotion {
  startMs: number;
  startX: number;
  startY: number;
  durationMs: number;
  arcLift: number;
  newsItem: BirdNewsItem;
}

interface SkyBirdsProps {
  horizonPct: number;
  newsItems: LocalPulseItem[];
}

const BIRDS: BirdConfig[] = [
  { id: 0, size: 18, y: 50, speed: 34, delay: 0, direction: 1, bobAmp: 4, opacity: 0.32 },
  { id: 1, size: 22, y: 50, speed: 30, delay: -5, direction: 1, bobAmp: 6, opacity: 0.44 },
  { id: 2, size: 15, y: 50, speed: 38, delay: -10, direction: 1, bobAmp: 3, opacity: 0.24 },
  { id: 3, size: 24, y: 50, speed: 28, delay: -3, direction: 1, bobAmp: 6, opacity: 0.46 },
  { id: 4, size: 17, y: 50, speed: 36, delay: -9, direction: 1, bobAmp: 4, opacity: 0.3 },
  { id: 5, size: 13, y: 50, speed: 42, delay: -16, direction: 1, bobAmp: 3, opacity: 0.2 },
  { id: 6, size: 20, y: 50, speed: 32, delay: -6, direction: 1, bobAmp: 6, opacity: 0.38 },
  { id: 7, size: 14, y: 50, speed: 40, delay: -13, direction: 1, bobAmp: 3, opacity: 0.22 },
];

const MESSENGER_BIRD_ID = 3;
const MESSENGER_FLOCK = BIRDS.find((bird) => bird.id === MESSENGER_BIRD_ID) ?? BIRDS[0];

function easeInCubic(value: number) {
  return value * value * value;
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function normalizePct(value: number) {
  return ((value % 100) + 100) % 100;
}

function shortestWrappedDelta(targetPct: number, fromPct: number) {
  const target = normalizePct(targetPct);
  const from = normalizePct(fromPct);
  let delta = target - from;
  if (delta > 50) delta -= 100;
  if (delta < -50) delta += 100;
  return delta;
}

export function SkyBirds({ horizonPct, newsItems }: SkyBirdsProps) {
  const birdNotes = useMemo(() => {
    const next = newsItems
      .map((item) => ({
        title: item.title,
        source: item.source,
      }))
      .filter((item) => item.title.trim().length > 0);

    return next.length > 0 ? next : FALLBACK_NOTES;
  }, [newsItems]);

  const [messenger, setMessenger] = useState<MessengerRenderState>({
    phase: "idle",
    x: 50,
    y: MESSENGER_FLOCK.y,
    rotation: 0,
    cardOpacity: 0,
    diveProgress: 0,
    newsItem: birdNotes[0],
  });
  const [showSplash, setShowSplash] = useState(false);

  const newsIdxRef = useRef(0);
  const messengerSnapshotRef = useRef(messenger);
  const rafRef = useRef(0);
  const splashHideTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<MessengerPhase>("idle");
  const diveRef = useRef<DiveMotion | null>(null);
  const returnRef = useRef<ReturnMotion | null>(null);
  const nextDiveAtMsRef = useRef(0);
  const flockClockStartMsRef = useRef(0);
  const prevFlockSampleRef = useRef<{ atMs: number; x: number; y: number } | null>(null);

  useEffect(() => {
    messengerSnapshotRef.current = messenger;
  }, [messenger]);

  useEffect(() => {
    newsIdxRef.current = 0;
  }, [birdNotes]);

  const getFlockPosition = (nowMs: number) => {
    const viewportWidth = window.innerWidth || 1;
    const elapsedSeconds = (nowMs - flockClockStartMsRef.current) / 1000;
    const adjustedSeconds = elapsedSeconds - MESSENGER_FLOCK.delay;
    const cycleSeconds =
      ((adjustedSeconds % MESSENGER_FLOCK.speed) + MESSENGER_FLOCK.speed) %
      MESSENGER_FLOCK.speed;
    const progress = cycleSeconds / MESSENGER_FLOCK.speed;

    const startX = -40 * MESSENGER_FLOCK.direction;
    const endX = (viewportWidth + 40) * MESSENGER_FLOCK.direction;
    const xPx = lerp(startX, endX, progress);
    const centerXPct = ((xPx + MESSENGER_FLOCK.size / 2) / viewportWidth) * 100;

    return { x: centerXPct, y: MESSENGER_FLOCK.y };
  };

  const syncFlockClockToX = (nowMs: number, xPct: number) => {
    const viewportWidth = window.innerWidth || 1;
    const startX = -40 * MESSENGER_FLOCK.direction;
    const endX = (viewportWidth + 40) * MESSENGER_FLOCK.direction;
    const centerXPx = (normalizePct(xPct) / 100) * viewportWidth;
    const xPx = centerXPx - MESSENGER_FLOCK.size / 2;
    const rawProgress = (xPx - startX) / (endX - startX);
    const progress = clamp(rawProgress, 0, 1);
    const adjustedSeconds = progress * MESSENGER_FLOCK.speed;
    flockClockStartMsRef.current = nowMs - (adjustedSeconds + MESSENGER_FLOCK.delay) * 1000;
  };

  useEffect(() => {
    flockClockStartMsRef.current = performance.now();
    nextDiveAtMsRef.current = flockClockStartMsRef.current + 3800;

    const tick = (nowMs: number) => {
      const flock = getFlockPosition(nowMs);

      if (phaseRef.current === "idle" && nowMs >= nextDiveAtMsRef.current) {
        const prev = prevFlockSampleRef.current;
        const fallbackVx =
          ((100 + (80 / (window.innerWidth || 1)) * 100) / MESSENGER_FLOCK.speed) *
          MESSENGER_FLOCK.direction;
        const sampledVx = prev
          ? (flock.x - prev.x) / Math.max((nowMs - prev.atMs) / 1000, 0.001)
          : fallbackVx;
        const clampedVx = clamp(sampledVx, fallbackVx * 0.75, fallbackVx * 1.25);

        const newsItem = birdNotes[newsIdxRef.current % birdNotes.length];
        newsIdxRef.current = (newsIdxRef.current + 1) % birdNotes.length;

        const diveDurationMs = 5400;
        const diveDurationSec = diveDurationMs / 1000;
        const targetX = 51.5 + Math.random() * 6;
        const targetY = clamp(horizonPct + 8.5 + Math.random() * 1.5, horizonPct + 7.8, 86.5);
        const deltaX = targetX - flock.x;
        const accelX = (2 * (deltaX - clampedVx * diveDurationSec)) / (diveDurationSec * diveDurationSec);

        diveRef.current = {
          startMs: nowMs,
          startX: flock.x,
          startY: flock.y,
          startVx: clampedVx,
          targetX,
          targetY,
          accelX,
          durationMs: diveDurationMs,
          newsItem,
        };
        phaseRef.current = "diving";
      }

      if (phaseRef.current === "diving" && diveRef.current) {
        const dive = diveRef.current;
        const progress = clamp((nowMs - dive.startMs) / dive.durationMs, 0, 1);
        const eased = easeInCubic(progress);
        const elapsedSec = progress * (dive.durationMs / 1000);
        const x = dive.startX + dive.startVx * elapsedSec + 0.5 * dive.accelX * elapsedSec * elapsedSec;
        const y = lerp(dive.startY, dive.targetY, eased);

        setMessenger({
          phase: "diving",
          x,
          y,
          rotation: lerp(0, 22, eased),
          cardOpacity: 0,
          diveProgress: progress,
          newsItem: dive.newsItem,
        });

        if (progress >= 1) {
          setShowSplash(true);
          if (splashHideTimerRef.current) {
            window.clearTimeout(splashHideTimerRef.current);
          }
          splashHideTimerRef.current = window.setTimeout(() => setShowSplash(false), 420);
          returnRef.current = {
            startMs: nowMs,
            startX: x,
            startY: y,
            durationMs: 12600,
            arcLift: 11 + Math.random() * 3,
            newsItem: dive.newsItem,
          };
          diveRef.current = null;
          phaseRef.current = "returning";
        }
      } else if (phaseRef.current === "returning" && returnRef.current) {
        const ret = returnRef.current;
        const progress = clamp((nowMs - ret.startMs) / ret.durationMs, 0, 1);
        const eased = easeInOutSine(progress);
        const flockNow = getFlockPosition(nowMs);
        const wrappedDelta = shortestWrappedDelta(flockNow.x, ret.startX);
        const targetX = ret.startX + wrappedDelta;
        const x = lerp(ret.startX, targetX, eased);
        const baseY = lerp(ret.startY, flockNow.y, eased);
        const y = baseY - Math.sin(progress * Math.PI) * ret.arcLift;
        const fadeIn = clamp(progress / 0.15, 0, 1);
        const fadeOut = clamp((1 - progress) / 0.22, 0, 1);
        const cardOpacity = Math.min(fadeIn, fadeOut);

        setMessenger({
          phase: "returning",
          x,
          y,
          rotation: lerp(22, 0, eased),
          cardOpacity: clamp(cardOpacity, 0, 1),
          diveProgress: 1,
          newsItem: ret.newsItem,
        });

        if (progress >= 1) {
          const syncedX = normalizePct(x);
          syncFlockClockToX(nowMs, syncedX);
          phaseRef.current = "idle";
          returnRef.current = null;
          nextDiveAtMsRef.current = nowMs + 14500;
          setMessenger({
            phase: "idle",
            x: syncedX,
            y: MESSENGER_FLOCK.y,
            rotation: 0,
            cardOpacity: 0,
            diveProgress: 0,
            newsItem: ret.newsItem,
          });
        }
      } else if (phaseRef.current === "idle") {
        setMessenger((prev) => ({
          ...prev,
          phase: "idle",
          x: flock.x,
          y: flock.y,
          rotation: 0,
          cardOpacity: 0,
          diveProgress: 0,
        }));
      }

      prevFlockSampleRef.current = { atMs: nowMs, x: flock.x, y: flock.y };
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      if (splashHideTimerRef.current) {
        window.clearTimeout(splashHideTimerRef.current);
      }
    };
  }, [birdNotes, horizonPct]);

  useEffect(() => {
    let rafId = 0;
    const onResize = () => {
      if (phaseRef.current !== "idle") return;
      const latest = messengerSnapshotRef.current;
      if (!latest) return;

      // Keep the idle flock phase locked to the currently rendered bird X.
      rafId = window.requestAnimationFrame(() => {
        syncFlockClockToX(performance.now(), latest.x);
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const cardOnLeft = true;
  const cardGap = "3.5rem";
  const tetherAnchorRight = 22;
  const trailingLiftPx = Math.max(0, messenger.rotation) * 0.18;
  const cardOffsetY = (1 - messenger.cardOpacity) * 6 - trailingLiftPx - 3;
  const tetherWaveTopY = 6.4 - trailingLiftPx * 0.08;
  const tetherWaveBottomY = 19.5 - trailingLiftPx * 0.04;
  const tetherMidY = 12.9 - trailingLiftPx * 0.12;
  const tetherEndY = 7.2 - trailingLiftPx * 0.1;
  const tetherPath = `M2 15 C 12 ${tetherWaveTopY.toFixed(2)}, 20 ${tetherWaveBottomY.toFixed(2)}, 31 ${tetherMidY.toFixed(2)} S 50 ${(tetherWaveTopY + 2.4).toFixed(2)}, 72 ${tetherEndY.toFixed(2)}`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BIRDS.filter((bird) => bird.id !== MESSENGER_BIRD_ID).map((bird) => (
        <div
          key={bird.id}
          className="bird-flight"
          style={
            {
              "--bird-y": `${bird.y}%`,
              "--bird-speed": `${bird.speed}s`,
              "--bird-delay": `${bird.delay}s`,
              "--bird-dir": bird.direction === 1 ? "1" : "-1",
              "--bird-bob": `${bird.bobAmp}px`,
              position: "absolute",
              top: `${bird.y}%`,
              left: 0,
              opacity: bird.opacity,
            } as BirdStyleVars
          }
        >
          <BirdSvg size={bird.size} className="text-white" />
        </div>
      ))}

      {showSplash ? (
        <div
          className="absolute"
          style={{
            left: `${messenger.x}%`,
            top: `${messenger.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="splash-glow" />
          <div className="splash-ring splash-ring-1" />
          <div className="splash-ring splash-ring-2" />
          <div className="splash-ring splash-ring-3" />
          <div className="splash-drop splash-drop-1" />
          <div className="splash-drop splash-drop-2" />
          <div className="splash-drop splash-drop-3" />
          <div className="splash-drop splash-drop-4" />
        </div>
      ) : null}

      <div
        data-testid="messenger-bird"
        className="absolute"
        style={{
          left: `${messenger.x}%`,
          top: `${messenger.y}%`,
          transform: "translate(-50%, -50%)",
          filter: "drop-shadow(0 8px 18px rgba(4, 10, 28, 0.4))",
          zIndex: 12,
        }}
      >
        <div className="relative inline-flex items-center justify-center">
          <div
            className="relative z-20"
            style={{ transform: `rotate(${messenger.rotation}deg)` }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <BirdSvg
                size={35}
                className="text-transparent"
                flapSpeed={messenger.phase === "diving" ? 0.44 : 0.82}
                style={
                  {
                    color: "rgba(35, 27, 59, 0.94)",
                    filter: "blur(0.55px)",
                  } as CSSProperties
                }
              />
            </div>
            <BirdSvg
              size={30}
              className={cn("relative z-20 transition-[filter,color] duration-300")}
              flapSpeed={messenger.phase === "diving" ? 0.44 : 0.82}
              style={
                {
                  color: `rgba(255, ${Math.round(255 - messenger.diveProgress * 10)}, ${Math.round(255 - messenger.diveProgress * 24)}, ${0.84 - messenger.diveProgress * 0.1})`,
                  filter: `brightness(${1 + messenger.diveProgress * 0.12})`,
                } as CSSProperties
              }
            />
          </div>

          <div
            className="pointer-events-none absolute transition-opacity duration-300"
            style={{
              top: "44%",
              left: cardOnLeft ? "auto" : `calc(100% + ${cardGap})`,
              right: cardOnLeft ? `calc(100% + ${cardGap})` : "auto",
              opacity: messenger.cardOpacity,
              transform: `translateY(calc(-50% + ${cardOffsetY}px))`,
              zIndex: 0,
            }}
          >
            <div
              data-testid="messenger-card"
              className="news-card relative z-0"
              style={{
                transform: `rotate(${cardOnLeft ? -3 : 3}deg)`,
                width: "clamp(13.5rem, 19vw, 15.5rem)",
              }}
            >
              <div className="news-card-glow" />
              <div className="relative z-10 flex w-full items-center gap-2 px-4 pt-2">
                <span className="inline-flex rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/55">
                  IV pulse
                </span>
                <span className="truncate text-[9px] uppercase tracking-[0.16em] text-white/34">
                  {messenger.newsItem.source}
                </span>
              </div>
              <p className="relative z-10 w-full px-4 pb-3 pt-1 text-[11px] font-medium leading-relaxed tracking-[0.04em] text-white/88 md:text-[11.5px]">
                {messenger.newsItem.title}
              </p>
              <div className="news-card-shine" />
            </div>
          </div>

          <svg
            className="pointer-events-none absolute overflow-visible"
            width="74"
            height="28"
            viewBox="0 0 74 28"
            style={{
              right: `${tetherAnchorRight}px`,
              top: "60%",
              transform: `translateY(calc(-50% - ${trailingLiftPx * 0.12}px))`,
              opacity: messenger.cardOpacity * 0.96,
              zIndex: 0,
            }}
            aria-hidden="true"
          >
            <path
              d={tetherPath}
              fill="none"
              stroke="rgba(255,255,255,0.24)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d={tetherPath}
              fill="none"
              stroke="rgba(255,240,218,0.34)"
              strokeWidth="0.5"
              strokeLinecap="round"
              transform="translate(0 -0.35)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
