/**
 * Shared high-quality canvas rendering primitives for sunset skies.
 * All "amount" / "vibrancy" / "brightness" values are normalised 0-1.
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function seededRng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export { lerpColor };

/* ------------------------------------------------------------------ */
/*  Sky gradient                                                       */
/* ------------------------------------------------------------------ */

export function drawSky(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  v: number,
) {
  const t = clamp01(v);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, lerpColor("#080c18", "#080c28", t));
  g.addColorStop(0.07, lerpColor("#0c1020", "#0e1448", t));
  g.addColorStop(0.16, lerpColor("#12142c", "#1c1862", t));
  g.addColorStop(0.25, lerpColor("#1a1c36", "#38207c", t));
  g.addColorStop(0.34, lerpColor("#22243c", "#642888", t));
  g.addColorStop(0.43, lerpColor("#2c2c3e", "#a42c72", t));
  g.addColorStop(0.52, lerpColor("#363438", "#cc3456", t));
  g.addColorStop(0.60, lerpColor("#3e3838", "#e04838", t));
  g.addColorStop(0.68, lerpColor("#4a4038", "#ec6828", t));
  g.addColorStop(0.76, lerpColor("#564c3c", "#f48820", t));
  g.addColorStop(0.84, lerpColor("#625840", "#f8a818", t));
  g.addColorStop(0.92, lerpColor("#6e6446", "#fcc014", t));
  g.addColorStop(1.00, lerpColor("#7a6e50", "#ffd018", t));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------------------------------------------ */
/*  Sun glow                                                           */
/* ------------------------------------------------------------------ */

export function drawSunGlow(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  brightness: number,
) {
  const b = clamp01(brightness);
  const sunX = w * 0.5;
  const sunY = h * 0.9;

  /* wide atmospheric glow */
  const atmo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.7);
  atmo.addColorStop(0.0, rgba(255, 220, 160, 0.18 * b));
  atmo.addColorStop(0.2, rgba(255, 180, 120, 0.10 * b));
  atmo.addColorStop(0.5, rgba(255, 140, 90, 0.04 * b));
  atmo.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = atmo;
  ctx.fillRect(0, 0, w, h);

  /* warm horizontal band across full horizon */
  const band = ctx.createLinearGradient(0, h * 0.78, 0, h);
  band.addColorStop(0.0, "rgba(0,0,0,0)");
  band.addColorStop(0.3, rgba(255, 180, 120, 0.06 * b));
  band.addColorStop(0.6, rgba(255, 160, 100, 0.10 * b));
  band.addColorStop(0.85, rgba(255, 140, 80, 0.08 * b));
  band.addColorStop(1.0, rgba(255, 120, 60, 0.04 * b));
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);

  /* inner glow — bright core */
  const inner = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.2);
  inner.addColorStop(0.0, rgba(255, 250, 240, 0.65 * b));
  inner.addColorStop(0.2, rgba(255, 225, 175, 0.40 * b));
  inner.addColorStop(0.5, rgba(255, 190, 130, 0.18 * b));
  inner.addColorStop(1.0, "rgba(255,150,90,0)");
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, w, h);

  /* sun disc */
  const r = Math.min(w, h) * 0.024;
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 3);
  disc.addColorStop(0.0, rgba(255, 255, 250, 0.92 * b));
  disc.addColorStop(0.25, rgba(255, 240, 200, 0.60 * b));
  disc.addColorStop(0.55, rgba(255, 200, 140, 0.25 * b));
  disc.addColorStop(1.0, "rgba(255,170,100,0)");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, r * 3, 0, Math.PI * 2);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/*  God rays                                                           */
/* ------------------------------------------------------------------ */

export function drawGodRays(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  v: number, time: number,
) {
  if (v < 0.12) return;
  const sunX = w * 0.5;
  const sunY = h * 0.9;
  const numRays = 11;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < numRays; i++) {
    const baseAngle = -Math.PI / 2 + (i - numRays / 2) * 0.14;
    const angle = baseAngle + Math.sin(time * 0.12 + i * 1.4) * 0.02;
    const rayLen = h * 0.8;
    const spread = 0.028 + Math.sin(i * 2.3 + 0.5) * 0.012;
    const rayAlpha = (0.04 + Math.sin(i * 1.7) * 0.015) * v;

    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(angle - spread) * rayLen, sunY + Math.sin(angle - spread) * rayLen);
    ctx.lineTo(sunX + Math.cos(angle + spread) * rayLen, sunY + Math.sin(angle + spread) * rayLen);
    ctx.closePath();

    const rg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, rayLen);
    rg.addColorStop(0.0, rgba(255, 220, 150, rayAlpha * 1.6));
    rg.addColorStop(0.3, rgba(255, 180, 110, rayAlpha));
    rg.addColorStop(0.7, rgba(255, 140, 80, rayAlpha * 0.4));
    rg.addColorStop(1.0, "rgba(255,100,60,0)");
    ctx.fillStyle = rg;
    ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Stars                                                              */
/* ------------------------------------------------------------------ */

export function drawStars(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  v: number, time: number,
) {
  const alpha = clamp01(1 - v * 1.5) * 0.8;
  if (alpha < 0.04) return;
  const rng = seededRng(999);

  ctx.save();
  for (let i = 0; i < 40; i++) {
    const sx = rng() * w;
    const sy = rng() * h * 0.42;
    const size = 0.4 + rng() * 1.3;
    const twinkle = 0.5 + Math.sin(time * (0.4 + rng() * 0.6) + i * 2.1) * 0.5;
    ctx.fillStyle = rgba(215, 225, 255, alpha * twinkle * (0.3 + rng() * 0.7));
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  High clouds — cirrus wisps                                         */
/* ------------------------------------------------------------------ */

export function drawHighClouds(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  amount: number, v: number, time: number, motionScale: number,
) {
  if (amount < 0.02) return;
  const d = clamp01(amount);
  const count = 6 + Math.floor(d * 12);
  const rng = seededRng(42);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < count; i++) {
    const baseX = rng() * w;
    const baseY = h * (0.06 + rng() * 0.3);
    const drift = Math.sin(time * 0.05 + i * 1.7) * 14 * motionScale;

    /* per-cloud soft glow halo first */
    const haloRx = w * (0.08 + rng() * 0.06);
    const haloRy = h * (0.015 + rng() * 0.01);
    const haloGrad = ctx.createRadialGradient(
      baseX + drift, baseY, 0,
      baseX + drift, baseY, haloRx,
    );
    haloGrad.addColorStop(0.0, rgba(255, 200, 140, d * 0.06 * (0.5 + v)));
    haloGrad.addColorStop(0.5, rgba(255, 170, 110, d * 0.025 * (0.5 + v)));
    haloGrad.addColorStop(1.0, "rgba(255,140,80,0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.ellipse(baseX + drift, baseY, haloRx, haloRy * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 8-12 individual wisps */
    const wispCount = 8 + Math.floor(rng() * 5);
    for (let j = 0; j < wispCount; j++) {
      const cx = baseX + drift + (rng() - 0.5) * w * 0.14;
      const cy = baseY + (rng() - 0.5) * h * 0.018;
      const rx = w * (0.02 + rng() * 0.06);
      const ry = h * (0.0015 + rng() * 0.004);
      const rotation = (rng() - 0.5) * 0.12;
      const a = d * (0.12 + rng() * 0.22) * (0.35 + v * 0.75);

      /* warm lit wisp with bright core */
      const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      wg.addColorStop(0.0, rgba(255, 225, 170, a * 1.1));
      wg.addColorStop(0.3, rgba(255, 195, 135, a * 0.7));
      wg.addColorStop(0.6, rgba(255, 165, 110, a * 0.35));
      wg.addColorStop(1.0, "rgba(255,140,85,0)");

      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Mid clouds — altocumulus clusters                                   */
/* ------------------------------------------------------------------ */

export function drawMidClouds(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  amount: number, v: number, time: number, motionScale: number,
) {
  if (amount < 0.02) return;
  const d = clamp01(amount);
  const count = 4 + Math.floor(d * 8);
  const rng = seededRng(137);

  ctx.save();

  for (let i = 0; i < count; i++) {
    const baseX = rng() * w;
    const baseY = h * (0.34 + rng() * 0.22);
    const drift = Math.sin(time * 0.035 + i * 2.1) * 10 * motionScale;
    const clusterW = w * (0.04 + rng() * 0.06);
    const clusterH = clusterW * (0.5 + rng() * 0.3);

    /* generate circle positions in a dome shape */
    const circles: Array<{ cx: number; cy: number; r: number; row: number }> = [];
    const subCount = 10 + Math.floor(rng() * 5);
    for (let j = 0; j < subCount; j++) {
      const t = j / subCount;
      const row = t < 0.45 ? 0 : t < 0.75 ? 1 : 2;
      const spreadX = (1 - row * 0.25) * clusterW;
      const cx = baseX + drift + (rng() - 0.5) * spreadX * 2;
      const cy = baseY - row * clusterH * 0.3 + (rng() - 0.5) * clusterH * 0.2;
      const r = clusterW * (0.22 + rng() * 0.28) * (1 - row * 0.15);
      circles.push({ cx, cy, r, row });
    }

    /* pass 1: shadow/body layer */
    for (const c of circles) {
      const bodyAlpha = d * (0.10 + rng() * 0.12);
      const g = ctx.createLinearGradient(c.cx, c.cy - c.r, c.cx, c.cy + c.r);
      /* cool shadow on top, warm on bottom */
      g.addColorStop(0.0, rgba(50, 40, 70, bodyAlpha * (0.5 + v * 0.3)));
      g.addColorStop(0.3, rgba(90, 70, 100, bodyAlpha * (0.4 + v * 0.3)));
      g.addColorStop(0.6, rgba(180, 140, 110, bodyAlpha * (0.5 + v * 0.6)));
      g.addColorStop(1.0, rgba(240, 190, 140, bodyAlpha * (0.6 + v * 0.8)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* pass 2: warm bottom-lit glow (screen) */
    ctx.globalCompositeOperation = "screen";
    for (const c of circles) {
      if (c.row > 1) continue; /* only bottom/middle circles get underside glow */
      const glowAlpha = d * (0.08 + rng() * 0.08) * (0.4 + v * 0.8);
      const gg = ctx.createRadialGradient(
        c.cx, c.cy + c.r * 0.4, 0,
        c.cx, c.cy + c.r * 0.4, c.r * 1.2,
      );
      gg.addColorStop(0.0, rgba(255, 200, 130, glowAlpha));
      gg.addColorStop(0.4, rgba(255, 170, 100, glowAlpha * 0.5));
      gg.addColorStop(1.0, "rgba(255,140,80,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy + c.r * 0.3, c.r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    /* pass 3: overall cluster underside bloom */
    ctx.globalCompositeOperation = "screen";
    const bloomAlpha = d * 0.035 * (0.4 + v * 0.8);
    const bloom = ctx.createRadialGradient(
      baseX + drift, baseY + clusterH * 0.3, 0,
      baseX + drift, baseY + clusterH * 0.3, clusterW * 1.5,
    );
    bloom.addColorStop(0.0, rgba(255, 190, 120, bloomAlpha));
    bloom.addColorStop(0.5, rgba(255, 155, 90, bloomAlpha * 0.4));
    bloom.addColorStop(1.0, "rgba(255,120,70,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(baseX + drift - clusterW * 1.5, baseY - clusterH, clusterW * 3, clusterH * 3);
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Low clouds — stratus / marine layer                                */
/* ------------------------------------------------------------------ */

export function drawLowClouds(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  amount: number, time: number, motionScale: number,
) {
  if (amount < 0.02) return;
  const d = clamp01(amount);
  const rng = seededRng(271);
  const bandCount = 2 + Math.floor(d * 4);

  ctx.save();

  /* heavy haze/darkness first — drawn below band tops */
  const hazeTop = h * (0.68 - d * 0.06);
  const haze = ctx.createLinearGradient(0, hazeTop, 0, h);
  haze.addColorStop(0.0, "rgba(6,8,18,0)");
  haze.addColorStop(0.2, rgba(6, 8, 18, d * 0.25));
  haze.addColorStop(0.5, rgba(6, 8, 18, d * 0.55));
  haze.addColorStop(0.8, rgba(6, 8, 18, d * 0.75));
  haze.addColorStop(1.0, rgba(6, 8, 18, d * 0.85));
  ctx.fillStyle = haze;
  ctx.fillRect(0, hazeTop, w, h - hazeTop);

  /* cloud bands */
  for (let i = 0; i < bandCount; i++) {
    const bandY = h * (0.68 + i * 0.055 + rng() * 0.03);
    const bandH = h * (0.025 + d * 0.05 + rng() * 0.02);
    const drift = Math.sin(time * 0.018 + i * 1.9) * 7 * motionScale;
    const bandAlpha = d * (0.55 + rng() * 0.35);

    /* 14-20 blobs for natural irregular edge */
    const blobCount = 14 + Math.floor(d * 6);
    for (let j = 0; j < blobCount; j++) {
      const bx = (j / blobCount) * w * 1.4 - w * 0.2 + drift;
      const by = bandY - bandH * 0.25 * rng();
      const bw = (w / blobCount) * 1.7;
      const bh = bandH * (0.5 + rng() * 0.9);

      const bg = ctx.createLinearGradient(bx, by - bh, bx, by + bh);
      bg.addColorStop(0.0, rgba(16, 18, 32, bandAlpha * 0.5));
      bg.addColorStop(0.2, rgba(10, 14, 26, bandAlpha * 0.8));
      bg.addColorStop(0.6, rgba(8, 10, 22, bandAlpha * 0.95));
      bg.addColorStop(1.0, rgba(6, 8, 18, bandAlpha));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* warm rim-light on top edge of the topmost band */
    if (i === 0 && d > 0.2) {
      ctx.globalCompositeOperation = "screen";
      const rimY = bandY - bandH * 0.4;
      const rim = ctx.createLinearGradient(0, rimY - 3, 0, rimY + 4);
      rim.addColorStop(0.0, "rgba(255,180,120,0)");
      rim.addColorStop(0.4, rgba(255, 170, 110, 0.08 * d));
      rim.addColorStop(0.6, rgba(255, 150, 90, 0.06 * d));
      rim.addColorStop(1.0, "rgba(255,120,70,0)");
      ctx.fillStyle = rim;
      ctx.fillRect(0, rimY - 3, w, 7);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Rain streaks & haze                                                */
/* ------------------------------------------------------------------ */

export function drawRain(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  intensity: number, time: number, motionScale: number,
) {
  const r = clamp01(intensity);
  if (r < 0.08) return;

  ctx.save();

  /* overall haze */
  ctx.fillStyle = rgba(120, 140, 175, r * 0.10);
  ctx.fillRect(0, 0, w, h);

  /* streaks */
  ctx.lineWidth = 1;
  const count = Math.floor(18 + r * 30);
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.5) / count) * w + Math.sin(time * 0.8 + i * 2.3) * 10 * motionScale;
    const y0 = h * (0.12 + (i % 5) * 0.05);
    const len = 16 + (i % 7) * 5;
    ctx.strokeStyle = rgba(180, 200, 230, (0.035 + r * 0.06) * (0.6 + Math.sin(i * 1.3) * 0.4));
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x - 3, y0 + len);
    ctx.stroke();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Horizon haze                                                       */
/* ------------------------------------------------------------------ */

export function drawHorizonHaze(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  v: number,
) {
  const haze = ctx.createLinearGradient(0, h * 0.8, 0, h);
  haze.addColorStop(0.0, "rgba(0,0,0,0)");
  haze.addColorStop(0.4, rgba(255, 200, 150, 0.03 + v * 0.06));
  haze.addColorStop(0.7, rgba(255, 175, 120, 0.04 + v * 0.05));
  haze.addColorStop(1.0, rgba(255, 150, 90, 0.02 + v * 0.03));
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
}
