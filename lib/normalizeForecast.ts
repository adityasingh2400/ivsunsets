import {
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
    averageHumidity: roundTo(factors.humidity, 1),
    averageVisibility: roundTo(factors.visibility, 1),
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
    // Heavy marine layer.
    { highCloud: 8, midCloud: 15, lowCloud: 82, totalCloud: 86, recentRain: 0.4, humidity: 88, visibility: 8 },
    // Mixed but still horizon risk.
    { highCloud: 18, midCloud: 22, lowCloud: 74, totalCloud: 68, recentRain: 0.8, humidity: 72, visibility: 14 },
    // Low cloud dominance with some upper structure.
    { highCloud: 14, midCloud: 34, lowCloud: 78, totalCloud: 52, recentRain: 0.6, humidity: 78, visibility: 12 },
    // Improving setup with active mid cloud texture.
    { highCloud: 12, midCloud: 62, lowCloud: 34, totalCloud: 35, recentRain: 1.2, humidity: 58, visibility: 28 },
    // Strong cloud texture and clearing potential.
    { highCloud: 54, midCloud: 48, lowCloud: 58, totalCloud: 84, recentRain: 1.1, humidity: 62, visibility: 22 },
    // Clearer horizon with post-rain bump.
    { highCloud: 20, midCloud: 34, lowCloud: 24, totalCloud: 40, recentRain: 1.4, humidity: 52, visibility: 35 },
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
      humidity: clamp(scenario.humidity, 0, 100),
      visibility: clamp(scenario.visibility, 0, 50),
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
    const humidityWindow = valuesAtIndices(raw.hourly.relative_humidity_2m, sunsetWindowIndices);
    const visibilityWindow = valuesAtIndices(raw.hourly.visibility, sunsetWindowIndices);

    const rainStartMillis = Math.floor((sunsetMillis - RAIN_LOOKBACK_START_MINUTES * 60 * 1000) / HOUR_MS) * HOUR_MS;
    const rainEndMillis = Math.ceil((sunsetMillis - RAIN_LOOKBACK_END_MINUTES * 60 * 1000) / HOUR_MS) * HOUR_MS;

    const priorRainIndices = extractIndices(hourlyEpochs, rainStartMillis, rainEndMillis);
    const priorRain = sum(valuesAtIndices(raw.hourly.precipitation, priorRainIndices));

    const factors: SunsetInputFactors = {
      highCloud: roundTo(average(highWindow), 1),
      midCloud: roundTo(average(midWindow), 1),
      lowCloud: roundTo(average(lowWindow), 1),
      totalCloud: roundTo(average(totalWindow), 1),
      recentRain: roundTo(priorRain, 2),
      humidity: roundTo(average(humidityWindow), 1),
      visibility: roundTo(average(visibilityWindow) / 1000, 1),
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
