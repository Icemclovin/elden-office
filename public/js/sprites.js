// Shin-AI Tokyo — 3D Modern Japanese Twilight Metropolis Procedural Assets & Building Sprites
// Pure Canvas 2D true-3D projected architecture with zero per-frame shadowBlur and zero
// per-frame createRadialGradient allocations in loops.

export const STATUS_PALETTE = {
  working: {
    main: '#f59e0b',
    bright: '#fde68a',
    deep: '#92400e',
    ring: 'rgba(245, 158, 11, 0.85)',
    label: 'Aan het werk',
  },
  waiting: {
    main: '#ef4444',
    bright: '#fca5a5',
    amber: '#fbbf24',
    deep: '#7f1d1d',
    ring: 'rgba(239, 68, 68, 0.92)',
    label: 'Wacht op mij',
  },
  done: {
    main: '#34d399',
    bright: '#a7f3d0',
    deep: '#065f46',
    ring: 'rgba(52, 211, 153, 0.82)',
    label: 'Klaar',
  },
  sleeping: {
    main: '#64748b',
    bright: '#cbd5e1',
    deep: '#334155',
    ring: 'rgba(100, 116, 139, 0.52)',
    label: 'Slaapt',
  },
};

export const SOURCE_TAGS = {
  claude: 'CLAUDE',
  antigravity: 'AGY',
  hermes: 'HERMES',
  gemini: 'GEMINI',
  demo: 'DEMO',
};

const FONT_UI = '"Inter", "Noto Sans", "Segoe UI", system-ui, -apple-system, sans-serif';
const FONT_MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

export function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function resolveStatus(status) {
  return STATUS_PALETTE[status] ? status : 'sleeping';
}

// ---------------------------------------------------------------------------
// Pre-Baked Offscreen Glow Sprites, Contact Shadow, Dusk Sky & Vignette
// Created ONCE at initialization -> <3ms/frame render budget!
// ---------------------------------------------------------------------------
let cachedAssets = null;

function bakeRadialSprite(size, stops) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, color] of stops) {
    grad.addColorStop(offset, color);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function bakeTwilightBackdrop() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const lin = g.createLinearGradient(0, 0, 0, 256);
  lin.addColorStop(0, '#0e1420');
  lin.addColorStop(0.36, '#162030');
  lin.addColorStop(0.75, '#192434');
  lin.addColorStop(1, '#101824');
  g.fillStyle = lin;
  g.fillRect(0, 0, 256, 256);

  // Subtle warm Tokyo dusk horizon glow near upper center
  const dusk = g.createRadialGradient(128, 38, 12, 128, 52, 175);
  dusk.addColorStop(0, 'rgba(244, 158, 92, 0.16)');
  dusk.addColorStop(0.45, 'rgba(196, 108, 96, 0.08)');
  dusk.addColorStop(1, 'rgba(20, 28, 42, 0)');
  g.fillStyle = dusk;
  g.fillRect(0, 0, 256, 256);
  return c;
}

function bakeVignetteSprite() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, half * 0.48, half, half, half * 1.06);
  grad.addColorStop(0, 'rgba(8, 12, 20, 0)');
  grad.addColorStop(0.74, 'rgba(8, 12, 20, 0.16)');
  grad.addColorStop(1, 'rgba(6, 9, 16, 0.62)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function bakeConcreteGrainTile() {
  const size = 96;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  let seed = 419283;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 380; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const bright = rand() > 0.5;
    g.fillStyle = bright
      ? `rgba(203, 213, 225, ${(0.014 + rand() * 0.022).toFixed(3)})`
      : `rgba(8, 12, 18, ${(0.03 + rand() * 0.045).toFixed(3)})`;
    g.fillRect(x, y, 1 + Math.floor(rand() * 2), 1);
  }
  return c;
}

export function getCityAssets() {
  if (cachedAssets) return cachedAssets;
  cachedAssets = {
    glowTungsten: bakeRadialSprite(128, [
      [0, 'rgba(255, 224, 150, 0.88)'],
      [0.32, 'rgba(245, 174, 66, 0.44)'],
      [0.68, 'rgba(217, 119, 34, 0.14)'],
      [1, 'rgba(217, 119, 34, 0)'],
    ]),
    glowAmber: bakeRadialSprite(128, [
      [0, 'rgba(254, 240, 172, 0.92)'],
      [0.30, 'rgba(245, 158, 11, 0.52)'],
      [0.68, 'rgba(217, 119, 6, 0.16)'],
      [1, 'rgba(217, 119, 6, 0)'],
    ]),
    glowVermilion: bakeRadialSprite(128, [
      [0, 'rgba(255, 220, 184, 0.92)'],
      [0.34, 'rgba(239, 68, 68, 0.58)'],
      [0.70, 'rgba(185, 28, 28, 0.18)'],
      [1, 'rgba(185, 28, 28, 0)'],
    ]),
    glowEmerald: bakeRadialSprite(128, [
      [0, 'rgba(209, 250, 229, 0.90)'],
      [0.34, 'rgba(52, 211, 153, 0.48)'],
      [0.70, 'rgba(16, 185, 129, 0.14)'],
      [1, 'rgba(16, 185, 129, 0)'],
    ]),
    glowCyan: bakeRadialSprite(128, [
      [0, 'rgba(207, 250, 254, 0.84)'],
      [0.36, 'rgba(56, 189, 248, 0.42)'],
      [0.72, 'rgba(14, 165, 233, 0.12)'],
      [1, 'rgba(14, 165, 233, 0)'],
    ]),
    glowMagenta: bakeRadialSprite(128, [
      [0, 'rgba(253, 224, 242, 0.88)'],
      [0.34, 'rgba(244, 114, 182, 0.48)'],
      [0.70, 'rgba(219, 39, 119, 0.14)'],
      [1, 'rgba(219, 39, 119, 0)'],
    ]),
    glowMoon: bakeRadialSprite(128, [
      [0, 'rgba(148, 163, 184, 0.34)'],
      [0.55, 'rgba(71, 85, 105, 0.14)'],
      [1, 'rgba(30, 41, 59, 0)'],
    ]),
    contactShadow: bakeRadialSprite(128, [
      [0, 'rgba(6, 10, 18, 0.68)'],
      [0.52, 'rgba(6, 10, 18, 0.36)'],
      [0.82, 'rgba(6, 10, 18, 0.10)'],
      [1, 'rgba(6, 10, 18, 0)'],
    ]),
    backdrop: bakeTwilightBackdrop(),
    vignette: bakeVignetteSprite(),
    concreteGrain: bakeConcreteGrainTile(),
  };
  return cachedAssets;
}

export function stampSprite(ctx, img, cx, cy, rx, ry, alpha = 1, additive = false) {
  if (alpha <= 0.005 || rx <= 0.5 || ry <= 0.5) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (additive) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3D Geometry Primitives (true perspective projected faces with culling)
// ---------------------------------------------------------------------------
export function fillQuad(ctx, p0, p1, p2, p3, fillStyle, strokeStyle = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(p0.sx, p0.sy);
  ctx.lineTo(p1.sx, p1.sy);
  ctx.lineTo(p2.sx, p2.sy);
  ctx.lineTo(p3.sx, p3.sy);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Draw a true 3D axis-aligned box centered at (cx, cy), spanning z0..z1, half-extents (hx, hy)
// Returns visible vertical faces so callers can paint windows/ribs on them!
export function drawExtrudedBox3D(ctx, project, cx, cy, hx, hy, z0, z1, colors, strokeColor = null, onFace = null) {
  const x0 = cx - hx;
  const x1 = cx + hx;
  const y0 = cy - hy;
  const y1 = cy + hy;

  const b0 = project(x0, y0, z0);
  const b1 = project(x1, y0, z0);
  const b2 = project(x1, y1, z0);
  const b3 = project(x0, y1, z0);

  const t0 = project(x0, y0, z1);
  const t1 = project(x1, y0, z1);
  const t2 = project(x1, y1, z1);
  const t3 = project(x0, y1, z1);

  const faces = [
    { name: 'south', pts: [b3, b2, t2, t3], fill: colors.south, wStart: [x0, y1], wEnd: [x1, y1] },
    { name: 'north', pts: [b1, b0, t0, t1], fill: colors.north, wStart: [x1, y0], wEnd: [x0, y0] },
    { name: 'east', pts: [b2, b1, t1, t2], fill: colors.east, wStart: [x1, y1], wEnd: [x1, y0] },
    { name: 'west', pts: [b0, b3, t3, t0], fill: colors.west, wStart: [x0, y0], wEnd: [x0, y1] },
  ];

  const vis = [];
  for (let i = 0; i < 4; i++) {
    const f = faces[i];
    const [p0, p1, , p3] = f.pts;
    const cross = (p1.sx - p0.sx) * (p3.sy - p0.sy) - (p1.sy - p0.sy) * (p3.sx - p0.sx);
    if (cross < 0) {
      f.depth = (p0.depth + p1.depth) * 0.5;
      vis.push(f);
    }
  }
  vis.sort((a, b) => b.depth - a.depth);

  const lw = Math.max(0.7, 1.0 * b0.scale);
  for (let i = 0; i < vis.length; i++) {
    const f = vis[i];
    fillQuad(ctx, f.pts[0], f.pts[1], f.pts[2], f.pts[3], f.fill, strokeColor, lw);
    if (onFace) onFace(f);
  }

  // Roof face (z = z1)
  if (colors.top) {
    fillQuad(ctx, t0, t1, t2, t3, colors.top, strokeColor, lw);
  }
  return { t0, t1, t2, t3, b0, b1, b2, b3, vis };
}

// Draw a cast dusk shadow polygon stretching toward (+1.1, +0.65) in world floor coords
function drawDuskShadow(ctx, project, cx, cy, hx, hy, height) {
  const dx = Math.min(82, height * 0.52);
  const dy = Math.min(54, height * 0.34);
  const p0 = project(cx - hx, cy + hy, 0.6);
  const p1 = project(cx + hx, cy - hy, 0.6);
  const p2 = project(cx + hx + dx, cy - hy + dy, 0.6);
  const p3 = project(cx + hx + dx, cy + hy + dy, 0.6);
  const p4 = project(cx - hx + dx, cy + hy + dy, 0.6);
  ctx.beginPath();
  ctx.moveTo(p0.sx, p0.sy);
  ctx.lineTo(p1.sx, p1.sy);
  ctx.lineTo(p2.sx, p2.sy);
  ctx.lineTo(p3.sx, p3.sy);
  ctx.lineTo(p4.sx, p4.sy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(6, 10, 18, 0.34)';
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 3D Sakura Tree & Streetlamp (City Growth Props)
// ---------------------------------------------------------------------------
export function drawSakuraTree3D(ctx, project, x, y, scaleFactor = 1, time = 0, phase = 0, reducedMotion = false) {
  const assets = getCityAssets();
  const base = project(x, y, 0);
  const top = project(x, y, 24 * scaleFactor);
  const s = base.scale * scaleFactor;
  if (s <= 0.05) return;

  const sway = reducedMotion ? 0 : Math.sin(time * 1.4 + phase) * 1.6 * s;

  stampSprite(ctx, assets.contactShadow, base.sx + 2 * s, base.sy + 1 * s, 14 * s, 9 * s, 0.55, false);

  // Dark cherry bark trunk
  ctx.strokeStyle = '#3f2c27';
  ctx.lineWidth = Math.max(1.4, 3.0 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.sx, base.sy);
  ctx.lineTo(top.sx + sway * 0.4, top.sy + 4 * s);
  ctx.stroke();

  // Layered twilight cherry blossom canopy puffs
  const cx = top.sx + sway;
  const cy = top.sy - 2 * s;

  ctx.fillStyle = '#b45c7a';
  ctx.beginPath();
  ctx.ellipse(cx - 5 * s, cy + 2 * s, 9.5 * s, 7.2 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 5.5 * s, cy + 2.5 * s, 9 * s, 6.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e789a8';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2 * s, 11 * s, 8.2 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 6 * s, cy - 0.5 * s, 7.2 * s, 5.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbc9d7';
  ctx.beginPath();
  ctx.ellipse(cx - 2 * s, cy - 5 * s, 6.5 * s, 4.4 * s, -0.15, 0, Math.PI * 2);
  ctx.ellipse(cx + 4 * s, cy - 2.5 * s, 4.8 * s, 3.4 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStreetlamp3D(ctx, project, x, y, armDx = 0, armDy = 0) {
  const assets = getCityAssets();
  const base = project(x, y, 0);
  const top = project(x, y, 42);
  const lamp = project(x + armDx * 9, y + armDy * 9, 41);
  const s = base.scale;
  if (s <= 0.05) return;

  // Warm sodium-amber street pool on asphalt
  stampSprite(ctx, assets.glowTungsten, base.sx, base.sy, 38 * s, 24 * s, 0.26, true);

  // Sleek Tokyo graphite steel pole
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = Math.max(1, 2.0 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.sx, base.sy);
  ctx.lineTo(top.sx, top.sy);
  ctx.lineTo(lamp.sx, lamp.sy);
  ctx.stroke();

  // Warm illuminated luminaire head
  stampSprite(ctx, assets.glowTungsten, lamp.sx, lamp.sy, 14 * lamp.scale, 14 * lamp.scale, 0.72, true);
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(lamp.sx, lamp.sy, Math.max(1.2, 2.0 * lamp.scale), 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Permanent 3D Tokyo Buildings (Huis, Flat, Infrastructuur)
// ---------------------------------------------------------------------------
export function drawPermanentBuilding3D(ctx, project, wx, wy, building, state, time, reducedMotion) {
  const assets = getCityAssets();
  const rise = state.rise != null ? state.rise : 1;
  const alpha = state.alpha != null ? state.alpha : 1;
  const celebrateT = state.celebrateT || 0;
  const seed = hashString(building.id || building.name);
  const type = building.buildingType || 'huis';
  const subtype = building.subtype || '';
  const floors = Math.max(1, Math.min(14, Number(building.floors) || (type === 'flat' ? 7 : 2)));

  const baseCenter = project(wx, wy, 0);
  const s = baseCenter.scale;
  if (s <= 0.04) return;

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Selection / Hover / Done-Link Parcel Highlight Rim on the Sidewalk Pad
  if (state.selected || state.hovered || state.isRecentlyDone) {
    const rimColor = state.selected
      ? '#38bdf8'
      : state.isRecentlyDone
        ? '#34d399'
        : 'rgba(248, 250, 252, 0.75)';
    const r0 = project(wx - 52, wy - 52, 2.4);
    const r1 = project(wx + 52, wy - 52, 2.4);
    const r2 = project(wx + 52, wy + 52, 2.4);
    const r3 = project(wx - 52, wy + 52, 2.4);
    fillQuad(ctx, r0, r1, r2, r3, null, rimColor, Math.max(1.4, (state.selected ? 2.4 : 1.7) * s));
  }

  let roofTopZ = 36;

  if (type === 'wolkenkrabber') {
    roofTopZ =
      subtype === 'solar_tower'
        ? drawTokyoSolarTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
        : subtype === 'aoyama_tower'
          ? drawTokyoAoyamaTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
          : drawTokyoSkyscraper3D(ctx, project, wx, wy, subtype, floors, rise, seed, state.cityLevel || 1, time, reducedMotion, assets);
  } else if (type === 'mall') {
    roofTopZ =
      subtype === 'department_store'
        ? drawTokyoDepartmentStore3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
        : subtype === 'night_bazaar'
          ? drawTokyoNightBazaar3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
          : drawTokyoMall3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets);
  } else if (type === 'flat') {
    roofTopZ =
      subtype === 'zen_penthouse' || subtype === 'residence_tower'
        ? drawTokyoResidenceTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
        : drawTokyoFlat3D(ctx, project, wx, wy, subtype, floors, rise, seed, state.cityLevel || 1, time, reducedMotion, assets);
  } else if (type === 'infrastructuur') {
    roofTopZ =
      subtype === 'harbor_lighthouse'
        ? drawTokyoHarborLighthouse3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets)
        : subtype === 'waterfront_market'
          ? drawTokyoWaterfrontMarket3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets)
          : drawTokyoInfra3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets);
  } else {
    roofTopZ =
      subtype === 'townhouse'
        ? drawTokyoTownhouseRow3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
        : subtype === 'zen_garden_home'
          ? drawTokyoZenGardenHome3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets)
          : drawTokyoHouse3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets);
  }

  // Subtle emerald architectural check badge if an active chat has status === 'done' linked to this building
  if (state.isRecentlyDone) {
    const bp = project(wx, wy, roofTopZ + 18);
    const bs = bp.scale;
    stampSprite(ctx, assets.glowEmerald, bp.sx, bp.sy, 22 * bs, 22 * bs, 0.52, true);
    ctx.fillStyle = '#065f46';
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = Math.max(1.2, 1.8 * bs);
    ctx.beginPath();
    ctx.arc(bp.sx, bp.sy, 8.5 * bs, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = Math.max(1.4, 2.0 * bs);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(bp.sx - 3.6 * bs, bp.sy + 0.3 * bs);
    ctx.lineTo(bp.sx - 0.8 * bs, bp.sy + 3.2 * bs);
    ctx.lineTo(bp.sx + 4.2 * bs, bp.sy - 2.8 * bs);
    ctx.stroke();
  }

  // Rising golden-emerald completion celebration shimmer ring!
  if (celebrateT > 0.01) {
    const p = 1 - celebrateT; // 0 -> 1
    const ringZ = 6 + p * (roofTopZ + 38);
    const ringR = 46 + p * 24;
    const ca = Math.sin(celebrateT * Math.PI);
    const topP = project(wx, wy, ringZ);
    stampSprite(ctx, assets.glowEmerald, topP.sx, topP.sy, 64 * topP.scale, 44 * topP.scale, 0.65 * ca, true);

    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const rp = project(wx + Math.cos(a) * ringR, wy + Math.sin(a) * ringR, ringZ);
      if (i === 0) ctx.moveTo(rp.sx, rp.sy);
      else ctx.lineTo(rp.sx, rp.sy);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(110, 231, 183, ${(0.88 * ca).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, 2.6 * topP.scale);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 1. Huis — Japanese Cedar Home / Machiya / Courtyard Home
// ---------------------------------------------------------------------------
function drawTokyoHouse3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const isCourtyard = subtype === 'courtyard_home';
  const isMachiya = subtype === 'machiya';
  const baseH = (26 + Math.min(3, floors) * 9) * rise;
  const hx = isMachiya ? 36 : 33;
  const hy = isMachiya ? 26 : 30;
  const offX = isCourtyard ? -6 : 0;
  const offY = isCourtyard ? -6 : 0;

  // Warm dusk shadow & soft garden yard pad
  drawDuskShadow(ctx, project, wx + offX, wy + offY, hx, hy, baseH + 14 * rise);

  // Subtle Japanese gravel garden yard inside parcel
  fillQuad(
    ctx,
    project(wx - 46, wy - 46, 2.2),
    project(wx + 46, wy - 46, 2.2),
    project(wx + 46, wy + 46, 2.2),
    project(wx - 46, wy + 46, 2.2),
    '#2a323b',
    'rgba(148, 163, 184, 0.16)',
    0.8
  );

  // Main cedar / plaster 3D walls
  const isModernCedar = subtype === 'cedar_house';
  const wallColors = isModernCedar
    ? { south: '#cfc8bc', north: '#9c958a', east: '#b3aba0', west: '#8c857b', top: '#2b3340' }
    : { south: '#b97648', north: '#754628', east: '#995e37', west: '#6a3e22', top: '#2b3340' };

  drawExtrudedBox3D(
    ctx,
    project,
    wx + offX,
    wy + offY,
    hx,
    hy,
    2.2,
    2.2 + baseH,
    wallColors,
    'rgba(17, 23, 34, 0.55)',
    (face) => {
      if (rise < 0.25) return;
      const [sx0, sy0] = face.wStart;
      const [sx1, sy1] = face.wEnd;

      // Cedar lower wainscot band on modern cedar_house
      if (isModernCedar) {
        const w0 = project(sx0, sy0, 2.2);
        const w1 = project(sx1, sy1, 2.2);
        const w2 = project(sx1, sy1, 2.2 + baseH * 0.44);
        const w3 = project(sx0, sy0, 2.2 + baseH * 0.44);
        fillQuad(ctx, w0, w1, w2, w3, '#9a5f38');
      }

      // Glowing warm Shoji paper windows with lattice muntins
      const winCols = isMachiya ? 3 : 2;
      const winRows = floors >= 2 ? 2 : 1;
      for (let r = 0; r < winRows; r++) {
        const wz0 = 2.2 + baseH * (0.16 + r * 0.44);
        const wz1 = 2.2 + baseH * (0.44 + r * 0.42);
        for (let c = 0; c < winCols; c++) {
          const u0 = 0.14 + (c / winCols) * 0.72;
          const u1 = u0 + (0.56 / winCols);
          const lit = ((seed + c * 7 + r * 13) % 5) !== 0;
          const p0 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz0);
          const p1 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz0);
          const p2 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz1);
          const p3 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz1);
          fillQuad(ctx, p0, p1, p2, p3, lit ? '#ffcf77' : '#242e3d', '#3e291b', 0.8);
          if (lit && face.name === 'south' && c === 0 && r === 0) {
            const wc = project(
              sx0 + (sx1 - sx0) * ((u0 + u1) * 0.5),
              sy0 + (sy1 - sy0) * ((u0 + u1) * 0.5),
              (wz0 + wz1) * 0.5
            );
            stampSprite(ctx, assets.glowTungsten, wc.sx, wc.sy, 22 * wc.scale, 18 * wc.scale, 0.34, true);
          }
        }
      }
    }
  );

  // Dark Charcoal Japanese Gabled / Overhanging Eaves Roof
  const roofBaseZ = 2.2 + baseH;
  const ridgeZ = roofBaseZ + 16 * rise;
  const ehx = hx + 6;
  const ehy = hy + 6;

  // Roof eaves overhang plate
  const e0 = project(wx + offX - ehx, wy + offY - ehy, roofBaseZ);
  const e1 = project(wx + offX + ehx, wy + offY - ehy, roofBaseZ);
  const e2 = project(wx + offX + ehx, wy + offY + ehy, roofBaseZ);
  const e3 = project(wx + offX - ehx, wy + offY + ehy, roofBaseZ);
  const rL = project(wx + offX - ehx + 6, wy + offY, ridgeZ);
  const rR = project(wx + offX + ehx - 6, wy + offY, ridgeZ);

  // Back & front pitched tile roof slopes
  fillQuad(ctx, e0, e1, rR, rL, '#252d3a', '#161c25', 1);
  fillQuad(ctx, e3, e2, rR, rL, '#343e4f', '#161c25', 1);
  // Gable end triangles
  ctx.beginPath();
  ctx.moveTo(e1.sx, e1.sy);
  ctx.lineTo(e2.sx, e2.sy);
  ctx.lineTo(rR.sx, rR.sy);
  ctx.closePath();
  ctx.fillStyle = '#2b3342';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(e0.sx, e0.sy);
  ctx.lineTo(e3.sx, e3.sy);
  ctx.lineTo(rL.sx, rL.sy);
  ctx.closePath();
  ctx.fillStyle = '#202733';
  ctx.fill();

  // Crisp roof ridge cap highlight
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = Math.max(1.1, 1.8 * rL.scale);
  ctx.beginPath();
  ctx.moveTo(rL.sx, rL.sy);
  ctx.lineTo(rR.sx, rR.sy);
  ctx.stroke();

  // Tiny glowing Japanese entrance lantern (andon) + courtyard miniature sakura tree
  const lant = project(wx + offX + hx - 8, wy + offY + hy + 5, 11 * rise);
  stampSprite(ctx, assets.glowTungsten, lant.sx, lant.sy, 14 * lant.scale, 14 * lant.scale, 0.56, true);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(lant.sx, lant.sy, Math.max(1.3, 2.2 * lant.scale), 0, Math.PI * 2);
  ctx.fill();

  if (rise > 0.5) {
    const tx = isCourtyard ? wx + 28 : wx - 32;
    const ty = isCourtyard ? wy + 26 : wy + 31;
    drawSakuraTree3D(ctx, project, tx, ty, 0.65 * rise, time, seed * 0.01, reducedMotion);
  }

  return ridgeZ;
}

// ---------------------------------------------------------------------------
// 2. Flat — Modern Tokyo Glass-and-Concrete Apartment Tower (4..12 Floors)
// ---------------------------------------------------------------------------
function drawTokyoFlat3D(ctx, project, wx, wy, subtype, floors, rise, seed, cityLevel, time, reducedMotion, assets) {
  const storyH = 12.2;
  const totalH = (22 + Math.max(4, Math.min(12, floors)) * storyH) * rise;
  const hx = 34;
  const hy = 30;
  const isCedarTower = subtype === 'cedar_tower';
  const isNeonFlat = subtype === 'neon_flat';

  drawDuskShadow(ctx, project, wx, wy, hx, hy, totalH);

  // Paved plaza skirt at base of tower
  fillQuad(
    ctx,
    project(wx - 46, wy - 46, 2.2),
    project(wx + 46, wy - 46, 2.2),
    project(wx + 46, wy + 46, 2.2),
    project(wx - 46, wy + 46, 2.2),
    '#272f3b',
    'rgba(148, 163, 184, 0.18)',
    0.8
  );

  // Main Tower Extrusion (glass curtain walls & architectural concrete ribs)
  const palette = isCedarTower
    ? { south: '#2c3645', north: '#1a212d', east: '#242d3b', west: '#161c26', top: '#3c4654' }
    : isNeonFlat
      ? { south: '#242e40', north: '#161d2b', east: '#1e2738', west: '#131926', top: '#374151' }
      : { south: '#2a3748', north: '#1a2330', east: '#222d3c', west: '#161d28', top: '#475569' };

  const visibleFloors = Math.max(1, Math.round(floors * rise));

  drawExtrudedBox3D(
    ctx,
    project,
    wx,
    wy,
    hx,
    hy,
    2.2,
    2.2 + totalH,
    palette,
    'rgba(15, 23, 42, 0.65)',
    (face) => {
      if (rise < 0.2) return;
      const [sx0, sy0] = face.wStart;
      const [sx1, sy1] = face.wEnd;
      const isLitFace = face.name === 'south' || face.name === 'east';

      // Ground-floor warm illuminated glass lobby
      const lob0 = project(sx0 + (sx1 - sx0) * 0.12, sy0 + (sy1 - sy0) * 0.12, 3.2);
      const lob1 = project(sx0 + (sx1 - sx0) * 0.88, sy0 + (sy1 - sy0) * 0.88, 3.2);
      const lob2 = project(sx0 + (sx1 - sx0) * 0.88, sy0 + (sy1 - sy0) * 0.88, 14.5 * rise);
      const lob3 = project(sx0 + (sx1 - sx0) * 0.12, sy0 + (sy1 - sy0) * 0.12, 14.5 * rise);
      fillQuad(ctx, lob0, lob1, lob2, lob3, isLitFace ? '#f7c974' : '#946e38');

      // Apartment floors: balcony slab lines + warm lit / dark reflective window panes
      const cols = 4;
      for (let f = 0; f < visibleFloors; f++) {
        const fz0 = 2.2 + (18 + f * storyH) * rise;
        const fz1 = fz0 + 7.2 * rise;
        const slabZ = fz0 - 1.4 * rise;

        // Crisp concrete balcony/slab band
        const sl0 = project(sx0, sy0, slabZ);
        const sl1 = project(sx1, sy1, slabZ);
        ctx.strokeStyle = isCedarTower ? '#a87046' : '#5b6778';
        ctx.lineWidth = Math.max(0.8, 1.4 * sl0.scale);
        ctx.beginPath();
        ctx.moveTo(sl0.sx, sl0.sy);
        ctx.lineTo(sl1.sx, sl1.sy);
        ctx.stroke();

        for (let c = 0; c < cols; c++) {
          const u0 = 0.09 + (c / cols) * 0.82;
          const u1 = u0 + 0.145;
          const hVal = (seed + f * 31 + c * 17 + (face.name === 'east' ? 5 : 0)) % 11;
          let winCol = '#16202e';
          if (hVal < 5) winCol = isLitFace ? '#ffd580' : '#cfa052';
          else if (hVal < 7) winCol = isLitFace ? '#ffb75e' : '#a8783e';
          else if (hVal === 7) winCol = '#7dd3fc';

          const w0 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz0);
          const w1 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz0);
          const w2 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz1);
          const w3 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz1);
          fillQuad(ctx, w0, w1, w2, w3, winCol);
        }
      }

      // Subtle architectural accent trim strip (cyan sky-band / coral sign / cedar fin)
      if (isLitFace && rise > 0.65) {
        if (isNeonFlat) {
          const n0 = project(sx0 + (sx1 - sx0) * 0.84, sy0 + (sy1 - sy0) * 0.84, 24 * rise);
          const n1 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, 24 * rise);
          const n2 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, totalH * 0.78);
          const n3 = project(sx0 + (sx1 - sx0) * 0.84, sy0 + (sy1 - sy0) * 0.84, totalH * 0.78);
          fillQuad(ctx, n0, n1, n2, n3, '#fb7185');
        } else if (!isCedarTower) {
          const b0 = project(sx0, sy0, totalH - 1.5);
          const b1 = project(sx1, sy1, totalH - 1.5);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.lineWidth = Math.max(1.1, 1.8 * b0.scale);
          ctx.beginPath();
          ctx.moveTo(b0.sx, b0.sy);
          ctx.lineTo(b1.sx, b1.sy);
          ctx.stroke();
        }
      }
    }
  );

  // Soft warm tungsten glow around tower lobby
  const lobbyGlowP = project(wx, wy + hy + 4, 8);
  stampSprite(ctx, assets.glowTungsten, lobbyGlowP.sx, lobbyGlowP.sy, 40 * lobbyGlowP.scale, 24 * lobbyGlowP.scale, 0.34, true);

  // Rooftop Mechanical Penthouse + Parapet + Aviation Beacon
  const roofZ = 2.2 + totalH;
  if (rise > 0.6) {
    drawExtrudedBox3D(
      ctx,
      project,
      wx - 6,
      wy - 5,
      14,
      12,
      roofZ,
      roofZ + 11 * rise,
      { south: '#475569', north: '#283241', east: '#394455', west: '#222b38', top: '#64748b' },
      'rgba(15, 23, 42, 0.5)'
    );

    // Blinking red aviation beacon on tall towers (or Level 5 Metropolis)
    if (floors >= 7 || cityLevel >= 5) {
      const antBase = project(wx - 6, wy - 5, roofZ + 11 * rise);
      const antTop = project(wx - 6, wy - 5, roofZ + 25 * rise);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1, 1.4 * antBase.scale);
      ctx.beginPath();
      ctx.moveTo(antBase.sx, antBase.sy);
      ctx.lineTo(antTop.sx, antTop.sy);
      ctx.stroke();

      const blink = reducedMotion ? 1 : 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(time * 3.1 + seed), 2);
      stampSprite(ctx, assets.glowVermilion, antTop.sx, antTop.sy, 11 * antTop.scale, 11 * antTop.scale, 0.72 * blink, true);
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(antTop.sx, antTop.sy, Math.max(1.3, 2.1 * antTop.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return roofZ + 14 * rise;
}

// ---------------------------------------------------------------------------
// 2b. Wolkenkrabber — Towering 16..28 Story Tokyo Neon & LED Skyscraper
// ---------------------------------------------------------------------------
function drawTokyoSkyscraper3D(ctx, project, wx, wy, subtype, floors, rise, seed, cityLevel, time, reducedMotion, assets) {
  const storyCount = Math.max(16, Math.min(28, Number(floors) || 20));
  const totalH = (62 + storyCount * 7.4) * rise;
  const t = reducedMotion ? 0 : time;

  const isLedTower = subtype === 'led_tower';
  const isCyberCitadel = subtype === 'cyber_citadel';
  const primaryNeon = isLedTower ? '#fbbf24' : isCyberCitadel ? '#fb7185' : '#38bdf8';
  const secondaryNeon = isLedTower ? '#2dd4bf' : isCyberCitadel ? '#38bdf8' : '#f472b6';
  const glowPrimary = isLedTower ? assets.glowAmber : isCyberCitadel ? assets.glowMagenta : assets.glowCyan;
  const glowSecondary = isLedTower ? assets.glowEmerald : isCyberCitadel ? assets.glowCyan : assets.glowMagenta;

  drawDuskShadow(ctx, project, wx, wy, 38, 34, totalH * 0.9);

  // Illuminated dark granite plaza base
  fillQuad(
    ctx,
    project(wx - 48, wy - 48, 2.2),
    project(wx + 48, wy - 48, 2.2),
    project(wx + 48, wy + 48, 2.2),
    project(wx - 48, wy + 48, 2.2),
    '#202836',
    'rgba(56, 189, 248, 0.32)',
    0.9
  );

  const zTier1 = 2.2 + totalH * 0.58;
  const zTier2 = 2.2 + totalH * 0.84;
  const zTop = 2.2 + totalH;

  const towerPalette = isCyberCitadel
    ? { south: '#1e2638', north: '#111622', east: '#181f30', west: '#0e131e', top: '#313d54' }
    : { south: '#233044', north: '#141c2a', east: '#1c2638', west: '#111824', top: '#3c4b62' };

  const paintSkyscraperFacade = (face, zBot, zRoof, isLowerTier) => {
    if (rise < 0.2) return;
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const isLit = face.name === 'south' || face.name === 'east';
    const bandH = zRoof - zBot;
    const rows = Math.max(3, Math.round(bandH / 12.5));
    const cols = isLowerTier ? 5 : 4;

    // Illuminated double-height lobby on lower tier
    if (isLowerTier) {
      const l0 = project(sx0 + (sx1 - sx0) * 0.1, sy0 + (sy1 - sy0) * 0.1, zBot + 1);
      const l1 = project(sx0 + (sx1 - sx0) * 0.9, sy0 + (sy1 - sy0) * 0.9, zBot + 1);
      const l2 = project(sx0 + (sx1 - sx0) * 0.9, sy0 + (sy1 - sy0) * 0.9, zBot + 15 * rise);
      const l3 = project(sx0 + (sx1 - sx0) * 0.1, sy0 + (sy1 - sy0) * 0.1, zBot + 15 * rise);
      fillQuad(ctx, l0, l1, l2, l3, isLit ? '#fde68a' : '#946e38');
    }

    // Crisp curtain-wall lit window bands
    const startRow = isLowerTier ? 1 : 0;
    for (let r = startRow; r < rows; r++) {
      const wz0 = zBot + (r / rows) * bandH + 2.2 * rise;
      const wz1 = wz0 + Math.min(6.2 * rise, (bandH / rows) * 0.56);
      for (let c = 0; c < cols; c++) {
        const u0 = 0.08 + (c / cols) * 0.84;
        const u1 = u0 + (0.62 / cols);
        const hv = (seed + r * 29 + c * 19 + (face.name === 'east' ? 7 : 0)) % 12;
        let wCol = '#101826';
        if (hv < 5) wCol = isLit ? '#ffd884' : '#b88f48';
        else if (hv < 8) wCol = isLit ? '#7dd3fc' : '#38769c';
        else if (hv === 8) wCol = isLit ? '#f9a8d4' : '#9d4c77';
        const p0 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz0);
        const p1 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz0);
        const p2 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz1);
        const p3 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz1);
        fillQuad(ctx, p0, p1, p2, p3, wCol);
      }
    }

    // Glowing vertical corner LED accent strips
    const led0 = project(sx0, sy0, zBot + 3 * rise);
    const led1 = project(sx0, sy0, zRoof - 2 * rise);
    const led2 = project(sx1, sy1, zBot + 3 * rise);
    const led3 = project(sx1, sy1, zRoof - 2 * rise);
    ctx.strokeStyle = isLit ? primaryNeon : secondaryNeon;
    ctx.lineWidth = Math.max(1.2, 2.0 * led0.scale);
    ctx.beginPath();
    ctx.moveTo(led0.sx, led0.sy);
    ctx.lineTo(led1.sx, led1.sy);
    ctx.moveTo(led2.sx, led2.sy);
    ctx.lineTo(led3.sx, led3.sy);
    ctx.stroke();

    // Animated luminous Tokyo LED facade billboard screen on lower-mid south/east face
    if (isLowerTier && isLit && rise > 0.65) {
      const bZ0 = zBot + bandH * 0.34;
      const bZ1 = zBot + bandH * 0.62;
      const bp0 = project(sx0 + (sx1 - sx0) * 0.16, sy0 + (sy1 - sy0) * 0.16, bZ0);
      const bp1 = project(sx0 + (sx1 - sx0) * 0.84, sy0 + (sy1 - sy0) * 0.84, bZ0);
      const bp2 = project(sx0 + (sx1 - sx0) * 0.84, sy0 + (sy1 - sy0) * 0.84, bZ1);
      const bp3 = project(sx0 + (sx1 - sx0) * 0.16, sy0 + (sy1 - sy0) * 0.16, bZ1);
      fillQuad(ctx, bp0, bp1, bp2, bp3, '#0b1220', primaryNeon, Math.max(1.0, 1.5 * bp0.scale));

      // Pulsing neon graphic bars inside the LED screen
      const pulse = reducedMotion ? 0.8 : 0.6 + 0.4 * Math.sin(t * 2.6 + seed);
      for (let bar = 0; bar < 3; bar++) {
        const frac0 = 0.2 + bar * 0.24;
        const frac1 = frac0 + 0.14;
        const barW = 0.24 + ((bar + Math.floor(t * 1.4 + seed)) % 3) * 0.2;
        const m0 = project(sx0 + (sx1 - sx0) * 0.22, sy0 + (sy1 - sy0) * 0.22, bZ0 + (bZ1 - bZ0) * frac0);
        const m1 = project(sx0 + (sx1 - sx0) * (0.22 + barW), sy0 + (sy1 - sy0) * (0.22 + barW), bZ0 + (bZ1 - bZ0) * frac0);
        const m2 = project(sx0 + (sx1 - sx0) * (0.22 + barW), sy0 + (sy1 - sy0) * (0.22 + barW), bZ0 + (bZ1 - bZ0) * frac1);
        const m3 = project(sx0 + (sx1 - sx0) * 0.22, sy0 + (sy1 - sy0) * 0.22, bZ0 + (bZ1 - bZ0) * frac1);
        fillQuad(ctx, m0, m1, m2, m3, bar === 1 ? secondaryNeon : primaryNeon);
      }

      const bMid = project((sx0 + sx1) * 0.5, (sy0 + sy1) * 0.5, (bZ0 + bZ1) * 0.5);
      stampSprite(ctx, glowPrimary, bMid.sx, bMid.sy, 38 * bMid.scale, 28 * bMid.scale, 0.36 * pulse, true);
    }
  };

  // Tier 1: Lower Tower Base
  drawExtrudedBox3D(ctx, project, wx, wy, 36, 32, 2.2, zTier1, towerPalette, 'rgba(15, 23, 42, 0.7)', (f) =>
    paintSkyscraperFacade(f, 2.2, zTier1, true)
  );
  // Tier 2: Stepped Mid-Tower
  drawExtrudedBox3D(ctx, project, wx, wy, 29, 25, zTier1, zTier2, towerPalette, 'rgba(15, 23, 42, 0.7)', (f) =>
    paintSkyscraperFacade(f, zTier1, zTier2, false)
  );
  // Tier 3: Tapered Illuminated Crown
  const crown = drawExtrudedBox3D(ctx, project, wx, wy, 21, 18, zTier2, zTop, towerPalette, primaryNeon);

  // Glowing horizontal LED crown band around top parapet
  ctx.strokeStyle = secondaryNeon;
  ctx.lineWidth = Math.max(1.5, 2.4 * crown.t0.scale);
  ctx.beginPath();
  ctx.moveTo(crown.t0.sx, crown.t0.sy);
  ctx.lineTo(crown.t1.sx, crown.t1.sy);
  ctx.lineTo(crown.t2.sx, crown.t2.sy);
  ctx.lineTo(crown.t3.sx, crown.t3.sy);
  ctx.closePath();
  ctx.stroke();

  const crownCenter = project(wx, wy, zTop);
  stampSprite(ctx, glowSecondary, crownCenter.sx, crownCenter.sy, 46 * crownCenter.scale, 30 * crownCenter.scale, 0.42, true);

  // Tall illuminated communications spire + blinking red aviation beacon tip
  if (rise > 0.6) {
    const spireTopZ = zTop + 42 * rise;
    const spBase = project(wx, wy, zTop);
    const spMid = project(wx, wy, zTop + 20 * rise);
    const spTop = project(wx, wy, spireTopZ);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(1.8, 3.0 * spBase.scale);
    ctx.beginPath();
    ctx.moveTo(spBase.sx, spBase.sy);
    ctx.lineTo(spMid.sx, spMid.sy);
    ctx.stroke();

    ctx.strokeStyle = primaryNeon;
    ctx.lineWidth = Math.max(1.1, 1.8 * spTop.scale);
    ctx.beginPath();
    ctx.moveTo(spMid.sx, spMid.sy);
    ctx.lineTo(spTop.sx, spTop.sy);
    ctx.stroke();

    const blink = reducedMotion ? 1 : 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 3.4 + seed), 2);
    stampSprite(ctx, assets.glowVermilion, spTop.sx, spTop.sy, 15 * spTop.scale, 15 * spTop.scale, 0.85 * blink, true);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(spTop.sx, spTop.sy, Math.max(1.5, 2.5 * spTop.scale), 0, Math.PI * 2);
    ctx.fill();
    return spireTopZ;
  }

  return zTop;
}

// ---------------------------------------------------------------------------
// 2c. Mall — Grand Multi-Tiered Tokyo Shopping Center & Glass Atrium
// ---------------------------------------------------------------------------
function drawTokyoMall3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const tiers = Math.max(3, Math.min(5, Number(floors) || 4));
  const zTier1 = 2.2 + 24 * rise;
  const zTier2 = 2.2 + (24 + tiers * 6.5) * rise;
  const isGalleria = subtype === 'arcade_galleria';

  drawDuskShadow(ctx, project, wx, wy, 44, 40, zTier2 + 12 * rise);

  // Entrance plaza pavement with warm step edge
  fillQuad(
    ctx,
    project(wx - 49, wy - 49, 2.2),
    project(wx + 49, wy - 49, 2.2),
    project(wx + 49, wy + 49, 2.2),
    project(wx - 49, wy + 49, 2.2),
    '#2f3847',
    'rgba(251, 191, 36, 0.28)',
    0.9
  );

  // Lower wide retail podium with warm illuminated shopfront arcades
  const lowerPal = { south: '#394354', north: '#222a36', east: '#2e3747', west: '#1e2530', top: '#475569' };
  drawExtrudedBox3D(ctx, project, wx, wy, 42, 37, 2.2, zTier1, lowerPal, 'rgba(15, 23, 42, 0.6)', (face) => {
    if (rise < 0.25) return;
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const isLit = face.name === 'south' || face.name === 'east';

    // Wide warm ground-floor glass shopfronts
    for (let s = 0; s < 4; s++) {
      const u0 = 0.06 + s * 0.23;
      const u1 = u0 + 0.18;
      const p0 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, 3.6);
      const p1 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, 3.6);
      const p2 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, 2.2 + 15 * rise);
      const p3 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, 2.2 + 15 * rise);
      fillQuad(ctx, p0, p1, p2, p3, isLit ? '#ffda85' : '#b88b44', '#1e293b', 0.8);
    }

    // Colorful facade LED ticker stripe along top of podium
    const ledZ = zTier1 - 2.6 * rise;
    const colors = isGalleria ? ['#38bdf8', '#2dd4bf', '#fde68a'] : ['#f472b6', '#fbbf24', '#38bdf8'];
    for (let k = 0; k < 3; k++) {
      const u0 = 0.06 + k * 0.3;
      const u1 = u0 + 0.26;
      const l0 = project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, ledZ);
      const l1 = project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, ledZ);
      ctx.strokeStyle = colors[(k + Math.floor(t * 1.2 + seed)) % 3];
      ctx.lineWidth = Math.max(1.6, 2.6 * l0.scale);
      ctx.beginPath();
      ctx.moveTo(l0.sx, l0.sy);
      ctx.lineTo(l1.sx, l1.sy);
      ctx.stroke();
    }
  });

  // Upper gallery floor
  const upperPal = { south: '#2c394d', north: '#1b2433', east: '#253143', west: '#171f2c', top: '#334155' };
  drawExtrudedBox3D(ctx, project, wx, wy, 35, 30, zTier1, zTier2, upperPal, 'rgba(148, 163, 184, 0.35)', (face) => {
    if (rise < 0.3) return;
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const p0 = project(sx0 + (sx1 - sx0) * 0.08, sy0 + (sy1 - sy0) * 0.08, zTier1 + 4 * rise);
    const p1 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, zTier1 + 4 * rise);
    const p2 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, zTier2 - 4 * rise);
    const p3 = project(sx0 + (sx1 - sx0) * 0.08, sy0 + (sy1 - sy0) * 0.08, zTier2 - 4 * rise);
    fillQuad(ctx, p0, p1, p2, p3, face.name === 'south' ? '#fbcf74' : '#64829e', '#38bdf8', 0.8);
  });

  // Faceted Glowing Glass Skylight Atrium Vault on Roof
  const ridgeZ = zTier2 + 13 * rise;
  const a0 = project(wx - 28, wy - 20, zTier2);
  const a1 = project(wx + 28, wy - 20, zTier2);
  const a2 = project(wx + 28, wy + 20, zTier2);
  const a3 = project(wx - 28, wy + 20, zTier2);
  const arL = project(wx - 22, wy, ridgeZ);
  const arR = project(wx + 22, wy, ridgeZ);

  fillQuad(ctx, a0, a1, arR, arL, 'rgba(125, 211, 252, 0.45)', '#e0f2fe', 1.1);
  fillQuad(ctx, a3, a2, arR, arL, 'rgba(253, 224, 150, 0.52)', '#e0f2fe', 1.1);

  const atrMid = project(wx, wy, zTier2 + 6 * rise);
  stampSprite(ctx, assets.glowTungsten, atrMid.sx, atrMid.sy, 46 * atrMid.scale, 30 * atrMid.scale, 0.44, true);

  // Rooftop Neon/LED Marquee Sign Billboard facing south avenue
  if (rise > 0.65) {
    const m0 = project(wx - 22, wy + 29, zTier2 + 1);
    const m1 = project(wx + 22, wy + 29, zTier2 + 1);
    const m2 = project(wx + 22, wy + 29, zTier2 + 14 * rise);
    const m3 = project(wx - 22, wy + 29, zTier2 + 14 * rise);
    fillQuad(ctx, m0, m1, m2, m3, '#111827', '#f472b6', Math.max(1.2, 1.8 * m0.scale));

    const mc = project(wx, wy + 29, zTier2 + 7.5 * rise);
    stampSprite(ctx, isGalleria ? assets.glowCyan : assets.glowMagenta, mc.sx, mc.sy, 32 * mc.scale, 18 * mc.scale, 0.56, true);

    // Bright marquee neon underline
    const l0 = project(wx - 17, wy + 29.4, zTier2 + 6 * rise);
    const l1 = project(wx + 17, wy + 29.4, zTier2 + 6 * rise);
    ctx.strokeStyle = isGalleria ? '#38bdf8' : '#f472b6';
    ctx.lineWidth = Math.max(1.6, 2.8 * l0.scale);
    ctx.beginPath();
    ctx.moveTo(l0.sx, l0.sy);
    ctx.lineTo(l1.sx, l1.sy);
    ctx.stroke();
  }

  // Warm entrance plaza bloom + corner manicured sakura trees
  const ent = project(wx, wy + 40, 6);
  stampSprite(ctx, assets.glowTungsten, ent.sx, ent.sy, 44 * ent.scale, 26 * ent.scale, 0.42, true);
  if (rise > 0.55) {
    drawSakuraTree3D(ctx, project, wx - 40, wy + 40, 0.68 * rise, time, seed, reducedMotion);
    drawSakuraTree3D(ctx, project, wx + 40, wy + 40, 0.68 * rise, time, seed + 1.8, reducedMotion);
  }

  return ridgeZ + 8;
}

// ---------------------------------------------------------------------------
// Iconic AI Hoofdkantoor (HQ) Landmark — Always Present, Clickable & Alive!
// ---------------------------------------------------------------------------
export function getHQLandingPadZ(level = 1) {
  const lv = Math.max(1, Math.min(6, Number(level) || 1));
  return 2.2 + 24 + 54 + lv * 12 + 18;
}

export function drawAIHeadquarters3D(ctx, project, wx, wy, hq, state, time, reducedMotion) {
  const assets = getCityAssets();
  const t = reducedMotion ? 0 : time;
  const lv = Math.max(1, Math.min(6, Number(hq?.level) || 1));
  const activeWorkers = Math.max(0, Number(hq?.activeWorkers) || 0);
  const baseP = project(wx, wy, 0);
  const s = baseP.scale;
  if (s <= 0.04) return;

  const zPodium = 26.2;
  const zShaft = zPodium + 54 + lv * 12;
  const zCrown = zShaft + 18;
  const zSpire = zCrown + 38;

  ctx.save();

  drawDuskShadow(ctx, project, wx, wy, 40, 36, zCrown);

  // Prestigious Granite HQ Campus Plaza with glowing cyan-emerald architectural trim
  const rimCol = state.selected
    ? '#38bdf8'
    : state.hovered
      ? '#a7f3d0'
      : 'rgba(45, 212, 191, 0.62)';
  fillQuad(
    ctx,
    project(wx - 50, wy - 50, 2.2),
    project(wx + 50, wy - 50, 2.2),
    project(wx + 50, wy + 50, 2.2),
    project(wx - 50, wy + 50, 2.2),
    '#202a38',
    rimCol,
    Math.max(1.4, (state.selected ? 2.6 : 1.7) * s)
  );

  // Illuminated Glass Lobby Atrium Podium
  const podPal = { south: '#2b3a4f', north: '#192230', east: '#233044', west: '#161e2b', top: '#475569' };
  drawExtrudedBox3D(ctx, project, wx, wy, 39, 35, 2.2, zPodium, podPal, '#64748b', (face) => {
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const isLit = face.name === 'south' || face.name === 'east';
    const p0 = project(sx0 + (sx1 - sx0) * 0.08, sy0 + (sy1 - sy0) * 0.08, 4);
    const p1 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, 4);
    const p2 = project(sx0 + (sx1 - sx0) * 0.92, sy0 + (sy1 - sy0) * 0.92, zPodium - 4);
    const p3 = project(sx0 + (sx1 - sx0) * 0.08, sy0 + (sy1 - sy0) * 0.08, zPodium - 4);
    fillQuad(ctx, p0, p1, p2, p3, isLit ? '#a5f3fc' : '#38769c', '#2dd4bf', 0.9);
  });

  // Main Stepped Obsidian-Glass & Brushed-Aluminum HQ Tower
  const shaftPal = { south: '#1e2c40', north: '#121a28', east: '#182436', west: '#0f1622', top: '#3b4c63' };
  const floorBands = Math.min(10, 4 + lv);
  const litFloorCount = Math.min(floorBands, 2 + activeWorkers * 2);

  drawExtrudedBox3D(ctx, project, wx, wy, 29, 25, zPodium, zShaft, shaftPal, '#94a3b8', (face) => {
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const isLit = face.name === 'south' || face.name === 'east';
    const bandH = zShaft - zPodium;

    // Warm office floors — more floors light up brightly as more AIs are working!
    for (let f = 0; f < floorBands; f++) {
      const fz0 = zPodium + 4 + (f / floorBands) * (bandH - 8);
      const fz1 = fz0 + Math.min(6, ((bandH - 8) / floorBands) * 0.58);
      const isFloorActive = f < litFloorCount;
      const p0 = project(sx0 + (sx1 - sx0) * 0.12, sy0 + (sy1 - sy0) * 0.12, fz0);
      const p1 = project(sx0 + (sx1 - sx0) * 0.88, sy0 + (sy1 - sy0) * 0.88, fz0);
      const p2 = project(sx0 + (sx1 - sx0) * 0.88, sy0 + (sy1 - sy0) * 0.88, fz1);
      const p3 = project(sx0 + (sx1 - sx0) * 0.12, sy0 + (sy1 - sy0) * 0.12, fz1);
      fillQuad(
        ctx,
        p0,
        p1,
        p2,
        p3,
        isFloorActive ? (isLit ? '#fde68a' : '#c89e4e') : '#162436'
      );
    }

    // Iconic Glowing Cyan-Emerald Vertical Architectural LED Fins along HQ corners
    const f0 = project(sx0, sy0, zPodium + 2);
    const f1 = project(sx0, sy0, zShaft);
    const f2 = project(sx1, sy1, zPodium + 2);
    const f3 = project(sx1, sy1, zShaft);
    ctx.strokeStyle = isLit ? '#38bdf8' : '#2dd4bf';
    ctx.lineWidth = Math.max(1.5, 2.6 * f0.scale);
    ctx.beginPath();
    ctx.moveTo(f0.sx, f0.sy);
    ctx.lineTo(f1.sx, f1.sy);
    ctx.moveTo(f2.sx, f2.sy);
    ctx.lineTo(f3.sx, f3.sy);
    ctx.stroke();
  });

  // Upper Executive Crown + Rooftop Drone Landing Pad
  const crownPal = { south: '#2b3d54', north: '#1a2636', east: '#233247', west: '#16202e', top: '#334155' };
  drawExtrudedBox3D(ctx, project, wx, wy, 20, 18, zShaft, zCrown, crownPal, '#38bdf8');

  // Illuminated Circular Rooftop Drone Landing Pad
  const padC = project(wx, wy, zCrown + 0.6);
  stampSprite(ctx, assets.glowCyan, padC.sx, padC.sy, 32 * padC.scale, 22 * padC.scale, 0.52, true);
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = Math.max(1.2, 1.8 * padC.scale);
  ctx.beginPath();
  ctx.ellipse(padC.sx, padC.sy, 12 * padC.scale, 7.5 * padC.scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Holographic / LED Beacon Spire rising from HQ Crown
  const spB = project(wx - 10, wy - 8, zCrown);
  const spT = project(wx - 10, wy - 8, zSpire);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(1.6, 2.6 * spB.scale);
  ctx.beginPath();
  ctx.moveTo(spB.sx, spB.sy);
  ctx.lineTo(spT.sx, spT.sy);
  ctx.stroke();

  const pulse = reducedMotion ? 0.9 : 0.68 + 0.32 * Math.sin(t * 2.8);
  stampSprite(ctx, assets.glowEmerald, spT.sx, spT.sy, 26 * spT.scale * pulse, 26 * spT.scale * pulse, 0.85, true);
  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath();
  ctx.arc(spT.sx, spT.sy, Math.max(2, 3.4 * spT.scale), 0, Math.PI * 2);
  ctx.fill();

  // Grounded "AI HQ" Architectural Emblem on front atrium parapet
  const signP = project(wx, wy + 35, zPodium - 1);
  if (signP.scale > 0.4) {
    ctx.font = `700 ${Math.max(8, Math.round(9.5 * signP.scale))}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ecfeff';
    ctx.fillText('AI HQ', signP.sx, signP.sy);
  }

  // Warm cyan-amber lobby wash on plaza
  const lobG = project(wx, wy + 36, 6);
  stampSprite(ctx, assets.glowCyan, lobG.sx, lobG.sy, 46 * lobG.scale, 28 * lobG.scale, 0.42, true);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Infrastructuur — Sakura Park, Metro Station, Torii Plaza, Solar Hub
// ---------------------------------------------------------------------------
function drawTokyoInfra3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets) {
  const s = project(wx, wy, 0).scale;

  if (subtype === 'sakura_park') {
    // Lush twilight jade grass lawn
    fillQuad(
      ctx,
      project(wx - 48, wy - 48, 2.2),
      project(wx + 48, wy - 48, 2.2),
      project(wx + 48, wy + 48, 2.2),
      project(wx - 48, wy + 48, 2.2),
      '#264c42',
      '#3c6b5d',
      Math.max(0.8, 1.2 * s)
    );

    // Curved pale granite footpath
    const pathPts = [
      [-44, 34],
      [-14, 16],
      [16, -6],
      [44, -32],
    ];
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(3, 8 * s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < pathPts.length; i++) {
      const p = project(wx + pathPts[i][0], wy + pathPts[i][1], 2.6);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();

    // Reflecting Koi Pond with twilight teal shimmer
    const pond = project(wx - 12, wy - 14, 2.6);
    ctx.fillStyle = '#1b4b5c';
    ctx.strokeStyle = '#476b75';
    ctx.lineWidth = Math.max(0.8, 1.3 * pond.scale);
    ctx.beginPath();
    ctx.ellipse(pond.sx, pond.sy, 22 * pond.scale, 13 * pond.scale, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle golden koi & water shimmer
    ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
    const kx = reducedMotion ? 0 : Math.sin(time * 1.4 + seed) * 5 * pond.scale;
    ctx.beginPath();
    ctx.ellipse(pond.sx + kx, pond.sy, 2.5 * pond.scale, 1.2 * pond.scale, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Warm Japanese stone garden lantern
    const gl = project(wx + 14, wy + 18, 9 * rise);
    stampSprite(ctx, assets.glowTungsten, gl.sx, gl.sy, 22 * gl.scale, 18 * gl.scale, 0.55, true);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(gl.sx, gl.sy, Math.max(1.6, 2.6 * gl.scale), 0, Math.PI * 2);
    ctx.fill();

    // 4 Blooming 3D Sakura Trees sorted by depth
    const trees = [
      { x: wx - 30, y: wy - 26, sc: 1.05 },
      { x: wx + 26, y: wy - 24, sc: 0.95 },
      { x: wx - 26, y: wy + 24, sc: 0.9 },
      { x: wx + 28, y: wy + 22, sc: 1.0 },
    ]
      .map((tr) => ({ ...tr, depth: project(tr.x, tr.y, 0).depth }))
      .sort((a, b) => b.depth - a.depth);
    for (let i = 0; i < trees.length; i++) {
      drawSakuraTree3D(ctx, project, trees[i].x, trees[i].y, trees[i].sc * rise, time, seed + i * 1.7, reducedMotion);
    }
    return 36 * rise;
  }

  if (subtype === 'metro_station') {
    // Sleek Tokyo concrete station plaza
    fillQuad(
      ctx,
      project(wx - 48, wy - 48, 2.2),
      project(wx + 48, wy - 48, 2.2),
      project(wx + 48, wy + 48, 2.2),
      project(wx - 48, wy + 48, 2.2),
      '#323b48',
      '#64748b',
      Math.max(0.8, 1.1 * s)
    );

    // Twin steel metro tracks running through platform
    for (const ty of [-10, 10]) {
      const r0 = project(wx - 46, wy + ty, 3);
      const r1 = project(wx + 46, wy + ty, 3);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.2, 2.0 * s);
      ctx.beginPath();
      ctx.moveTo(r0.sx, r0.sy);
      ctx.lineTo(r1.sx, r1.sy);
      ctx.stroke();
    }

    // Platform concrete concourse & warm glowing entrance kiosk
    drawExtrudedBox3D(
      ctx,
      project,
      wx,
      wy - 24,
      36,
      10,
      2.2,
      2.2 + 16 * rise,
      { south: '#475569', north: '#2b3442', east: '#384354', west: '#252d3a', top: '#64748b' },
      'rgba(15, 23, 42, 0.5)'
    );

    // Steel columns supporting curved glass station canopy
    const canopyZ = 2.2 + 34 * rise;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = Math.max(1.2, 2.2 * s);
    for (const cxOff of [-30, 0, 30]) {
      for (const cyOff of [-22, 22]) {
        const b = project(wx + cxOff, wy + cyOff, 2.4);
        const t = project(wx + cxOff, wy + cyOff, canopyZ);
        ctx.beginPath();
        ctx.moveTo(b.sx, b.sy);
        ctx.lineTo(t.sx, t.sy);
        ctx.stroke();
      }
    }

    // Translucent glass-and-steel station canopy roof
    fillQuad(
      ctx,
      project(wx - 38, wy - 28, canopyZ),
      project(wx + 38, wy - 28, canopyZ),
      project(wx + 38, wy + 28, canopyZ),
      project(wx - 38, wy + 28, canopyZ),
      'rgba(56, 132, 178, 0.58)',
      '#cbd5e1',
      Math.max(1.2, 1.8 * s)
    );

    // Illuminated turquoise & amber Tokyo station signage strip
    const sg0 = project(wx - 36, wy + 28, canopyZ - 2);
    const sg1 = project(wx + 36, wy + 28, canopyZ - 2);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = Math.max(2, 3.2 * s);
    ctx.beginPath();
    ctx.moveTo(sg0.sx, sg0.sy);
    ctx.lineTo(sg1.sx, sg1.sy);
    ctx.stroke();

    const sgMid = project(wx, wy + 26, canopyZ - 6);
    stampSprite(ctx, assets.glowCyan, sgMid.sx, sgMid.sy, 38 * sgMid.scale, 22 * sgMid.scale, 0.46, true);
    return canopyZ + 8;
  }

  if (subtype === 'solar_hub') {
    // Clean modern concrete civic energy terrace
    fillQuad(
      ctx,
      project(wx - 48, wy - 48, 2.2),
      project(wx + 48, wy - 48, 2.2),
      project(wx + 48, wy + 48, 2.2),
      project(wx - 48, wy + 48, 2.2),
      '#2c3542',
      '#475569',
      Math.max(0.8, 1.1 * s)
    );

    // 2x2 angled photovoltaic blue-glass solar arrays
    for (const sxOff of [-22, 22]) {
      for (const syOff of [-22, 18]) {
        const p0 = project(wx + sxOff - 16, wy + syOff + 10, 6 * rise);
        const p1 = project(wx + sxOff + 16, wy + syOff + 10, 6 * rise);
        const p2 = project(wx + sxOff + 16, wy + syOff - 10, 19 * rise);
        const p3 = project(wx + sxOff - 16, wy + syOff - 10, 19 * rise);
        fillQuad(ctx, p0, p1, p2, p3, '#1d4ed8', '#7dd3fc', Math.max(0.8, 1.1 * s));
      }
    }

    // Central glowing turquoise energy core ring
    const core = project(wx, wy, 10 * rise);
    stampSprite(ctx, assets.glowCyan, core.sx, core.sy, 32 * core.scale, 24 * core.scale, 0.56, true);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = Math.max(1.5, 2.4 * core.scale);
    ctx.beginPath();
    ctx.ellipse(core.sx, core.sy, 11 * core.scale, 7 * core.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return 24 * rise;
  }

  // Default / 'torii_plaza' / 'canal_bridge': Modern Japanese Civic Torii Gate Plaza
  fillQuad(
    ctx,
    project(wx - 48, wy - 48, 2.2),
    project(wx + 48, wy - 48, 2.2),
    project(wx + 48, wy + 48, 2.2),
    project(wx - 48, wy + 48, 2.2),
    '#343c48',
    'rgba(203, 213, 225, 0.25)',
    Math.max(0.8, 1.1 * s)
  );

  // Granite ceremonial avenue strip
  fillQuad(
    ctx,
    project(wx - 14, wy - 46, 2.6),
    project(wx + 14, wy - 46, 2.6),
    project(wx + 14, wy + 46, 2.6),
    project(wx - 14, wy + 46, 2.6),
    '#4c5563'
  );

  // Iconic Vermilion Japanese Torii Gate in true 3D!
  const gateH = 44 * rise;
  const pL0 = project(wx - 20, wy, 2.4);
  const pL1 = project(wx - 18, wy, gateH);
  const pR0 = project(wx + 20, wy, 2.4);
  const pR1 = project(wx + 18, wy, gateH);

  // Dark stone pillar pedestals
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(pL0.sx, pL0.sy, Math.max(2.2, 4.2 * pL0.scale), 0, Math.PI * 2);
  ctx.arc(pR0.sx, pR0.sy, Math.max(2.2, 4.2 * pR0.scale), 0, Math.PI * 2);
  ctx.fill();

  // Vermilion Torii columns
  ctx.strokeStyle = '#e04f3e';
  ctx.lineWidth = Math.max(2.4, 4.8 * pL0.scale);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(pL0.sx, pL0.sy);
  ctx.lineTo(pL1.sx, pL1.sy);
  ctx.moveTo(pR0.sx, pR0.sy);
  ctx.lineTo(pR1.sx, pR1.sy);
  ctx.stroke();

  // Lower crossbeam (nuki) & curved upper lintel (kasagi)
  const nL = project(wx - 26, wy, gateH * 0.78);
  const nR = project(wx + 26, wy, gateH * 0.78);
  ctx.strokeStyle = '#e04f3e';
  ctx.lineWidth = Math.max(2, 3.8 * nL.scale);
  ctx.beginPath();
  ctx.moveTo(nL.sx, nL.sy);
  ctx.lineTo(nR.sx, nR.sy);
  ctx.stroke();

  const kL = project(wx - 32, wy, gateH + 3 * rise);
  const kM = project(wx, wy, gateH - 1 * rise);
  const kR = project(wx + 32, wy, gateH + 3 * rise);
  ctx.strokeStyle = '#e04f3e';
  ctx.lineWidth = Math.max(2.8, 5.4 * kM.scale);
  ctx.beginPath();
  ctx.moveTo(kL.sx, kL.sy);
  ctx.quadraticCurveTo(kM.sx, kM.sy, kR.sx, kR.sy);
  ctx.stroke();

  // Dark cap along top of kasagi
  const cL = project(wx - 33, wy, gateH + 5.5 * rise);
  const cM = project(wx, wy, gateH + 1.5 * rise);
  const cR = project(wx + 33, wy, gateH + 5.5 * rise);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(1.5, 2.6 * cM.scale);
  ctx.beginPath();
  ctx.moveTo(cL.sx, cL.sy);
  ctx.quadraticCurveTo(cM.sx, cM.sy, cR.sx, cR.sy);
  ctx.stroke();

  // Warm walkway bollards + flanking sakura trees
  for (const bx of [-16, 16]) {
    const bp = project(wx + bx, wy + 28, 7 * rise);
    stampSprite(ctx, assets.glowTungsten, bp.sx, bp.sy, 16 * bp.scale, 14 * bp.scale, 0.45, true);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(bp.sx, bp.sy, Math.max(1.4, 2.0 * bp.scale), 0, Math.PI * 2);
    ctx.fill();
  }
  drawSakuraTree3D(ctx, project, wx - 32, wy - 24, 0.85 * rise, time, seed, reducedMotion);
  drawSakuraTree3D(ctx, project, wx + 32, wy - 24, 0.85 * rise, time, seed + 2.1, reducedMotion);

  return gateH + 8;
}

// ---------------------------------------------------------------------------
// 4. Extra Building Variants — New Subtypes (Townhouse, Zen Garden, Residence
//    Tower, Solar Tower, Aoyama Tower, Department Store, Night Bazaar,
//    Harbor Lighthouse, Waterfront Market)
// ---------------------------------------------------------------------------

// 3a. Townhouse Row — Rechtsegoing uniten met doorhangende papiere lantaarnstrings
function drawTokyoTownhouseRow3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const unitCount = 3;
  const unitW = 26;
  const unitH = 18;
  const unitGap = 20;
  const span = unitCount * unitW + (unitCount - 1) * unitGap;
  const start = -span / 2 + unitW / 2;
  const baseH = (22 + Math.min(2, Math.max(1, floors)) * 8) * rise;

  drawDuskShadow(ctx, project, wx, wy, span / 2 + 2, unitH * 0.7, baseH + 10 * rise);

  const wallCols = { south: '#7a6656', north: '#5e4d41', east: '#6f5c4a', west: '#5a4a38', top: '#2b3340' };

  for (let i = 0; i < unitCount; i++) {
    const cx = wx + start + i * (unitW + unitGap);
    drawExtrudedBox3D(
      ctx,
      project,
      cx,
      wy,
      unitW / 2,
      unitH / 2,
      2.2,
      2.2 + baseH,
      wallCols,
      'rgba(17, 23, 34, 0.5)',
      (face) => {
        if (rise < 0.3) return;
        const [sx0, sy0] = face.wStart;
        const [sx1, sy1] = face.wEnd;
        if (face.name !== 'south') return;
        // Front shop windows on the warmer south facade
        for (let s = 0; s < 2; s++) {
          const u0 = 0.08 + s * 0.5;
          const u1 = u0 + 0.18;
          const wz0 = 2.2 + baseH * 0.25;
          const wz1 = 2.2 + baseH * 0.55;
          const lit = ((seed + i * 11 + s * 7) % 3) !== 0;
          fillQuad(
            ctx,
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, wz1),
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, wz1),
            lit ? '#ffc77a' : '#3e4351',
            '#2b3340',
            0.7
          );
        }
      }
    );
  }

  // Shared party-wall piers between the row units
  for (let i = 0; i < unitCount - 1; i++) {
    const cx = wx + start + (i + 1) * (unitW + unitGap);
    const h = baseH + 6 * rise;
    for (const off of [-5, 5]) {
      fillQuad(
        ctx,
        project(cx + off - 1.3, wy - 10, 2.2),
        project(cx + off + 1.3, wy - 10, 2.2),
        project(cx + off + 1.3, wy - 10, 2.2 + h),
        project(cx + off - 1.3, wy - 10, 2.2 + h),
        '#6b5c4e'
      );
    }
  }

  // Lively hanging paper-lantern strings between units (soft warm glow, swaying by time)
  for (let i = 1; i < unitCount; i++) {
    const cx = wx + start + i * (unitW + unitGap) - unitW / 2 - unitGap / 2;
    const pp = project(cx, wy, baseH * 0.7);
    const swing = reducedMotion ? 0 : Math.sin(t * 0.8 + seed + i * 2.3) * 2.5 * pp.scale;
    stampSprite(ctx, assets.glowTungsten, pp.sx, pp.sy + swing, 13 * pp.scale, 9 * pp.scale, 0.34, true);
    stampSprite(ctx, assets.glowTungsten, pp.sx, pp.sy + swing, 26 * pp.scale, 17 * pp.scale, 0.17, true);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(pp.sx, pp.sy + swing, Math.max(1.2, 1.9 * pp.scale), 0, Math.PI * 2);
    ctx.fill();
  }

  return baseH;
}

// 3b. Zen Garden Home — Natural cedar & plaster huis met bolwerk, mini koi-vijver & kraagdaken
function drawTokyoZenGardenHome3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const hx = 15;
  const hy = 13;
  const baseH = (30 + Math.min(2, Math.max(1, floors)) * 10) * rise;
  drawDuskShadow(ctx, project, wx, wy, hx, hy, baseH + 6 * rise);

  const pal = { south: '#9aa0a8', north: '#737a82', east: '#8b9298', west: '#6f7681', top: '#b4bdc8' };
  drawExtrudedBox3D(ctx, project, wx, wy, hx, hy, 2.2, 2.2 + baseH, pal, 'rgba(15, 23, 42, 0.5)');

  // Powder-tiled white roof with small white-painted ridge cap
  fillQuad(
    ctx,
    project(wx - 12, wy - 11, 2.2 + baseH),
    project(wx + 12, wy - 11, 2.2 + baseH),
    project(wx + 12, wy + 11, 2.2 + baseH),
    project(wx - 12, wy + 11, 2.2 + baseH),
    '#e4e7ea'
  );
  const rr = project(wx, wy, 2.2 + baseH + 5 * rise);
  ctx.strokeStyle = '#b7bfc5';
  ctx.lineWidth = Math.max(1.1, 2.0 * rr.scale);
  ctx.beginPath();
  ctx.moveTo(rr.sx - 8 * rr.scale, rr.sy);
  ctx.lineTo(rr.sx, rr.sy - 3 * rr.scale);
  ctx.lineTo(rr.sx + 8 * rr.scale, rr.sy);
  ctx.stroke();

  // Mini Maple tree near the roof terrace
  drawSakuraTree3D(ctx, project, wx - 9, wy + 10, 0.85 * rise, t, seed * 0.7, reducedMotion);

  // Stone lantern at the front gate
  const l0 = project(wx - 9, wy - 9, 2.2);
  const l1 = project(wx - 9, wy - 9, 10 * rise);
  stampSprite(ctx, assets.glowTungsten, l1.sx, l1.sy, 16 * l1.scale, 14 * l1.scale, 0.5, true);
  ctx.strokeStyle = '#3f2c27';
  ctx.lineWidth = Math.max(1.4, 2.6 * l0.scale);
  ctx.beginPath();
  ctx.moveTo(l0.sx, l0.sy);
  ctx.lineTo(l1.sx, l1.sy);
  ctx.stroke();
  ctx.fillStyle = '#9dc3c0';
  ctx.beginPath();
  ctx.ellipse(l1.sx, l1.sy, 5.5 * l1.scale, 4 * l1.scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Miniature koi pond in front with time shimmer
  const pond = project(wx + 10, wy - 7, 2.2);
  const kx = reducedMotion ? 0 : Math.sin(t * 1.6 + seed) * 3.2 * pond.scale;
  ctx.fillStyle = '#1c5a5a';
  ctx.strokeStyle = '#33626d';
  ctx.lineWidth = Math.max(0.8, 1.3 * pond.scale);
  ctx.beginPath();
  ctx.ellipse(pond.sx + kx, pond.sy, 9 * pond.scale, 6 * pond.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Three flat stone rocks on the garden
  for (let i = 0; i < 3; i++) {
    const rx = wx + 14 + i * 5;
    const ry = wy - 8 + (i % 2 ? 3 : -3);
    const rp = project(rx, ry, 2.4);
    ctx.fillStyle = i % 2 ? '#5a4f44' : '#4a4240';
    ctx.beginPath();
    ctx.ellipse(rp.sx, rp.sy, 5 * rp.scale, 3.5 * rp.scale, -0.2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  return 2.2 + baseH + 7 * rise;
}

// 3c. Residence Tower (Zen Penthouse / Residence Tower) — Concrete brut, hot-pink neon band & rooftop pots
function drawTokyoResidenceTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const storyH = 12.2;
  const totalH = (18 + Math.max(5, Math.min(12, floors)) * storyH) * rise;
  const hx = 30;
  const hy = 27;

  drawDuskShadow(ctx, project, wx, wy, hx, hy, totalH + 6);

  // Plaza skirt
  fillQuad(
    ctx,
    project(wx - 44, wy - 44, 2.2),
    project(wx + 44, wy - 44, 2.2),
    project(wx + 44, wy + 44, 2.2),
    project(wx - 44, wy + 44, 2.2),
    '#2c3440',
    'rgba(249, 132, 142, 0.3)'
  );

  const palette = { south: '#4a5563', north: '#313c48', east: '#3c4857', west: '#2a3240', top: '#586677' };
  const visibleFloors = Math.max(1, Math.round(floors * rise));

  drawExtrudedBox3D(
    ctx,
    project,
    wx,
    wy,
    hx,
    hy,
    2.2,
    2.2 + totalH,
    palette,
    'rgba(15, 23, 42, 0.65)',
    (face) => {
      if (rise < 0.2) return;
      const [sx0, sy0] = face.wStart;
      const [sx1, sy1] = face.wEnd;
      const isLit = face.name === 'south' || face.name === 'east';

      for (let f = 0; f < visibleFloors; f++) {
        const fz0 = 2.2 + (18 + f * storyH) * rise;
        const fz1 = fz0 + 7.2 * rise;
        const slabZ = fz0 - 1.4 * rise;
        const sl0 = project(sx0, sy0, slabZ);
        const sl1 = project(sx1, sy1, slabZ);
        ctx.strokeStyle = '#6b7a89';
        ctx.lineWidth = Math.max(0.8, 1.4 * sl0.scale);
        ctx.beginPath();
        ctx.moveTo(sl0.sx, sl0.sy);
        ctx.lineTo(sl1.sx, sl1.sy);
        ctx.stroke();

        for (let c = 0; c < 3; c++) {
          const u0 = 0.12 + (c / 3) * 0.65;
          const u1 = u0 + 0.15;
          const hv = (seed + f * 23 + c * 11 + (face.name === 'east' ? 4 : 0)) % 9;
          fillQuad(
            ctx,
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz1),
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz1),
            hv < 3 && isLit ? '#f9a8a6' : '#16202e'
          );
        }
      }

      // Hot-pink neon band wrapping the upper third of the tower on the lit faces
      if (isLit && rise > 0.5) {
        const bandZ = 2.2 + totalH * 0.62;
        const b0 = project(sx0, sy0, bandZ);
        const b1 = project(sx1, sy1, bandZ);
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = Math.max(2, 3.2 * b0.scale);
        ctx.beginPath();
        ctx.moveTo(b0.sx, b0.sy);
        ctx.lineTo(b1.sx, b1.sy);
        ctx.stroke();
      }
    }
  );

  // Rooftop garden pots (potted plants for liveness)
  if (rise > 0.6) {
    const nPots = 3;
    for (let i = 0; i < nPots; i++) {
      const px = wx - 14 + (i / (nPots - 1)) * 28;
      const pot = project(px, wy, 2.2 + totalH);
      stampSprite(ctx, assets.glowTungsten, pot.sx, pot.sy, 13 * pot.scale, 12 * pot.scale, 0.4, true);
      ctx.strokeStyle = '#8a94a2';
      ctx.lineWidth = Math.max(1.1, 1.9 * pot.scale);
      ctx.beginPath();
      ctx.arc(pot.sx, pot.sy, 7 * pot.scale, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#4b6635';
      ctx.beginPath();
      ctx.arc(pot.sx, pot.sy, 2.5 * pot.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Hot-pink neon "ZEN" sign above the roof garden
  if (rise > 0.7) {
    const s0 = project(wx, wy, 2.2 + totalH + 16);
    stampSprite(ctx, assets.glowMagenta, s0.sx, s0.sy, 34 * s0.scale, 20 * s0.scale, 0.6, true);
    ctx.fillStyle = '#f1eef8';
    ctx.font = `700 ${Math.max(8, Math.round(9 * s0.scale))}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZEN', s0.sx, s0.sy);
  }

  return 2.2 + totalH + 10;
}

// 3d. Solar Tower — Jade circular solar array with rotating vanes + pulsing energy core
function drawTokyoSolarTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const storyCount = Math.max(10, Math.min(18, Math.floor(floors) || 14));
  const totalH = (60 + storyCount * 6.5) * rise;
  drawDuskShadow(ctx, project, wx, wy, 26, 24, totalH);

  // Radioactive-green solar plaza slab
  fillQuad(
    ctx,
    project(wx - 44, wy - 44, 2.2),
    project(wx + 44, wy - 44, 2.2),
    project(wx + 44, wy + 44, 2.2),
    project(wx - 44, wy + 44, 2.2),
    '#264c42',
    '#4a6a5c',
    0.8
  );

  // Tapered jade solar pole
  ctx.strokeStyle = '#3f918a';
  ctx.lineWidth = Math.max(1.4, 2.2 * project(wx, wy, 2.2).scale);
  ctx.beginPath();
  ctx.moveTo(project(wx, wy, 2.2).sx, project(wx, wy, 2.2).sy);
  ctx.lineTo(project(wx, wy, totalH * 0.8).sx, project(wx, wy, totalH * 0.8).sy);
  ctx.stroke();

  // Disk-shaped solar array with 4 rotating vanes
  const r = 24;
  const zDisk = 2.2 + totalH * 0.35;
  for (let i = 0; i < 4; i++) {
    const ang = t * 0.9 + i * (Math.PI / 2) + seed;
    const va = project(wx + Math.cos(ang) * r * 1.1, wy + Math.sin(ang) * r * 1.1, zDisk);
    const vb = project(wx + Math.cos(ang + 0.5) * r * 1.1, wy + Math.sin(ang + 0.5) * r * 1.1, zDisk + 6 * rise);
    const vc = project(wx + Math.cos(ang + 0.5) * r, wy + Math.sin(ang + 0.5) * r, zDisk + 12 * rise);
    const vd = project(wx + Math.cos(ang) * r, wy + Math.sin(ang) * r, zDisk);
    fillQuad(ctx, va, vb, vc, vd, '#2563eb', '#38bdf8', 0.8);
  }
  const dp = project(wx, wy, zDisk);
  stampSprite(ctx, assets.glowCyan, dp.sx, dp.sy, 46 * dp.scale, 30 * dp.scale, 0.45, true);

  // Pulsing energy core ring at the top
  const pulse = reducedMotion ? 1 : 0.45 + 0.55 * Math.sin(t * 0.9 + seed);
  const core = project(wx, wy, totalH);
  stampSprite(ctx, assets.glowCyan, core.sx, core.sy, 38 * core.scale, 26 * core.scale, 0.55 * pulse, true);
  ctx.fillStyle = '#b2f2bb';
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = Math.max(1.5, 2.4 * core.scale);
  ctx.beginPath();
  ctx.ellipse(core.sx, core.sy, 13 * core.scale, 9 * core.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  return totalH + 8;
}

// 3e. Aoyama Tower (Flat Hot Pink) — Concrete & hot-pink neon strips ("OFFICIAL" sign & pulsing beam)
function drawTokyoAoyamaTower3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const storyH = 12.2;
  const totalH = (18 + Math.max(5, Math.min(12, floors)) * storyH) * rise;
  const hx = 34;
  const hy = 30;

  drawDuskShadow(ctx, project, wx, wy, hx, hy, totalH + 6);

  fillQuad(
    ctx,
    project(wx - 46, wy - 46, 2.2),
    project(wx + 46, wy - 46, 2.2),
    project(wx + 46, wy + 46, 2.2),
    project(wx - 46, wy + 46, 2.2),
    '#2b3241',
    'rgba(244, 114, 182, 0.22)'
  );

  const palette = { south: '#475569', north: '#313c48', east: '#3c4857', west: '#2b3442', top: '#586f8a' };
  drawExtrudedBox3D(
    ctx,
    project,
    wx,
    wy,
    hx,
    hy,
    2.2,
    2.2 + totalH,
    palette,
    'rgba(15, 23, 42, 0.65)',
    (face) => {
      if (rise < 0.2) return;
      const [sx0, sy0] = face.wStart;
      const [sx1, sy1] = face.wEnd;
      const isLit = face.name === 'south' || face.name === 'east';
      const visibleFloors = Math.max(1, Math.round(floors * rise));

      for (let f = 0; f < visibleFloors; f++) {
        const fz0 = 2.2 + (18 + f * storyH) * rise;
        const fz1 = fz0 + 7.2 * rise;
        const slabZ = fz0 - 1.4 * rise;
        const sl0 = project(sx0, sy0, slabZ);
        const sl1 = project(sx1, sy1, slabZ);
        ctx.strokeStyle = '#7a8694';
        ctx.lineWidth = Math.max(0.8, 1.4 * sl0.scale);
        ctx.beginPath();
        ctx.moveTo(sl0.sx, sl0.sy);
        ctx.lineTo(sl1.sx, sl1.sy);
        ctx.stroke();

        for (let c = 0; c < 3; c++) {
          const u0 = 0.1 + (c / 3) * 0.7;
          const u1 = u0 + 0.12;
          const hv = (seed + f * 19 + c * 13 + (face.name === 'west' ? 6 : 0)) % 7;
          fillQuad(
            ctx,
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz0),
            project(sx0 + (sx1 - sx0) * u1, sy0 + (sy1 - sy0) * u1, fz1),
            project(sx0 + (sx1 - sx0) * u0, sy0 + (sy1 - sy0) * u0, fz1),
            isLit ? (hv < 2 ? '#f9a8d4' : '#16202e') : '#0b1320'
          );
        }
      }

      // Hot-pink neon vertical strips on tower corners (pulse with time)
      if (isLit && rise > 0.55) {
        const pulse = reducedMotion ? 0.85 : 0.45 + 0.55 * Math.sin(t * 2.2 + seed);
        const zStrip = 2.2 + totalH * 0.7;
        for (const sx0f of [0.08, 0.92]) {
          for (const sy0f of [0.1, 0.9]) {
            const s0 = project(sx0 + (sx1 - sx0) * sx0f, sy0 + (sy1 - sy0) * sy0f, zStrip);
            const s1 = project(sx0 + (sx1 - sx0) * sx0f, sy0 + (sy1 - sy0) * sy0f, totalH - 1);
            ctx.strokeStyle = `rgba(244, 114, 182, ${(0.3 + 0.2 * pulse).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.5, 2.2 * s0.scale);
            ctx.beginPath();
            ctx.moveTo(s0.sx, s0.sy);
            ctx.lineTo(s1.sx, s1.sy);
            ctx.stroke();
          }
        }
      }
    }
  );

  // Rooftop: starred sign + pulsing neon beam
  if (rise > 0.75) {
    const sk = project(wx, wy, 2.2 + totalH + 14);
    stampSprite(ctx, assets.glowMagenta, sk.sx, sk.sy, 40 * sk.scale, 28 * sk.scale, 0.65, true);
    const beam = project(wx, wy, 2.2 + totalH + 30 * rise);
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = Math.max(1.5, 2.5 * beam.scale);
    ctx.beginPath();
    ctx.moveTo(sk.sx, sk.sy);
    ctx.lineTo(beam.sx, beam.sy);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(8, Math.round(8 * sk.scale))}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OFFICIAL', sk.sx, sk.sy);
  }

  return 2.2 + totalH + 12;
}

// 3f. Department Store — Grand Department Store met Century-style escalator & neonflashstripjes
function drawTokyoDepartmentStore3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const tiers = Math.max(2, Math.min(4, Math.floor(floors) || 3));
  const zTier1 = 2.2 + 16 * rise;
  const zTier2 = 2.2 + (16 + tiers * 7) * rise;

  drawDuskShadow(ctx, project, wx, wy, 48, 44, zTier2 + 10 * rise);

  // Wide plaza
  fillQuad(
    ctx,
    project(wx - 48, wy - 48, 2.2),
    project(wx + 48, wy - 48, 2.2),
    project(wx + 48, wy + 48, 2.2),
    project(wx - 48, wy + 48, 2.2),
    '#2f3847'
  );

  const toRgb = (h) =>
    `rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`;

  const lowerPal = { south: '#3f2929', north: '#2c2634', east: '#3b2d31', west: '#271f26', top: '#475569' };
  drawExtrudedBox3D(ctx, project, wx, wy, 38, 40, 2.2, zTier1, lowerPal, 'rgba(15, 23, 42, 0.6)', (face) => {
    if (rise < 0.3) return;
    const [sx0, sy0] = face.wStart;
    const [sx1, sy1] = face.wEnd;
    const isLit = face.name === 'south' || face.name === 'east';

    // Ground-floor mall shell with beveled entrance awning
    fillQuad(
      ctx,
      project(sx0 + (sx1 - sx0) * 0.05, sy0 + (sy1 - sy0) * 0.05, 3.6),
      project(sx0 + (sx1 - sx0) * 0.95, sy0 + (sy1 - sy0) * 0.95, 3.6),
      project(sx0 + (sx1 - sx0) * 0.95, sy0 + (sy1 - sy0) * 0.95, zTier1 - 3 * rise),
      project(sx0 + (sx1 - sx0) * 0.05, sy0 + (sy1 - sy0) * 0.05, zTier1 - 3 * rise),
      '#552020',
      '#c41e3a',
      1.2
    );

    // Glass atrium centered on the facade
    fillQuad(
      ctx,
      project(sx0 + (sx1 - sx0) * 0.28, sy0 + (sy1 - sy0) * 0.28, zTier1 - 2),
      project(sx0 + (sx1 - sx0) * 0.72, sy0 + (sy1 - sy0) * 0.28, zTier1 - 2),
      project(sx0 + (sx1 - sx0) * 0.72, sy0 + (sy1 - sy0) * 0.72, zTier1 - 2),
      project(sx0 + (sx1 - sx0) * 0.28, sy0 + (sy1 - sy0) * 0.72, zTier1 - 2),
      '#cfe7f7',
      '#7dd3fc',
      0.8
    );

    // Staggered escalator blocks at the atrium base
    const escZ = 2.2 + 4 * rise;
    for (let r = 0; r < 2; r++) {
      for (let q = 0; q < 3; q++) {
        const u = 0.42 + q * 0.2;
        fillQuad(
          ctx,
          project(sx0 + (sx1 - sx0) * u, sy0 + (sy1 - sy0) * 0.45, escZ + r * 5 * rise),
          project(sx0 + (sx1 - sx0) * (u + 0.12), sy0 + (sy1 - sy0) * 0.45, escZ + (r + 1) * 5 * rise),
          project(sx0 + (sx1 - sx0) * (u + 0.12), sy0 + (sy1 - sy0) * 0.35, escZ + (r + 1) * 5 * rise),
          project(sx0 + (sx1 - sx0) * u, sy0 + (sy1 - sy0) * 0.35, escZ + r * 5 * rise),
          '#94a3b8',
          null,
          0.7
        );
      }
    }
  });

  // Upper gallery floor
  drawExtrudedBox3D(ctx, project, wx, wy, 34, 33, zTier1, zTier2, {
    south: '#2c3a52', north: '#1b2637', east: '#253142', west: '#171e2b', top: '#334155',
  }, 'rgba(148, 163, 184, 0.3)');

  // Lively LED flash strip along the lower roof edge (pulses by time)
  if (rise > 0.5) {
    const pulse = reducedMotion ? 0.9 : 0.4 + 0.6 * Math.sin(t * 1.6 + seed);
    const LED_STRIPS = [
      '#fde047', '#f472b6', '#38bdf8', '#fde047', '#2dd4bf', '#fb923c', '#f472b6', '#fde047'
    ];
    for (let k = 0; k < 8; k++) {
      const u0 = 0.02 + k * 0.11;
      const u1 = u0 + 0.085;
      const l0 = project(wx - 15 + u0 * 32, wy + 44, zTier2 - 3 * rise);
      const l1 = project(wx - 15 + u1 * 32, wy + 44, zTier2 - 3 * rise);
      ctx.strokeStyle = `rgba(${toRgb(LED_STRIPS[k]).slice(4, -1)}, ${(0.13 * pulse).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.5, 2.3 * l0.scale);
      ctx.beginPath();
      ctx.moveTo(l0.sx, l0.sy);
      ctx.lineTo(l1.sx, l1.sy);
      ctx.stroke();
    }
    // Neon "OPEN" sign on the roof
    const so = project(wx, wy + 44, zTier2 + 5);
    stampSprite(ctx, assets.glowMagenta, so.sx, so.sy, 34 * so.scale, 20 * so.scale, 0.62, true);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(8, Math.round(9 * so.scale))}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OPEN', so.sx, so.sy);
  }

  // Rooftop neon sign
  if (rise > 0.65) {
    const sign0 = project(wx, wy + 41, zTier2 + 9);
    fillQuad(
      ctx,
      project(wx - 21, wy + 38, zTier2 + 7),
      project(wx + 21, wy + 38, zTier2 + 7),
      project(wx + 21, wy + 44, zTier2 + 16),
      project(wx - 21, wy + 44, zTier2 + 16),
      '#111827',
      '#fb7185'
    );
    stampSprite(ctx, assets.glowMagenta, sign0.sx, sign0.sy, 30 * sign0.scale, 18 * sign0.scale, 0.56, true);
  }

  // Warm entrance plaza bloom
  stampSprite(ctx, assets.glowTungsten, project(wx, wy + 40, 6).sx, project(wx, wy + 40, 6).sy, 44 * project(wx, wy + 40, 6).scale, 26 * project(wx, wy + 40, 6).scale, 0.42, true);

  return zTier2 + 16;
}

// 3g. Night Bazaar — Covered mall with hanging neon lantern strings (lively: animated)
function drawTokyoNightBazaar3D(ctx, project, wx, wy, subtype, floors, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const zAtrium = 2.2 + 26 * rise;
  const zRoof = zAtrium + 34 * rise;

  // Covered promenade roof
  fillQuad(
    ctx,
    project(wx - 42, wy - 44, zRoof),
    project(wx + 42, wy - 44, zRoof),
    project(wx + 42, wy + 18, zRoof),
    project(wx - 42, wy + 18, zRoof),
    '#14232f',
    '#263a4d',
    0.9
  );

  // Hanging neon lantern strings across the promenade
  for (const ly of [-30, 0, 30]) {
    const p = project(wx, wy + ly, zRoof - 3);
    stampSprite(ctx, assets.glowMagenta, p.sx, p.sy, 34 * p.scale, 22 * p.scale, 0.45 + 0.1 * Math.sin(t * 1.1 + ly), true);
    stampSprite(ctx, assets.glowCyan, p.sx, p.sy, 18 * p.scale, 12 * p.scale, 0.3, true);
  }

  // Corner paper lanterns (glowCyan)
  for (const c of [-20, 20]) {
    const pp = project(wx + c * 2.1, wy - 33, zRoof - 2);
    stampSprite(ctx, assets.glowCyan, pp.sx, pp.sy, 16 * pp.scale, 14 * pp.scale, 0.42, true);
    ctx.fillStyle = '#fbcf74';
    ctx.beginPath();
    ctx.ellipse(pp.sx, pp.sy, 4 * pp.scale, 2.5 * pp.scale, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Star-shaped food court sign over the promenade
  const ss = project(wx, wy + 8, zRoof - 5);
  stampSprite(ctx, assets.glowMagenta, ss.sx, ss.sy, 30 * ss.scale, 20 * ss.scale, 0.5, true);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.max(8, Math.round(8 * ss.scale))}px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TSUKI-AMA', ss.sx, ss.sy);

  return zRoof + 5;
}

// 3h. Harbor Lighthouse — Witte & rode hausfassade, roterende Floodlicht
function drawTokyoHarborLighthouse3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;
  const zBase = 2.2 + 22 * rise;
  const zMid = 2.2 + 40 * rise;
  const zTop = 2.2 + 62 * rise;

  // Pier base & foghorn puff on the quay
  stampSprite(ctx, assets.glowTungsten, project(wx, wy - 30, zBase - 2).sx, project(wx, wy - 30, zBase - 2).sy, 26 * project(wx, wy - 30, zBase - 2).scale, 10 * project(wx, wy - 30, zBase - 2).scale, 0.45, true);
  stampSprite(ctx, assets.glowMoon, project(wx + 12, wy - 30, zBase - 1).sx, project(wx + 12, wy - 30, zBase - 1).sy, 14 * project(wx + 12, wy - 30, zBase - 1).scale, 9 * project(wx + 12, wy - 30, zBase - 1).scale, 0.5, true);

  // Cylindrical tower (white with red band)
  const a0 = project(wx - 16, wy - 2, zBase);
  const a1 = project(wx + 16, wy - 2, zTop);
  const a2 = project(wx + 16, wy + 2, zTop);
  const a3 = project(wx - 16, wy + 2, zBase);
  fillQuad(ctx, a0, a1, a2, a3, '#e8e3d8', '#475569', 1.4);
  const b0 = project(wx - 20, wy - 2.8, zMid);
  const b1 = project(wx + 20, wy - 2.8, zMid);
  const b2 = project(wx + 20, wy + 2.8, zMid);
  const b3 = project(wx - 20, wy + 2.8, zMid);
  fillQuad(ctx, b0, b1, b2, b3, '#c41e3a', null, 1.2);

  // Glass windows band
  for (let i = 0; i < 4; i++) {
    const w0 = project(wx - 14, wy, zBase + 8 + i * 10);
    stampSprite(ctx, assets.glowTungsten, w0.sx, w0.sy, 6 * w0.scale, 4.5 * w0.scale, 0.55, true);
  }

  // Roterende beacon: wide rotating beam sweeping the harbor at night
  const ang = t * 0.6 + seed;
  const beamLen = 34;
  const bC0 = project(wx + Math.cos(ang) * 8, wy + Math.sin(ang) * 8, zTop + 8);
  const bC1 = project(wx + Math.cos(ang) * beamLen, wy + Math.sin(ang) * beamLen, zTop - 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 239, 195, ${(0.38 + 0.28 * Math.sin(t * 1.5)).toFixed(3)})`;
  ctx.lineWidth = Math.max(2.6, 4.2 * bC0.scale);
  ctx.beginPath();
  ctx.moveTo(bC0.sx, bC0.sy);
  ctx.lineTo(bC1.sx, bC1.sy);
  ctx.stroke();
  ctx.restore();

  // Beacon peak
  const bep = project(wx, wy, zTop + 12);
  stampSprite(ctx, assets.glowMoon, bep.sx, bep.sy, 16 * bep.scale, 16 * bep.scale, 0.75, true);
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(bep.sx, bep.sy, 5.5 * bep.scale, 0, Math.PI * 2);
  ctx.fill();

  return zTop + 14;
}

// 3i. Waterfront Market — Havenmarkt hokken met vis & papegaaien, hanging lantern strings (lively: swaying)
function drawTokyoWaterfrontMarket3D(ctx, project, wx, wy, subtype, rise, seed, time, reducedMotion, assets) {
  const t = reducedMotion ? 0 : time;

  // Quay platform facing the canal
  fillQuad(
    ctx,
    project(wx - 46, wy - 44, 2.2),
    project(wx + 46, wy - 44, 2.2),
    project(wx + 46, wy + 16, 2.2),
    project(wx - 46, wy + 16, 2.2),
    '#4a4034'
  );

  // Water glow under the quay (Toledo canal water tone)
  fillQuad(
    ctx,
    project(wx - 46, wy + 16, 2.0),
    project(wx + 46, wy + 16, 2.0),
    project(wx + 46, wy + 34, 2.0),
    project(wx - 46, wy + 34, 2.0),
    '#174a52',
    '#2d6e7a',
    0.9
  );

  // 3 market stalls along the quay with hanging lantern strings (sway with time)
  for (let i = 0; i < 3; i++) {
    const sx = wx - 38 + i * 23;
    const top = project(sx, wy - 34, 8);
    stampSprite(ctx, assets.glowTungsten, top.sx, top.sy, 26 * top.scale, 13 * top.scale, 0.5, true);
    // Small red-tiled awning below
    const u0 = project(sx - 12, wy - 34, 6);
    const u1 = project(sx + 12, wy - 34, 6);
    const u2 = project(sx + 12, wy - 46, 6);
    const u3 = project(sx - 12, wy - 46, 6);
    fillQuad(ctx, u0, u1, u2, u3, '#7c3b3b', '#a85757', 0.9);
    // Hanging lantern string + paper lantern
    const ls = project(sx, wy - 46, 4);
    stampSprite(ctx, assets.glowTungsten, ls.sx, ls.sy + Math.sin(t * 0.7 + i) * 1.5, 10 * ls.scale, 7 * ls.scale, 0.55, true);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(ls.sx, ls.sy + Math.sin(t * 0.7 + i) * 1.5, 3 * ls.scale, 2.2 * ls.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fish sign
    if (i === 1) {
      ctx.fillStyle = '#d9f99d';
      ctx.font = `600 ${Math.max(8, Math.round(9 * top.scale))}px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VIS', sx, wy - 42);
    }
  }

  return 10;
}

// ---------------------------------------------------------------------------
// Live AI Construction Site Floor Base (Status Perimeter, Blueprint Grid, Shadow)
// ---------------------------------------------------------------------------
export function drawConstructionFloor3D(ctx, project, wx, wy, chat, state, time, reducedMotion) {
  const assets = getCityAssets();
  const status = resolveStatus(chat.status);
  const pal = STATUS_PALETTE[status];
  const t = reducedMotion ? 0 : time;
  const phase = state.pulsePhase || 0;
  const alpha = state.alpha != null ? state.alpha : 1;

  const center = project(wx, wy, 0);
  const s = center.scale;
  if (s <= 0.04) return;

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Construction pad surface
  fillQuad(
    ctx,
    project(wx - 48, wy - 48, 2.0),
    project(wx + 48, wy - 48, 2.0),
    project(wx + 48, wy + 48, 2.0),
    project(wx - 48, wy + 48, 2.0),
    status === 'sleeping' ? '#1e2736' : '#262d38',
    pal.ring,
    Math.max(1.1, (status === 'waiting' ? 2.1 : 1.3) * s)
  );

  // Subtle architectural blueprint grid lines on lot pad
  ctx.strokeStyle =
    status === 'sleeping'
      ? 'rgba(148, 163, 184, 0.16)'
      : status === 'waiting'
        ? 'rgba(248, 113, 113, 0.22)'
        : 'rgba(251, 191, 36, 0.16)';
  ctx.lineWidth = Math.max(0.6, 0.85 * s);
  for (const offset of [-24, 0, 24]) {
    const h0 = project(wx - 46, wy + offset, 2.2);
    const h1 = project(wx + 46, wy + offset, 2.2);
    ctx.beginPath();
    ctx.moveTo(h0.sx, h0.sy);
    ctx.lineTo(h1.sx, h1.sy);
    ctx.stroke();

    const v0 = project(wx + offset, wy - 46, 2.2);
    const v1 = project(wx + offset, wy + 46, 2.2);
    ctx.beginPath();
    ctx.moveTo(v0.sx, v0.sy);
    ctx.lineTo(v1.sx, v1.sy);
    ctx.stroke();
  }

  // Status Floor Lighting
  if (status === 'working') {
    const flick = reducedMotion ? 0.95 : 0.88 + 0.12 * Math.sin(t * 7.2 + phase);
    stampSprite(ctx, assets.glowAmber, center.sx, center.sy, 86 * s * flick, 56 * s * flick, 0.42, true);
  } else if (status === 'waiting') {
    // Dramatic pulsing vermilion-coral approval frame flat on the 3D parcel!
    const pulse = reducedMotion ? 0.88 : 0.65 + 0.35 * Math.sin(t * 4.6 + phase);
    const exp = reducedMotion ? 1 : 1 + 0.05 * Math.sin(t * 4.6 + phase);
    stampSprite(ctx, assets.glowVermilion, center.sx, center.sy, 98 * s * exp, 66 * s * exp, 0.62 * pulse, true);

    const ex = 53 * exp;
    fillQuad(
      ctx,
      project(wx - ex, wy - ex, 2.6),
      project(wx + ex, wy - ex, 2.6),
      project(wx + ex, wy + ex, 2.6),
      project(wx - ex, wy + ex, 2.6),
      null,
      `rgba(239, 68, 68, ${(0.72 + pulse * 0.25).toFixed(3)})`,
      Math.max(1.5, 2.4 * s)
    );
  } else if (status === 'sleeping') {
    stampSprite(ctx, assets.glowMoon, center.sx, center.sy, 72 * s, 48 * s, 0.36, false);
  }

  // Hover or Selection highlight ring
  if (state.selected || state.hovered) {
    const ext = state.selected ? 55 : 52;
    fillQuad(
      ctx,
      project(wx - ext, wy - ext, 3.0),
      project(wx + ext, wy - ext, 3.0),
      project(wx + ext, wy + ext, 3.0),
      project(wx - ext, wy + ext, 3.0),
      null,
      state.selected ? '#38bdf8' : 'rgba(248, 250, 252, 0.78)',
      Math.max(1.4, (state.selected ? 2.4 : 1.6) * s)
    );
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Live AI Construction Site 3D Structure (Crane, Steel Frame, Drone, Beacon)
// ---------------------------------------------------------------------------
export function drawConstructionSite3D(ctx, project, wx, wy, chat, state, time, reducedMotion) {
  const assets = getCityAssets();
  const status = resolveStatus(chat.status);
  const t = reducedMotion ? 0 : time;
  const phase = state.pulsePhase || 0;
  const alpha = state.alpha != null ? state.alpha : 1;
  const bType = chat.buildingType || 'huis';
  const plannedFloors = Math.max(1, Math.min(12, Number(chat.plannedFloors) || (bType === 'flat' ? 6 : 2)));

  const center = project(wx, wy, 0);
  const s = center.scale;
  if (s <= 0.04) return;

  ctx.save();
  ctx.globalAlpha *= alpha;

  // --- WAITING: Tall Translucent Vermilion-Amber Approval Light Beam ---
  if (status === 'waiting') {
    const pulse = reducedMotion ? 0.85 : 0.65 + 0.35 * Math.sin(t * 4.4 + phase);
    const bot = project(wx, wy, 2);
    const top = project(wx, wy, 134);
    const bw = 28 * bot.scale;
    const tw = 16 * top.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(239, 68, 68, ${(0.18 * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(top.sx - tw, top.sy);
    ctx.lineTo(top.sx + tw, top.sy);
    ctx.lineTo(bot.sx + bw, bot.sy);
    ctx.lineTo(bot.sx - bw, bot.sy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- SLEEPING: Quiet Twilight Blueprint Lot + Dim Site Cabin + Lowered Signpost ---
  if (status === 'sleeping') {
    // Low site perimeter fencing
    drawSiteFence3D(ctx, project, wx, wy, '#475569', false, t, phase, reducedMotion);

    // Small site office cabin on corner
    drawExtrudedBox3D(
      ctx,
      project,
      wx - 16,
      wy - 14,
      16,
      12,
      2.2,
      17,
      { south: '#334155', north: '#1e293b', east: '#283548', west: '#1b2434', top: '#475569' },
      'rgba(15, 23, 42, 0.6)'
    );
    // Dim cool window on cabin
    fillQuad(
      ctx,
      project(wx - 24, wy - 2, 7),
      project(wx - 10, wy - 2, 7),
      project(wx - 10, wy - 2, 13),
      project(wx - 24, wy - 2, 13),
      '#64748b'
    );

    // Stacked steel beams waiting quietly on the concrete pad
    for (let i = 0; i < 3; i++) {
      const b0 = project(wx + 6, wy + 4 + i * 6, 4);
      const b1 = project(wx + 32, wy + 4 + i * 6, 4);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1.5, 2.6 * s);
      ctx.beginPath();
      ctx.moveTo(b0.sx, b0.sy);
      ctx.lineTo(b1.sx, b1.sy);
      ctx.stroke();
    }

    // Gentle slow-rising translucent 'z' motes
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const p = reducedMotion ? 0.25 + i * 0.25 : ((t * 0.24 + i * 0.33 + phase * 0.1) % 1);
      const zp = project(wx - 12 + i * 7, wy - 10, 26 + p * 44);
      const za = Math.sin(p * Math.PI) * 0.78;
      const fs = Math.max(8, Math.round((10 + p * 4) * zp.scale));
      ctx.font = `600 ${fs}px ${FONT_UI}`;
      ctx.fillStyle = `rgba(203, 213, 225, ${za.toFixed(3)})`;
      ctx.fillText(i === 2 ? 'Z' : 'z', zp.sx, zp.sy);
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // --- WORKING & WAITING: Exposed 3D Structural Frame + 3D Tower Crane ---
  const frameH = bType === 'flat' ? 42 + Math.min(7, plannedFloors) * 8 : bType === 'infrastructuur' ? 30 : 34;
  const fhx = 28;
  const fhy = 24;
  const isWorking = status === 'working';

  // Site safety fence with animated amber progress bar along front rail when working
  drawSiteFence3D(ctx, project, wx, wy, isWorking ? '#f59e0b' : '#ef4444', isWorking, t, phase, reducedMotion);

  // Concrete foundation core slab
  drawExtrudedBox3D(
    ctx,
    project,
    wx,
    wy,
    fhx,
    fhy,
    2.2,
    8,
    { south: '#4b5563', north: '#374151', east: '#3f4856', west: '#2f3744', top: '#5b6575' }
  );

  // Exposed 3D Steel / Timber Structural Skeleton
  const beamCol = bType === 'huis' ? '#b97648' : '#7c8ea4';
  const beamHi = bType === 'huis' ? '#d99866' : '#cbd5e1';
  const levels = bType === 'flat' ? Math.max(3, Math.min(6, Math.round(plannedFloors * 0.65))) : 2;
  const zStep = (frameH - 8) / levels;

  ctx.strokeStyle = beamCol;
  ctx.lineWidth = Math.max(1.2, 2.0 * s);

  // Vertical structural columns
  const cols = [
    [-fhx, -fhy],
    [0, -fhy],
    [fhx, -fhy],
    [-fhx, fhy],
    [0, fhy],
    [fhx, fhy],
  ];
  for (let i = 0; i < cols.length; i++) {
    const b = project(wx + cols[i][0], wy + cols[i][1], 8);
    const top = project(wx + cols[i][0], wy + cols[i][1], frameH);
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy);
    ctx.lineTo(top.sx, top.sy);
    ctx.stroke();
  }

  // Horizontal steel floor girders + partial poured concrete deck on lower half
  for (let lv = 1; lv <= levels; lv++) {
    const lz = 8 + lv * zStep;
    const p0 = project(wx - fhx, wy - fhy, lz);
    const p1 = project(wx + fhx, wy - fhy, lz);
    const p2 = project(wx + fhx, wy + fhy, lz);
    const p3 = project(wx - fhx, wy + fhy, lz);

    if (lv === 1) {
      fillQuad(ctx, p0, p1, p2, p3, 'rgba(71, 85, 105, 0.55)', beamHi, Math.max(0.9, 1.3 * s));
    } else {
      ctx.strokeStyle = lv === levels ? beamHi : beamCol;
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.lineTo(p3.sx, p3.sy);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // --- 3D Amber Tower Crane (swinging smoothly when working, halted when waiting) ---
  const craneX = wx - 36;
  const craneY = wy - 32;
  const craneTopZ = frameH + 34;
  const mastBot = project(craneX, craneY, 2.2);
  const mastTop = project(craneX, craneY, craneTopZ);
  const cs = mastTop.scale;

  // Crane lattice mast
  ctx.strokeStyle = isWorking ? '#f59e0b' : '#b45309';
  ctx.lineWidth = Math.max(2, 3.8 * mastBot.scale);
  ctx.beginPath();
  ctx.moveTo(mastBot.sx, mastBot.sy);
  ctx.lineTo(mastTop.sx, mastTop.sy);
  ctx.stroke();

  // Swinging horizontal crane boom + counter-jib
  const boomAngle = isWorking
    ? (reducedMotion ? 0.55 : 0.55 + Math.sin(t * 0.95 + phase) * 0.65)
    : 0.4;
  const jibLen = 62;
  const counterLen = 20;
  const jibTip = project(
    craneX + Math.cos(boomAngle) * jibLen,
    craneY + Math.sin(boomAngle) * jibLen,
    craneTopZ
  );
  const counterTip = project(
    craneX - Math.cos(boomAngle) * counterLen,
    craneY - Math.sin(boomAngle) * counterLen,
    craneTopZ
  );
  const apex = project(craneX, craneY, craneTopZ + 12);

  // Guy cables
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.lineWidth = Math.max(0.8, 1.0 * cs);
  ctx.beginPath();
  ctx.moveTo(apex.sx, apex.sy);
  ctx.lineTo(jibTip.sx, jibTip.sy);
  ctx.moveTo(apex.sx, apex.sy);
  ctx.lineTo(counterTip.sx, counterTip.sy);
  ctx.stroke();

  // Amber crane jib boom
  ctx.strokeStyle = isWorking ? '#fbbf24' : '#d97706';
  ctx.lineWidth = Math.max(1.8, 3.2 * cs);
  ctx.beginPath();
  ctx.moveTo(counterTip.sx, counterTip.sy);
  ctx.lineTo(jibTip.sx, jibTip.sy);
  ctx.stroke();

  // Suspended hoist cable & steel girder load
  const hookR = jibLen * 0.72;
  const hookX = craneX + Math.cos(boomAngle) * hookR;
  const hookY = craneY + Math.sin(boomAngle) * hookR;
  const hookZ = craneTopZ - (isWorking && !reducedMotion ? 22 + Math.sin(t * 1.8 + phase) * 6 : 26);
  const trolley = project(hookX, hookY, craneTopZ);
  const hook = project(hookX, hookY, hookZ);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(0.8, 1.1 * cs);
  ctx.beginPath();
  ctx.moveTo(trolley.sx, trolley.sy);
  ctx.lineTo(hook.sx, hook.sy);
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(hook.sx - 6 * hook.scale, hook.sy - 1.5 * hook.scale, 12 * hook.scale, 3 * hook.scale);

  // --- WORKING: Hovering AI Builder Drone + Rising Welding Sparks ---
  if (isWorking) {
    const droneAngle = reducedMotion ? 1.1 : t * 2.1 + phase;
    const dx = wx + Math.cos(droneAngle) * 20;
    const dy = wy + Math.sin(droneAngle) * 16;
    const dz = frameH + 8 + (reducedMotion ? 0 : Math.sin(t * 4.5 + phase) * 3);
    const dp = project(dx, dy, dz);
    const ds = dp.scale;

    stampSprite(ctx, assets.glowAmber, dp.sx, dp.sy, 22 * ds, 22 * ds, 0.72, true);
    // Sleek tiny quad-drone body
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(1, 1.4 * ds);
    ctx.beginPath();
    ctx.ellipse(dp.sx, dp.sy, 5.5 * ds, 3.2 * ds, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rising welding sparks from active beams
    for (let i = 0; i < 6; i++) {
      const sp = reducedMotion ? i * 0.16 : ((t * 0.85 + i * 0.165 + phase * 0.1) % 1);
      const sx = wx + Math.sin(sp * Math.PI * 2 + i * 2.1) * 22;
      const sy = wy + Math.cos(sp * Math.PI * 2 + i) * 16;
      const sz = frameH * 0.75 + sp * 42;
      const pp = project(sx, sy, sz);
      const sa = Math.sin(sp * Math.PI) * 0.94;
      ctx.fillStyle = i % 2 === 0 ? `rgba(254, 240, 138, ${sa.toFixed(3)})` : `rgba(245, 158, 11, ${sa.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, Math.max(1.1, (1.7 + (i % 2) * 0.7) * pp.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- WAITING: Crisp Bobbing High 3D Vermilion '!' Approval Beacon ---
  if (status === 'waiting') {
    const bobZ = reducedMotion ? frameH + 54 : frameH + 54 + Math.sin(t * 4.6 + phase) * 6;
    const bp = project(wx, wy, bobZ);
    const bs = bp.scale;
    const ringP = reducedMotion ? 0.5 : (t * 1.4 + phase * 0.2) % 1;

    stampSprite(ctx, assets.glowVermilion, bp.sx, bp.sy, 34 * bs, 34 * bs, 0.86, true);

    ctx.strokeStyle = `rgba(252, 165, 165, ${((1 - ringP) * 0.9).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, 2.0 * bs);
    ctx.beginPath();
    ctx.arc(bp.sx, bp.sy, (14 + ringP * 22) * bs, 0, Math.PI * 2);
    ctx.stroke();

    // Bold vermilion diamond beacon
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = Math.max(1.4, 2.2 * bs);
    ctx.beginPath();
    ctx.moveTo(bp.sx, bp.sy - 15 * bs);
    ctx.lineTo(bp.sx + 13 * bs, bp.sy);
    ctx.lineTo(bp.sx, bp.sy + 15 * bs);
    ctx.lineTo(bp.sx - 13 * bs, bp.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp '!' mark
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bp.sx - 1.7 * bs, bp.sy - 7.5 * bs, 3.4 * bs, 8.2 * bs);
    ctx.beginPath();
    ctx.arc(bp.sx, bp.sy + 5.2 * bs, 2.0 * bs, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSiteFence3D(ctx, project, wx, wy, accentCol, showProgress, t, phase, reducedMotion) {
  const f = 45;
  const h = 7.5;
  const corners = [
    [-f, -f],
    [f, -f],
    [f, f],
    [-f, f],
  ];
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    const c0 = corners[i];
    const c1 = corners[(i + 1) % 4];
    const p0 = project(wx + c0[0], wy + c0[1], h);
    const p1 = project(wx + c1[0], wy + c1[1], h);
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.stroke();
  }

  // Animated progress bar along south site fence when working
  if (showProgress) {
    const prog = reducedMotion ? 0.65 : 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.9 + phase));
    const b0 = project(wx - f + 4, wy + f, h + 1);
    const b1 = project(wx + f - 4, wy + f, h + 1);
    const pm = project(wx - f + 4 + (2 * f - 8) * prog, wy + f, h + 1);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = Math.max(2.4, 3.6 * b0.scale);
    ctx.beginPath();
    ctx.moveTo(b0.sx, b0.sy);
    ctx.lineTo(b1.sx, b1.sy);
    ctx.stroke();

    ctx.strokeStyle = accentCol;
    ctx.lineWidth = Math.max(1.6, 2.4 * b0.scale);
    ctx.beginPath();
    ctx.moveTo(b0.sx, b0.sy);
    ctx.lineTo(pm.sx, pm.sy);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Crisp Dark-Ink Architectural Nameplates (HUD Pass)
// ---------------------------------------------------------------------------
function truncateText(ctx, text, maxWidth) {
  const str = String(text || 'Naamloos').trim();
  if (ctx.measureText(str).width <= maxWidth) return str;
  const ellipsis = '…';
  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(str.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return str.slice(0, Math.max(1, lo)).trimEnd() + ellipsis;
}

export function measureCityLabel(ctx, item, scale) {
  const uiScale = Math.max(0.84, Math.min(1.06, scale * 1.04));
  const isHQ = item.kind === 'hq';
  const isBuilding = item.kind === 'building';
  const rawName = isHQ
    ? 'Shin-AI HQ'
    : isBuilding
      ? `${item.building.code || ''} ${item.building.name || ''}`.trim()
      : item.chat.name || 'Bouwer';

  const badgeText = isHQ
    ? 'HQ'
    : isBuilding
      ? item.building.buildingType === 'wolkenkrabber'
        ? `${item.building.floors || 20}V`
        : item.building.buildingType === 'mall'
          ? 'MALL'
          : item.building.buildingType === 'flat'
            ? `${item.building.floors || 6}V`
            : item.building.buildingType === 'infrastructuur'
              ? 'INFRA'
              : 'HUIS'
      : SOURCE_TAGS[String(item.chat.source || 'demo').toLowerCase()] || 'AI';

  ctx.font = `600 ${(11.2 * uiScale).toFixed(1)}px ${FONT_UI}`;
  const displayName = truncateText(ctx, rawName, (isBuilding ? 124 : 114) * uiScale);
  const nameW = Math.ceil(ctx.measureText(displayName).width);

  ctx.font = `600 ${(8.5 * uiScale).toFixed(1)}px ${FONT_MONO}`;
  const badgeW = Math.ceil(ctx.measureText(badgeText).width) + 8 * uiScale;

  const padL = 9 * uiScale;
  const dotSpace = 12 * uiScale;
  const gap = 7 * uiScale;
  const padR = 7 * uiScale;
  const w = Math.max(88 * uiScale, Math.min(194 * uiScale, padL + dotSpace + nameW + gap + badgeW + padR));
  const h = 22 * uiScale;

  return { w, h, uiScale, displayName, badgeText, badgeW, padL, padR };
}

export function drawCityLabelHUD(ctx, cx, cy, metrics, item, state, time, reducedMotion) {
  const isHQ = item.kind === 'hq';
  const isBuilding = item.kind === 'building';
  const status = isHQ || isBuilding ? 'done' : resolveStatus(item.chat.status);
  const pal = STATUS_PALETTE[status];
  const { w, h, uiScale, displayName, badgeText, badgeW, padL, padR } = metrics;
  const left = cx - w / 2;
  const top = cy - h / 2;

  ctx.save();
  ctx.globalAlpha *= state.alpha != null ? state.alpha : 1;

  // Grounded drop shadow
  ctx.fillStyle = 'rgba(4, 7, 13, 0.72)';
  drawRoundedRectPath(ctx, left + 1, top + 2, w, h, 5 * uiScale);
  ctx.fill();

  // Dark Tokyo ink plaque
  ctx.fillStyle = isHQ ? 'rgba(13, 24, 36, 0.96)' : 'rgba(15, 20, 29, 0.94)';
  drawRoundedRectPath(ctx, left, top, w, h, 5 * uiScale);
  ctx.fill();

  ctx.strokeStyle = state.selected
    ? '#38bdf8'
    : state.hovered
      ? 'rgba(241, 245, 249, 0.82)'
      : isHQ
        ? 'rgba(56, 189, 248, 0.72)'
        : status === 'waiting'
          ? 'rgba(239, 68, 68, 0.88)'
          : isBuilding
            ? 'rgba(52, 211, 153, 0.52)'
            : 'rgba(148, 163, 184, 0.40)';
  ctx.lineWidth = state.selected || isHQ ? 1.45 : 1.05;
  ctx.stroke();

  // Status dot on left
  const dotX = left + padL + 2 * uiScale;
  if (status === 'waiting' && !reducedMotion) {
    const p = 0.55 + 0.45 * Math.sin(time * 5.6);
    ctx.fillStyle = `rgba(239, 68, 68, ${(p * 0.45).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(dotX, cy, 6 * uiScale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isHQ ? '#38bdf8' : pal.main;
  ctx.beginPath();
  ctx.arc(dotX, cy, 3.2 * uiScale, 0, Math.PI * 2);
  ctx.fill();

  // Crisp ivory-white label text
  ctx.font = `600 ${(11.2 * uiScale).toFixed(1)}px ${FONT_UI}`;
  ctx.fillStyle = status === 'sleeping' ? '#cbd5e1' : '#f1f5f9';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, dotX + 8.5 * uiScale, cy + 0.4);

  // Compact monospace tag pill on right
  const tagX = left + w - padR - badgeW;
  const tagH = 13.5 * uiScale;
  const tagY = cy - tagH / 2;
  ctx.fillStyle = isHQ
    ? 'rgba(56, 189, 248, 0.18)'
    : isBuilding
      ? 'rgba(52, 211, 153, 0.14)'
      : 'rgba(148, 163, 184, 0.15)';
  ctx.strokeStyle = isHQ
    ? 'rgba(56, 189, 248, 0.5)'
    : isBuilding
      ? 'rgba(52, 211, 153, 0.36)'
      : 'rgba(148, 163, 184, 0.32)';
  ctx.lineWidth = 0.8;
  drawRoundedRectPath(ctx, tagX, tagY, badgeW, tagH, 3 * uiScale);
  ctx.fill();
  ctx.stroke();

  ctx.font = `600 ${(8.5 * uiScale).toFixed(1)}px ${FONT_MONO}`;
  ctx.fillStyle = isHQ ? '#bae6fd' : isBuilding ? '#a7f3d0' : '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, tagX + badgeW / 2, cy + 0.4);

  ctx.restore();
}
