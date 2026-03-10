"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { IslaVistaSceneSvg } from "@/components/hero/IslaVistaSceneSvg";
import type { ScenePalette } from "@/components/hero/islaVistaPalette";

interface Props {
  palette: ScenePalette;
  className?: string;
}

export function IslaVistaSunsetScene({ palette, className }: Props) {
  const reduceMotion = useReducedMotion();
  const horizonY = 76.5;
  const sunY = 68.2;

  return (
    <div
      className={className}
      style={
        {
          "--iv-linework": "rgba(98, 102, 132, 0.42)",
          "--iv-coast-shadow": palette.coastShadow,
          "--iv-coast-mid": palette.coastMid,
          "--iv-coast-light": palette.coastLight,
          "--iv-coast-rim": palette.coastRim,
          "--iv-ocean-fill": palette.oceanTint,
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyMid} 34%, ${palette.skyHorizon} ${horizonY - 3}%, ${palette.oceanTint} ${horizonY + 6}%, ${palette.oceanDeep} 100%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 18% 16%, rgba(101,115,218,0.08) 0%, transparent 34%), radial-gradient(circle at 78% 20%, rgba(228,133,181,0.1) 0%, transparent 38%), radial-gradient(ellipse 62% 20% at 51% ${horizonY - 2}%, ${palette.horizonLift}30 0%, transparent 72%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, transparent ${horizonY - 12}%, ${palette.horizonLift}38 ${horizonY - 4}%, ${palette.horizonWarm}82 ${horizonY + 0.5}%, ${palette.horizonWarm}40 ${horizonY + 6}%, transparent ${horizonY + 14}%)`,
          mixBlendMode: "screen",
          opacity: 0.86,
        }}
      />

      <motion.div
        className="absolute inset-0"
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [0.78, 0.92, 0.78],
                scale: [1, 1.035 * palette.glowScale, 1],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 26, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{
          transformOrigin: `50% ${horizonY}%`,
          background: `radial-gradient(ellipse 58% 19% at 52% ${horizonY - 0.6}%, ${palette.glowAura} 0%, transparent 72%)`,
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={
          reduceMotion
            ? undefined
            : { rotate: [0, 3, 0], opacity: [0.05, 0.1, 0.05] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 34, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{
          transformOrigin: `52% ${sunY}%`,
          background:
            `repeating-linear-gradient(108deg, rgba(255,232,196,0.14) 0%, rgba(255,232,196,0.04) 7%, transparent 15%, transparent 26%)`,
          maskImage: `radial-gradient(ellipse 88% 40% at 52% ${sunY + 1}%, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.68) 28%, transparent 72%)`,
          mixBlendMode: "screen",
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={
          reduceMotion
            ? undefined
            : { rotate: [0, -3, 0], opacity: [0.04, 0.08, 0.04] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 42, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{
          transformOrigin: `52% ${sunY}%`,
          background:
            `repeating-linear-gradient(72deg, rgba(255,204,154,0.12) 0%, rgba(255,204,154,0.03) 7%, transparent 14%, transparent 28%)`,
          maskImage: `radial-gradient(ellipse 88% 40% at 52% ${sunY + 1}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.56) 24%, transparent 74%)`,
          mixBlendMode: "screen",
        }}
      />

      <motion.div
        className="pointer-events-none absolute rounded-full"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.78, 0.95, 0.78], scale: [1, 1.03, 1] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{
          left: "52%",
          top: `${sunY}%`,
          width: "clamp(42px, 5.8vw, 76px)",
          height: "clamp(42px, 5.8vw, 76px)",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, rgba(255,248,232,0.98) 0%, ${palette.glowCore} 42%, ${palette.horizonWarm} 78%, transparent 100%)`,
          filter: "blur(0.8px)",
          boxShadow: `0 0 30px ${palette.glowAura}`,
          mixBlendMode: "screen",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 18% 9% at 52% ${sunY}%, ${palette.glowCore} 0%, rgba(255,255,255,0.16) 26%, transparent 74%)`,
          opacity: 0.2 * palette.glowScale,
        }}
      />

      <motion.div
        className="absolute inset-0"
        animate={
          reduceMotion
            ? undefined
            : {
                x: ["-1.5%", "1.5%", "-1.5%"],
                opacity: [palette.hazeOpacity * 0.75, palette.hazeOpacity, palette.hazeOpacity * 0.75],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 36, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{
          background: `linear-gradient(180deg, transparent ${horizonY - 7}%, rgba(255,255,255,0.02) ${horizonY - 1}%, ${palette.hazeColor} ${horizonY + 4}%, transparent ${horizonY + 12}%)`,
          mixBlendMode: "screen",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 top-[39%] md:top-[36%]">
        <IslaVistaSceneSvg
          layer="base"
          className="h-full w-full scale-[1.26] md:scale-[1.1] md:translate-y-[4%]"
        />
      </div>

      <motion.div
        className="iv-water-shimmer pointer-events-none absolute inset-x-0 bottom-0"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.24, 0.34, 0.22, 0.24], x: ["-1%", "1%", "-1%"] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
        }
        style={{ top: `${horizonY + 1}%` }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.01) 0%, ${palette.contentTint} 78%, rgba(0,0,0,0.14) 100%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 84% at 50% 38%, transparent 42%, rgba(0,0,0,0.74) 100%)",
          opacity: palette.vignetteOpacity * 0.56,
        }}
      />

      <div className="absolute inset-x-0 bottom-0 top-[39%] md:top-[36%]">
        <IslaVistaSceneSvg
          layer="bluff"
          className="h-full w-full scale-[1.26] md:scale-[1.1] md:translate-y-[4%]"
        />
      </div>
    </div>
  );
}

