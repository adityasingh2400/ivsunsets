export type ScoreLabel = "Poor" | "Decent" | "Good" | "Great" | "Unreal";

export type SunsetRating = "bland" | "decent" | "beautiful" | "unreal";

export interface SunsetInputFactors {
  highCloud: number;
  midCloud: number;
  lowCloud: number;
  /**
   * Low cloud coverage at the offshore probe point ~30 km west of IV,
   * directly on the sunset light path. The marine layer out there blocks
   * color even when the sky overhead is clear.
   */
  horizonLowCloud: number;
  totalCloud: number;
  recentRain: number;
  visibility: number;
  dewPointSpread: number;
  windSpeed: number;
  windDirection: number;
  pm25: number;
  aerosolOpticalDepth: number;
  relativeHumidity: number;
  directRadiation: number;
  diffuseRadiation: number;
  cloudVariance: number;
  /** 0 = today (full confidence), higher = further out, max ~1 */
  confidenceDecay: number;
  /** Score from the previous day, used as a persistence anchor. -1 if unavailable. */
  previousDayScore: number;
}

export interface FactorBreakdown {
  /** Floor: the sun setting over an ocean horizon is never worth zero. */
  baseline: number;
  /** Points available from the high/mid cloud palette (pre-gating). */
  cloudCanvas: number;
  /** Points available from a clean open-horizon fade when clouds are sparse. */
  clearSkyGlow: number;
  /** Air clarity effect in points: aerosols/visibility/humidity sharpening or muting color. */
  vividnessModifier: number;
  /** Points removed because local low cloud blocks the horizon. */
  marineLayerPenalty: number;
  /** Points removed because offshore low cloud sits on the sunset light path. */
  horizonPenalty: number;
  /** Points removed because a near-solid ceiling smothers the light. */
  overcastPenalty: number;
  /** Points removed because the air is near saturation (fog / horizon murk). */
  fogPenalty: number;
  rainBonus: number;
  windModifier: number;
  stabilityModifier: number;
  persistenceModifier: number;
  confidenceAdjustment: number;
  /** Diagnostics (0..1 unless noted): how much paintable cloud exists. */
  canvas: number;
  /** Diagnostics: fraction of sunset light that survives all gates. */
  lightPath: number;
  /** Diagnostics: air clarity multiplier (~0.55..1.15). */
  vividness: number;
}

export interface SunsetScoreResult {
  score: number;
  label: ScoreLabel;
  explanation: string;
  reasonChips: string[];
  factorBreakdown: FactorBreakdown;
}

export interface SunsetWindowSnapshot {
  windowStart: string;
  windowEnd: string;
  hourlyCount: number;
  averageHighCloud: number;
  averageMidCloud: number;
  averageLowCloud: number;
  averageHorizonLowCloud: number;
  averageTotalCloud: number;
  windowPrecipitation: number;
  priorRain: number;
  averageVisibility: number;
  averageDewPointSpread: number;
  averageWindSpeed: number;
  averageWindDirection: number;
  averagePm25: number;
  averageAerosolOpticalDepth: number;
  averageRelativeHumidity: number;
  averageDirectRadiation: number;
  averageDiffuseRadiation: number;
  cloudVariance: number;
  confidenceDecay: number;
}

export interface ForecastPreview {
  hueShift: number;
  warmth: number;
  glow: number;
  lowCloudBand: number;
  texture: number;
}

export interface ForecastDay extends SunsetScoreResult {
  date: string;
  dayName: string;
  sunriseISO: string;
  sunriseTime: string;
  sunsetISO: string;
  sunsetTime: string;
  precipitationSum: number;
  factors: SunsetInputFactors;
  sunsetWindow: SunsetWindowSnapshot;
  preview: ForecastPreview;
}

export type LocalPulseKind = "news" | "event" | "safety";

export interface LocalPulseItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  kind: LocalPulseKind;
  publishedAt: string;
  startsAt?: string;
  locationLabel?: string;
  tags: string[];
  ivScore: number;
}

export interface LocalPulsePayload {
  generatedAt: string;
  items: LocalPulseItem[];
}

export interface ForecastPayload {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: "open-meteo" | "fallback";
  generatedAt: string;
  localPulse: LocalPulsePayload;
  days: ForecastDay[];
  today: ForecastDay;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    precipitation: number[];
    visibility: number[];
    temperature_2m: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    relative_humidity_2m: number[];
    direct_radiation: number[];
    diffuse_radiation: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
  };
}

/** Offshore probe ~30 km west of IV on the sunset light path. */
export interface OpenMeteoHorizonResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    cloud_cover_low: number[];
  };
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    pm2_5: number[];
    aerosol_optical_depth: number[];
  };
}
