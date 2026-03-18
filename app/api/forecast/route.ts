import { NextResponse } from "next/server";
import { fetchLocalPulse } from "@/lib/localPulse";
import {
  ISLA_VISTA_COORDS,
  buildFallbackForecastPayload,
  normalizeForecastPayload,
} from "@/lib/normalizeForecast";
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from "@/lib/types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

function buildOpenMeteoUrl() {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", String(ISLA_VISTA_COORDS.latitude));
  url.searchParams.set("longitude", String(ISLA_VISTA_COORDS.longitude));
  url.searchParams.set(
    "hourly",
    "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,visibility,temperature_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,direct_radiation,diffuse_radiation",
  );
  url.searchParams.set("daily", "sunrise,sunset,precipitation_sum");
  url.searchParams.set("timezone", ISLA_VISTA_COORDS.timezone);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("past_days", "1");

  return url;
}

function buildOpenMeteoAirQualityUrl() {
  const url = new URL(OPEN_METEO_AIR_QUALITY_URL);

  url.searchParams.set("latitude", String(ISLA_VISTA_COORDS.latitude));
  url.searchParams.set("longitude", String(ISLA_VISTA_COORDS.longitude));
  url.searchParams.set("hourly", "pm2_5,aerosol_optical_depth");
  url.searchParams.set("timezone", ISLA_VISTA_COORDS.timezone);
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("past_days", "1");

  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const localPulsePromise = fetchLocalPulse().catch(() => ({
    generatedAt: new Date().toISOString(),
    items: [],
  }));

  if (requestUrl.searchParams.get("forceFallback") === "1") {
    const localPulse = await localPulsePromise;
    return NextResponse.json({
      ...buildFallbackForecastPayload(),
      localPulse,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  }

  try {
    const openMeteoUrl = buildOpenMeteoUrl();
    const airQualityPromise = fetch(buildOpenMeteoAirQualityUrl().toString(), {
      next: { revalidate: 900 },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as OpenMeteoAirQualityResponse;
      })
      .catch(() => null);

    const [response, airQualityRaw, localPulse] = await Promise.all([
      fetch(openMeteoUrl.toString(), {
        next: { revalidate: 900 },
      }),
      airQualityPromise,
      localPulsePromise,
    ]);

    if (!response.ok) {
      throw new Error(`Open-Meteo failed with status ${response.status}`);
    }

    const raw = (await response.json()) as OpenMeteoForecastResponse;
    const payload = {
      ...normalizeForecastPayload(raw, airQualityRaw, "open-meteo"),
      localPulse,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch {
    const localPulse = await localPulsePromise;
    const fallback = {
      ...buildFallbackForecastPayload(),
      localPulse,
    };

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  }
}
