export type ScoreLabel = "Poor" | "Decent" | "Good" | "Great" | "Unreal";

export type SunsetRating = "bland" | "decent" | "beautiful" | "unreal";

export interface SunsetInputFactors {
  highCloud: number;
  midCloud: number;
  lowCloud: number;
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
  highCloudContribution: number;
  midCloudContribution: number;
  textureContribution: number;
  lowCloudPenalty: number;
  rainBonus: number;
  contrastBonus: number;
  dewPointModifier: number;
  windModifier: number;
  clarityModifier: number;
  humidityModifier: number;
  radiationModifier: number;
  stabilityModifier: number;
  persistenceModifier: number;
  confidenceAdjustment: number;
  baseline: number;
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

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    pm2_5: number[];
    aerosol_optical_depth: number[];
  };
}
