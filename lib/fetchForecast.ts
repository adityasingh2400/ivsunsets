import type { ForecastPayload } from "@/lib/types";

/*
 * Schema version in the query string busts the CDN cache key on deploy —
 * the route is edge-cached (s-maxage + stale-while-revalidate), and a new
 * client reading an old-schema cached payload would render NaN scores.
 * Bump when ForecastDay/FactorBreakdown change shape.
 */
const FORECAST_SCHEMA_VERSION = "3";

export async function fetchForecast(signal?: AbortSignal) {
  const response = await fetch(`/api/forecast?schema=${FORECAST_SCHEMA_VERSION}`, {
    method: "GET",
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Forecast request failed (${response.status})`);
  }

  const payload = (await response.json()) as ForecastPayload;

  if (!payload?.days?.length || !payload.today) {
    throw new Error("Forecast response is missing required data.");
  }

  // Defensive backfill in case a pre-v3 payload ever slips through a cache.
  for (const day of payload.days) {
    if (day?.factors && typeof day.factors.horizonLowCloud !== "number") {
      day.factors.horizonLowCloud = day.factors.lowCloud ?? 0;
    }
  }

  return payload;
}
