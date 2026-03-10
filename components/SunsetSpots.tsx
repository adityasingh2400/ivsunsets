"use client";

import { motion } from "framer-motion";
import {
  Footprints,
  HeartHandshake,
  MapPin,
  Navigation,
  Sparkles,
  Sunset,
  TreePalm,
  Eye,
  Users,
  Waves,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SkyCanvas } from "@/components/SkyCanvas";
import { resolveScenePalette } from "@/components/hero/islaVistaPalette";
import type { ForecastDay } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Dynamic‑import the Leaflet map (client‑only, no SSR)              */
/* ------------------------------------------------------------------ */

const SunsetMap = dynamic(() => import("./SunsetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060c18]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
    </div>
  ),
});

/* ------------------------------------------------------------------ */
/*  Spot data                                                         */
/* ------------------------------------------------------------------ */

interface Spot {
  name: string;
  description: string;
  walkMin: number;
  vibe: string[];
  gradient: string;
  accent: string;
  Icon: ComponentType<{ className?: string }>;
  lat: number;
  lng: number;
  crowd: "quiet" | "balanced" | "social";
  horizonScore: number;
  photoScore: number;
  bestFor: string;
}

const spots: Spot[] = [
  {
    name: "Coal Oil Point",
    description:
      "West of IV at the nature reserve. Wide-open coastal bluffs with almost no light pollution. If you want to watch the sky go from gold to deep violet in peace, this is it.",
    walkMin: 18,
    vibe: ["secluded", "pristine"],
    gradient:
      "linear-gradient(135deg, #0c1238 0%, #2a1858 35%, #8a3060 70%, #d87030 100%)",
    accent: "#c084fc",
    Icon: TreePalm,
    lat: 34.4083,
    lng: -119.8776,
    crowd: "quiet",
    horizonScore: 10,
    photoScore: 9,
    bestFor: "big-sky isolation",
  },
  {
    name: "Sands Beach",
    description:
      "Below Coal Oil Point — beach-level views with the Channel Islands silhouetted against the horizon. The wet sand reflects the sky for a mirror effect on good evenings.",
    walkMin: 20,
    vibe: ["beach", "mirror effect"],
    gradient:
      "linear-gradient(135deg, #101838 0%, #28205c 35%, #a04058 70%, #e89028 100%)",
    accent: "#fbbf24",
    Icon: Waves,
    lat: 34.4048,
    lng: -119.8773,
    crowd: "balanced",
    horizonScore: 9,
    photoScore: 10,
    bestFor: "reflection shots",
  },
  {
    name: "Del Playa Cliffs",
    description:
      "The classic IV sunset spot. Walk the clifftop path between Camino Pescadero and Camino Corto for wide ocean panoramas. Bring friends — everyone's out here on a good evening.",
    walkMin: 5,
    vibe: ["social", "iconic"],
    gradient:
      "linear-gradient(135deg, #1a1040 0%, #6a2868 35%, #d85840 70%, #f0a020 100%)",
    accent: "#fb923c",
    Icon: Users,
    lat: 34.4094,
    lng: -119.8530,
    crowd: "social",
    horizonScore: 8,
    photoScore: 7,
    bestFor: "fast social horizon",
  },
  {
    name: "Window to the Sea",
    description:
      "A tiny hidden park at the end of a residential street. Only fits a handful of people, which is the charm. Perfect for a date or a quiet moment with the ocean.",
    walkMin: 8,
    vibe: ["hidden gem", "intimate"],
    gradient:
      "linear-gradient(135deg, #121640 0%, #3c206a 35%, #9a3868 70%, #d88038 100%)",
    accent: "#f472b6",
    Icon: MapPin,
    lat: 34.4092,
    lng: -119.8618,
    crowd: "quiet",
    horizonScore: 7,
    photoScore: 8,
    bestFor: "intimate lookout",
  },
  {
    name: "Campus Point",
    description:
      "The bluff near the UCSB lagoon. A little quieter than DP, with views stretching from the Channel Islands to the Santa Ynez mountains. Great for a reflective solo session.",
    walkMin: 10,
    vibe: ["serene", "scenic"],
    gradient:
      "linear-gradient(135deg, #0e1444 0%, #3a2070 35%, #c04868 70%, #e88830 100%)",
    accent: "#22d3ee",
    Icon: Eye,
    lat: 34.4050,
    lng: -119.8442,
    crowd: "balanced",
    horizonScore: 8,
    photoScore: 8,
    bestFor: "quiet reset",
  },
  {
    name: "Goleta Beach Pier",
    description:
      "A wider vantage point with the pier extending into the view. Popular for post-class hangouts. Bring food from campus — there are benches and BBQ pits nearby.",
    walkMin: 15,
    vibe: ["social", "pier views"],
    gradient:
      "linear-gradient(135deg, #0e1440 0%, #342468 35%, #b43860 70%, #ec7828 100%)",
    accent: "#facc15",
    Icon: Users,
    lat: 34.4161,
    lng: -119.8287,
    crowd: "social",
    horizonScore: 7,
    photoScore: 8,
    bestFor: "pier silhouettes",
  },
];

/** Subset passed to the Leaflet map (no React components / functions) */
const mapPins = spots.map((s) => ({
  name: s.name,
  accent: s.accent,
  lat: s.lat,
  lng: s.lng,
}));

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function formatLeaveBy(targetMs: number, now: number) {
  if (!Number.isFinite(targetMs)) return "Flexible";
  const diffMin = Math.round((targetMs - now) / 60000);

  if (diffMin <= 0) return "Leave now";
  if (diffMin > 120) {
    return `Plan for ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(targetMs)}`;
  }
  if (diffMin <= 8) return `Move in ${diffMin} min`;
  return `Leave in ${diffMin} min`;
}

function crowdLabel(crowd: Spot["crowd"]) {
  if (crowd === "quiet") return "Quiet";
  if (crowd === "social") return "Lively";
  return "Balanced";
}

function recommendationNote(
  spot: Spot,
  sunsetScore: number,
  minutesUntilSunset: number,
) {
  if (minutesUntilSunset <= 22 && spot.walkMin <= 8) {
    return "Close enough to save the sunset without turning this into a sprint.";
  }

  if (sunsetScore >= 70 && spot.photoScore >= 9) {
    return "High-upside sky plus strong composition makes this the premium play.";
  }

  if (sunsetScore >= 60 && spot.crowd === "quiet") {
    return "A cleaner horizon and less noise makes the afterglow feel bigger here.";
  }

  if (sunsetScore < 45 && spot.walkMin <= 8) {
    return "When the sky is only decent, convenience beats overcommitting.";
  }

  if (spot.crowd === "social") {
    return "Good if you want sunset energy without disappearing into the quiet spots.";
  }

  return `A dependable pick for ${spot.bestFor}.`;
}

function rankSpot(
  spot: Spot,
  sunsetScore: number,
  minutesUntilSunset: number,
) {
  const urgency = minutesUntilSunset <= 0 ? 1.15 : minutesUntilSunset < 30 ? 1.5 : minutesUntilSunset < 50 ? 1.15 : 0.8;
  const scenicWeight = sunsetScore >= 70 ? 1.45 : sunsetScore >= 50 ? 1.15 : 0.9;
  const convenience = Math.max(0, 30 - spot.walkMin) * urgency;
  const scenic = spot.horizonScore * 5.5 * scenicWeight;
  const photo = spot.photoScore * (sunsetScore >= 65 ? 3.2 : 2.1);
  const quietBonus =
    sunsetScore >= 65 && spot.crowd === "quiet"
      ? 9
      : sunsetScore < 45 && spot.crowd === "social"
        ? 7
        : 0;

  return scenic + photo + convenience + quietBonus;
}

function plannerTone(score: number) {
  if (score >= 75) return "Tonight wants a big horizon.";
  if (score >= 55) return "Pick a clean bluff and stay late.";
  if (score >= 35) return "Prioritize convenience over romance.";
  return "Keep it nearby if you go at all.";
}

export function SunsetSpots({
  bare,
  today,
}: {
  bare?: boolean;
  today?: ForecastDay;
} = {}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sunsetScore = today?.score ?? 55;
  const minutesUntilSunset =
    today && now ? Math.round((Date.parse(today.sunsetISO) - now) / 60000) : 65;
  const palette = resolveScenePalette(sunsetScore, null);

  const recommendations = useMemo(() => {
    return spots
      .map((spot, index) => ({
        index,
        spot,
        score: rankSpot(spot, sunsetScore, minutesUntilSunset),
        note: recommendationNote(spot, sunsetScore, minutesUntilSunset),
      }))
      .sort((a, b) => b.score - a.score);
  }, [minutesUntilSunset, sunsetScore]);

  const activeIndex = selected ?? recommendations[0]?.index ?? 0;
  const spot = spots[activeIndex] ?? null;
  const spotRank =
    spot !== null
      ? recommendations.find((entry) => entry.index === activeIndex)
      : recommendations[0];

  const handleSelect = useCallback(
    (i: number) => setSelected(i),
    [],
  );

  const directionsUrl = spot
    ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`
    : null;

  const topPick = recommendations[0];
  const backupPick = recommendations[1];
  const quickest = [...spots].sort((a, b) => a.walkMin - b.walkMin)[0];
  const leaveByMs =
    today && topPick
      ? Date.parse(today.sunsetISO) - (topPick.spot.walkMin + 12) * 60 * 1000
      : Number.NaN;

  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[#040610]",
        bare ? "flex w-full flex-1 flex-col" : "mx-auto w-full max-w-6xl rounded-[2rem]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 15% 14%, ${palette.glowAura} 0%, transparent 34%),
            radial-gradient(circle at 84% 16%, rgba(130,168,255,0.16) 0%, transparent 28%),
            linear-gradient(180deg, rgba(5,7,16,0.16) 0%, rgba(5,7,16,0.54) 55%, rgba(5,7,16,0.92) 100%)
          `,
        }}
      />
      <div className="sunset-noise absolute inset-0 opacity-[0.1]" />

      <div className={cn("relative z-10", bare ? "px-5 py-6 md:px-10 md:py-8" : "px-6 py-8 md:px-8 md:py-10")}>
        <motion.div
          className="mx-auto flex w-full max-w-6xl flex-col gap-5"
          initial={bare ? false : { opacity: 0, y: 20 }}
          animate={bare ? undefined : { opacity: 1, y: 0 }}
          transition={bare ? undefined : { duration: 0.45 }}
        >
          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/48">
              Where to watch
            </p>
            <h2 className="text-4xl leading-[0.92] tracking-tight text-white md:text-[3.35rem]">
              The right bluff matters.
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-white/66">
              {plannerTone(sunsetScore)} Use tonight&apos;s forecast to choose the
              spot that fits the light, the clock, and the mood you want.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Smart pick
              </p>
              <p className="mt-2 text-xl font-medium text-white">
                {topPick?.spot.name ?? "--"}
              </p>
              <p className="mt-1 text-sm text-white/58">
                {topPick?.spot.bestFor ?? "Scouted by the forecast"}
              </p>
            </div>
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Backup
              </p>
              <p className="mt-2 text-xl font-medium text-white">
                {backupPick?.spot.name ?? "--"}
              </p>
              <p className="mt-1 text-sm text-white/58">
                {backupPick?.spot.bestFor ?? "Secondary move"}
              </p>
            </div>
            <div className="rounded-[1.45rem] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Timing
              </p>
              <p className="mt-2 text-xl font-medium text-white">
                {formatLeaveBy(leaveByMs, now)}
              </p>
              <p className="mt-1 text-sm text-white/58">
                Fastest reach: {quickest?.name ?? "--"} ({quickest?.walkMin ?? "--"} min)
              </p>
            </div>
          </div>

          <motion.div
            className={cn(
              "grid gap-4",
              bare
                ? "flex-1 lg:min-h-[30rem] lg:grid-cols-[1.02fr_0.98fr]"
                : "lg:min-h-[34rem] lg:grid-cols-[1.02fr_0.98fr]",
            )}
            initial={bare ? false : { opacity: 0, y: 20 }}
            animate={bare ? undefined : { opacity: 1, y: 0 }}
            transition={bare ? undefined : { duration: 0.45, delay: 0.08 }}
          >
            <div className="relative min-h-[20rem] overflow-hidden rounded-[2rem] border border-white/12 shadow-[0_28px_80px_rgba(2,5,16,0.34)]">
              <SunsetMap
                spots={mapPins}
                selected={activeIndex}
                hovered={hovered}
                onSelect={handleSelect}
                onHover={setHovered}
              />

              <div className="pointer-events-none absolute inset-0 z-[500] rounded-[2rem] shadow-[inset_0_0_90px_rgba(4,6,16,0.48)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-16 bg-gradient-to-b from-[#040610]/50 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] h-16 bg-gradient-to-t from-[#040610]/50 to-transparent" />

              {topPick ? (
                <div className="pointer-events-none absolute left-4 top-4 z-[550] max-w-[17rem] rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(8,12,28,0.68),rgba(8,12,28,0.34))] p-4 backdrop-blur-xl">
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/46">
                    <Sparkles className="h-3.5 w-3.5" />
                    Tonight&apos;s smart pick
                  </p>
                  <p className="mt-2 text-lg text-white">{topPick.spot.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/64">
                    {topPick.note}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,13,28,0.56),rgba(8,13,28,0.22))] shadow-[0_28px_80px_rgba(2,5,16,0.34)] backdrop-blur-xl">
              {spot ? (
                <>
                  <div className="relative h-44 overflow-hidden border-b border-white/10">
                    {today ? (
                      <SkyCanvas
                        className="absolute inset-0"
                        score={today.score}
                        highCloud={today.factors.highCloud}
                        midCloud={today.factors.midCloud}
                        lowCloud={today.factors.lowCloud}
                        totalCloud={today.factors.totalCloud}
                        rain={today.factors.recentRain}
                        colorIntensity={0.92}
                        animated={false}
                      />
                    ) : null}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `${spot.gradient}, linear-gradient(180deg, rgba(4,6,16,0.14), rgba(4,6,16,0.62))`,
                        mixBlendMode: today ? "screen" : "normal",
                        opacity: today ? 0.68 : 1,
                      }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,16,0.08),rgba(4,6,16,0.28)_42%,rgba(4,6,16,0.78)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/56">
                        #{Math.max(1, recommendations.findIndex((entry) => entry.spot.name === spot.name) + 1)} ranked pick
                      </p>
                      <h3 className="mt-2 text-3xl text-white">{spot.name}</h3>
                      <p className="mt-1 text-sm text-white/66">
                        Best for {spot.bestFor}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/16 p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                          Walk
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-base text-white/82">
                          <Footprints className="h-4 w-4" />
                          {spot.walkMin} min
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/16 p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                          Crowd
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-base text-white/82">
                          <HeartHandshake className="h-4 w-4" />
                          {crowdLabel(spot.crowd)}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-black/16 p-3.5">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/42">
                          Sunset
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-base text-white/82">
                          <Sunset className="h-4 w-4" />
                          {today?.sunsetTime ?? "Tonight"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/10 bg-black/16 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">
                        Why it works tonight
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-white/72">
                        {spotRank?.note ?? "This spot gives you a reliable west-facing horizon."}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-white/66">
                      {spot.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {spot.vibe.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-white/62"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3 pt-2">
                      <a
                        href={directionsUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm text-white/76 transition hover:bg-white/[0.12] hover:text-white"
                      >
                        <Navigation className="h-4 w-4" />
                        Get walking directions
                      </a>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/16 px-4 py-2.5 text-sm text-white/56">
                        <MapPin className="h-4 w-4" />
                        Tap another pin to compare
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>

          <div className="grid gap-3 md:grid-cols-3">
            {recommendations.map((entry, index) => {
              const isActive = activeIndex === entry.index;
              return (
                <button
                  key={entry.spot.name}
                  type="button"
                  onClick={() => setSelected(entry.index)}
                  onMouseEnter={() => setHovered(entry.index)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "group rounded-[1.45rem] border px-4 py-4 text-left transition duration-300",
                    isActive
                      ? "border-white/24 bg-white/[0.08] shadow-[0_18px_54px_rgba(2,5,16,0.24)]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.06]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                        {index === 0
                          ? "Best pick"
                          : index === 1
                            ? "Backup"
                            : "Alt route"}
                      </p>
                      <h4 className="mt-1 text-lg text-white">{entry.spot.name}</h4>
                    </div>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        background: entry.spot.accent,
                        boxShadow: `0 0 14px ${entry.spot.accent}66`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-white/64">{entry.spot.bestFor}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/44">
                    <span>{entry.spot.walkMin} min walk</span>
                    <span>{crowdLabel(entry.spot.crowd)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
