"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn, clamp } from "@/lib/utils";
import * as sky from "@/lib/skyRenderer";

interface SkyCanvasProps {
  className?: string;
  score: number;
  highCloud: number;
  midCloud: number;
  lowCloud: number;
  totalCloud: number;
  rain?: number;
  animated?: boolean;
  colorIntensity?: number;
}

export function SkyCanvas({
  className,
  score,
  highCloud,
  midCloud,
  lowCloud,
  totalCloud,
  rain = 0,
  animated = true,
  colorIntensity = 1,
}: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return undefined;

    const v = clamp((score / 100) * colorIntensity, 0, 1);
    const hc = clamp(highCloud / 100, 0, 1);
    const mc = clamp(midCloud / 100, 0, 1);
    const lc = clamp((lowCloud * 0.85 + totalCloud * 0.15) / 100, 0, 1);
    const ri = clamp(rain / 6, 0, 1);
    let frameId = 0;

    const draw = (timestamp: number) => {
      const { width: cssW, height: cssH } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(cssW));
      const h = Math.max(1, Math.floor(cssH));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const motion = prefersReducedMotion || !animated ? 0 : 1;
      const time = timestamp * 0.001;

      sky.drawSky(ctx, w, h, v);
      sky.drawSunGlow(ctx, w, h, v);
      sky.drawGodRays(ctx, w, h, v, time);
      sky.drawStars(ctx, w, h, v, time * motion);
      sky.drawHighClouds(ctx, w, h, hc, v, time, motion);
      sky.drawMidClouds(ctx, w, h, mc, v, time, motion);
      sky.drawLowClouds(ctx, w, h, lc, time, motion);
      sky.drawHorizonHaze(ctx, w, h, v);
      sky.drawRain(ctx, w, h, ri, time, motion);
    };

    const tick = (ts: number) => {
      draw(ts);
      frameId = window.requestAnimationFrame(tick);
    };

    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);
    draw(performance.now());

    if (!prefersReducedMotion && animated) {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [animated, colorIntensity, highCloud, lowCloud, midCloud, prefersReducedMotion, rain, score, totalCloud]);

  return <canvas ref={canvasRef} className={cn("h-full w-full", className)} aria-hidden="true" />;
}
