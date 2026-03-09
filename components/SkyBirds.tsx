"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn, clamp, lerp } from "@/lib/utils";

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

function BirdSvg({
  size = 16,
  className,
  flapSpeed = 0.8,
}: {
  size?: number;
  className?: string;
  flapSpeed?: number;
}) {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 24 14"
      fill="none"
      className={className}
      style={
        { overflow: "visible", "--flap-speed": `${flapSpeed}s` } as React.CSSProperties
      }
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

const BIRDS: BirdConfig[] = [
  { id: 0, size: 18, y: 30, speed: 34, delay: 0, direction: 1, bobAmp: 5, opacity: 0.34 },
  { id: 1, size: 22, y: 37, speed: 30, delay: -5, direction: -1, bobAmp: 7, opacity: 0.46 },
  { id: 2, size: 15, y: 26, speed: 38, delay: -10, direction: 1, bobAmp: 4, opacity: 0.24 },
  { id: 3, size: 24, y: 41, speed: 28, delay: -3, direction: 1, bobAmp: 8, opacity: 0.48 },
  { id: 4, size: 17, y: 34, speed: 36, delay: -9, direction: -1, bobAmp: 5, opacity: 0.3 },
  { id: 5, size: 13, y: 24, speed: 42, delay: -16, direction: 1, bobAmp: 4, opacity: 0.2 },
  { id: 6, size: 20, y: 45, speed: 32, delay: -6, direction: -1, bobAmp: 7, opacity: 0.4 },
  { id: 7, size: 14, y: 29, speed: 40, delay: -13, direction: 1, bobAmp: 4, opacity: 0.22 },
];

const MESSENGER_PERCH = { x: 80, y: 17.5 };

type MessengerPhase = "diving" | "lifting" | "showing" | "returning";

interface MessengerState {
  phase: MessengerPhase;
  x: number;
  y: number;
  rotation: number;
  cardOpacity: number;
  newsText: string;
}

interface SkyBirdsProps {
  horizonPct: number;
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number) {
  return value * value * value;
}

export function SkyBirds({ horizonPct }: SkyBirdsProps) {
  const [messenger, setMessenger] = useState<MessengerState | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const newsIdxRef = useRef(0);
  const rafRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const cycleRef = useRef(0);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const animateSegment = useCallback(
    (
      cycleId: number,
      duration: number,
      updater: (progress: number) => void,
    ) =>
      new Promise<void>((resolve) => {
        const start = performance.now();

        const frame = (now: number) => {
          if (cycleRef.current !== cycleId) {
            resolve();
            return;
          }

          const progress = clamp((now - start) / duration, 0, 1);
          updater(progress);

          if (progress >= 1) {
            resolve();
            return;
          }

          rafRef.current = window.requestAnimationFrame(frame);
        };

        rafRef.current = window.requestAnimationFrame(frame);
      }),
    [],
  );

  const sleep = useCallback(
    (cycleId: number, duration: number) =>
      new Promise<void>((resolve) => {
        schedule(() => {
          if (cycleRef.current === cycleId) {
            resolve();
          }
        }, duration);
      }),
    [schedule],
  );

  const triggerDive = useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    runningRef.current = true;
    clearTimers();
    window.cancelAnimationFrame(rafRef.current);

    const cycleId = cycleRef.current + 1;
    cycleRef.current = cycleId;

    const newsText = SB_NEWS[newsIdxRef.current];
    newsIdxRef.current = (newsIdxRef.current + 1) % SB_NEWS.length;

    const diveTargetX = 45 + Math.random() * 10;
    const showX = 76 + Math.random() * 4;
    const showY = horizonPct - 8.6;
    const returnArcLift = 10 + Math.random() * 4;

    await animateSegment(cycleId, 1180, (progress) => {
      const eased = easeInCubic(progress);
      const x = lerp(MESSENGER_PERCH.x, diveTargetX, eased);
      const y =
        lerp(MESSENGER_PERCH.y, horizonPct - 1.5, eased) -
        Math.sin(progress * Math.PI) * 7;

      setMessenger({
        phase: "diving",
        x,
        y,
        rotation: lerp(-6, 68, eased),
        cardOpacity: 0,
        newsText,
      });
    });

    setShowSplash(true);
    await sleep(cycleId, 260);
    setShowSplash(false);

    await animateSegment(cycleId, 880, (progress) => {
      const eased = easeOutCubic(progress);
      const x = lerp(diveTargetX, showX, eased);
      const y = lerp(horizonPct - 1.5, showY, eased) - Math.sin(progress * Math.PI) * 5;

      setMessenger({
        phase: "lifting",
        x,
        y,
        rotation: lerp(68, -10, eased),
        cardOpacity: clamp((progress - 0.68) / 0.32, 0, 1),
        newsText,
      });
    });

    await animateSegment(cycleId, 2300, (progress) => {
      const drift = Math.sin(progress * Math.PI) * 1.5;

      setMessenger({
        phase: "showing",
        x: showX + drift,
        y: showY + Math.sin(progress * Math.PI * 2) * 1.4,
        rotation: -8 + Math.sin(progress * Math.PI * 2) * 3,
        cardOpacity: 1,
        newsText,
      });
    });

    await animateSegment(cycleId, 1250, (progress) => {
      const eased = easeInOutCubic(progress);
      const x = lerp(showX, MESSENGER_PERCH.x, eased);
      const baseY = lerp(showY, MESSENGER_PERCH.y, eased);
      const y = baseY - Math.sin(progress * Math.PI) * returnArcLift;

      setMessenger({
        phase: "returning",
        x,
        y,
        rotation: lerp(-8, -2, eased),
        cardOpacity: lerp(1, 0, eased),
        newsText,
      });
    });

    if (cycleRef.current === cycleId) {
      setMessenger(null);
      runningRef.current = false;
    }
  }, [animateSegment, clearTimers, horizonPct, sleep]);

  useEffect(() => {
    schedule(triggerDive, 3800);
    const intervalId = window.setInterval(triggerDive, 14500);

    return () => {
      window.clearInterval(intervalId);
      cycleRef.current += 1;
      clearTimers();
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [clearTimers, schedule, triggerDive]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BIRDS.map((bird) => (
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
              top: 0,
              left: 0,
              opacity: bird.opacity,
            } as React.CSSProperties
          }
        >
          <BirdSvg size={bird.size} className="text-white" />
        </div>
      ))}

      {!messenger ? (
        <div
          data-testid="messenger-perch"
          className="messenger-perch absolute"
          style={{
            left: `${MESSENGER_PERCH.x}%`,
            top: `${MESSENGER_PERCH.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <BirdSvg size={30} className="text-white/76 drop-shadow-[0_0_16px_rgba(255,220,180,0.22)]" flapSpeed={0.92} />
        </div>
      ) : null}

      {showSplash ? (
        <div
          className="absolute"
          style={{
            left: `${messenger?.x ?? 50}%`,
            top: `${horizonPct}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="splash-ring splash-ring-1" />
          <div className="splash-ring splash-ring-2" />
          <div className="splash-ring splash-ring-3" />
          <div className="splash-drop splash-drop-1" />
          <div className="splash-drop splash-drop-2" />
          <div className="splash-drop splash-drop-3" />
        </div>
      ) : null}

      {messenger ? (() => {
        const cardOnLeft = messenger.x > 68;
        const connectorStyle = cardOnLeft
          ? {
              right: "95%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.28), rgba(255,255,255,0.08))",
            }
          : {
              left: "95%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.28), rgba(255,255,255,0.04))",
            };

        return (
          <div
            data-testid="messenger-bird"
            className="absolute"
            style={{
              left: `${messenger.x}%`,
              top: `${messenger.y}%`,
              transform: `translate(-50%, -50%) rotate(${messenger.rotation}deg)`,
              filter: "drop-shadow(0 8px 18px rgba(4, 10, 28, 0.4))",
            }}
          >
            <div className="relative flex items-center justify-center">
                <BirdSvg
                  size={38}
                  className={cn(
                    "relative z-10 text-white/84 transition-opacity duration-300",
                    messenger.phase === "diving" && "text-amber-50/76",
                  )}
                  flapSpeed={messenger.phase === "diving" ? 0.44 : 0.82}
                />

              <div
                className="absolute top-1/2 h-px w-8 -translate-y-1/2"
                style={{
                  ...connectorStyle,
                  opacity: messenger.cardOpacity * 0.9,
                }}
              />

              <div
                data-testid="messenger-card"
                className="news-card absolute top-1/2 transition-opacity duration-300"
                style={{
                  left: cardOnLeft ? "auto" : "calc(100% + 0.9rem)",
                  right: cardOnLeft ? "calc(100% + 0.9rem)" : "auto",
                  opacity: messenger.cardOpacity,
                  transform: `translateY(calc(-50% + ${(1 - messenger.cardOpacity) * 10}px)) rotate(${cardOnLeft ? -4 : 4}deg)`,
                }}
              >
                <div className="news-card-glow" />
                <div className="relative z-10 flex items-center gap-2 px-4 pt-2">
                  <span className="inline-flex rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/55">
                    Local note
                  </span>
                </div>
                <p className="relative z-10 max-w-[15rem] px-4 pb-3 pt-1 text-[11px] font-medium leading-relaxed tracking-[0.04em] text-white/88 md:max-w-[18rem] md:text-[11.5px]">
                  {messenger.newsText}
                </p>
                <div className="news-card-shine" />
              </div>
            </div>
          </div>
        );
      })() : null}
    </div>
  );
}
