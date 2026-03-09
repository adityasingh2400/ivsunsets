"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SpotPin {
  name: string;
  accent: string;
  lat: number;
  lng: number;
}

interface SunsetMapProps {
  spots: SpotPin[];
  selected: number | null;
  hovered: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Marker icon                                                       */
/* ------------------------------------------------------------------ */

function createIcon(accent: string): L.DivIcon {
  return L.divIcon({
    className: "sunset-spot-marker",
    html: `
      <div class="spot-marker-wrap" style="--accent:${accent}">
        <span class="spot-pulse"></span>
        <span class="spot-glow"></span>
        <span class="spot-dot"></span>
        <span class="spot-core"></span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SunsetMap({
  spots,
  selected,
  hovered,
  onSelect,
  onHover,
}: SunsetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  /* Stable callback refs so we don't re-init the map on parent re-render */
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [onSelect, onHover]);

  /* ---------- Initialise map once ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [34.41, -119.855],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      maxBounds: [
        [34.38, -119.92],
        [34.44, -119.8],
      ],
      minZoom: 13,
      maxZoom: 17,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    /* Fit all spots into view with padding */
    const bounds = L.latLngBounds(
      spots.map((s) => [s.lat, s.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [55, 55] });

    /* Create markers */
    const markers = spots.map((s, i) => {
      const marker = L.marker([s.lat, s.lng], {
        icon: createIcon(s.accent),
      })
        .addTo(map)
        .bindTooltip(s.name, {
          className: "sunset-tooltip",
          direction: "top",
          offset: [0, -18],
        });

      marker.on("click", () => onSelectRef.current(i));
      marker.on("mouseover", () => onHoverRef.current(i));
      marker.on("mouseout", () => onHoverRef.current(null));

      return marker;
    });

    markersRef.current = markers;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Re-fit map on container resize (card → full-screen) ---------- */
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const prevSizeRef = useRef({ w: 0, h: 0 });
  const refitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map) return;

    const spotBounds = L.latLngBounds(
      spots.map((s) => [s.lat, s.lng] as [number, number]),
    );

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: w, height: h } = entry.contentRect;

      map.invalidateSize({ animate: false });

      /* If the container grew significantly, re-fit bounds to the spots
         area so the map zooms in nicely when the card goes full-screen. */
      const prev = prevSizeRef.current;
      const grew = w > prev.w * 1.3 || h > prev.h * 1.3;
      prevSizeRef.current = { w, h };

      if (grew && selectedRef.current === null) {
        clearTimeout(refitTimerRef.current);
        refitTimerRef.current = setTimeout(() => {
          map.flyToBounds(spotBounds, {
            padding: [60, 60],
            duration: 0.6,
            maxZoom: 15,
          });
        }, 100);
      }
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(refitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Toggle CSS classes on markers ---------- */
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      const el = marker.getElement();
      if (!el) return;
      const wrap = el.querySelector(".spot-marker-wrap");
      if (!wrap) return;
      wrap.classList.toggle("selected", selected === i);
      wrap.classList.toggle("active", hovered === i);
    });
  }, [selected, hovered]);

  /* ---------- Fly to selected spot / back to overview ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selected !== null && spots[selected]) {
      map.flyTo([spots[selected].lat, spots[selected].lng], 16, {
        duration: 0.8,
      });
    } else {
      const bounds = L.latLngBounds(
        spots.map((s) => [s.lat, s.lng] as [number, number]),
      );
      map.flyToBounds(bounds, { padding: [55, 55], duration: 0.8 });
    }
  }, [selected, spots]);

  return <div ref={containerRef} className="h-full w-full" />;
}
