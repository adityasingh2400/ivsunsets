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

  return `${topPath} L ${bottom[bottom.length - 1][0]} ${bottom[bottom.length - 1][1]} ${bottomPath.replace(/^M/, "L ")} Z`;
}

function strokePath(points: Point[]) {
  return pathBuilder(points) ?? "";
}

function wavePoints(y: number, amplitude: number, start = 220, end = 1510, phase = 0) {
  const count = 9;
  const points: Point[] = [];

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const x = start + (end - start) * t;
    const wobble = Math.sin(t * Math.PI * 2 + phase) * amplitude;
    const drift = Math.cos(t * Math.PI * 3 + phase * 0.8) * amplitude * 0.35;
    points.push([x, y + wobble + drift]);
  }

  return points;
}

const oceanTop: Point[] = [
  [0, 520],
  [150, 524],
  [320, 529],
  [520, 533],
  [760, 529],
  [1030, 519],
  [1290, 505],
  [1600, 494],
];

const distantCoast: Point[] = [
  [0, 516],
  [190, 510],
  [420, 503],
  [640, 498],
  [860, 497],
  [1090, 501],
  [1345, 508],
  [1600, 515],
];

const leftBluffSilhouette: Point[] = [
  [0, 505],
  [85, 486],
  [180, 466],
  [274, 446],
  [356, 451],
  [430, 486],
  [510, 558],
  [590, 654],
  [660, 776],
  [725, 900],
];

const leftBluffFace: Point[] = [
  [0, 618],
  [80, 576],
  [165, 542],
  [250, 524],
  [323, 526],
  [380, 565],
  [438, 630],
  [492, 716],
  [538, 812],
  [575, 900],
];

const leftCapTop: Point[] = [
  [16, 580],
  [94, 575],
  [170, 566],
  [246, 551],
  [312, 533],
  [364, 515],
];

const leftCapBottom: Point[] = [
  [14, 594],
  [98, 591],
  [180, 583],
  [256, 568],
  [322, 549],
  [370, 530],
];

const rightHeadland: Point[] = [
  [1145, 560],
  [1240, 543],
  [1350, 521],
  [1460, 498],
  [1545, 480],
  [1600, 482],
];

const rightForeground: Point[] = [
  [1245, 760],
  [1368, 722],
  [1480, 678],
  [1582, 620],
  [1600, 628],
];

const nearWaveYs = [566, 596, 628, 664, 704, 748];
const farWaveYs = [536, 548, 560, 574];

const striationSets: Point[][] = [
  [
    [78, 686],
    [174, 663],
    [278, 638],
    [374, 618],
  ],
  [
    [118, 742],
    [228, 713],
    [340, 683],
    [428, 658],
  ],
  [
    [172, 792],
    [286, 764],
    [398, 734],
    [482, 707],
  ],
];

export function HeroShoreline({ palette }: { palette: ShorelinePalette }) {
  const oceanArea = areaPath(oceanTop);
  const leftBluffArea = areaPath(leftBluffSilhouette);
  const leftFaceArea = areaPath(leftBluffFace);
  const rightHeadlandArea = areaPath(rightHeadland, 610);
  const rightForegroundArea = areaPath(rightForeground);
  const leftCapArea = ribbonPath(leftCapTop, leftCapBottom);
  const reflectionMask = areaPath(
    [
      [678, 538],
      [716, 566],
      [742, 626],
      [758, 706],
      [768, 802],
      [774, 900],
    ],
    900,
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ocean-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(95,102,157,0.28)" />
            <stop offset="34%" stopColor="rgba(40,56,114,0.52)" />
            <stop offset="68%" stopColor="rgba(10,24,68,0.9)" />
            <stop offset="100%" stopColor="rgba(2,8,26,1)" />
          </linearGradient>
          <linearGradient id="reflection-fill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,236,214,0.34)" />
            <stop offset="32%" stopColor="rgba(255,202,154,0.2)" />
            <stop offset="78%" stopColor="rgba(120,149,236,0.08)" />
            <stop offset="100%" stopColor="rgba(120,149,236,0)" />
          </linearGradient>
          <linearGradient id="left-bluff-fill" x1="6%" y1="20%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="rgba(18,22,33,0.98)" />
            <stop offset="44%" stopColor="rgba(7,12,22,0.98)" />
            <stop offset="100%" stopColor="rgba(2,6,14,1)" />
          </linearGradient>
          <linearGradient id="left-face-fill" x1="0%" y1="16%" x2="78%" y2="100%">
            <stop offset="0%" stopColor="rgba(122,91,68,0.88)" />
            <stop offset="40%" stopColor="rgba(88,68,56,0.9)" />
            <stop offset="100%" stopColor="rgba(26,29,38,0.98)" />
          </linearGradient>
          <linearGradient id="left-cap-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(71,104,76,0.96)" />
            <stop offset="58%" stopColor="rgba(112,145,108,0.76)" />
            <stop offset="100%" stopColor="rgba(144,170,130,0.22)" />
          </linearGradient>
          <linearGradient id="right-headland-fill" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="rgba(42,46,74,0.5)" />
            <stop offset="100%" stopColor="rgba(8,12,24,0.9)" />
          </linearGradient>
          <linearGradient id="right-foreground-fill" x1="0%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor="rgba(43,46,64,0.42)" />
            <stop offset="100%" stopColor="rgba(9,11,22,0.95)" />
          </linearGradient>
          <linearGradient id="horizon-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,214,182,0)" />
            <stop offset="46%" stopColor="rgba(255,214,182,0.18)" />
            <stop offset="50%" stopColor="rgba(255,228,204,0.34)" />
            <stop offset="54%" stopColor="rgba(255,214,182,0.18)" />
            <stop offset="100%" stopColor="rgba(255,214,182,0)" />
          </linearGradient>
          <filter id="shore-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="mist-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <clipPath id="ocean-clip">
            <path d={oceanArea} />
          </clipPath>
          <clipPath id="left-face-clip">
            <path d={leftFaceArea} />
          </clipPath>
          <clipPath id="reflection-clip">
            <path d={reflectionMask} />
          </clipPath>
        </defs>

        <path d={oceanArea} fill="url(#ocean-fill)" />
        <path
          d={strokePath(distantCoast)}
          stroke="rgba(205,188,184,0.24)"
          strokeWidth="10"
          fill="none"
          filter="url(#mist-blur)"
        />
        <path d={rightHeadlandArea} fill="url(#right-headland-fill)" opacity="0.96" />
        <path
          d={strokePath(rightHeadland)}
          stroke="rgba(255,219,188,0.08)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d={strokePath(distantCoast)}
          stroke="url(#horizon-ribbon)"
          strokeWidth="5"
          fill="none"
          opacity="0.72"
        />

        <g clipPath="url(#ocean-clip)">
          <rect
            x="0"
            y="520"
            width="1600"
            height="380"
            fill="rgba(255,255,255,0.02)"
            className="shoreline-water-sheen"
          />
          {farWaveYs.map((y, index) => (
            <path
              key={`far-wave-${y}`}
              d={strokePath(wavePoints(y, 4 + index * 0.5, 220, 1580, index * 0.75))}
              stroke={index % 2 === 0 ? "rgba(255,220,190,0.11)" : "rgba(170,190,255,0.08)"}
              strokeWidth={1.4}
              fill="none"
              opacity={0.66 - index * 0.08}
            />
          ))}
          <g className="shoreline-wave-drift">
            {nearWaveYs.map((y, index) => (
              <path
                key={`near-wave-${y}`}
                d={strokePath(wavePoints(y, 7 + index * 1.5, 250, 1520, index * 0.8))}
                stroke={index % 2 === 0 ? "rgba(255,216,180,0.1)" : "rgba(143,168,255,0.08)"}
                strokeWidth={1.2 + index * 0.18}
                fill="none"
                opacity={0.36 - index * 0.03}
              />
            ))}
          </g>
          <g clipPath="url(#reflection-clip)" filter="url(#shore-blur)">
            <rect x="676" y="534" width="104" height="366" rx="52" fill="url(#reflection-fill)" opacity="0.46" />
            {[566, 604, 644, 688, 736, 788].map((y, index) => (
              <path
                key={`reflection-wave-${y}`}
                d={strokePath(wavePoints(y, 4 + index, 676, 792, index * 0.6))}
                stroke={index % 2 === 0 ? "rgba(255,224,194,0.22)" : "rgba(174,193,255,0.14)"}
                strokeWidth={1.1 + index * 0.15}
                fill="none"
                opacity={0.75 - index * 0.08}
              />
            ))}
          </g>
          <ellipse cx="740" cy="626" rx="134" ry="104" fill="rgba(255,194,146,0.05)" filter="url(#mist-blur)" />
        </g>

        <path d={leftBluffArea} fill="url(#left-bluff-fill)" />
        <path d={leftFaceArea} fill="url(#left-face-fill)" />
        <path d={leftCapArea} fill="url(#left-cap-fill)" />

        <g clipPath="url(#left-face-clip)">
          {striationSets.map((points, index) => (
            <path
              key={`striation-${index}`}
              d={strokePath(points)}
              stroke={index === 0 ? "rgba(255,220,192,0.22)" : "rgba(255,220,192,0.14)"}
              strokeWidth={index === 0 ? 2 : 1.25}
              fill="none"
              className="shoreline-striation"
            />
          ))}
          <path
            d={strokePath([
              [54, 640],
              [162, 612],
              [270, 584],
              [356, 556],
            ])}
            stroke="rgba(255,232,210,0.18)"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        <path
          d={strokePath(leftCapTop)}
          stroke="rgba(184,210,168,0.22)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d={strokePath([
            [1300, 807],
            [1412, 783],
            [1524, 758],
            [1600, 744],
          ])}
          stroke="rgba(255,222,192,0.1)"
          strokeWidth="1.5"
          fill="none"
        />
        <path d={rightForegroundArea} fill="url(#right-foreground-fill)" />
        <path
          d={strokePath(rightForeground)}
          stroke="rgba(255,219,188,0.06)"
          strokeWidth="1.6"
          fill="none"
        />
        <ellipse
          cx="740"
          cy="544"
          rx="275"
          ry="28"
          fill={`rgba(255,220,188,${Math.min(0.18, palette.glowOpacity * 0.55)})`}
          filter="url(#mist-blur)"
        />
      </svg>
    </div>
  );
}
