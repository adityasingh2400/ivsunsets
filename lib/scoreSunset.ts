import {
  type ScoreLabel,
  type SunsetInputFactors,
  type SunsetScoreResult,
} from "@/lib/types";
import { clamp, roundTo } from "@/lib/utils";

const SCORE_BASELINE = 18;

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

function directionInRange(direction: number, start: number, end: number) {
  const normalized = ((direction % 360) + 360) % 360;
  if (start <= end) {
    return normalized >= start && normalized <= end;
  }
  return normalized >= start || normalized <= end;
}

function windPatternModifier(speed: number, direction: number) {
  const offshore = directionInRange(direction, 0, 130);
  const onshore = directionInRange(direction, 200, 330);

  if (offshore) {
    return bandScore(speed, 4, 18, 10) * 4;
  }

  if (onshore) {
    return -bandScore(speed, 8, 24, 12) * 4;
  }

  return 0;
}

function clarityFromHaze(
  visibilityKm: number,
  pm25: number,
  aerosolOpticalDepth: number,
) {
  const visibilityComponent =
    visibilityKm < 12
      ? -clamp((12 - visibilityKm) / 12, 0, 1) * 3
      : clamp((visibilityKm - 18) / 18, 0, 1) * 1.5;

  const pm25Component =
    pm25 <= 8
      ? 1
      : pm25 <= 12
        ? 0.3
        : -clamp((pm25 - 12) / 25, 0, 1) * 3;

  const aerosolComponent =
    aerosolOpticalDepth <= 0.08
      ? 0.3
      : aerosolOpticalDepth <= 0.12
        ? 0
        : -clamp((aerosolOpticalDepth - 0.12) / 0.18, 0, 1) * 2;

  return visibilityComponent + pm25Component + aerosolComponent;
}

function humidityModifier(relativeHumidity: number) {
  if (relativeHumidity <= 40) return 3;
  if (relativeHumidity <= 55) return 2;
  if (relativeHumidity <= 70) return 0;
  if (relativeHumidity <= 85) return -1.5;
  return -clamp((relativeHumidity - 85) / 15, 0, 1) * 4;
}

function radiationRatioModifier(directRadiation: number, diffuseRadiation: number) {
  const totalRad = directRadiation + diffuseRadiation;
  if (totalRad < 20) return 0;
  const directFraction = directRadiation / totalRad;
  if (directFraction >= 0.4) return clamp((directFraction - 0.4) / 0.35, 0, 1) * 3;
  if (directFraction <= 0.1) return -2;
  return 0;
}

function cloudStabilityModifier(cloudVariance: number) {
  if (cloudVariance <= 100) return 1.5;
  if (cloudVariance <= 300) return 0;
  return -clamp((cloudVariance - 300) / 500, 0, 1) * 2;
}

/** Isla Vista climatological average score (~42) used as the anchor for uncertain days. */
const CLIMATOLOGICAL_MEAN = 42;

/**
 * If yesterday's score is available, nudge today's raw score toward it.
 * Stanford paper found P(beautiful today | beautiful yesterday) = 34%
 * vs 12% baseline -- weather patterns persist. This provides a small
 * stabilizing pull (max ±3 pts) that reduces day-over-day jitter.
 */
function persistenceModifier(rawScore: number, previousDayScore: number) {
  if (previousDayScore < 0) return 0;
  const delta = previousDayScore - rawScore;
  return clamp(delta * 0.08, -3, 3);
}

function buildExplanation(
  factors: SunsetInputFactors,
  score: number,
  lowPenalty: number,
  rainBonus: number,
  dewPointModifier: number,
  windModifier: number,
  clarityModifier: number,
  humidityMod: number,
) {
  if (lowPenalty >= 23) {
    return "Low clouds likely block the horizon.";
  }

  if (clarityModifier <= -3.5 || humidityMod <= -3) {
    return "Haze and humidity may flatten the color tonight.";
  }

  if (dewPointModifier <= -4) {
    return "Air is close to saturation, so fog and horizon haze are a real risk.";
  }

  if (factors.totalCloud <= 18 && factors.highCloud <= 24) {
    return "Too clear to be dramatic.";
  }

  if (factors.totalCloud >= 90) {
    return "Too overcast for strong color depth.";
  }

  if (factors.confidenceDecay >= 0.5) {
    return "This far out the forecast is uncertain — treat this as a rough outlook.";
  }

  if (rainBonus >= 2 && windModifier >= 2 && score >= 55) {
    return "Clearing flow after rain could keep the marine layer pushed back.";
  }

  if (rainBonus >= 2.5 && score >= 55) {
    return "Post rain clearing could make tonight pop.";
  }

  if (windModifier >= 3 && score >= 55) {
    return "Offshore flow could help scrub the horizon before sunset.";
  }

  if (factors.relativeHumidity <= 45 && score >= 50) {
    return "Dry lower atmosphere should keep colors vivid and the horizon sharp.";
  }

  if (factors.highCloud >= 28 && factors.midCloud >= 18 && factors.lowCloud <= 26) {
    return "Upper cloud texture and a clear horizon are lining up well.";
  }

  if (factors.midCloud >= 24 && factors.lowCloud <= 38) {
    return "Nice cloud texture, but some low marine layer risk.";
  }

  if (clarityModifier >= 2) {
    return "Clean air should help the horizon colors stay crisp.";
  }

  return "Balanced cloud texture gives Isla Vista a decent glow setup.";
}

function buildReasonChips(
  factors: SunsetInputFactors,
  score: number,
  lowPenalty: number,
  rainBonus: number,
  dewPointModifier: number,
  windModifier: number,
  clarityModifier: number,
  humidityMod: number,
  stabilityMod: number,
) {
  const chips: Array<{ weight: number; text: string }> = [];

  if (factors.highCloud >= 26) {
    chips.push({
      weight: factors.highCloud,
      text: "high wispy cloud support",
    });
  }

  if (factors.midCloud >= 20 && factors.midCloud <= 60) {
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

  if (dewPointModifier <= -2.5) {
    chips.push({
      weight: Math.abs(dewPointModifier) * 6,
      text: "air near saturation",
    });
  }

  if (dewPointModifier >= 1.5) {
    chips.push({
      weight: dewPointModifier * 5,
      text: "healthy dry-air gap",
    });
  }

  if (windModifier >= 2) {
    chips.push({
      weight: windModifier * 5,
      text: "offshore clearing push",
    });
  } else if (windModifier <= -2) {
    chips.push({
      weight: Math.abs(windModifier) * 5,
      text: "onshore marine push",
    });
  }

  if (clarityModifier <= -2) {
    chips.push({
      weight: Math.abs(clarityModifier) * 4,
      text: "hazy horizon",
    });
  } else if (clarityModifier >= 1.5) {
    chips.push({
      weight: clarityModifier * 4,
      text: "clean air",
    });
  }

  if (humidityMod >= 2) {
    chips.push({
      weight: humidityMod * 5,
      text: "dry lower atmosphere",
    });
  } else if (humidityMod <= -2) {
    chips.push({
      weight: Math.abs(humidityMod) * 4,
      text: "humid air dampening",
    });
  }

  if (stabilityMod >= 1) {
    chips.push({
      weight: stabilityMod * 6,
      text: "stable cloud forecast",
    });
  } else if (stabilityMod <= -1) {
    chips.push({
      weight: Math.abs(stabilityMod) * 5,
      text: "cloud forecast noisy",
    });
  }

  if (factors.confidenceDecay >= 0.4) {
    chips.push({
      weight: factors.confidenceDecay * 30,
      text: "far-out forecast",
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
    bandScore(factors.highCloud, 18, 58, 30) * ramp(factors.highCloud, 6, 20);
  const midSupport =
    bandScore(factors.midCloud, 18, 52, 26) * ramp(factors.midCloud, 8, 20);
  const textureSupport =
    bandScore(factors.totalCloud, 24, 68, 28) *
    ramp(factors.totalCloud, 10, 22) *
    (1 - clamp((factors.totalCloud - 82) / 18, 0, 1) * 0.9);

  const highCloudContribution = highSupport * 28;
  const midCloudContribution = midSupport * 22;
  const textureContribution = textureSupport * 10;

  const lowCloudPenalty = penaltyScore(factors.lowCloud, 18, 32);

  const hasClearingWindow = factors.lowCloud < 58 && factors.totalCloud < 86;
  const rainBonus =
    factors.recentRain > 0.2 && hasClearingWindow
      ? bandScore(factors.recentRain, 0.4, 2.8, 2.2) * 5
      : 0;

  const contrastSignal = clamp(
    ((factors.highCloud + factors.midCloud) / 2 - factors.lowCloud + 35) / 90,
    0,
    1,
  );
  const contrastBonus = contrastSignal * 4;

  const saturationPenalty = clamp((4 - factors.dewPointSpread) / 4, 0, 1) * 5;
  const dryGapBonus = bandScore(factors.dewPointSpread, 5, 11, 5) * 1.5;
  const dewPointModifier = dryGapBonus - saturationPenalty;

  const windModifier = windPatternModifier(factors.windSpeed, factors.windDirection);
  const clarityModifier = clarityFromHaze(
    factors.visibility,
    factors.pm25,
    factors.aerosolOpticalDepth,
  );
  const humidityMod = humidityModifier(factors.relativeHumidity);
  const radiationMod = radiationRatioModifier(factors.directRadiation, factors.diffuseRadiation);
  const stabilityMod = cloudStabilityModifier(factors.cloudVariance);

  const rawScore =
    SCORE_BASELINE +
    highCloudContribution +
    midCloudContribution +
    textureContribution +
    rainBonus +
    contrastBonus +
    dewPointModifier +
    windModifier +
    clarityModifier +
    humidityMod +
    radiationMod +
    stabilityMod -
    lowCloudPenalty;

  const persistenceMod = persistenceModifier(rawScore, factors.previousDayScore);

  const decay = clamp(factors.confidenceDecay, 0, 1);
  const confidenceAdjustment = decay > 0
    ? (CLIMATOLOGICAL_MEAN - rawScore) * decay * 0.6
    : 0;
  const adjustedScore = rawScore + persistenceMod + confidenceAdjustment;

  const score = normalizeScore(adjustedScore);
  const label = labelFromScore(score);

  return {
    score,
    label,
    explanation: buildExplanation(
      factors,
      score,
      lowCloudPenalty,
      rainBonus,
      dewPointModifier,
      windModifier,
      clarityModifier,
      humidityMod,
    ),
    reasonChips: buildReasonChips(
      factors,
      score,
      lowCloudPenalty,
      rainBonus,
      dewPointModifier,
      windModifier,
      clarityModifier,
      humidityMod,
      stabilityMod,
    ),
    factorBreakdown: {
      baseline: roundTo(SCORE_BASELINE, 2),
      highCloudContribution: roundTo(highCloudContribution, 2),
      midCloudContribution: roundTo(midCloudContribution, 2),
      textureContribution: roundTo(textureContribution, 2),
      lowCloudPenalty: roundTo(lowCloudPenalty, 2),
      rainBonus: roundTo(rainBonus, 2),
      contrastBonus: roundTo(contrastBonus, 2),
      dewPointModifier: roundTo(dewPointModifier, 2),
      windModifier: roundTo(windModifier, 2),
      clarityModifier: roundTo(clarityModifier, 2),
      humidityModifier: roundTo(humidityMod, 2),
      radiationModifier: roundTo(radiationMod, 2),
      stabilityModifier: roundTo(stabilityMod, 2),
      persistenceModifier: roundTo(persistenceMod, 2),
      confidenceAdjustment: roundTo(confidenceAdjustment, 2),
    },
  };
}
