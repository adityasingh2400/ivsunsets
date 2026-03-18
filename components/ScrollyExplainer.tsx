"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ForecastDay } from "@/lib/types";
import { clamp, lerp } from "@/lib/utils";
import { lerpColor } from "@/lib/skyRenderer";
import * as sky from "@/lib/skyRenderer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScrollyExplainerProps {
  today: ForecastDay;
}

interface ChapterSceneState {
  skyVibrancy: number;
  sunBrightness: number;
  highCloud: number;
  midCloud: number;
  lowCloud: number;
  rainHaze: number;
  clarityBoost: number;
}

interface ExplainerChapter {
  id: string;
  title: string;
  body: string;
  caption: string;
  highlight: string;
  scene: ChapterSceneState;
}

/* ------------------------------------------------------------------ */
/*  Scene interpolation                                                */
/* ------------------------------------------------------------------ */

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function lerpScene(a: ChapterSceneState, b: ChapterSceneState, t: number): ChapterSceneState {
  const ct = clamp(t, 0, 1);
  return {
    skyVibrancy: lerp(a.skyVibrancy, b.skyVibrancy, ct),
    sunBrightness: lerp(a.sunBrightness, b.sunBrightness, ct),
    highCloud: lerp(a.highCloud, b.highCloud, ct),
    midCloud: lerp(a.midCloud, b.midCloud, ct),
    lowCloud: lerp(a.lowCloud, b.lowCloud, ct),
    rainHaze: lerp(a.rainHaze, b.rainHaze, ct),
    clarityBoost: lerp(a.clarityBoost, b.clarityBoost, ct),
  };
}

/* ------------------------------------------------------------------ */
/*  Scene renderer                                                     */
/* ------------------------------------------------------------------ */

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: ChapterSceneState,
  time: number,
) {
  const v = clamp(state.skyVibrancy + state.clarityBoost * 0.15, 0, 1);

  sky.drawSky(ctx, w, h, v);
  sky.drawSunGlow(ctx, w, h, state.sunBrightness);
  sky.drawGodRays(ctx, w, h, v, time);
  sky.drawStars(ctx, w, h, v, time);
  sky.drawHighClouds(ctx, w, h, state.highCloud, v, time, 1);
  sky.drawMidClouds(ctx, w, h, state.midCloud, v, time, 1);
  sky.drawLowClouds(ctx, w, h, state.lowCloud, time, 1);
  sky.drawHorizonHaze(ctx, w, h, v);
  sky.drawRain(ctx, w, h, state.rainHaze, time, 1);

  /* clarity boost: extra vibrancy bloom */
  if (state.clarityBoost > 0.1) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const boost = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, w * 0.55);
    boost.addColorStop(0.0, rgba(255, 210, 140, state.clarityBoost * 0.12));
    boost.addColorStop(0.4, rgba(255, 170, 100, state.clarityBoost * 0.05));
    boost.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = boost;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* subtle vignette */
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------ */
/*  Chapter highlight pill                                             */
/* ------------------------------------------------------------------ */

function ChapterHighlight({ text }: { text: string }) {
  return (
    <motion.span
      className="inline-block rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-100/90"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {text}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Final chapter — score breakdown card                               */
/* ------------------------------------------------------------------ */

interface BreakdownRow {
  label: string;
  value: number;
  maxPossible: number;
  isPenalty: boolean;
  detail: string;
  barGradient: string;
}

function FinalBreakdown({ today }: { today: ForecastDay }) {
  const bd = today.factorBreakdown;

  const rows: BreakdownRow[] = [
    {
      label: "High clouds",
      value: bd.highCloudContribution,
      maxPossible: 28,
      isPenalty: false,
      detail: `${Math.round(today.factors.highCloud)}% cover`,
      barGradient: "from-amber-300/90 to-orange-400/80",
    },
    {
      label: "Mid clouds",
      value: bd.midCloudContribution,
      maxPossible: 22,
      isPenalty: false,
      detail: `${Math.round(today.factors.midCloud)}% cover`,
      barGradient: "from-fuchsia-300/90 to-rose-400/80",
    },
    {
      label: "Texture",
      value: bd.textureContribution,
      maxPossible: 10,
      isPenalty: false,
      detail: "cloud contrast",
      barGradient: "from-cyan-300/90 to-sky-400/80",
    },
    {
      label: "Low clouds",
      value: bd.lowCloudPenalty,
      maxPossible: 32,
      isPenalty: true,
      detail: `${Math.round(today.factors.lowCloud)}% cover`,
      barGradient: "from-rose-400/90 to-red-500/80",
    },
    {
      label: "Rain bonus",
      value: bd.rainBonus,
      maxPossible: 5,
      isPenalty: false,
      detail: `${today.factors.recentRain.toFixed(1)} mm`,
      barGradient: "from-sky-300/90 to-indigo-400/80",
    },
    {
      label: "Humidity",
      value: Math.abs(bd.humidityModifier),
      maxPossible: 4,
      isPenalty: bd.humidityModifier < 0,
      detail: `${Math.round(today.factors.relativeHumidity)}% RH`,
      barGradient: bd.humidityModifier >= 0 ? "from-emerald-300/90 to-teal-400/80" : "from-rose-400/90 to-red-500/80",
    },
  ];

  const labelColor =
    today.label === "Unreal" || today.label === "Great"
      ? "text-amber-200"
      : today.label === "Good"
        ? "text-cyan-200"
        : "text-white/70";

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {/* Score header */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          {/* ring */}
          <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2.5"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${today.score * 0.974} 100`}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>
          <span className="relative text-lg font-semibold text-white">{today.score}</span>
        </div>
        <div>
          <p className={`text-sm font-medium ${labelColor}`}>{today.label}</p>
          <p className="text-xs text-white/50">of 100 possible</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-white/10 via-white/6 to-transparent" />

      {/* Factor rows */}
      <div className="space-y-3">
        {rows.map((row) => {
          const pct = clamp((row.value / row.maxPossible) * 100, 0, 100);
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-white/65">{row.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] text-white/35">{row.detail}</span>
                  <span className={row.isPenalty ? "font-medium text-rose-300/90" : "font-medium text-white/90"}>
                    {row.isPenalty ? "\u2212" : "+"}{row.value.toFixed(1)}
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${row.barGradient}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Baseline note */}
      <div className="flex items-baseline justify-between border-t border-white/8 pt-2 text-[11px] text-white/40">
        <span>Baseline: +{bd.baseline.toFixed(0)} · wind, saturation, and haze also nudge the score</span>
        <span>Sunset at {today.sunsetTime}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ScrollyExplainer({ today }: ScrollyExplainerProps) {
  const prefersReducedMotion = useReducedMotion();

  const chapters = useMemo<ExplainerChapter[]>(() => {
    const todayVibrancy = clamp(today.score / 100, 0, 1);
    return [
      {
        id: "setup",
        title: "The canvas",
        body: "Every sunset starts with sunlight slicing through the atmosphere at a steep angle. Without clouds, the sky fades smoothly — pretty but predictable. What turns a sunset electric is structure overhead to catch, scatter, and amplify the warm light.",
        caption: "A clear horizon is just the beginning.",
        highlight: "Baseline sky",
        scene: { skyVibrancy: 0.38, sunBrightness: 0.65, highCloud: 0, midCloud: 0, lowCloud: 0, rainHaze: 0, clarityBoost: 0 },
      },
      {
        id: "high-clouds",
        title: "High clouds light up",
        body: "Cirrus and cirrostratus clouds, thin ice-crystal veils 20,000+ feet up, catch the sun\u2019s last rays and scatter them into wide bands of orange, pink, and magenta. They act like a colour amplifier in the upper sky.",
        caption: "Watch the upper sky ignite with colour.",
        highlight: "Upper wisps ignite",
        scene: { skyVibrancy: 0.72, sunBrightness: 0.82, highCloud: 0.85, midCloud: 0, lowCloud: 0, rainHaze: 0, clarityBoost: 0 },
      },
      {
        id: "mid-clouds",
        title: "Mid clouds add depth",
        body: "Altocumulus at 6,000\u201320,000 feet create the textured, layered look that separates a good sunset from a great one. Their puffy shapes catch light on the underside, creating contrast and drama across the sky.",
        caption: "Texture transforms flat light into a painting.",
        highlight: "Depth & structure",
        scene: { skyVibrancy: 0.82, sunBrightness: 0.85, highCloud: 0.8, midCloud: 0.75, lowCloud: 0, rainHaze: 0, clarityBoost: 0 },
      },
      {
        id: "low-clouds",
        title: "Low clouds can ruin it",
        body: "Marine layer and stratus sitting below 6,000 feet act like a wall. They block the direct light path that creates the glow at the horizon. Even beautiful upper texture can\u2019t overcome a heavy low blanket.",
        caption: "The horizon goes dark.",
        highlight: "Horizon blocked",
        scene: { skyVibrancy: 0.3, sunBrightness: 0.25, highCloud: 0.5, midCloud: 0.35, lowCloud: 0.85, rainHaze: 0, clarityBoost: 0 },
      },
      {
        id: "rain-clearing",
        title: "Rain clears the air",
        body: "After light rain, aerosols and dust get washed out of the atmosphere. The air is cleaner, so Rayleigh scattering is purer and sunset colours are more saturated. A post-rain clearing is one of the best setups for an unreal sunset.",
        caption: "Post-storm clarity elevates everything.",
        highlight: "Post-storm clarity",
        scene: { skyVibrancy: 0.88, sunBrightness: 0.92, highCloud: 0.7, midCloud: 0.5, lowCloud: 0.15, rainHaze: 0.25, clarityBoost: 0.8 },
      },
      {
        id: "final",
        title: "Tonight\u2019s result",
        body: `Our model now blends cloud layers, horizon blockage, post-rain clearing, humidity, atmospheric clarity, radiation quality, and forecast confidence into a single sunset score. Tonight lands at ${today.score} with a ${today.label.toLowerCase()} outlook.`,
        caption: `Score: ${today.score}/100 \u2014 ${today.label}`,
        highlight: "Combined score",
        scene: {
          skyVibrancy: todayVibrancy,
          sunBrightness: clamp(todayVibrancy * 1.1, 0, 1),
          highCloud: clamp(today.factors.highCloud / 100, 0, 1),
          midCloud: clamp(today.factors.midCloud / 100, 0, 1),
          lowCloud: clamp(today.factors.lowCloud / 100, 0, 1),
          rainHaze: clamp(today.factors.recentRain / 8, 0, 1),
          clarityBoost: today.factors.recentRain > 0.5 ? 0.5 : 0,
        },
      },
    ];
  }, [today]);

  /* ---- Scroll tracking ---- */
  const containerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const total = chapters.length;
    const raw = latest * total;
    const idx = Math.min(total - 1, Math.max(0, Math.floor(raw)));
    const progress = clamp(raw - idx, 0, 1);
    setActiveIndex(idx);
    setChapterProgress(progress);
  });

  /* ---- Canvas rendering ---- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneStateRef = useRef<ChapterSceneState>(chapters[0].scene);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { width: cssW, height: cssH } = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(cssW));
    const h = Math.max(1, Math.floor(cssH));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, w, h, sceneStateRef.current, performance.now() * 0.001);
  }, []);

  /*
   * Interpolate scene state.
   * Hold the current chapter's scene for the first 70 % of scroll,
   * then ease toward the next chapter in the remaining 30 %.
   * This prevents the next factor (e.g. low clouds) from leaking in too early.
   */
  useEffect(() => {
    const current = chapters[activeIndex].scene;
    const nextIdx = Math.min(chapters.length - 1, activeIndex + 1);
    const next = chapters[nextIdx].scene;

    const HOLD = 0.7; /* fraction of chapter scroll that stays static */

    let interpolated: ChapterSceneState;
    if (activeIndex >= chapters.length - 1 || chapterProgress < HOLD) {
      interpolated = current;
    } else {
      const raw = (chapterProgress - HOLD) / (1 - HOLD);
      /* ease-in-out */
      const eased = raw < 0.5
        ? 2 * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      interpolated = lerpScene(current, next, eased);
    }

    sceneStateRef.current = interpolated;
    renderCanvas();
  }, [activeIndex, chapterProgress, chapters, renderCanvas]);

  /* Animation loop */
  useEffect(() => {
    if (prefersReducedMotion) return;
    let frameId = 0;
    const tick = () => {
      renderCanvas();
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReducedMotion, renderCanvas]);

  /* Resize */
  useEffect(() => {
    const onResize = () => renderCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderCanvas]);

  const activeChapter = chapters[activeIndex];

  /* ---- Mobile gradient fallback ---- */
  function mobileGradient(scene: ChapterSceneState) {
    const v = scene.skyVibrancy;
    return `linear-gradient(180deg, ${lerpColor("#0c1020", "#0e1040", v)} 0%, ${lerpColor("#1e1e34", "#6a2868", v)} 40%, ${lerpColor("#4a3838", "#e08040", v)} 80%, ${lerpColor("#6a5848", "#f0a830", v)} 100%)`;
  }

  return (
    <section className="relative bg-[#040714]">
      <div className="mx-auto w-full max-w-6xl px-6 pb-8 pt-24 md:px-10">
        <p className="mb-4 text-xs uppercase tracking-[0.22em] text-white/55">
          The science of sunsets
        </p>
        <h2 className="max-w-3xl text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
          Watch each factor reshape the sky.
        </h2>
        <p className="mt-5 max-w-2xl text-sm text-white/65 md:text-base">
          Scroll through six chapters. The canvas on the left builds the scene
          in real time as each ingredient is added.
        </p>
      </div>

      {/* ---- Desktop: sticky scrollytelling ---- */}
      <section ref={containerRef} className="relative mt-4 hidden h-[600vh] lg:block">
        <div className="sticky top-0 mx-auto grid h-screen w-full max-w-6xl grid-cols-[1.2fr_0.8fr] gap-8 px-10 pb-8 pt-4">
          {/* Canvas panel */}
          <div className="relative h-full">
            <div className="absolute inset-0 overflow-hidden rounded-[2.25rem] border border-white/14 shadow-[0_30px_100px_rgba(2,7,28,0.6)]">
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                aria-hidden="true"
              />

              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,7,18,0.04),rgba(4,7,18,0.35))]" />

              <div className="absolute left-5 top-5 rounded-xl border border-white/18 bg-black/30 px-3.5 py-2 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Now showing</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeChapter.id}
                    className="text-base text-white"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    {activeChapter.title}
                  </motion.p>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChapter.id}
                  className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/18 bg-black/28 px-4 py-3 backdrop-blur-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm text-white/85">{activeChapter.caption}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Text panel */}
          <div className="relative flex h-full items-center">
            <div className="w-full space-y-6">
              {/* Chapter nav dots */}
              <div className="flex items-center gap-2">
                {chapters.map((ch, i) => (
                  <div
                    key={ch.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? "w-8 bg-amber-200/80"
                        : i < activeIndex
                          ? "w-3 bg-white/30"
                          : "w-3 bg-white/12"
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChapter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-5"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Chapter {activeIndex + 1} of {chapters.length}
                  </p>

                  <h3 className="text-4xl leading-tight text-white">
                    {activeChapter.title}
                  </h3>

                  <p className="text-base leading-relaxed text-white/72">
                    {activeChapter.body}
                  </p>

                  <AnimatePresence mode="wait">
                    <ChapterHighlight key={activeChapter.highlight} text={activeChapter.highlight} />
                  </AnimatePresence>

                  {activeChapter.id === "final" && (
                    <FinalBreakdown today={today} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Mobile: card-based chapters ---- */}
      <div className="mx-auto mt-8 grid w-full max-w-6xl gap-4 px-6 pb-20 lg:hidden">
        {chapters.map((chapter, index) => (
          <motion.article
            key={chapter.id}
            className="overflow-hidden rounded-3xl border border-white/14 bg-white/[0.04]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: index * 0.04 }}
          >
            <div className="relative h-40" style={{ background: mobileGradient(chapter.scene) }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(255,200,130,0.2),transparent_50%)]" />
              <div className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
                {chapter.highlight}
              </div>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                Chapter {index + 1}
              </p>
              <h3 className="text-3xl text-white">{chapter.title}</h3>
              <p className="text-sm leading-relaxed text-white/70">{chapter.body}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
