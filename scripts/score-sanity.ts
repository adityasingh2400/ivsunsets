/**
 * Executable spec for the sunset scoring engine.
 *
 * Run with: npx tsx scripts/score-sanity.ts
 *
 * Encodes physical expectations as assertions: marine layer collapses the
 * score, offshore cloud on the light path matters, post-storm cirrus is the
 * rare banger, smoke mutes, scores are monotonic in the obvious directions,
 * and the factor breakdown reconciles to the final score.
 */

import { calculateSunsetScore, effectiveTotalCloud } from "../lib/scoreSunset";
import type { SunsetInputFactors } from "../lib/types";

let failures = 0;

function check(name: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name} — ${detail}`);
  }
}

function factors(over: Partial<SunsetInputFactors>): SunsetInputFactors {
  return {
    highCloud: 20,
    midCloud: 15,
    lowCloud: 20,
    horizonLowCloud: 20,
    totalCloud: 35,
    recentRain: 0,
    visibility: 18,
    dewPointSpread: 5,
    windSpeed: 8,
    windDirection: 260,
    pm25: 8,
    aerosolOpticalDepth: 0.1,
    relativeHumidity: 60,
    directRadiation: 150,
    diffuseRadiation: 80,
    cloudVariance: 150,
    confidenceDecay: 0,
    previousDayScore: -1,
    ...over,
  };
}

/* ------------------------------------------------------------------ */
/*  Scenario expectations                                              */
/* ------------------------------------------------------------------ */

console.log("\nScenario bands");

const scenarios: Array<{
  name: string;
  input: SunsetInputFactors;
  min: number;
  max: number;
}> = [
  {
    name: "Pristine clear, humid marine air (June gloom edges)",
    input: factors({
      highCloud: 0, midCloud: 0, lowCloud: 2, horizonLowCloud: 5, totalCloud: 2,
      visibility: 16, dewPointSpread: 2.7, relativeHumidity: 84, pm25: 5,
      aerosolOpticalDepth: 0.1, windSpeed: 5, windDirection: 166, cloudVariance: 2,
    }),
    min: 24, max: 42,
  },
  {
    name: "Crisp clear fall evening",
    input: factors({
      highCloud: 0, midCloud: 0, lowCloud: 0, horizonLowCloud: 0, totalCloud: 0,
      visibility: 35, dewPointSpread: 9, relativeHumidity: 40, pm25: 4,
      aerosolOpticalDepth: 0.07, windSpeed: 8, windDirection: 30, cloudVariance: 20,
    }),
    min: 30, max: 46,
  },
  {
    name: "Marine layer wall",
    input: factors({
      highCloud: 20, midCloud: 15, lowCloud: 92, horizonLowCloud: 88, totalCloud: 92,
      visibility: 8, dewPointSpread: 1, relativeHumidity: 90, windSpeed: 10,
      windDirection: 220, cloudVariance: 400,
    }),
    min: 0, max: 20,
  },
  {
    name: "Post-storm cirrus blaze with offshore flow",
    input: factors({
      highCloud: 42, midCloud: 28, lowCloud: 6, horizonLowCloud: 10, totalCloud: 55,
      recentRain: 2.2, visibility: 35, dewPointSpread: 7, relativeHumidity: 48,
      pm25: 4, aerosolOpticalDepth: 0.07, windSpeed: 12, windDirection: 40,
      cloudVariance: 80,
    }),
    min: 82, max: 100,
  },
  {
    name: "Solid overcast ceiling",
    input: factors({
      highCloud: 95, midCloud: 90, lowCloud: 55, horizonLowCloud: 60, totalCloud: 100,
      visibility: 12, dewPointSpread: 4, relativeHumidity: 78, windSpeed: 8,
      windDirection: 200, cloudVariance: 150,
    }),
    min: 0, max: 28,
  },
  {
    name: "Textured sky, clear horizon (good night)",
    input: factors({
      highCloud: 30, midCloud: 18, lowCloud: 15, horizonLowCloud: 22, totalCloud: 45,
    }),
    min: 55, max: 84,
  },
  {
    name: "Wildfire smoke day",
    input: factors({
      highCloud: 35, midCloud: 20, lowCloud: 8, horizonLowCloud: 10, totalCloud: 40,
      visibility: 5, dewPointSpread: 6, relativeHumidity: 35, pm25: 55,
      aerosolOpticalDepth: 0.5, windSpeed: 6, windDirection: 40, cloudVariance: 100,
    }),
    min: 25, max: 55,
  },
  {
    name: "Fog-saturated evening",
    input: factors({
      highCloud: 15, midCloud: 12, lowCloud: 45, horizonLowCloud: 50, totalCloud: 60,
      visibility: 2, dewPointSpread: 0.5, relativeHumidity: 97, windSpeed: 6,
      windDirection: 240, cloudVariance: 300,
    }),
    min: 0, max: 30,
  },
];

for (const scenario of scenarios) {
  const { score, label } = calculateSunsetScore(scenario.input);
  check(
    `${scenario.name} → ${score} (${label})`,
    score >= scenario.min && score <= scenario.max,
    `expected ${scenario.min}..${scenario.max}`,
  );
}

/* ------------------------------------------------------------------ */
/*  Relational expectations                                            */
/* ------------------------------------------------------------------ */

console.log("\nRelational checks");

const clearHorizon = calculateSunsetScore(
  factors({ highCloud: 38, midCloud: 20, lowCloud: 8, horizonLowCloud: 10 }),
).score;
const blockedHorizon = calculateSunsetScore(
  factors({ highCloud: 38, midCloud: 20, lowCloud: 8, horizonLowCloud: 88 }),
).score;
check(
  `Offshore wall costs real points (${clearHorizon} → ${blockedHorizon})`,
  clearHorizon - blockedHorizon >= 18,
  "expected a drop of at least 18",
);

const smokeDay = calculateSunsetScore(
  factors({ pm25: 55, aerosolOpticalDepth: 0.5, visibility: 5 }),
).score;
const cleanDay = calculateSunsetScore(factors({})).score;
check(
  `Smoke mutes the same sky (${cleanDay} → ${smokeDay})`,
  cleanDay - smokeDay >= 8,
  "expected a drop of at least 8",
);

const farOut = calculateSunsetScore(
  factors({ highCloud: 42, midCloud: 28, lowCloud: 6, horizonLowCloud: 8, confidenceDecay: 0.85 }),
);
const nearIn = calculateSunsetScore(
  factors({ highCloud: 42, midCloud: 28, lowCloud: 6, horizonLowCloud: 8, confidenceDecay: 0 }),
);
check(
  `Far-out optimism is tempered toward climatology (${nearIn.score} → ${farOut.score})`,
  farOut.score < nearIn.score && farOut.score > 40,
  "expected pull toward ~42 without crossing it",
);

/* ------------------------------------------------------------------ */
/*  Monotonicity                                                       */
/* ------------------------------------------------------------------ */

console.log("\nMonotonicity sweeps");

function sweep(
  name: string,
  key: keyof SunsetInputFactors,
  from: number,
  to: number,
  step: number,
  expect: "non-increasing" | "non-decreasing",
) {
  let prev: number | null = null;
  let ok = true;
  let detail = "";

  for (let value = from; value <= to; value += step) {
    const { score } = calculateSunsetScore(factors({ [key]: value }));
    if (prev !== null) {
      const delta = score - prev;
      if (expect === "non-increasing" && delta > 0.6) {
        ok = false;
        detail = `${String(key)}=${value} rose ${prev} → ${score}`;
        break;
      }
      if (expect === "non-decreasing" && delta < -0.6) {
        ok = false;
        detail = `${String(key)}=${value} fell ${prev} → ${score}`;
        break;
      }
    }
    prev = score;
  }

  check(name, ok, detail);
}

sweep("More local low cloud never helps", "lowCloud", 0, 100, 5, "non-increasing");
sweep("More offshore low cloud never helps", "horizonLowCloud", 0, 100, 5, "non-increasing");
sweep("More smoke never helps", "pm25", 15, 60, 5, "non-increasing");
sweep("Drier spread never hurts", "dewPointSpread", 0, 12, 1, "non-decreasing");

/* ------------------------------------------------------------------ */
/*  Breakdown reconciliation                                           */
/* ------------------------------------------------------------------ */

console.log("\nBreakdown reconciliation");

let reconciled = true;
let reconcileDetail = "";

for (const scenario of scenarios) {
  const result = calculateSunsetScore(scenario.input);
  if (result.score <= 0 || result.score >= 100) continue;
  if (result.factorBreakdown.lightPath <= 0.05) continue; // light-path floor breaks exact identity

  const b = result.factorBreakdown;
  const sum =
    b.baseline +
    b.cloudCanvas +
    b.clearSkyGlow +
    b.vividnessModifier -
    b.marineLayerPenalty -
    b.horizonPenalty -
    b.overcastPenalty -
    b.fogPenalty +
    b.rainBonus +
    b.windModifier +
    b.stabilityModifier +
    b.persistenceModifier +
    b.confidenceAdjustment;

  if (Math.abs(sum - result.score) > 1.2) {
    reconciled = false;
    reconcileDetail = `${scenario.name}: terms sum to ${sum.toFixed(2)} but score is ${result.score}`;
    break;
  }
}

check("Breakdown terms sum to the score", reconciled, reconcileDetail);

/* ------------------------------------------------------------------ */
/*  Distribution over plausible IV evenings                            */
/* ------------------------------------------------------------------ */

console.log("\nDistribution over 2000 seeded plausible evenings");

let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const scores: number[] = [];
for (let i = 0; i < 2000; i += 1) {
  const low = rand() * 100 * (rand() < 0.55 ? 1 : 0.3); // marine layer is common
  const input = factors({
    highCloud: rand() * 80,
    midCloud: rand() * 70,
    lowCloud: low,
    horizonLowCloud: Math.min(100, low * (0.6 + rand() * 0.8)),
    totalCloud: Math.min(100, low + rand() * 50),
    recentRain: rand() < 0.15 ? rand() * 4 : 0,
    visibility: 5 + rand() * 30,
    dewPointSpread: rand() * 10,
    relativeHumidity: 40 + rand() * 55,
    pm25: rand() < 0.08 ? 20 + rand() * 40 : 3 + rand() * 12,
    aerosolOpticalDepth: 0.04 + rand() * 0.2,
    windSpeed: rand() * 25,
    windDirection: rand() * 360,
    cloudVariance: rand() * 600,
  });
  scores.push(calculateSunsetScore(input).score);
}

const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
const unreal = scores.filter((s) => s >= 85).length / scores.length;
const poor = scores.filter((s) => s <= 24).length / scores.length;
const great = scores.filter((s) => s >= 65).length / scores.length;

console.log(
  `  mean=${mean.toFixed(1)} poor=${(poor * 100).toFixed(1)}% great+=${(great * 100).toFixed(1)}% unreal=${(unreal * 100).toFixed(1)}%`,
);

check("Mean sits in a believable range (28..55)", mean >= 28 && mean <= 55, `mean=${mean.toFixed(1)}`);
check("Unreal nights are rare (<10%)", unreal < 0.1, `unreal=${(unreal * 100).toFixed(1)}%`);
check("Poor nights exist in numbers (>12%)", poor > 0.12, `poor=${(poor * 100).toFixed(1)}%`);
check("Great+ nights are attainable (4%..35%)", great >= 0.04 && great <= 0.35, `great=${(great * 100).toFixed(1)}%`);

/* ------------------------------------------------------------------ */
/*  effectiveTotalCloud sanity                                         */
/* ------------------------------------------------------------------ */

console.log("\nEffective total cloud");

check(
  "Single solid layer reads solid",
  effectiveTotalCloud(100, 0, 0, 0) === 100,
  `got ${effectiveTotalCloud(100, 0, 0, 0)}`,
);
check(
  "Three half layers read more than half",
  effectiveTotalCloud(60, 60, 60, 0) > 65 && effectiveTotalCloud(60, 60, 60, 0) < 90,
  `got ${effectiveTotalCloud(60, 60, 60, 0)}`,
);
check(
  "Reported total wins when higher",
  effectiveTotalCloud(10, 10, 10, 80) === 80,
  `got ${effectiveTotalCloud(10, 10, 10, 80)}`,
);

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All sanity checks passed.");
