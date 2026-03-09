"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Footprints,
  MapPin,
  Users,
  TreePalm,
  Waves,
  Eye,
  Navigation,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type ComponentType, useState, useCallback } from "react";

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

export function SunsetSpots({ bare }: { bare?: boolean } = {}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const spot = selected !== null ? spots[selected] : null;

  const handleSelect = useCallback(
    (i: number) => setSelected((prev) => (prev === i ? null : i)),
    [],
  );

  const directionsUrl = spot
    ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`
    : null;

  return (
    <section className={bare ? "flex w-full flex-1 flex-col bg-[#040610]" : "mx-auto w-full max-w-6xl px-6 py-20 md:px-10"}>
      {/* Header */}
      {bare ? (
        <div className="px-5 pt-5">
          <p className="mb-1 text-xs uppercase tracking-[0.22em] text-white/55">Where to watch</p>
          <h2 className="text-2xl leading-tight tracking-tight text-white md:text-3xl">Best sunset spots in IV.</h2>
        </div>
      ) : (
        <motion.div
          className="mb-10 max-w-3xl"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55 }}
        >
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-white/55">
            Where to watch
          </p>
          <h2 className="text-4xl leading-[0.95] tracking-tight text-white md:text-6xl">
            Best sunset spots in IV.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-white/65 md:text-base">
            Six spots along the Isla Vista coastline, from the social scene on DP
            to secluded bluffs at Coal Oil Point. All west-facing, all free.
          </p>
        </motion.div>
      )}

      {/* Map + Detail panel */}
      <motion.div
        className={bare ? "grid flex-1 grid-rows-[1fr_auto] gap-3 p-4 pt-3 lg:grid-cols-[1fr_280px] lg:grid-rows-[1fr]" : "grid gap-4 lg:min-h-[460px] lg:grid-cols-[1fr_340px]"}
        initial={bare ? false : { opacity: 0, y: 22 }}
        whileInView={bare ? undefined : { opacity: 1, y: 0 }}
        viewport={bare ? undefined : { once: true, amount: 0.15 }}
        transition={bare ? undefined : { duration: 0.55, delay: 0.1 }}
      >
        {/* ---- Interactive Map ---- */}
        <div className={bare ? "relative min-h-[200px] overflow-hidden rounded-2xl border border-white/10" : "relative aspect-[2/1] overflow-hidden rounded-3xl border border-white/10 lg:aspect-auto"}>
          <SunsetMap
            spots={mapPins}
            selected={selected}
            hovered={hovered}
            onSelect={handleSelect}
            onHover={setHovered}
          />

          {/* Cinematic overlays (pointer‑events: none) */}
          <div className="pointer-events-none absolute inset-0 z-[500] rounded-3xl shadow-[inset_0_0_80px_rgba(4,6,16,0.45)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-10 rounded-t-3xl bg-gradient-to-b from-[#040610]/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] h-8 rounded-b-3xl bg-gradient-to-t from-[#040610]/30 to-transparent" />
        </div>

        {/* ---- Detail Panel ---- */}
        <div className="relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] lg:min-h-0">
          <AnimatePresence mode="wait">
            {spot ? (
              /* ---------- Selected spot ---------- */
              <motion.div
                key={spot.name}
                className="flex flex-1 flex-col"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.28 }}
              >
                {/* Gradient sky header */}
                <div
                  className="relative h-28 shrink-0 overflow-hidden"
                  style={{ background: spot.gradient }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(4,6,16,0.35), transparent 60%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="absolute bottom-2.5 left-[52%] h-3 w-3 rounded-full bg-amber-200/70 blur-[2px]" />
                  <span className="absolute bottom-3 left-[52%] h-2 w-2 rounded-full bg-amber-100/90" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {spot.name}
                      </h3>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-white/50">
                        <Footprints className="h-3 w-3" />
                        {spot.walkMin} min walk from campus
                      </p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                      <spot.Icon className="h-4 w-4 text-white/50" />
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-white/60">
                    {spot.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {spot.vibe.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Directions */}
                  <div className="mt-auto pt-2">
                    <a
                      href={directionsUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs text-white/70 transition hover:bg-white/[0.1] hover:text-white/90"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Get walking directions
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ---------- Legend / spot list ---------- */
              <motion.div
                key="legend"
                className="flex flex-1 flex-col justify-center p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <p className="mb-1 text-xs uppercase tracking-[0.14em] text-white/40">
                  Tap a spot on the map
                </p>
                <p className="mb-5 text-[11px] text-white/25">
                  or pick from the list below
                </p>

                <div className="space-y-1">
                  {spots.map((s, i) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelected(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background: s.accent,
                          boxShadow: `0 0 6px ${s.accent}66`,
                        }}
                      />
                      <span className="text-sm text-white/55 transition group-hover:text-white/85">
                        {s.name}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-white/25 transition group-hover:text-white/45">
                        <Footprints className="h-3 w-3" />
                        {s.walkMin}m
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
