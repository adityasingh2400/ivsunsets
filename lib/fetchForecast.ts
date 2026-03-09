import type { ForecastPayload } from "@/lib/types";

export async function fetchForecast(signal?: AbortSignal) {
  const response = await fetch("/api/forecast", {
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

  return payload;
}
