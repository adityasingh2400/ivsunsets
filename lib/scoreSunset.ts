import {
  type ScoreLabel,
  type SunsetInputFactors,
  type SunsetScoreResult,
} from "./types";
import { clamp, roundTo } from "./utils";

/**
 * IV Sunsets scoring engine v3 — a gated physical model.
 *
 * The score answers one question: how much color will the sky over the
 * Isla Vista bluffs actually show at sunset?
 *
 * Structure:
 *   1. Canvas      — how much paintable cloud exists (high cirrus and mid
 *                    altocumulus light up; they are the show).
 *   2. Light path  — whether direct sun can still reach that canvas at
 *                    sunset. Multiplicative gates: local marine layer,
 *                    offshore marine layer on the western light path,
 *                    overcast ceiling, fog saturation. Any one of these
 *                    can kill the night on its own, so they multiply
 *                    instead of subtracting fixed point amounts.
 *   3. Vividness   — air clarity multiplier. Moderate aerosols deepen the
 *                    reds; smoke, murk and muggy air flatten everything.
 *   4. Bonuses     — post-rain clearing, offshore (sundowner) flow,
 *                    forecast stability.
 *   5. Stabilizers — day-over-day persistence and a blend toward the IV
 *                    climatological mean for low-confidence far-out days.
 *
 * The previous additive model could hand a fully fogged-in evening ~50
 * points if the upper sky looked good on paper. Gating fixes that: a solid
 * marine layer now collapses the score no matter what sits above it —
 * which is exactly how sunsets fail in Isla Vista.
 */

const BASELINE = 10;
const CLOUD_GLOW_CEILING = 68;
const CLEAR_SKY_CEILING = 26;

/** Isla Vista climatological average score (~42) used as the anchor for uncertain days. */
const CLIMATOLOGICAL_MEAN = 42;

/** The light path never reaches exactly zero — marine layers tear, decks crack. */
const LIGHT_PATH_FLOOR = 0.02;

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smooth bump: 0 below riseStart, 1 between riseFull and fallStart, 0 past fallEnd. */
function bump(
  value: number,
  riseStart: number,
  riseFull: number,
  fallStart: number,
  fallEnd: number,
) {
  return (
    smoothstep(riseStart, riseFull, value) *
    (1 - smoothstep(fallStart, fallEnd, value))
  );
}

export function normalizeScore(score: number) {
  return Math.round(clamp(score, 0, 100));
}

export function labelFromScore(score: number): ScoreLabel {
  if (score <= 24) {
    return "Poor";
  }

  if (score <= 44) {
    return "Decent";
  }

  if (score <= 64) {
    return "Good";
  }

  if (score <= 84) {
    return "Great";
  }

  return "Unreal";
}

/**
 * Best estimate of how much of the sky is actually covered.
 * Open-Meteo reports a real total; the simulator only has the three layers.
 * Layers overlap partially, so we take the largest single layer plus a
 * fraction of the random-overlap excess.
 */
export function effectiveTotalCloud(
  highCloud: number,
  midCloud: number,
  lowCloud: number,
  reportedTotal = 0,
) {
  const high = clamp(highCloud, 0, 100) / 100;
  const mid = clamp(midCloud, 0, 100) / 100;
  const low = clamp(lowCloud, 0, 100) / 100;
  const randomOverlap = 100 * (1 - (1 - high) * (1 - mid) * (1 - low));
  const maxLayer = Math.max(highCloud, midCloud, lowCloud);
  const layered = maxLayer + 0.35 * Math.max(0, randomOverlap - maxLayer);
  return clamp(Math.max(reportedTotal, layered), 0, 100);
}

/** How much paintable cloud is overhead (0..1). High cirrus carries the show. */
function canvasFrom(highCloud: number, midCloud: number) {
  const highQuality = bump(highCloud, 6, 26, 55, 92);
  const midQuality = bump(midCloud, 6, 22, 48, 85);
  return clamp(0.6 * highQuality + 0.44 * midQuality, 0, 1);
}

interface LightPathGates {
  localLowGate: number;
  horizonGate: number;
  overcastGate: number;
  fogGate: number;
  lightPath: number;
}

function lightPathFrom(factors: SunsetInputFactors, effTotal: number): LightPathGates {
  const localLowGate = 1 - smoothstep(18, 72, factors.lowCloud) * 0.94;
  const horizonGate = 1 - smoothstep(28, 85, factors.horizonLowCloud) * 0.8;
  const overcastGate = 1 - smoothstep(80, 98, effTotal) * 0.88;

  const spreadRisk = 1 - smoothstep(1.2, 4.5, factors.dewPointSpread);
  const visRisk = 1 - smoothstep(3, 10, factors.visibility);
  const humidityAmp = 0.55 + 0.45 * smoothstep(72, 94, factors.relativeHumidity);
  const fogRisk = clamp(0.6 * spreadRisk + 0.4 * visRisk, 0, 1) * humidityAmp;
  const fogGate = 1 - fogRisk * 0.8;

  return {
    localLowGate,
    horizonGate,
    overcastGate,
    fogGate,
    lightPath: clamp(
      localLowGate * horizonGate * overcastGate * fogGate,
      LIGHT_PATH_FLOOR,
      1,
    ),
  };
}

/** Air clarity multiplier (~0.55..1.15). Moderate aerosols help; murk hurts. */
function vividnessFrom(factors: SunsetInputFactors) {
  let vividness = 1;

  vividness += 0.04 * smoothstep(18, 30, factors.visibility);
  vividness -= 0.1 * (1 - smoothstep(4, 11, factors.visibility));
  vividness += 0.03 * (1 - smoothstep(5, 9, factors.pm25));
  vividness -= 0.18 * smoothstep(15, 40, factors.pm25);
  vividness += 0.05 * bump(factors.aerosolOpticalDepth, 0.03, 0.06, 0.15, 0.32);
  vividness -= 0.15 * smoothstep(0.28, 0.55, factors.aerosolOpticalDepth);
  vividness += 0.05 * (1 - smoothstep(38, 55, factors.relativeHumidity));
  vividness -= 0.1 * smoothstep(70, 92, factors.relativeHumidity);

  return clamp(vividness, 0.55, 1.15);
}

/**
 * Post-rain clearing bonus. Rain scrubs aerosols and often breaks the deck;
 * the classic IV banger is the evening a storm clears. Only counts when the
 * sky is actually opening up, and is scaled by the light path — rain cannot
 * rescue a blocked horizon.
 */
function rainBonusFrom(factors: SunsetInputFactors, effTotal: number, lightPath: number) {
  const clearingWindow = factors.lowCloud < 58 && effTotal < 84;
  if (!clearingWindow || factors.recentRain <= 0.25) {
    return 0;
  }

  return bump(factors.recentRain, 0.35, 1.2, 3.5, 6.5) * 6 * lightPath;
}

function directionInRange(direction: number, start: number, end: number) {
  const normalized = ((direction % 360) + 360) % 360;
  if (start <= end) {
    return normalized >= start && normalized <= end;
  }
  return normalized >= start || normalized <= end;
}

/**
 * IV's shoreline faces south. Northerly (offshore / sundowner) flow pushes
 * the marine layer off the horizon; steady southerly-to-westerly onshore
 * flow drags it back in.
 */
function windModifierFrom(speed: number, direction: number) {
  const offshore = directionInRange(direction, 315, 75);
  const onshore = directionInRange(direction, 150, 285);

  if (offshore) {
    const moderate = smoothstep(4, 12, speed) * (1 - smoothstep(22, 38, speed));
    return moderate * 5;
  }

  if (onshore) {
    return -smoothstep(8, 26, speed) * 5;
  }

  return 0;
}

/** Steady cloud forecasts deserve a little trust; noisy ones a little doubt. */
function stabilityModifierFrom(cloudVariance: number) {
  return (
    1.5 * (1 - smoothstep(60, 220, cloudVariance)) -
    2.5 * smoothstep(260, 700, cloudVariance)
  );
}

/**
 * If yesterday's score is available, nudge today's raw score toward it.
 * Stanford photo-archive work found P(beautiful today | beautiful yesterday)
 * = 34% vs 12% baseline — weather patterns persist. Small pull (max ±3 pts)
 * that reduces day-over-day jitter.
 */
function persistenceModifier(rawScore: number, previousDayScore: number) {
  if (previousDayScore < 0) return 0;
  const delta = previousDayScore - rawScore;
  return clamp(delta * 0.08, -3, 3);
}

interface EngineTerms {
  canvas: number;
  lightPath: number;
  vividness: number;
  gates: LightPathGates;
  cloudCanvas: number;
  clearSkyGlow: number;
  vividnessPoints: number;
  marineLayerPenalty: number;
  horizonPenalty: number;
  overcastPenalty: number;
  fogPenalty: number;
  rainBonus: number;
  windModifier: number;
  stabilityModifier: number;
  rawScore: number;
}

function computeTerms(factors: SunsetInputFactors): EngineTerms {
  const effTotal = effectiveTotalCloud(
    factors.highCloud,
    factors.midCloud,
    factors.lowCloud,
    factors.totalCloud,
  );

  const canvas = canvasFrom(factors.highCloud, factors.midCloud);
  const gates = lightPathFrom(factors, effTotal);
  const vividness = vividnessFrom(factors);

  const cloudCanvas = CLOUD_GLOW_CEILING * canvas;
  const clearSkyGlow = CLEAR_SKY_CEILING * (1 - canvas);
  const glowPotentialNeutral = cloudCanvas + clearSkyGlow;
  const glowPotential = glowPotentialNeutral * vividness;
  const vividnessPoints = glowPotential - glowPotentialNeutral;

  /*
   * Sequential gate attribution: each gate removes a share of whatever glow
   * survived the gates before it, so the penalties sum exactly to the total
   * gating loss and the breakdown reconciles to the score.
   */
  const afterLocal = glowPotential * gates.localLowGate;
  const afterHorizon = afterLocal * gates.horizonGate;
  const afterOvercast = afterHorizon * gates.overcastGate;
  const afterFog = afterOvercast * gates.fogGate;

  const marineLayerPenalty = glowPotential - afterLocal;
  const horizonPenalty = afterLocal - afterHorizon;
  const overcastPenalty = afterHorizon - afterOvercast;
  const fogPenalty = afterOvercast - afterFog;

  const glow = Math.max(afterFog, glowPotential * LIGHT_PATH_FLOOR);

  const rainBonus = rainBonusFrom(factors, effTotal, gates.lightPath);
  const windModifier = windModifierFrom(factors.windSpeed, factors.windDirection);
  const stabilityModifier = stabilityModifierFrom(factors.cloudVariance);

  const rawScore = BASELINE + glow + rainBonus + windModifier + stabilityModifier;

  return {
    canvas,
    lightPath: gates.lightPath,
    vividness,
    gates,
    cloudCanvas,
    clearSkyGlow,
    vividnessPoints,
    marineLayerPenalty,
    horizonPenalty,
    overcastPenalty,
    fogPenalty,
    rainBonus,
    windModifier,
    stabilityModifier,
    rawScore,
  };
}

function buildExplanation(
  factors: SunsetInputFactors,
  terms: EngineTerms,
  score: number,
) {
  if (terms.marineLayerPenalty >= 18) {
    return "A thick marine layer is parked over the bluffs — the horizon likely stays gray.";
  }

  if (terms.horizonPenalty >= 14) {
    return "Low cloud offshore is sitting on the sunset light path, so color may die before it reaches IV.";
  }

  if (terms.overcastPenalty >= 14) {
    return "A near-solid ceiling should smother most of tonight's color.";
  }

  if (terms.fogPenalty >= 10) {
    return "The air is close to saturation — fog and horizon murk are a real risk tonight.";
  }

  if (factors.confidenceDecay >= 0.5) {
    return "This far out the forecast is uncertain — treat this as a rough outlook.";
  }

  if (terms.canvas >= 0.75 && terms.lightPath >= 0.8 && score >= 75) {
    return "High canvas and a clean light path — this is the setup glow-chasing nights are made of.";
  }

  if (terms.rainBonus >= 3 && score >= 55) {
    return "Post-rain clear-out should leave scrubbed air and saturated color over the channel.";
  }

  if (terms.windModifier >= 3 && score >= 50) {
    return "Offshore flow is helping push the marine layer off the horizon before sunset.";
  }

  if (
    terms.canvas <= 0.15 &&
    terms.marineLayerPenalty < 6 &&
    terms.horizonPenalty < 6 &&
    terms.overcastPenalty < 6
  ) {
    return "Very clear sky — expect a clean, simple fade into the ocean rather than fireworks.";
  }

  if (terms.vividnessPoints <= -6) {
    return "Haze and particulates may flatten whatever color does show up.";
  }

  if (score >= 65) {
    return "Cloud texture and a workable horizon are lining up well tonight.";
  }

  return "A mixed setup — some texture, some risk. Worth a look from the bluffs.";
}

function buildReasonChips(
  factors: SunsetInputFactors,
  terms: EngineTerms,
  score: number,
) {
  const chips: Array<{ weight: number; text: string }> = [];

  if (terms.cloudCanvas >= 30 && factors.highCloud >= 18) {
    chips.push({ weight: terms.cloudCanvas, text: "high cloud canvas in play" });
  }

  if (terms.cloudCanvas >= 22 && factors.midCloud >= 16) {
    chips.push({ weight: terms.cloudCanvas * 0.8, text: "mid sky texture is healthy" });
  }

  if (terms.marineLayerPenalty >= 10) {
    chips.push({ weight: terms.marineLayerPenalty + 8, text: "marine layer risk" });
  } else if (factors.lowCloud <= 14 && terms.canvas >= 0.2) {
    chips.push({ weight: 18, text: "low fog risk overhead" });
  }

  if (terms.horizonPenalty >= 8) {
    chips.push({ weight: terms.horizonPenalty + 6, text: "offshore cloud on the light path" });
  } else if (factors.horizonLowCloud <= 18 && terms.canvas >= 0.2) {
    chips.push({ weight: 16, text: "clear western horizon" });
  }

  if (terms.overcastPenalty >= 8) {
    chips.push({ weight: terms.overcastPenalty + 4, text: "ceiling close to solid" });
  }

  if (terms.fogPenalty >= 6) {
    chips.push({ weight: terms.fogPenalty + 6, text: "air near saturation" });
  }

  if (terms.rainBonus >= 2) {
    chips.push({ weight: terms.rainBonus * 4, text: "post-rain clearing" });
  }

  if (terms.windModifier >= 2) {
    chips.push({ weight: terms.windModifier * 4, text: "offshore clearing push" });
  } else if (terms.windModifier <= -2) {
    chips.push({ weight: Math.abs(terms.windModifier) * 4, text: "onshore marine push" });
  }

  if (terms.vividnessPoints >= 3) {
    chips.push({ weight: terms.vividnessPoints * 3, text: "clean, vivid air" });
  } else if (terms.vividnessPoints <= -4) {
    chips.push({ weight: Math.abs(terms.vividnessPoints) * 3, text: "hazy, muted air" });
  }

  if (
    terms.canvas <= 0.12 &&
    terms.marineLayerPenalty < 5 &&
    terms.horizonPenalty < 5 &&
    terms.overcastPenalty < 5
  ) {
    chips.push({ weight: 20, text: "very clear, lower drama" });
  }

  if (terms.stabilityModifier <= -1.2) {
    chips.push({ weight: 12, text: "cloud forecast is noisy" });
  }

  if (factors.confidenceDecay >= 0.4) {
    chips.push({ weight: factors.confidenceDecay * 30, text: "far-out forecast" });
  }

  if (score >= 85) {
    chips.push({ weight: 50, text: "rare full-alignment setup" });
  }

  if (!chips.length) {
    chips.push({ weight: 20, text: "mixed coastal cloud setup" });
  }

  return chips
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((chip) => chip.text);
}

export function calculateSunsetScore(
  factors: SunsetInputFactors,
): SunsetScoreResult {
  const terms = computeTerms(factors);

  const persistenceMod = persistenceModifier(terms.rawScore, factors.previousDayScore);

  const decay = clamp(factors.confidenceDecay, 0, 1);
  const withPersistence = terms.rawScore + persistenceMod;
  const confidenceAdjustment =
    decay > 0 ? (CLIMATOLOGICAL_MEAN - withPersistence) * decay * 0.55 : 0;

  const score = normalizeScore(withPersistence + confidenceAdjustment);
  const label = labelFromScore(score);

  return {
    score,
    label,
    explanation: buildExplanation(factors, terms, score),
    reasonChips: buildReasonChips(factors, terms, score),
    factorBreakdown: {
      baseline: roundTo(BASELINE, 2),
      cloudCanvas: roundTo(terms.cloudCanvas, 2),
      clearSkyGlow: roundTo(terms.clearSkyGlow, 2),
      vividnessModifier: roundTo(terms.vividnessPoints, 2),
      marineLayerPenalty: roundTo(terms.marineLayerPenalty, 2),
      horizonPenalty: roundTo(terms.horizonPenalty, 2),
      overcastPenalty: roundTo(terms.overcastPenalty, 2),
      fogPenalty: roundTo(terms.fogPenalty, 2),
      rainBonus: roundTo(terms.rainBonus, 2),
      windModifier: roundTo(terms.windModifier, 2),
      stabilityModifier: roundTo(terms.stabilityModifier, 2),
      persistenceModifier: roundTo(persistenceMod, 2),
      confidenceAdjustment: roundTo(confidenceAdjustment, 2),
      canvas: roundTo(terms.canvas, 3),
      lightPath: roundTo(terms.lightPath, 3),
      vividness: roundTo(terms.vividness, 3),
    },
  };
}
