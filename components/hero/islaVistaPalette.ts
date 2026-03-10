"use client";

import type { SunsetRating } from "@/lib/types";

export type SceneMode = "default" | "muted" | "decent" | "beautiful" | "unreal";

export interface ScenePalette {
  mode: SceneMode;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  horizonWarm: string;
  horizonLift: string;
  glowCore: string;
  glowAura: string;
  oceanTint: string;
  oceanDeep: string;
  hazeColor: string;
  hazeOpacity: number;
  reflectionColor: string;
  reflectionOpacity: number;
  vignetteOpacity: number;
  contentTint: string;
  glowScale: number;
  coastShadow: string;
  coastMid: string;
  coastLight: string;
  coastRim: string;
}

const SCENE_PALETTES: Record<SceneMode, ScenePalette> = {
  default: {
    mode: "default",
    skyTop: "#050915",
    skyMid: "#2b2551",
    skyHorizon: "#cf8a72",
    horizonWarm: "#ffd2ad",
    horizonLift: "#f0a799",
    glowCore: "#ffe7ce",
    glowAura: "rgba(255, 196, 145, 0.32)",
    oceanTint: "#24324f",
    oceanDeep: "#050c1a",
    hazeColor: "#efbf99",
    hazeOpacity: 0.26,
    reflectionColor: "#ffe5c6",
    reflectionOpacity: 0.2,
    vignetteOpacity: 0.34,
    contentTint: "rgba(6, 8, 18, 0.22)",
    glowScale: 0.96,
    coastShadow: "#1a2034",
    coastMid: "#272c43",
    coastLight: "#353650",
    coastRim: "#4a4662",
  },
  muted: {
    mode: "muted",
    skyTop: "#040712",
    skyMid: "#241f40",
    skyHorizon: "#9f7167",
    horizonWarm: "#cfa086",
    horizonLift: "#b88284",
    glowCore: "#efcbab",
    glowAura: "rgba(217, 170, 138, 0.2)",
    oceanTint: "#1d2940",
    oceanDeep: "#050916",
    hazeColor: "#c79a84",
    hazeOpacity: 0.18,
    reflectionColor: "#efd2b2",
    reflectionOpacity: 0.11,
    vignetteOpacity: 0.42,
    contentTint: "rgba(4, 6, 14, 0.3)",
    glowScale: 0.78,
    coastShadow: "#161a29",
    coastMid: "#202535",
    coastLight: "#2a2e42",
    coastRim: "#38384e",
  },
  decent: {
    mode: "decent",
    skyTop: "#060918",
    skyMid: "#33255a",
    skyHorizon: "#d68a68",
    horizonWarm: "#ffbf94",
    horizonLift: "#f3a08d",
    glowCore: "#ffe0bc",
    glowAura: "rgba(247, 186, 138, 0.28)",
    oceanTint: "#273758",
    oceanDeep: "#061022",
    hazeColor: "#f1bc93",
    hazeOpacity: 0.24,
    reflectionColor: "#ffe4c0",
    reflectionOpacity: 0.17,
    vignetteOpacity: 0.33,
    contentTint: "rgba(5, 8, 17, 0.22)",
    glowScale: 1,
    coastShadow: "#192136",
    coastMid: "#242c46",
    coastLight: "#343c58",
    coastRim: "#4b5270",
  },
  beautiful: {
    mode: "beautiful",
    skyTop: "#070a1d",
    skyMid: "#3b275f",
    skyHorizon: "#e08b5f",
    horizonWarm: "#ffc497",
    horizonLift: "#ff9d8f",
    glowCore: "#ffe7c8",
    glowAura: "rgba(255, 198, 142, 0.38)",
    oceanTint: "#2c3c63",
    oceanDeep: "#071226",
    hazeColor: "#ffc39b",
    hazeOpacity: 0.32,
    reflectionColor: "#ffeaca",
    reflectionOpacity: 0.24,
    vignetteOpacity: 0.29,
    contentTint: "rgba(4, 7, 15, 0.18)",
    glowScale: 1.08,
    coastShadow: "#171f35",
    coastMid: "#24304e",
    coastLight: "#37476a",
    coastRim: "#536284",
  },
  unreal: {
    mode: "unreal",
    skyTop: "#090a22",
    skyMid: "#46286b",
    skyHorizon: "#f08d56",
    horizonWarm: "#ffc288",
    horizonLift: "#ff9691",
    glowCore: "#ffedd2",
    glowAura: "rgba(255, 201, 131, 0.44)",
    oceanTint: "#324571",
    oceanDeep: "#09142d",
    hazeColor: "#ffc7a0",
    hazeOpacity: 0.35,
    reflectionColor: "#fff0d6",
    reflectionOpacity: 0.28,
    vignetteOpacity: 0.27,
    contentTint: "rgba(4, 7, 15, 0.16)",
    glowScale: 1.15,
    coastShadow: "#18233b",
    coastMid: "#2a3860",
    coastLight: "#405584",
    coastRim: "#6678a2",
  },
};

export function modeFromScore(score: number): SceneMode {
  if (score >= 90) return "unreal";
  if (score >= 72) return "beautiful";
  if (score >= 50) return "decent";
  if (score <= 30) return "muted";
  return "default";
}

export function modeFromRating(rating: SunsetRating | null): SceneMode | null {
  if (!rating) return null;
  if (rating === "bland") return "muted";
  if (rating === "decent") return "decent";
  if (rating === "beautiful") return "beautiful";
  return "unreal";
}

export function resolveScenePalette(
  score: number,
  rating: SunsetRating | null,
): ScenePalette {
  const ratingMode = modeFromRating(rating);
  const mode = ratingMode ?? modeFromScore(score);
  return SCENE_PALETTES[mode];
}

