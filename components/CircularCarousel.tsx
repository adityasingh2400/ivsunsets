"use client";

import { useScroll, useMotionValueEvent } from "framer-motion";
import {
  createContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { smoothScrollTo } from "@/components/SmoothScrollProvider";

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

const MOBILE_BREAKPOINT = 767;
const SWIPE_THRESHOLD = 48;

/** True while a section is the active card or one of its neighbours.
 *  Animated children (canvas skies) idle when this is false. */
export const CarouselNearContext = createContext(true);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CircularCarousel({ sections }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef(0);
  const rotationRef = useRef(0);
  const containerTopRef = useRef(0);
  const extraRef = useRef<number[]>([]);
  const activeIdxRef = useRef(0);
  const prevZRef = useRef<number[]>([]);
  const prevOffsetRef = useRef<number[]>([]);
  const dimsRef = useRef({ w: 1200, h: 800 });
  const swipeRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    tracking: false,
  });

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [preloadAll, setPreloadAll] = useState(false);
  const [dwellTotal, setDwellTotal] = useState(0);
  const isMobileRef = useRef(isMobile);

  const n = sections.length;
  const stepAngle = 360 / n;
  const LOOPS = 2;
  const totalStops = LOOPS * n;

  const { scrollY } = useScroll();

  /* ------------------------------------------------------------------
   * Scroll track: every stop is a 100vh rotation, preceded by a "dwell"
   * for sections taller than the viewport. During a dwell the carousel
   * holds still and the section's content scrolls instead, so nothing is
   * stranded below the fold.
   * ---------------------------------------------------------------- */
  const dwellAt = (k: number) =>
    k < totalStops ? (extraRef.current[k % n] ?? 0) : 0;

  /** Track offset (px) where each stop's dwell begins; last entry = end. */
  const stopStarts = () => {
    const h = dimsRef.current.h;
    const starts = [0];
    for (let k = 0; k < totalStops; k++) {
      starts.push(starts[k] + dwellAt(k) + h);
    }
    return starts;
  };

  /** Rotation, measured in stops, for a track offset. */
  const rotationAt = (pos: number, starts: number[]) => {
    const h = dimsRef.current.h;
    for (let k = 0; k < totalStops; k++) {
      if (pos < starts[k + 1]) {
        const turnStart = starts[k] + dwellAt(k);
        return pos <= turnStart ? k : k + (pos - turnStart) / h;
      }
    }
    return totalStops;
  };

  const setCarouselIndex = (idx: number) => {
    const normalized = ((idx % n) + n) % n;
    activeIdxRef.current = normalized;
    setActiveIndex((prev) => (prev === normalized ? prev : normalized));
  };

  const indexFromRotation = (rot: number) => Math.round(rot) % n;

  const scrollToIndex = (idx: number) => {
    const normalized = ((idx % n) + n) % n;

    if (isMobileRef.current) {
      setCarouselIndex(normalized);
      return;
    }

    if (typeof window === "undefined") return;

    const current = rotationRef.current;
    let target = normalized;
    for (let k = normalized + n; k < totalStops; k += n) {
      if (Math.abs(k - current) < Math.abs(target - current)) target = k;
    }

    smoothScrollTo(containerTopRef.current + stopStarts()[target]);
  };

  const syncFromScroll = () => {
    posRef.current = window.scrollY - containerTopRef.current;
    tick();
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const syncMode = () => {
      const mobile = media.matches;
      isMobileRef.current = mobile;
      setIsMobile(mobile);

      if (!mobile) {
        syncFromScroll();
        setCarouselIndex(indexFromRotation(rotationRef.current));
        return;
      }

      tick();
    };

    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  /* ------------------------------------------------------------------
   * HOT PATH — runs every scroll frame.
   * ONLY `transform` + `opacity` — both are GPU-composited and
   * skip layout / paint entirely. Everything else is deferred to
   * `onActiveChange` which fires ~5 times during the full scroll.
   * ---------------------------------------------------------------- */
  const tick = () => {
    const mobile = isMobileRef.current;
    const starts = stopStarts();
    if (!mobile) rotationRef.current = rotationAt(posRef.current, starts);
    const rot = mobile ? activeIdxRef.current : rotationRef.current;
    const rotation = rot * stepAngle;
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

      /* Cards are full-screen sized, so neighbours need a steeper falloff
         to land at roughly card size (~0.4) one stop away. */
      const scale = 0.13 + 0.87 * Math.pow(Math.max(0, 1 - dist), 2.2);
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

      /* Dwell: scroll the card itself (not a transform) so sticky
         children keep working. Mobile cards scroll natively instead. */
      const card = cardsRef.current[i];
      if (card && !mobile) {
        let k = i + n * Math.round((rot - i) / n);
        if (k > totalStops) k -= n;
        if (k < 0) k += n;
        const offset = Math.round(
          Math.min(Math.max(posRef.current - starts[k], 0), dwellAt(k)),
        );
        if (prevOffsetRef.current[i] !== offset) {
          prevOffsetRef.current[i] = offset;
          card.scrollTop = offset;
        }
      }
    }
  };

  const resetSwipe = () => {
    swipeRef.current = {
      pointerId: -1,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
      tracking: false,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobileRef.current || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      tracking: true,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!isMobileRef.current || !swipe.tracking) return;
    if (swipe.pointerId !== event.pointerId) return;

    swipe.deltaX = event.clientX - swipe.startX;
    swipe.deltaY = event.clientY - swipe.startY;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!isMobileRef.current || !swipe.tracking) return;
    if (swipe.pointerId !== event.pointerId) return;

    const { deltaX, deltaY } = swipe;
    resetSwipe();

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    setCarouselIndex(activeIdxRef.current + (deltaX < 0 ? 1 : -1));
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
    if (countRef.current) {
      countRef.current.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    }
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(ellipse 60% 50% at 50% 55%,${sections[idx].glowColor},transparent)`;
    }
  };

  useMotionValueEvent(scrollY, "change", () => {
    if (isMobileRef.current) return;

    syncFromScroll();

    const idx = indexFromRotation(rotationRef.current);
    if (idx !== activeIdxRef.current) {
      setCarouselIndex(idx);
    }
  });

  useEffect(() => {
    isMobileRef.current = isMobile;
    onActiveChange(activeIndex);
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isMobile]);

  /* ---------- Measure sections taller than the viewport ---------- */
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (container) {
        containerTopRef.current =
          container.getBoundingClientRect().top + window.scrollY;
      }

      let changed = false;
      for (let i = 0; i < n; i++) {
        const card = cardsRef.current[i];

        /* Mobile cards scroll natively, so they never dwell */
        const overflow =
          card && !isMobileRef.current ? card.scrollHeight - card.clientHeight : 0;
        const extra = overflow > 4 ? overflow : 0;
        if (extraRef.current[i] !== extra) {
          extraRef.current[i] = extra;
          changed = true;
        }
      }

      if (changed) {
        setDwellTotal(LOOPS * extraRef.current.reduce((sum, e) => sum + e, 0));
      }
      prevOffsetRef.current = [];
      if (isMobileRef.current) tick();
      else syncFromScroll();
    };

    measure();
    const ro = new ResizeObserver(measure);
    for (const card of cardsRef.current) {
      if (card) ro.observe(card);
      if (card?.firstElementChild) ro.observe(card.firstElementChild);
    }
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, isMobile, preloadAll, n]);

  /* Mount every section once the page is idle. Rendering only the near
     ones made far cards swap a spinner for real content (and back) while
     they were still visible mid-rotation. */
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setPreloadAll(true), {
        timeout: 2000,
      });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setPreloadAll(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
      if (!inView) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        scrollToIndex(activeIdxRef.current + 1);
        return;
      }

      event.preventDefault();
      scrollToIndex(activeIdxRef.current - 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile
          ? "100dvh"
          : `calc(${totalStops * 100 + 100}vh + ${dwellTotal}px)`,
      }}
      className="touch-action-pan-y"
    >
      <div
        data-testid="carousel-viewport"
        className="sticky top-0 flex h-screen items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={resetSwipe}
      >
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
              style={{
                width: "100vw",
                height: "100dvh",
                willChange: "transform, opacity",
                transition: isMobile
                  ? "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : undefined,
              }}
            >
              <div
                ref={(el) => {
                  cardsRef.current[i] = el;
                }}
                className="carousel-card"
              >
                <CarouselNearContext.Provider value={near}>
                  {near || preloadAll ? (
                    sec.content
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
                    </div>
                  )}
                </CarouselNearContext.Provider>
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
          <p
            ref={countRef}
            className="text-[10px] uppercase tracking-[0.22em] text-white/28"
          >
            {`01 / ${String(n).padStart(2, "0")}`}
          </p>
          <div className="flex items-center gap-2">
            {sections.map((s, i) => (
              <button
                key={s.id}
                ref={(el) => {
                  dotsRef.current[i] = el;
                }}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to ${s.label}`}
                className="h-1.5 appearance-none rounded-full border-0 p-0 transition-[width,background] duration-300"
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
