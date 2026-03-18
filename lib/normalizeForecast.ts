import {
  type OpenMeteoAirQualityResponse,
  type ForecastDay,
  type ForecastPayload,
  type ForecastPreview,
  type OpenMeteoForecastResponse,
  type SunsetInputFactors,
  type SunsetWindowSnapshot,
} from "@/lib/types";
import { calculateSunsetScore } from "@/lib/scoreSunset";
import {
  addDaysToDateKey,
  average,
  clamp,
  formatClockTime,
  formatDayName,
  getDateInTimezone,
  roundTo,
  safeNumber,
  sum,
  variance,
  weightedAverage,
} from "@/lib/utils";

export const ISLA_VISTA_COORDS = {
  latitude: 34.4133,
  longitude: -119.861,
  timezone: "America/Los_Angeles",
  location: "Isla Vista, California",
};

const DAYS_TO_SHOW = 6;
const SUNSET_WINDOW_BEFORE_MINUTES = 120;
const SUNSET_WINDOW_AFTER_MINUTES = 30;
const RAIN_LOOKBACK_START_MINUTES = 24 * 60;
const RAIN_LOOKBACK_END_MINUTES = 6 * 60;

function toMillis(timestamp: string) {
  const millis = Date.parse(timestamp);
  return Number.isNaN(millis) ? 0 : millis;
}

function extractIndices(
  epochTimes: number[],
  startMillis: number,
  endMillis: number,
) {
  const indices: number[] = [];

  for (let index = 0; index < epochTimes.length; index += 1) {
    const value = epochTimes[index];

    if (value >= startMillis && value <= endMillis) {
      indices.push(index);
    }
  }

  return indices;
}

function pickFallbackWindowIndices(
  hourlyTimes: string[],
  sunsetIso: string,
  fallbackCount = 5,
) {
  const targetDate = sunsetIso.split("T")[0] ?? "";
  const targetHour = Number((sunsetIso.split("T")[1] ?? "18:00").split(":")[0]);

  return hourlyTimes
    .map((timestamp, index) => ({
      timestamp,
      index,
    }))
    .filter((entry) => {
      const datePart = entry.timestamp.split("T")[0] ?? "";
      const hour = Number((entry.timestamp.split("T")[1] ?? "00:00").split(":")[0]);
      return (
        datePart === targetDate &&
        hour >= targetHour - 2 &&
        hour <= targetHour + 1
      );
    })
    .slice(0, fallbackCount)
    .map((entry) => entry.index);
}

function valuesAtIndices(values: number[], indices: number[]) {
  return indices.map((index) => safeNumber(values[index]));
}

function averageDirection(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const vector = values.reduce(
    (sum, value) => {
      const radians = (safeNumber(value) * Math.PI) / 180;
      return {
        x: sum.x + Math.cos(radians),
        y: sum.y + Math.sin(radians),
      };
    },
    { x: 0, y: 0 },
  );

  if (Math.abs(vector.x) < 1e-6 && Math.abs(vector.y) < 1e-6) {
    return 0;
  }

  return roundTo(((Math.atan2(vector.y, vector.x) * 180) / Math.PI + 360) % 360, 1);
}

/**
 * Build weights that favor hours closest to sunset.
 * Uses a Gaussian-like falloff so the hour at sunset gets weight 1.0
 * and hours 2h away get ~0.25.
 */
function buildSunsetProximityWeights(
  indices: number[],
  epochTimes: number[],
  sunsetMillis: number,
) {
  const SIGMA_MS = 45 * 60 * 1000;
  return indices.map((i) => {
    const dt = Math.abs((epochTimes[i] ?? 0) - sunsetMillis);
    return Math.exp(-0.5 * (dt / SIGMA_MS) ** 2);
  });
}

function buildAirQualityLookup(raw?: OpenMeteoAirQualityResponse | null) {
  const lookup = new Map<string, { pm25: number; aerosolOpticalDepth: number }>();

  if (!raw?.hourly?.time?.length) {
    return lookup;
  }

  for (let index = 0; index < raw.hourly.time.length; index += 1) {
    const time = raw.hourly.time[index];
    if (!time) continue;

    lookup.set(time, {
      pm25: raw.hourly.pm2_5[index] ?? 8,
      aerosolOpticalDepth: raw.hourly.aerosol_optical_depth[index] ?? 0.08,
    });
  }

  return lookup;
}

function buildPreview(score: number, factors: SunsetInputFactors): ForecastPreview {
  const warmth = clamp(score / 100, 0, 1);
  const texture = clamp((factors.highCloud + factors.midCloud) / 200, 0, 1);

  return {
    hueShift: roundTo((0.5 - warmth) * 24 + (factors.lowCloud - factors.highCloud) * 0.08, 1),
    warmth: roundTo(warmth, 2),
    glow: roundTo(clamp(warmth + factors.recentRain * 0.03, 0, 1), 2),
    lowCloudBand: roundTo(clamp(factors.lowCloud / 100, 0, 1), 2),
    texture: roundTo(texture, 2),
  };
}

function buildWindowSnapshot(
  windowStartMillis: number,
  windowEndMillis: number,
  indices: number[],
  factors: SunsetInputFactors,
  windowPrecipitation: number,
): SunsetWindowSnapshot {
  return {
    windowStart: new Date(windowStartMillis).toISOString(),
    windowEnd: new Date(windowEndMillis).toISOString(),
    hourlyCount: indices.length,
    averageHighCloud: roundTo(factors.highCloud, 1),
    averageMidCloud: roundTo(factors.midCloud, 1),
    averageLowCloud: roundTo(factors.lowCloud, 1),
    averageTotalCloud: roundTo(factors.totalCloud, 1),
    windowPrecipitation: roundTo(windowPrecipitation, 2),
    priorRain: roundTo(factors.recentRain, 2),
    averageVisibility: roundTo(factors.visibility, 1),
    averageDewPointSpread: roundTo(factors.dewPointSpread, 1),
    averageWindSpeed: roundTo(factors.windSpeed, 1),
    averageWindDirection: roundTo(factors.windDirection, 1),
    averagePm25: roundTo(factors.pm25, 1),
    averageAerosolOpticalDepth: roundTo(factors.aerosolOpticalDepth, 2),
    averageRelativeHumidity: roundTo(factors.relativeHumidity, 1),
    averageDirectRadiation: roundTo(factors.directRadiation, 1),
    averageDiffuseRadiation: roundTo(factors.diffuseRadiation, 1),
    cloudVariance: roundTo(factors.cloudVariance, 1),
    confidenceDecay: roundTo(factors.confidenceDecay, 3),
  };
}

function createDay(
  dateKey: string,
  dayName: string,
  sunriseISO: string,
  sunsetISO: string,
  precipitationSum: number,
  factors: SunsetInputFactors,
  window: SunsetWindowSnapshot,
): ForecastDay {
  const scoreResult = calculateSunsetScore(factors);

  return {
    date: dateKey,
    dayName,
    sunriseISO,
    sunriseTime: formatClockTime(sunriseISO),
    sunsetISO,
    sunsetTime: formatClockTime(sunsetISO),
    precipitationSum: roundTo(precipitationSum, 2),
    factors,
    sunsetWindow: window,
    preview: buildPreview(scoreResult.score, factors),
    ...scoreResult,
  };
}

export function buildFallbackForecastPayload(): ForecastPayload {
  const todayKey = getDateInTimezone(new Date(), ISLA_VISTA_COORDS.timezone);

  const fallbackScenarios: SunsetInputFactors[] = [
    { highCloud: 8, midCloud: 15, lowCloud: 82, totalCloud: 86, recentRain: 0.4, visibility: 8, dewPointSpread: 1.5, windSpeed: 14, windDirection: 260, pm25: 14, aerosolOpticalDepth: 0.12, relativeHumidity: 88, directRadiation: 40, diffuseRadiation: 60, cloudVariance: 200, confidenceDecay: 0, previousDayScore: -1 },
    { highCloud: 18, midCloud: 22, lowCloud: 74, totalCloud: 68, recentRain: 0.8, visibility: 14, dewPointSpread: 2.5, windSpeed: 12, windDirection: 248, pm25: 12, aerosolOpticalDepth: 0.1, relativeHumidity: 78, directRadiation: 80, diffuseRadiation: 70, cloudVariance: 350, confidenceDecay: 0.15, previousDayScore: -1 },
    { highCloud: 14, midCloud: 34, lowCloud: 78, totalCloud: 52, recentRain: 0.6, visibility: 12, dewPointSpread: 2.2, windSpeed: 10, windDirection: 242, pm25: 11, aerosolOpticalDepth: 0.1, relativeHumidity: 80, directRadiation: 70, diffuseRadiation: 65, cloudVariance: 400, confidenceDecay: 0.3, previousDayScore: -1 },
    { highCloud: 12, midCloud: 62, lowCloud: 34, totalCloud: 35, recentRain: 1.2, visibility: 28, dewPointSpread: 6.2, windSpeed: 11, windDirection: 75, pm25: 7, aerosolOpticalDepth: 0.08, relativeHumidity: 52, directRadiation: 200, diffuseRadiation: 90, cloudVariance: 180, confidenceDecay: 0.45, previousDayScore: -1 },
    { highCloud: 54, midCloud: 48, lowCloud: 58, totalCloud: 84, recentRain: 1.1, visibility: 22, dewPointSpread: 5.3, windSpeed: 8, windDirection: 82, pm25: 8, aerosolOpticalDepth: 0.08, relativeHumidity: 58, directRadiation: 150, diffuseRadiation: 100, cloudVariance: 250, confidenceDecay: 0.6, previousDayScore: -1 },
    { highCloud: 20, midCloud: 34, lowCloud: 24, totalCloud: 40, recentRain: 1.4, visibility: 35, dewPointSpread: 8.4, windSpeed: 9, windDirection: 62, pm25: 5, aerosolOpticalDepth: 0.06, relativeHumidity: 42, directRadiation: 280, diffuseRadiation: 60, cloudVariance: 120, confidenceDecay: 0.75, previousDayScore: -1 },
  ];

  const days = Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index);
    const scenario = fallbackScenarios[index % fallbackScenarios.length];
    const factors: SunsetInputFactors = {
      highCloud: clamp(scenario.highCloud, 0, 100),
      midCloud: clamp(scenario.midCloud, 0, 100),
      lowCloud: clamp(scenario.lowCloud, 0, 100),
      totalCloud: clamp(scenario.totalCloud, 0, 100),
      recentRain: clamp(scenario.recentRain, 0, 8),
      visibility: clamp(scenario.visibility, 0, 50),
      dewPointSpread: clamp(scenario.dewPointSpread, 0, 18),
      windSpeed: clamp(scenario.windSpeed, 0, 50),
      windDirection: ((scenario.windDirection % 360) + 360) % 360,
      pm25: clamp(scenario.pm25, 0, 80),
      aerosolOpticalDepth: clamp(scenario.aerosolOpticalDepth, 0, 1),
      relativeHumidity: clamp(scenario.relativeHumidity, 0, 100),
      directRadiation: clamp(scenario.directRadiation, 0, 1000),
      diffuseRadiation: clamp(scenario.diffuseRadiation, 0, 1000),
      cloudVariance: clamp(scenario.cloudVariance, 0, 2500),
      confidenceDecay: clamp(scenario.confidenceDecay, 0, 1),
      previousDayScore: -1,
    };

    const sunsetISO = `${dateKey}T18:${String(8 + (index % 6)).padStart(2, "0")}`;
    const sunriseISO = `${dateKey}T06:${String(30 + (index % 8)).padStart(2, "0")}`;

    const windowStartMillis = toMillis(sunsetISO) - SUNSET_WINDOW_BEFORE_MINUTES * 60 * 1000;
    const windowEndMillis = toMillis(sunsetISO) + SUNSET_WINDOW_AFTER_MINUTES * 60 * 1000;

    const window = buildWindowSnapshot(
      windowStartMillis,
      windowEndMillis,
      [0, 1, 2],
      factors,
      factors.recentRain * 0.5,
    );

    return createDay(
      dateKey,
      index === 0 ? "Today" : formatDayName(dateKey),
      sunriseISO,
      sunsetISO,
      roundTo(factors.recentRain * 1.5, 2),
      factors,
      window,
    );
  });

  return {
    ...ISLA_VISTA_COORDS,
    generatedAt: new Date().toISOString(),
    localPulse: {
      generatedAt: new Date().toISOString(),
      items: [],
    },
    source: "fallback",
    days,
    today: days[0],
  };
}

export function normalizeForecastPayload(
  raw: OpenMeteoForecastResponse,
  airQualityRaw?: OpenMeteoAirQualityResponse | null,
  source: ForecastPayload["source"] = "open-meteo",
): ForecastPayload {
  if (
    !raw?.daily?.time?.length ||
    !raw?.daily?.sunset?.length ||
    !raw?.hourly?.time?.length
  ) {
    return buildFallbackForecastPayload();
  }

  const timezone = raw.timezone || ISLA_VISTA_COORDS.timezone;
  const todayKey = getDateInTimezone(new Date(), timezone);

  const hourlyEpochs = raw.hourly.time.map((timestamp) => toMillis(timestamp));
  const airQualityLookup = buildAirQualityLookup(airQualityRaw);
  const days: ForecastDay[] = [];

  for (let dayIndex = 0; dayIndex < raw.daily.time.length; dayIndex += 1) {
    if (days.length >= DAYS_TO_SHOW) {
      break;
    }

    const dateKey = raw.daily.time[dayIndex];

    if (!dateKey || dateKey < todayKey) {
      continue;
    }

    const sunriseISO = raw.daily.sunrise[dayIndex];
    const sunsetISO = raw.daily.sunset[dayIndex];

    if (!sunriseISO || !sunsetISO) {
      continue;
    }

    const sunsetMillis = toMillis(sunsetISO);

    if (!sunsetMillis) {
      continue;
    }

    const windowStartMillis =
      sunsetMillis - SUNSET_WINDOW_BEFORE_MINUTES * 60 * 1000;
    const windowEndMillis = sunsetMillis + SUNSET_WINDOW_AFTER_MINUTES * 60 * 1000;

    /*
     * Snap extraction bounds to hour boundaries so we never miss a data point
     * that falls just outside the window due to minute-level offsets.
     * Open-Meteo hourly data is timestamped at :00, and a sunset at e.g.
     * 19:01 would start the window at 17:01, excluding the 17:00 data point
     * by 60 seconds. Rounding down/up fixes this.
     */
    const HOUR_MS = 3_600_000;
    const snapStart = Math.floor(windowStartMillis / HOUR_MS) * HOUR_MS;
    const snapEnd = Math.ceil(windowEndMillis / HOUR_MS) * HOUR_MS;

    let sunsetWindowIndices = extractIndices(
      hourlyEpochs,
      snapStart,
      snapEnd,
    );

    if (!sunsetWindowIndices.length) {
      sunsetWindowIndices = pickFallbackWindowIndices(raw.hourly.time, sunsetISO);
    }

    if (!sunsetWindowIndices.length) {
      continue;
    }

    const highWindow = valuesAtIndices(raw.hourly.cloud_cover_high, sunsetWindowIndices);
    const midWindow = valuesAtIndices(raw.hourly.cloud_cover_mid, sunsetWindowIndices);
    const lowWindow = valuesAtIndices(raw.hourly.cloud_cover_low, sunsetWindowIndices);
    const totalWindow = valuesAtIndices(raw.hourly.cloud_cover, sunsetWindowIndices);
    const precipWindow = valuesAtIndices(raw.hourly.precipitation, sunsetWindowIndices);
    const tempWindow = valuesAtIndices(raw.hourly.temperature_2m, sunsetWindowIndices);
    const dewPointWindow = valuesAtIndices(raw.hourly.dew_point_2m, sunsetWindowIndices);
    const visibilityWindow = valuesAtIndices(raw.hourly.visibility, sunsetWindowIndices);
    const windSpeedWindow = valuesAtIndices(raw.hourly.wind_speed_10m, sunsetWindowIndices);
    const windDirectionWindow = valuesAtIndices(raw.hourly.wind_direction_10m, sunsetWindowIndices);
    const rhWindow = valuesAtIndices(raw.hourly.relative_humidity_2m ?? [], sunsetWindowIndices);
    const directRadWindow = valuesAtIndices(raw.hourly.direct_radiation ?? [], sunsetWindowIndices);
    const diffuseRadWindow = valuesAtIndices(raw.hourly.diffuse_radiation ?? [], sunsetWindowIndices);

    const proximityWeights = buildSunsetProximityWeights(
      sunsetWindowIndices,
      hourlyEpochs,
      sunsetMillis,
    );

    const dewPointSpreadWindow = tempWindow.map((temperature, index) =>
      Math.max(0, safeNumber(temperature) - safeNumber(dewPointWindow[index])),
    );
    const pm25Window = sunsetWindowIndices.map((index) => {
      const lookup = airQualityLookup.get(raw.hourly.time[index] ?? "");
      return safeNumber(lookup?.pm25 ?? 8);
    });
    const aerosolWindow = sunsetWindowIndices.map((index) => {
      const lookup = airQualityLookup.get(raw.hourly.time[index] ?? "");
      return safeNumber(lookup?.aerosolOpticalDepth ?? 0.08);
    });

    const totalCloudVariance = variance(totalWindow) + variance(highWindow) * 0.5;
    const dayOffset = days.length;
    const confidenceDecay = clamp(dayOffset * 0.18, 0, 0.85);

    const rainStartMillis = Math.floor((sunsetMillis - RAIN_LOOKBACK_START_MINUTES * 60 * 1000) / HOUR_MS) * HOUR_MS;
    const rainEndMillis = Math.ceil((sunsetMillis - RAIN_LOOKBACK_END_MINUTES * 60 * 1000) / HOUR_MS) * HOUR_MS;

    const priorRainIndices = extractIndices(hourlyEpochs, rainStartMillis, rainEndMillis);
    const priorRain = sum(valuesAtIndices(raw.hourly.precipitation, priorRainIndices));

    const factors: SunsetInputFactors = {
      highCloud: roundTo(weightedAverage(highWindow, proximityWeights), 1),
      midCloud: roundTo(weightedAverage(midWindow, proximityWeights), 1),
      lowCloud: roundTo(weightedAverage(lowWindow, proximityWeights), 1),
      totalCloud: roundTo(weightedAverage(totalWindow, proximityWeights), 1),
      recentRain: roundTo(priorRain, 2),
      visibility: roundTo(weightedAverage(visibilityWindow, proximityWeights) / 1000, 1),
      dewPointSpread: roundTo(weightedAverage(dewPointSpreadWindow, proximityWeights), 1),
      windSpeed: roundTo(weightedAverage(windSpeedWindow, proximityWeights), 1),
      windDirection: averageDirection(windDirectionWindow),
      pm25: roundTo(weightedAverage(pm25Window, proximityWeights), 1),
      aerosolOpticalDepth: roundTo(weightedAverage(aerosolWindow, proximityWeights), 2),
      relativeHumidity: roundTo(
        rhWindow.length ? weightedAverage(rhWindow, proximityWeights) : 65,
        1,
      ),
      directRadiation: roundTo(
        directRadWindow.length ? weightedAverage(directRadWindow, proximityWeights) : 100,
        1,
      ),
      diffuseRadiation: roundTo(
        diffuseRadWindow.length ? weightedAverage(diffuseRadWindow, proximityWeights) : 80,
        1,
      ),
      cloudVariance: roundTo(totalCloudVariance, 1),
      confidenceDecay,
      previousDayScore: days.length > 0 ? days[days.length - 1].score : -1,
    };

    const window = buildWindowSnapshot(
      windowStartMillis,
      windowEndMillis,
      sunsetWindowIndices,
      factors,
      sum(precipWindow),
    );

    const day = createDay(
      dateKey,
      dateKey === todayKey ? "Today" : formatDayName(dateKey),
      sunriseISO,
      sunsetISO,
      safeNumber(raw.daily.precipitation_sum[dayIndex]),
      factors,
      window,
    );

    days.push(day);
  }

  if (!days.length) {
    return buildFallbackForecastPayload();
  }

  if (days.length < DAYS_TO_SHOW) {
    const fallback = buildFallbackForecastPayload().days;

    for (const fallbackDay of fallback) {
      if (days.length >= DAYS_TO_SHOW) {
        break;
      }

      if (!days.some((day) => day.date === fallbackDay.date)) {
        days.push(fallbackDay);
      }
    }
  }

  return {
    location: ISLA_VISTA_COORDS.location,
    latitude: raw.latitude || ISLA_VISTA_COORDS.latitude,
    longitude: raw.longitude || ISLA_VISTA_COORDS.longitude,
    timezone,
    source,
    generatedAt: new Date().toISOString(),
    localPulse: {
      generatedAt: new Date().toISOString(),
      items: [],
    },
    days,
    today: days[0],
  };
}
