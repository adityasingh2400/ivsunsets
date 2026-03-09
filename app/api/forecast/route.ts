import { NextResponse } from "next/server";
import {
  ISLA_VISTA_COORDS,
  buildFallbackForecastPayload,
  normalizeForecastPayload,
} from "@/lib/normalizeForecast";
import type { OpenMeteoForecastResponse } from "@/lib/types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

function buildOpenMeteoUrl() {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", String(ISLA_VISTA_COORDS.latitude));
  url.searchParams.set("longitude", String(ISLA_VISTA_COORDS.longitude));
  url.searchParams.set(
    "hourly",
    "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,relative_humidity_2m,visibility",
  );
  url.searchParams.set("daily", "sunrise,sunset,precipitation_sum");
  url.searchParams.set("timezone", ISLA_VISTA_COORDS.timezone);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("past_days", "1");

  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.searchParams.get("forceFallback") === "1") {
    return NextResponse.json(buildFallbackForecastPayload(), {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  }

  try {
    const openMeteoUrl = buildOpenMeteoUrl();
    const response = await fetch(openMeteoUrl.toString(), {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo failed with status ${response.status}`);
    }

    const raw = (await response.json()) as OpenMeteoForecastResponse;
    const payload = normalizeForecastPayload(raw, "open-meteo");

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch {
    const fallback = buildFallbackForecastPayload();

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  }
}
