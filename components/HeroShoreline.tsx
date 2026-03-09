"use client";

import { curveCatmullRom, line } from "d3-shape";

export interface ShorelinePalette {
  top: string;
  mid: string;
  horizon: string;
  sunColor: string;
  sunGlow: string;
  sunSize: number;
  sunBlur: number;
  glowOpacity: number;
}

type Point = [number, number];

const VIEWBOX = { width: 1600, height: 900 };
const curve = curveCatmullRom.alpha(0.5);
const pathBuilder = line<Point>()
  .x((point) => point[0])
  .y((point) => point[1])
  .curve(curve);

function areaPath(points: Point[], bottom = VIEWBOX.height) {
  const path = pathBuilder(points);
  if (!path) return "";

  const start = points[0];
  const end = points[points.length - 1];
  return `${path} L ${end[0]} ${bottom} L ${start[0]} ${bottom} Z`;
}

function ribbonPath(top: Point[], bottom: Point[]) {
  const topPath = pathBuilder(top);
  const bottomPath = pathBuilder([...bottom].reverse());

  if (!topPath || !bottomPath) return "";

  return `${topPath} ${bottomPath.replace(/^M/, "L")} Z`;
}

function strokePath(points: Point[]) {
  return pathBuilder(points) ?? "";
}

function bandPoints(y: number, amplitude: number, start: number, end: number, phase: number) {
  const count = 8;
  const points: Point[] = [];

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const x = start + (end - start) * t;
    const wobble = Math.sin(t * Math.PI * 1.8 + phase) * amplitude;
    const drift = Math.cos(t * Math.PI * 3 + phase * 0.6) * amplitude * 0.25;
    points.push([x, y + wobble + drift]);
  }

  return points;
}

const oceanTop: Point[] = [
  [0, 542],
  [220, 548],
  [520, 551],
  [820, 547],
  [1098, 538],
  [1365, 524],
  [1600, 512],
];

const hazeRidge: Point[] = [
  [0, 525],
  [230, 518],
  [520, 508],
  [835, 504],
  [1168, 509],
  [1600, 518],
];

const rightCoastBack: Point[] = [
  [1046, 533],
  [1174, 522],
  [1318, 507],
  [1458, 490],
  [1600, 486],
];

const rightCoastFront: Point[] = [
  [1118, 560],
  [1230, 545],
  [1360, 523],
  [1486, 500],
  [1600, 494],
];

const leftBluffSilhouette: Point[] = [
  [0, 514],
  [92, 496],
  [188, 474],
  [282, 452],
  [356, 458],
  [420, 488],
  [478, 548],
  [536, 631],
  [594, 728],
  [650, 823],
  [706, 900],
];

const leftBluffFace: Point[] = [
  [0, 618],
  [82, 582],
  [170, 548],
  [252, 526],
  [318, 529],
  [376, 557],
  [432, 622],
  [482, 706],
  [524, 800],
  [560, 900],
];

const leftRidgeOneTop: Point[] = [
  [18, 650],
  [106, 615],
  [194, 582],
  [276, 564],
  [346, 572],
  [404, 612],
  [454, 676],
];

const leftRidgeOneBottom: Point[] = [
  [8, 706],
  [100, 672],
  [194, 642],
  [282, 626],
  [356, 638],
  [420, 684],
  [474, 754],
];

const leftRidgeTwoTop: Point[] = [
  [74, 734],
  [164, 704],
  [252, 678],
  [332, 676],
  [396, 704],
  [450, 750],
];

const leftRidgeTwoBottom: Point[] = [
  [56, 792],
  [150, 760],
  [246, 734],
  [336, 734],
  [408, 766],
  [466, 818],
];

const leftRidgeThreeTop: Point[] = [
  [30, 784],
  [118, 756],
  [204, 736],
  [286, 736],
  [354, 758],
  [408, 798],
];

const leftRidgeThreeBottom: Point[] = [
  [16, 848],
  [110, 820],
  [204, 804],
  [292, 806],
  [366, 832],
  [428, 876],
];

const leftCapTop: Point[] = [
  [16, 580],
  [98, 577],
  [176, 570],
  [248, 559],
  [308, 544],
  [354, 524],
];

const leftCapBottom: Point[] = [
  [14, 587],
  [100, 584],
  [184, 576],
  [256, 564],
  [318, 547],
  [360, 528],
];

const horizonBandYs = [544, 560];
const surfaceBandConfig = [
  { y: 592, amplitude: 3.8, start: 228, end: 1496, opacity: 0.12, width: 1.6 },
  { y: 626, amplitude: 5.2, start: 238, end: 1482, opacity: 0.11, width: 1.5 },
  { y: 666, amplitude: 6, start: 250, end: 1462, opacity: 0.1, width: 1.4 },
  { y: 712, amplitude: 7, start: 266, end: 1438, opacity: 0.09, width: 1.35 },
];

const reflectionBands = [
  { y: 584, amplitude: 2.6, opacity: 0.18 },
  { y: 628, amplitude: 3.2, opacity: 0.15 },
  { y: 684, amplitude: 3.8, opacity: 0.12 },
  { y: 748, amplitude: 4.2, opacity: 0.1 },
];

export function HeroShoreline({ palette }: { palette: ShorelinePalette }) {
  const oceanArea = areaPath(oceanTop);
  const hazeArea = areaPath(hazeRidge, 566);
  const rightBackArea = areaPath(rightCoastBack, 590);
  const rightFrontArea = areaPath(rightCoastFront, 614);
  const leftBluffArea = areaPath(leftBluffSilhouette);
  const leftFaceArea = areaPath(leftBluffFace);
  const leftRidgeOneArea = ribbonPath(leftRidgeOneTop, leftRidgeOneBottom);
  const leftRidgeTwoArea = ribbonPath(leftRidgeTwoTop, leftRidgeTwoBottom);
  const leftRidgeThreeArea = ribbonPath(leftRidgeThreeTop, leftRidgeThreeBottom);
  const leftCapArea = ribbonPath(leftCapTop, leftCapBottom);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shore-ocean-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(104,111,156,0.28)" />
            <stop offset="36%" stopColor="rgba(49,63,116,0.5)" />
            <stop offset="70%" stopColor="rgba(12,27,76,0.92)" />
            <stop offset="100%" stopColor="rgba(2,8,24,1)" />
          </linearGradient>
          <linearGradient id="shore-left-bluff" x1="4%" y1="10%" x2="72%" y2="96%">
            <stop offset="0%" stopColor="#171926" />
            <stop offset="48%" stopColor="#080d19" />
            <stop offset="100%" stopColor="#030711" />
          </linearGradient>
          <linearGradient id="shore-left-face" x1="0%" y1="8%" x2="78%" y2="92%">
            <stop offset="0%" stopColor="rgba(123,90,66,0.98)" />
            <stop offset="46%" stopColor="rgba(96,74,59,0.98)" />
            <stop offset="100%" stopColor="rgba(35,31,39,1)" />
          </linearGradient>
          <linearGradient id="shore-left-ridge-one" x1="0%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="rgba(98,74,59,1)" />
            <stop offset="100%" stopColor="rgba(55,45,44,1)" />
          </linearGradient>
          <linearGradient id="shore-left-ridge-two" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(74,58,51,1)" />
            <stop offset="100%" stopColor="rgba(34,31,37,1)" />
          </linearGradient>
          <linearGradient id="shore-left-ridge-three" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(53,45,43,1)" />
            <stop offset="100%" stopColor="rgba(20,20,28,1)" />
          </linearGradient>
          <linearGradient id="shore-cap-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(48,64,49,1)" />
            <stop offset="62%" stopColor="rgba(61,76,56,0.98)" />
            <stop offset="100%" stopColor="rgba(73,84,60,0.94)" />
          </linearGradient>
          <linearGradient id="shore-right-back" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(97,96,121,0.26)" />
            <stop offset="100%" stopColor="rgba(45,48,74,0.12)" />
          </linearGradient>
          <linearGradient id="shore-right-front" x1="0%" y1="0%" x2="100%" y2="92%">
            <stop offset="0%" stopColor="rgba(62,66,94,0.58)" />
            <stop offset="100%" stopColor="rgba(16,20,37,0.9)" />
          </linearGradient>
          <linearGradient id="shore-horizon-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,214,182,0)" />
            <stop offset="46%" stopColor="rgba(255,214,182,0.14)" />
            <stop offset="50%" stopColor="rgba(255,228,204,0.26)" />
            <stop offset="54%" stopColor="rgba(255,214,182,0.14)" />
            <stop offset="100%" stopColor="rgba(255,214,182,0)" />
          </linearGradient>
          <filter id="shore-haze-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="shore-reflection-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id="shore-ocean-clip">
            <path d={oceanArea} />
          </clipPath>
          <clipPath id="shore-left-face-clip">
            <path d={leftFaceArea} />
          </clipPath>
        </defs>

        <path
          d={hazeArea}
          fill={`rgba(255,212,184,${Math.min(0.08, palette.glowOpacity * 0.22)})`}
          filter="url(#shore-haze-blur)"
          className="shoreline-haze"
        />
        <path d={rightBackArea} fill="url(#shore-right-back)" />
        <path d={rightFrontArea} fill="url(#shore-right-front)" />

        <path d={oceanArea} fill="url(#shore-ocean-fill)" />
        {horizonBandYs.map((y, index) => (
          <path
            key={`horizon-band-${y}`}
            d={strokePath(bandPoints(y, 1.8 + index, 250, 1560, index * 0.7))}
            stroke="url(#shore-horizon-ribbon)"
            strokeWidth={index === 0 ? 5 : 3}
            opacity={index === 0 ? 0.88 : 0.52}
            fill="none"
          />
        ))}

        <g clipPath="url(#shore-ocean-clip)">
          <rect
            x="0"
            y="542"
            width="1600"
            height="358"
            fill="rgba(255,255,255,0.015)"
            className="shoreline-water-sheen"
          />
          {surfaceBandConfig.map((band, index) => (
            <path
              key={`surface-band-${band.y}`}
              d={strokePath(bandPoints(band.y, band.amplitude, band.start, band.end, index * 0.55))}
              stroke={index < 2 ? "rgba(255,221,196,0.11)" : "rgba(142,163,236,0.08)"}
              strokeWidth={band.width}
              opacity={band.opacity}
              fill="none"
            />
          ))}
          <g className="shoreline-reflection-shimmer">
            <ellipse cx="734" cy="596" rx="42" ry="10" fill="rgba(255,229,206,0.1)" filter="url(#shore-reflection-blur)" />
            <ellipse cx="738" cy="644" rx="56" ry="13" fill="rgba(255,218,188,0.08)" filter="url(#shore-reflection-blur)" />
            <ellipse cx="742" cy="708" rx="72" ry="18" fill="rgba(255,208,176,0.06)" filter="url(#shore-reflection-blur)" />
            <ellipse cx="748" cy="786" rx="86" ry="23" fill="rgba(255,200,164,0.04)" filter="url(#shore-reflection-blur)" />
            {reflectionBands.map((band, index) => (
              <path
                key={`reflection-band-${band.y}`}
                d={strokePath(bandPoints(band.y, band.amplitude, 696, 786, index * 0.4))}
                stroke={index < 2 ? "rgba(255,228,204,0.2)" : "rgba(177,197,255,0.11)"}
                strokeWidth={1.2 + index * 0.14}
                opacity={band.opacity}
                fill="none"
                filter="url(#shore-reflection-blur)"
              />
            ))}
          </g>
        </g>

        <path d={leftBluffArea} fill="url(#shore-left-bluff)" />
        <path d={leftFaceArea} fill="url(#shore-left-face)" />
        <path d={leftCapArea} fill="url(#shore-cap-fill)" />

        <g clipPath="url(#shore-left-face-clip)">
          <path d={leftRidgeOneArea} fill="url(#shore-left-ridge-one)" />
          <path d={leftRidgeTwoArea} fill="url(#shore-left-ridge-two)" />
          <path d={leftRidgeThreeArea} fill="url(#shore-left-ridge-three)" />
        </g>

        <path
          d={strokePath(leftCapTop)}
          stroke="rgba(186,198,158,0.12)"
          strokeWidth="1.4"
          fill="none"
        />
        <path
          d={strokePath([
            [26, 580],
            [112, 575],
            [198, 565],
            [280, 550],
            [344, 529],
          ])}
          stroke="rgba(255,220,190,0.08)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
}
