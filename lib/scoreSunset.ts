import {
  type ScoreLabel,
  type SunsetInputFactors,
  type SunsetScoreResult,
} from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

const SCORE_BASELINE = 20;

function ramp(value: number, start: number, full: number) {
  if (value <= start) {
    return 0;
  }

  if (value >= full) {
    return 1;
  }

  return clamp((value - start) / (full - start), 0, 1);
}

export function bandScore(
  value: number,
  idealMin: number,
  idealMax: number,
  softFalloff: number,
) {
  if (value >= idealMin && value <= idealMax) {
    return 1;
  }

  if (value < idealMin) {
    return clamp(1 - (idealMin - value) / softFalloff, 0, 1);
  }

  return clamp(1 - (value - idealMax) / softFalloff, 0, 1);
}

export function penaltyScore(
  value: number,
  startPenalty: number,
  maxPenalty: number,
) {
  if (value <= startPenalty) {
    return 0;
  }

  const severity = (value - startPenalty) / (100 - startPenalty);
  return clamp(severity * maxPenalty, 0, maxPenalty);
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

function buildExplanation(
  factors: SunsetInputFactors,
  score: number,
  lowPenalty: number,
  rainBonus: number,
  visibilityModifier: number,
) {
  if (lowPenalty >= 23) {
    return "Low clouds likely block the horizon.";
  }

  if (factors.totalCloud <= 18 && factors.highCloud <= 30) {
    return "Too clear to be dramatic.";
  }

  if (factors.totalCloud >= 90) {
    return "Too overcast for strong color depth.";
  }

  if (rainBonus >= 3 && score >= 55) {
    return "Post rain clearing could make tonight pop.";
  }

  if (factors.highCloud >= 32 && factors.lowCloud <= 28) {
    return "Thin upper clouds and low fog risk.";
  }

  if (factors.midCloud >= 28 && factors.lowCloud <= 42) {
    return "Nice cloud texture, but some low marine layer risk.";
  }

  if (visibilityModifier <= -3) {
    return "Low visibility may dim the horizon colors.";
  }

  return "Balanced cloud texture gives Isla Vista a decent glow setup.";
}

function buildReasonChips(
  factors: SunsetInputFactors,
  score: number,
  lowPenalty: number,
  rainBonus: number,
  humidityBonus: number,
  visibilityModifier: number,
) {
  const chips: Array<{ weight: number; text: string }> = [];

  if (factors.highCloud >= 30) {
    chips.push({
      weight: factors.highCloud,
      text: "high wispy cloud support",
    });
  }

  if (factors.midCloud >= 25 && factors.midCloud <= 65) {
    chips.push({
      weight: factors.midCloud,
      text: "mid sky texture is healthy",
    });
  }

  if (lowPenalty <= 10) {
    chips.push({
      weight: 40 - factors.lowCloud,
      text: "low fog risk",
    });
  }

  if (lowPenalty >= 18) {
    chips.push({
      weight: lowPenalty,
      text: "marine layer risk",
    });
  }

  if (rainBonus >= 2) {
    chips.push({
      weight: rainBonus * 4,
      text: "post rain clearing",
    });
  }

  if (factors.totalCloud <= 20) {
    chips.push({
      weight: 25,
      text: "very clear, lower drama",
    });
  }

  if (humidityBonus >= 2.5) {
    chips.push({
      weight: humidityBonus * 5,
      text: "good moisture for scattering",
    });
  }

  if (visibilityModifier <= -2.5) {
    chips.push({
      weight: Math.abs(visibilityModifier) * 4,
      text: "hazy horizon",
    });
  } else if (visibilityModifier >= 2) {
    chips.push({
      weight: visibilityModifier * 4,
      text: "crystal-clear horizon",
    });
  }

  if (score >= 80) {
    chips.push({
      weight: 45,
      text: "color potential is elevated",
    });
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
  const highSupport =
    bandScore(factors.highCloud, 26, 62, 26) * ramp(factors.highCloud, 8, 22);
  const midSupport =
    bandScore(factors.midCloud, 20, 58, 28) * ramp(factors.midCloud, 10, 24);
  const textureSupport =
    bandScore(factors.totalCloud, 30, 72, 30) *
    ramp(factors.totalCloud, 12, 28) *
    (1 - clamp((factors.totalCloud - 78) / 20, 0, 1) * 0.82);

  const highCloudContribution = highSupport * 32;
  const midCloudContribution = midSupport * 24;
  const textureContribution = textureSupport * 14;

  const lowCloudPenalty = penaltyScore(factors.lowCloud, 24, 34);

  const hasClearingWindow = factors.lowCloud < 62 && factors.totalCloud < 88;
  const rainBonus =
    factors.recentRain > 0.2 && hasClearingWindow
      ? bandScore(factors.recentRain, 0.4, 4.6, 2.4) * 8
      : 0;

  const contrastSignal = clamp(
    ((factors.highCloud + factors.midCloud) / 2 - factors.lowCloud + 36) / 100,
    0,
    1,
  );
  const textureBonus = contrastSignal * 6;

  // Humidity bonus: moderate humidity (40-75%) enhances atmospheric scattering for warmer colors.
  const humidityBonus = bandScore(factors.humidity, 40, 75, 25) * 4;

  // Visibility modifier: very low visibility (<10km) dims colors, excellent visibility (>30km) helps.
  const visKm = factors.visibility;
  const visibilityModifier =
    visKm < 10
      ? -clamp((10 - visKm) / 10, 0, 1) * 5
      : clamp((visKm - 20) / 20, 0, 1) * 3;

  const rawScore =
    SCORE_BASELINE +
    highCloudContribution +
    midCloudContribution +
    textureContribution +
    rainBonus +
    textureBonus +
    humidityBonus +
    visibilityModifier -
    lowCloudPenalty;

  const score = normalizeScore(rawScore);
  const label = labelFromScore(score);

  return {
    score,
    label,
    explanation: buildExplanation(factors, score, lowCloudPenalty, rainBonus, visibilityModifier),
    reasonChips: buildReasonChips(factors, score, lowCloudPenalty, rainBonus, humidityBonus, visibilityModifier),
    factorBreakdown: {
      baseline: roundTo(SCORE_BASELINE, 2),
      highCloudContribution: roundTo(highCloudContribution, 2),
      midCloudContribution: roundTo(midCloudContribution, 2),
      textureContribution: roundTo(textureContribution, 2),
      lowCloudPenalty: roundTo(lowCloudPenalty, 2),
      rainBonus: roundTo(rainBonus, 2),
      textureBonus: roundTo(textureBonus, 2),
      humidityBonus: roundTo(humidityBonus, 2),
      visibilityModifier: roundTo(visibilityModifier, 2),
    },
  };
}
