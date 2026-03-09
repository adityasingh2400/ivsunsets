"use client";

import { useScroll, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CarouselSection {
  id: string;
  label: string;
  glowColor: string;
  content: ReactNode;
}

interface Props {
  sections: CarouselSection[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CircularCarousel({ sections }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const activeIdxRef = useRef(0);
  const prevZRef = useRef<number[]>([]);
  const dimsRef = useRef({ w: 1200, h: 800 });

  const [activeIndex, setActiveIndex] = useState(0);

  const n = sections.length;
  const stepAngle = 360 / n;
  const LOOPS = 2;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  /* ---------- Responsive dimensions ---------- */
  useEffect(() => {
    const onResize = () => {
      dimsRef.current = { w: window.innerWidth, h: window.innerHeight };
      tick();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------
   * HOT PATH — runs every scroll frame.
   * ONLY `transform` + `opacity` — both are GPU-composited and
   * skip layout / paint entirely. Everything else is deferred to
   * `onActiveChange` which fires ~5 times during the full scroll.
   * ---------------------------------------------------------------- */
  const tick = () => {
    const p = progressRef.current;
    const rotation = p * LOOPS * 360;
    const { w, h } = dimsRef.current;
    const RX = w * 0.34;
    const RY = h * 0.18;

    for (let i = 0; i < n; i++) {
      const el = itemsRef.current[i];
      if (!el) continue;

      const raw = (((i * stepAngle - rotation) % 360) + 360) % 360;
      const rad = (raw * Math.PI) / 180;

      const x = -Math.sin(rad) * RX;
      const y = -(1 - Math.cos(rad)) * RY;
      const dist = Math.min(raw, 360 - raw) / 180;

      const scale = 0.18 + 0.82 * Math.pow(Math.max(0, 1 - dist), 1.4);
      const opacity = Math.max(0.03, Math.pow(Math.max(0, 1 - dist), 1.6));

      /* GPU-composited only — zero layout / paint cost */
      el.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
      el.style.opacity = String(opacity);

      /* zIndex: only write when the integer value actually changes */
      const z = Math.round((1 - dist) * 100);
      if (prevZRef.current[i] !== z) {
        prevZRef.current[i] = z;
        el.style.zIndex = String(z);
      }
    }
  };

  /* ------------------------------------------------------------------
   * COLD PATH — runs only when the active section changes (~5× total).
   * All non-composited DOM writes live here.
   * ---------------------------------------------------------------- */
  const onActiveChange = (idx: number) => {
    /* Pointer events + focused class */
    for (let i = 0; i < n; i++) {
      const el = itemsRef.current[i];
      if (!el) continue;

      const cDist = Math.min(
        Math.abs(i - idx),
        n - Math.abs(i - idx),
      );
      el.style.pointerEvents = cDist === 0 ? "auto" : "none";

      const inner = el.querySelector(".carousel-card") as HTMLElement | null;
      if (inner) inner.classList.toggle("focused", cDist === 0);
    }

    /* Dots */
    for (let i = 0; i < n; i++) {
      const dot = dotsRef.current[i];
      if (!dot) continue;
      const on = i === idx;
      dot.style.width = on ? "24px" : "6px";
      dot.style.background = on
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.15)";
    }

    /* Label + glow */
    if (labelRef.current) labelRef.current.textContent = sections[idx].label;
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(ellipse 60% 50% at 50% 55%,${sections[idx].glowColor},transparent)`;
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    tick();

    const idx = Math.round(v * LOOPS * n) % n;
    if (idx !== activeIdxRef.current) {
      activeIdxRef.current = idx;
      setActiveIndex(idx);
      onActiveChange(idx);
    }
  });

  /* Initial paint */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onActiveChange(0), []);

  return (
    <div
      ref={containerRef}
      style={{ height: `${n * LOOPS * 100 + 100}vh` }}
      className="touch-action-pan-y"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Ambient glow */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        />

        {/* Carousel items */}
        {sections.map((sec, i) => {
          const cDist = Math.min(
            Math.abs(i - activeIndex),
            n - Math.abs(i - activeIndex),
          );
          const near = cDist <= 1;

          return (
            <div
              key={sec.id}
              ref={(el) => {
                itemsRef.current[i] = el;
              }}
              className="absolute flex items-center justify-center contain-layout-paint"
              style={{ width: "100vw", height: "100dvh", willChange: "transform, opacity" }}
            >
              <div className="carousel-card">
                {near ? (
                  sec.content
                ) : (
                  <div className="flex h-56 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom: label + dots */}
        <div className="absolute bottom-7 z-[200] flex flex-col items-center gap-2.5 md:bottom-10">
          <p
            ref={labelRef}
            data-testid="carousel-label"
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45"
          >
            {sections[0].label}
          </p>
          <div className="flex items-center gap-2">
            {sections.map((s, i) => (
              <div
                key={s.id}
                ref={(el) => {
                  dotsRef.current[i] = el;
                }}
                className="h-1.5 rounded-full transition-[width,background] duration-300"
                style={{
                  width: i === 0 ? 24 : 6,
                  background:
                    i === 0
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
