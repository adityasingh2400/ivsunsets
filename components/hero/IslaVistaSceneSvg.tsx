"use client";

import { useEffect, useMemo, useState } from "react";
import sceneAsset from "@/isla-vista-scene.svg";

interface Props {
  className?: string;
  layer?: "full" | "base" | "bluff";
}

interface SceneMarkup {
  defs: string;
  reflections: string;
  distantCoast: string;
  oceanBase: string;
  bluff: string;
  linework: string;
}

const REFLECTION_END = 36;
const COAST_START = 37;
const COAST_END = 40;
const OCEAN_BASE_PATH_INDEX = 66;
const HORIZON_LINE_PATH = "M666 688.5H1224.5";
const COAST_FILLS: Record<number, string> = {
  37: "var(--iv-coast-shadow)",
  38: "var(--iv-coast-mid)",
  39: "var(--iv-coast-light)",
  40: "var(--iv-coast-rim)",
};

function parseScene(svgText: string): SceneMarkup {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const defs = doc.querySelector("defs")?.innerHTML ?? "";
  const paths = Array.from(doc.querySelectorAll("path"));
  const lineworkIndices = new Set<number>([41, paths.length - 1]);

  const groups: SceneMarkup = {
    defs,
    reflections: "",
    distantCoast: "",
    oceanBase: "",
    bluff: "",
    linework: "",
  };

  paths.forEach((path, index) => {
    const next = path.cloneNode(true) as SVGPathElement;
    const rawD = next.getAttribute("d") ?? "";
    const withoutHorizonVector = rawD
      .replace(/M634\.5 688\.5H1224\.5L1223 689/g, "")
      .replace(/M634\.5 688\.5H1224\.5/g, "");

    if (lineworkIndices.has(index)) {
      if (withoutHorizonVector !== rawD) {
        next.setAttribute("d", withoutHorizonVector);
      }
      next.setAttribute("stroke", "var(--iv-linework)");
      if (next.hasAttribute("fill")) {
        next.setAttribute("fill", "none");
      }
      next.setAttribute("opacity", "0.48");
      groups.linework += next.outerHTML;
      return;
    }

    if (index <= REFLECTION_END) {
      groups.reflections += next.outerHTML;
      return;
    }

    if (index >= COAST_START && index <= COAST_END) {
      next.setAttribute("fill", COAST_FILLS[index] ?? "var(--iv-coast-mid)");
      next.setAttribute("opacity", index === COAST_END ? "0.96" : "0.9");
      groups.distantCoast += next.outerHTML;
      return;
    }

    if (index === OCEAN_BASE_PATH_INDEX) {
      next.setAttribute("fill", "var(--iv-ocean-fill)");
      next.setAttribute("opacity", "0.92");
      groups.oceanBase += next.outerHTML;
      return;
    }

    groups.bluff += next.outerHTML;
  });

  return groups;
}

export function IslaVistaSceneSvg({ className, layer = "full" }: Props) {
  const [markup, setMarkup] = useState<SceneMarkup | null>(null);

  useEffect(() => {
    let alive = true;

    fetch(sceneAsset.src)
      .then((res) => res.text())
      .then((raw) => {
        if (!alive) return;
        setMarkup(parseScene(raw));
      })
      .catch(() => {
        if (!alive) return;
        setMarkup(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const content = useMemo(() => {
    if (!markup) return null;
    const renderBase = layer === "full" || layer === "base";
    const renderBluff = layer === "full" || layer === "bluff";

    return (
      <>
        <defs dangerouslySetInnerHTML={{ __html: markup.defs }} />
        {renderBase && (
          <>
            <g className="iv-reflection-geometry" dangerouslySetInnerHTML={{ __html: markup.reflections }} />
            <g className="iv-coast-geometry" dangerouslySetInnerHTML={{ __html: markup.distantCoast }} />
            <g className="iv-horizon-geometry">
              <path
                d={HORIZON_LINE_PATH}
                fill="none"
                stroke="var(--iv-linework)"
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.34"
              />
            </g>
            <g className="iv-ocean-geometry" dangerouslySetInnerHTML={{ __html: markup.oceanBase }} />
          </>
        )}
        {renderBluff && (
          <>
            <g className="iv-bluff-geometry" dangerouslySetInnerHTML={{ __html: markup.bluff }} />
            <g className="iv-linework-geometry" dangerouslySetInnerHTML={{ __html: markup.linework }} />
          </>
        )}
      </>
    );
  }, [layer, markup]);

  return (
    <svg
      className={className}
      viewBox="0 0 1928 1088"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

