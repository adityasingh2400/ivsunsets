export type ScoreLabel = "Poor" | "Decent" | "Good" | "Great" | "Unreal";

export type SunsetRating = "bland" | "decent" | "beautiful" | "unreal";

export interface SunsetInputFactors {
  highCloud: number;
  midCloud: number;
  lowCloud: number;
  totalCloud: number;
  recentRain: number;
  humidity: number;
  visibility: number;
}

export interface FactorBreakdown {
  highCloudContribution: number;
  midCloudContribution: number;
  textureContribution: number;
  lowCloudPenalty: number;
  rainBonus: number;
  textureBonus: number;
  humidityBonus: number;
  visibilityModifier: number;
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
  averageHumidity: number;
  averageVisibility: number;
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
    relative_humidity_2m: number[];
    visibility: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
  };
}
