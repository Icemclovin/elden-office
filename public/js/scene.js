// Shin-AI Tokyo — Interactive 3D Twilight Metropolis Canvas 2D Engine
// True 3D perspective camera (360° orbit, 3D/Overview tilt, 1:1 floor pan, wheel zoom, focusItem),
// Painter's Z-sorting, living city growth across 5 levels (streetlamps, sakura avenues, canal bridges,
// gliding cars, elevated Tokyo Monorail viaduct & train, rooftop beacons), zero shadowBlur,
// pre-baked glow sprites, pooled zero-GC particles, DPR <= 1.75, auto-pause when document.hidden.

import {
  drawCityLabelHUD,
  drawConstructionFloor3D,
  drawConstructionSite3D,
  drawExtrudedBox3D,
  drawHoofdkantoor3D,
  drawPermanentBuilding3D,
  drawSakuraTree3D,
  drawSiteAgents3D,
  drawStreetlamp3D,
  fillQuad,
  getCityAssets,
  hashString,
  measureCityLabel,
  resolveStatus,
  stampSprite,
} from './sprites.js';

const PITCH_3D = (38 * Math.PI) / 180;
const PITCH_OVERVIEW = (64 * Math.PI) / 180;
const PITCH_MIN = (28 * Math.PI) / 180;
const PITCH_MAX = (68 * Math.PI) / 180;
const DEFAULT_YAW = 0.56; // Cinematic 3/4 isometric Tokyo skyline angle
const CAMERA_DIST = 1750;

// Clean Tokyo Urban Parcel Grid:
// Every integer parcel (gridX, gridY) sits centered inside a 148x148 city tile:
// 106x106 raised concrete sidewalk parcel + 42-unit paved asphalt street with crosswalks between every tile!
const CELL_PITCH = 148;
const BLOCK_HALF = 53;

function createSeededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gridToWorld(gx, gy) {
  const x = Number.isFinite(gx) ? gx : 0;
  const y = Number.isFinite(gy) ? gy : 0;
  return { x: x * CELL_PITCH, y: y * CELL_PITCH };
}

function easeOutCubic(x) {
  const t = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - t, 3);
}

// ---------------------------------------------------------------------------
// Main Exported Scene Factory (+ safe createOfficeScene alias)
// ---------------------------------------------------------------------------
export function createCityScene(canvas, callbacks = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = getCityAssets();
  const concretePattern = ctx.createPattern(assets.concreteGrain, 'repeat');

  const onSelect = typeof callbacks.onSelect === 'function' ? callbacks.onSelect : () => {};
  const onHover = typeof callbacks.onHover === 'function' ? callbacks.onHover : () => {};
  const onHQModeChange =
    typeof callbacks.onHQModeChange === 'function' ? callbacks.onHQModeChange : () => {};

  const motionQuery =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  let reducedMotion = motionQuery ? motionQuery.matches : false;
  const onMotionChange = (e) => {
    reducedMotion = e.matches;
  };
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
  }

  // City & AI Builder State
  let chats = [];
  let buildings = [];
  let cityMeta = { level: 1, name: 'Kustdorp', totalBuildings: 0 };
  let hqData = {
    id: 'hq-central',
    name: 'Shin-AI Hoofdkantoor',
    gridX: 0,
    gridY: 0,
    foreman: {
      id: 'foreman-uitvoerder',
      name: 'Kuroda',
      role: 'Uitvoerder',
      status: 'online',
      channelScope: 'user-only',
    },
    roster: null,
  };
  let hqFocused = false;
  let hqCutaway = 0;
  let lastNotifiedHQMode = false;

  // RPG camera floor-walker state (spacious 460x320 HQ-local coords clamped inside [-214..214] x [-144..144])
  const HQ_WALK_X = 214;
  const HQ_WALK_Y = 144;
  const HQ_FLOOR_CLICK_X = 228;
  const HQ_FLOOR_CLICK_Y = 158;
  const HQ_EXIT_ZOOM = 1.15;

  const rpg = {
    x: 0,
    y: 6,
    targetX: 0,
    targetY: 6,
    nearest: null,
  };
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // Persistent zero-GC autonomous walking state across spacious 460x320 atrium & all 5 HQ wings
  const agentMotion = new Map();
  const LOUNGE_WAYPOINTS = [
    { x: 46, y: 2 },
    { x: 126, y: 24 },
    { x: 112, y: 34 },
    { x: 116, y: 66 },
    { x: 146, y: 70 },
    { x: 118, y: 122 },
    { x: 116, y: 66 },
    { x: 112, y: 34 },
    { x: 126, y: 24 },
    { x: 120, y: -20 },
    { x: 80, y: -48 },
    { x: 118, y: -104 },
    { x: 160, y: -48 },
    { x: 120, y: -20 },
    { x: 0, y: 2 },
    { x: -46, y: 2 },
    { x: -120, y: -20 },
    { x: -118, y: -42 },
    { x: -158, y: -88 },
    { x: -88, y: -84 },
    { x: -58, y: -84 },
    { x: -88, y: -84 },
    { x: -118, y: -42 },
    { x: -120, y: -20 },
    { x: -46, y: 2 },
    { x: 0, y: 2 },
  ];
  const FOREMAN_WAYPOINTS = [
    { x: -18, y: 82, pause: 5.0 },
    { x: 10, y: 76, pause: 0.3 },
    { x: 0, y: 36, pause: 1.5 },
    { x: 0, y: 2, pause: 2.2 },
    { x: -46, y: 2, pause: 1.2 },
    { x: -120, y: -20, pause: 1.2 },
    { x: -118, y: -42, pause: 3.4 },
    { x: -120, y: -20, pause: 0.4 },
    { x: -46, y: 2, pause: 1.0 },
    { x: 0, y: 36, pause: 1.0 },
    { x: 24, y: 96, pause: 3.0 },
  ];
  const SITE_WAYPOINTS = [
    { x: 24, y: 28 },
    { x: -20, y: 30 },
    { x: 28, y: -12 },
  ];

  function notifyHQMode(nextInside) {
    const inside = Boolean(nextInside);
    if (inside !== lastNotifiedHQMode) {
      lastNotifiedHQMode = inside;
      onHQModeChange(inside);
    }
  }
  let filter = 'all';
  let selection = null; // { kind: 'chat' | 'building' | 'hq' | 'foreman' | 'agent', id } | null
  let hoveredItem = null;
  let lastHoverScreen = null;

  // Animation state per building & active chat
  const buildingAnim = new Map(); // id -> { rise, celebrateT, alpha }
  const chatAnim = new Map(); // id -> { alpha, dimAlpha, pulsePhase }
  let hasInitializedState = false;

  // Dynamic city district bounds (in integer grid coords)
  const district = {
    minGX: -2,
    maxGX: 2,
    minGY: -2,
    maxGY: 2,
    minX: -370,
    maxX: 370,
    minY: -370,
    maxY: 370,
    canalY: 460,
    fitSpan: 1020,
  };

  // Viewport & 3D Camera State
  let viewW = 1280;
  let viewH = 800;
  let dpr = 1;
  let userMovedCamera = false;
  let tiltMode = '3d';

  const cam = {
    x: 0,
    y: 40,
    yaw: DEFAULT_YAW,
    pitch: PITCH_3D,
    zoom: 1,
    targetX: 0,
    targetY: 40,
    targetYaw: DEFAULT_YAW,
    targetPitch: PITCH_3D,
    targetZoom: 1,
  };

  // Cached per-frame camera trigonometry
  let cosY = Math.cos(cam.yaw);
  let sinY = Math.sin(cam.yaw);
  let cosP = Math.cos(cam.pitch);
  let sinP = Math.sin(cam.pitch);
  let screenCx = 640;
  let screenCy = 420;

  function syncCameraBasis() {
    cosY = Math.cos(cam.yaw);
    sinY = Math.sin(cam.yaw);
    cosP = Math.cos(cam.pitch);
    sinP = Math.sin(cam.pitch);
    screenCx = viewW * 0.5;
    screenCy = viewH * 0.5 + (viewH > 500 ? 32 : 16);
  }

  function project(wx, wy, wz = 0) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const rx = dx * cosY - dy * sinY;
    const ry = dx * sinY + dy * cosY;
    const depth = Math.max(220, CAMERA_DIST - ry * cosP - wz * sinP);
    const camUp = -ry * sinP + wz * cosP;
    const scale = (CAMERA_DIST / depth) * cam.zoom;
    return {
      sx: screenCx + rx * scale,
      sy: screenCy - camUp * scale,
      scale,
      depth,
      ry,
    };
  }

  function unprojectFloor(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const u = (sx - screenCx) / cam.zoom;
    const v = -(sy - screenCy) / cam.zoom;
    const denom = v * cosP - sinP * CAMERA_DIST;
    if (Math.abs(denom) < 1e-4) return { x: cam.x, y: cam.y };
    const ry = (v * CAMERA_DIST) / denom;
    const depth = CAMERA_DIST - ry * cosP;
    const rx = (u * depth) / CAMERA_DIST;
    return {
      x: cam.x + rx * cosY + ry * sinY,
      y: cam.y - rx * sinY + ry * cosY,
    };
  }

  // Interactive pointer state (declared before clearHover/updateCursor)
  const pointer = {
    down: false,
    dragging: false,
    mode: 'pan',
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    grabWorldX: 0,
    grabWorldY: 0,
  };

  function updateCursor() {
    if (pointer.dragging) {
      canvas.style.cursor = 'grabbing';
    } else if (hoveredItem) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'grab';
    }
  }

  function clearHover() {
    if (hoveredItem !== null || lastHoverScreen !== null) {
      hoveredItem = null;
      lastHoverScreen = null;
      onHover(null, null);
      updateCursor();
    }
  }

  // -------------------------------------------------------------------------
  // Pooled Zero-GC Particle Arrays (Drifting Sakura Petals + Celebration Burst)
  // -------------------------------------------------------------------------
  const PETAL_COUNT = 42;
  const petals = new Array(PETAL_COUNT);
  const pRand = createSeededRandom(88421);
  for (let i = 0; i < PETAL_COUNT; i++) {
    petals[i] = {
      x: (pRand() - 0.5) * 900,
      y: (pRand() - 0.5) * 900,
      z: 20 + pRand() * 190,
      vx: 10 + pRand() * 14,
      vy: 4 + pRand() * 9,
      vz: -(8 + pRand() * 10),
      size: 1.8 + pRand() * 1.8,
      phase: pRand() * Math.PI * 2,
    };
  }

  const BURST_POOL_SIZE = 48;
  const burstParticles = new Array(BURST_POOL_SIZE);
  for (let i = 0; i < BURST_POOL_SIZE; i++) {
    burstParticles[i] = {
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      isGold: false,
    };
  }

  function spawnCelebrationBurst(wx, wy, topZ) {
    let spawned = 0;
    for (let i = 0; i < BURST_POOL_SIZE && spawned < 24; i++) {
      const p = burstParticles[i];
      if (!p.active) {
        const a = (spawned / 24) * Math.PI * 2 + (spawned % 3) * 0.2;
        const spd = 28 + (spawned % 5) * 14;
        p.active = true;
        p.x = wx + Math.cos(a) * 16;
        p.y = wy + Math.sin(a) * 16;
        p.z = Math.max(24, topZ * 0.65);
        p.vx = Math.cos(a) * spd;
        p.vy = Math.sin(a) * spd;
        p.vz = 42 + (spawned % 4) * 18;
        p.life = 0;
        p.maxLife = 1.15 + (spawned % 4) * 0.22;
        p.isGold = spawned % 2 === 0;
        spawned++;
      }
    }
  }

  // Pooled ambient city cars (Level 3+)
  const CAR_COUNT = 10;
  const cars = new Array(CAR_COUNT);
  for (let i = 0; i < CAR_COUNT; i++) {
    cars[i] = {
      axis: i % 2 === 0 ? 'x' : 'y',
      laneIdx: (i % 5) - 2,
      dir: i % 4 < 2 ? 1 : -1,
      pos: ((i * 193) % 700) - 350,
      speed: 44 + (i % 3) * 14,
      color: i % 3 === 0 ? '#e2e8f0' : i % 3 === 1 ? '#94a3b8' : '#cbd5e1',
    };
  }

  // Reusable per-frame queues (zero GC churn)
  const renderQueue = [];
  const labelQueue = [];
  const hqHitboxes = [];

  function getEffectiveRoster() {
    if (Array.isArray(hqData?.roster)) return hqData.roster;
    // Fallback derivation from chats if backend hasn't pushed hq.roster yet
    const derived = [];
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      const st = resolveStatus(c.status);
      const isSite = st === 'working' || st === 'waiting';
      derived.push({
        id: c.id,
        name: c.name || 'AI-bouwer',
        role: c.role || 'Architect',
        status: st,
        location: isSite ? 'site' : 'hq',
        zone: isSite ? 'site' : st === 'sleeping' ? 'sleep_pods' : 'lounge',
        buildingId: c.builtBuildingId || null,
        gridX: c.gridX,
        gridY: c.gridY,
        task: c.currentTool || c.summary || '',
      });
    }
    return derived;
  }

  // -------------------------------------------------------------------------
  // District Bounds & Auto-Fit Camera
  // -------------------------------------------------------------------------
  function recomputeDistrictBounds() {
    let minGX = -2;
    let maxGX = 2;
    let minGY = -2;
    let maxGY = 2;

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (Number.isFinite(b.gridX)) {
        if (b.gridX < minGX) minGX = b.gridX;
        if (b.gridX > maxGX) maxGX = b.gridX;
      }
      if (Number.isFinite(b.gridY)) {
        if (b.gridY < minGY) minGY = b.gridY;
        if (b.gridY > maxGY) maxGY = b.gridY;
      }
    }
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (Number.isFinite(c.gridX)) {
        if (c.gridX < minGX) minGX = c.gridX;
        if (c.gridX > maxGX) maxGX = c.gridX;
      }
      if (Number.isFinite(c.gridY)) {
        if (c.gridY < minGY) minGY = c.gridY;
        if (c.gridY > maxGY) maxGY = c.gridY;
      }
    }

    // Clamp symmetric breathing margin around active parcels
    district.minGX = minGX;
    district.maxGX = maxGX;
    district.minGY = minGY;
    district.maxGY = maxGY;

    district.minX = (minGX - 0.5) * CELL_PITCH - 34;
    district.maxX = (maxGX + 0.5) * CELL_PITCH + 34;
    district.minY = (minGY - 0.5) * CELL_PITCH - 34;
    district.maxY = (maxGY + 0.5) * CELL_PITCH + 34;
    district.canalY = district.maxY + 96;

    const spanX = district.maxX - district.minX + 120;
    const spanY = district.canalY + 70 - district.minY + 120;
    district.fitSpan = Math.max(920, Math.max(spanX, spanY) * 1.06);
  }

  function computeAutoFitZoom(pitchRad = cam.targetPitch) {
    const usableW = Math.max(300, viewW - 56);
    const usableH = Math.max(240, viewH - 110);
    const span = district.fitSpan;
    const verticalSpan = span * Math.sin(pitchRad) + 210 * Math.cos(pitchRad);
    const zW = usableW / span;
    const zH = usableH / verticalSpan;
    return Math.max(0.42, Math.min(1.24, Math.min(zW, zH)));
  }

  function applyAutoFit(instant = false) {
    const midX = (district.minX + district.maxX) * 0.5;
    const midY = (district.minY + district.maxY + 60) * 0.5;
    const z = computeAutoFitZoom(cam.targetPitch);
    cam.targetX = midX;
    cam.targetY = midY;
    cam.targetZoom = z;
    if (instant || reducedMotion) {
      cam.x = midX;
      cam.y = midY;
      cam.zoom = z;
      cam.yaw = cam.targetYaw;
      cam.pitch = cam.targetPitch;
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width || window.innerWidth || 1280));
    const nextH = Math.max(1, Math.round(rect.height || window.innerHeight || 800));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.75);

    const changed = nextW !== viewW || nextH !== viewH || nextDpr !== dpr;
    viewW = nextW;
    viewH = nextH;
    dpr = nextDpr;

    const cw = Math.round(viewW * dpr);
    const ch = Math.round(viewH * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    if (changed) {
      clearHover();
      if (!userMovedCamera) applyAutoFit(true);
    }
  }

  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
  }
  window.addEventListener('resize', resize);

  // -------------------------------------------------------------------------
  // Public State & Camera API
  // -------------------------------------------------------------------------
  function setHQ(nextHQ) {
    if (!nextHQ || typeof nextHQ !== 'object') return;
    hqData = {
      id: nextHQ.id || 'hq-central',
      name: nextHQ.name || 'Shin-AI Hoofdkantoor',
      gridX: Number.isFinite(nextHQ.gridX) ? nextHQ.gridX : 0,
      gridY: Number.isFinite(nextHQ.gridY) ? nextHQ.gridY : 0,
      foreman: nextHQ.foreman
        ? { ...hqData.foreman, ...nextHQ.foreman }
        : hqData.foreman,
      roster: Array.isArray(nextHQ.roster) ? nextHQ.roster.slice() : hqData.roster,
    };
  }

  function setState(payload = {}) {
    const nextChats = Array.isArray(payload.chats) ? payload.chats.slice() : [];
    const nextBuildings = Array.isArray(payload.buildings) ? payload.buildings.slice() : [];
    const nextCity = payload.city || { level: 1, name: 'Kustdorp', totalBuildings: nextBuildings.length };
    if (payload.hq) setHQ(payload.hq);

    chats = nextChats;
    buildings = nextBuildings;
    cityMeta = nextCity;

    // Sync permanent building animations (smooth rise-up for newly added buildings!)
    const activeBuildingIds = new Set();
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      activeBuildingIds.add(b.id);
      if (!buildingAnim.has(b.id)) {
        const isFresh = hasInitializedState && !reducedMotion;
        buildingAnim.set(b.id, {
          rise: isFresh ? 0.02 : 1,
          celebrateT: isFresh ? 1 : 0,
          alpha: 1,
        });
        if (isFresh) {
          const wp = gridToWorld(b.gridX, b.gridY);
          spawnCelebrationBurst(wp.x, wp.y, b.buildingType === 'flat' ? 95 : 46);
        }
      }
    }
    for (const id of buildingAnim.keys()) {
      if (!activeBuildingIds.has(id)) buildingAnim.delete(id);
    }

    // Sync active chat animations
    const activeChatIds = new Set();
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      activeChatIds.add(c.id);
      if (!chatAnim.has(c.id)) {
        const h = hashString(c.id);
        chatAnim.set(c.id, {
          alpha: hasInitializedState && !reducedMotion ? 0.05 : 1,
          dimAlpha: 1,
          pulsePhase: (h % 628) / 100,
        });
      }
    }
    for (const id of chatAnim.keys()) {
      if (!activeChatIds.has(id)) chatAnim.delete(id);
    }

    const prevSpan = district.fitSpan;
    recomputeDistrictBounds();

    if (!hasInitializedState && (buildings.length > 0 || chats.length > 0)) {
      hasInitializedState = true;
      if (!userMovedCamera) applyAutoFit(true);
    } else if (Math.abs(district.fitSpan - prevSpan) > 40 && !userMovedCamera) {
      applyAutoFit(false);
    }

    // Refresh hover payload cleanly if currently hovering an item
    if (hoveredItem) {
      let updated = null;
      if (hoveredItem.kind === 'building') {
        const b = buildings.find((x) => x.id === hoveredItem.id);
        if (b) updated = { kind: 'building', id: b.id, building: b };
      } else {
        const c = chats.find((x) => x.id === hoveredItem.id);
        if (c) updated = { kind: 'chat', id: c.id, chat: c };
      }
      if (!updated) {
        clearHover();
      } else if (lastHoverScreen) {
        onHover(updated, lastHoverScreen);
      }
    }
  }

  function setFilter(statusOrAll) {
    filter = statusOrAll || 'all';
  }

  function setSelected(sel) {
    if (!sel) {
      selection = null;
    } else if (typeof sel === 'string') {
      selection = { kind: 'chat', id: sel };
    } else if ((sel.kind || sel.type) && sel.id) {
      selection = { kind: sel.kind || sel.type, id: sel.id };
    } else {
      selection = null;
    }
  }

  function zoomIn() {
    clearHover();
    userMovedCamera = true;
    cam.targetZoom = Math.min(12.0, cam.targetZoom * 1.24);
    if (reducedMotion) cam.zoom = cam.targetZoom;
  }

  function zoomOut() {
    clearHover();
    userMovedCamera = true;
    cam.targetZoom = Math.max(0.38, cam.targetZoom / 1.24);
    if (hqFocused && cam.targetZoom < HQ_EXIT_ZOOM) {
      hqFocused = false;
      notifyHQMode(false);
    }
    if (reducedMotion) cam.zoom = cam.targetZoom;
  }

  function orbit(deltaRad) {
    if (!Number.isFinite(deltaRad)) return;
    clearHover();
    cam.targetYaw += deltaRad;
    if (reducedMotion) cam.yaw = cam.targetYaw;
  }

  function setTilt(mode) {
    clearHover();
    tiltMode = mode === 'overview' ? 'overview' : '3d';
    cam.targetPitch = tiltMode === 'overview' ? PITCH_OVERVIEW : PITCH_3D;
    if (!userMovedCamera) {
      cam.targetZoom = computeAutoFitZoom(cam.targetPitch);
    }
    if (reducedMotion) {
      cam.pitch = cam.targetPitch;
      cam.zoom = cam.targetZoom;
    }
    return tiltMode;
  }

  function toggleTilt() {
    return setTilt(tiltMode === '3d' ? 'overview' : '3d');
  }

  function resetView() {
    clearHover();
    hqFocused = false;
    notifyHQMode(false);
    userMovedCamera = false;
    tiltMode = '3d';
    cam.targetYaw = DEFAULT_YAW;
    cam.targetPitch = PITCH_3D;
    applyAutoFit(false);
  }

  function focusHQZone(zone = 'overview') {
    clearHover();
    hqFocused = true;
    notifyHQMode(true);
    userMovedCamera = true;
    tiltMode = '3d';
    const wp = gridToWorld(hqData?.gridX ?? 0, hqData?.gridY ?? 0);
    const availW = viewW >= 1100 ? viewW - 380 : viewW - 48;
    const availH = Math.max(360, viewH - 128);
    const baseZ = Math.max(1.45, Math.min(3.2, Math.min(availW / 490, availH / 300)));
    const roomZ = Math.max(3.6, Math.min(5.6, baseZ * 2.1));

    let ox = 0;
    let oy = 6;
    let targetZ = baseZ;
    let targetPitch = (52 * Math.PI) / 180;
    if (zone === 'command') {
      ox = 0;
      oy = 86;
      targetZ = roomZ;
      targetPitch = (50 * Math.PI) / 180;
    } else if (zone === 'sleep_pods') {
      ox = -147;
      oy = 86;
      targetZ = roomZ;
      targetPitch = (52 * Math.PI) / 180;
    } else if (zone === 'war_room') {
      ox = -120;
      oy = -84;
      targetZ = roomZ;
      targetPitch = (50 * Math.PI) / 180;
    } else if (zone === 'lab') {
      ox = 120;
      oy = -84;
      targetZ = roomZ;
      targetPitch = (50 * Math.PI) / 180;
    } else if (zone === 'lounge') {
      ox = 147;
      oy = 86;
      targetZ = roomZ;
      targetPitch = (52 * Math.PI) / 180;
    }
    const drawerShiftX = viewW >= 1100 ? 180 / targetZ : 0;
    rpg.targetX = zone === 'overview' ? 0 : ox;
    rpg.targetY = zone === 'overview' ? 6 : oy;
    cam.targetX = wp.x + ox + drawerShiftX;
    cam.targetY = wp.y + oy;
    cam.targetPitch = targetPitch;
    cam.targetYaw = 0;
    cam.targetZoom = targetZ;
    if (reducedMotion) {
      rpg.x = rpg.targetX;
      rpg.y = rpg.targetY;
      cam.x = cam.targetX;
      cam.y = cam.targetY;
      cam.pitch = cam.targetPitch;
      cam.yaw = cam.targetYaw;
      cam.zoom = cam.targetZoom;
      hqCutaway = 1;
    }
  }

  function focusHQ() {
    focusHQZone('overview');
  }

  function exitHQInterior() {
    clearHover();
    hqFocused = false;
    notifyHQMode(false);
    userMovedCamera = false;
    tiltMode = '3d';
    cam.targetYaw = DEFAULT_YAW;
    cam.targetPitch = PITCH_3D;
    applyAutoFit(false);
    if (reducedMotion) hqCutaway = 0;
  }

  function isHQFocused() {
    return Boolean(hqFocused || hqCutaway > 0.45);
  }

  function focusItem(kind, id) {
    if (kind === 'hq' || kind === 'foreman') {
      focusHQ();
      return;
    }
    let target = null;
    if (kind === 'agent') {
      const roster = getEffectiveRoster();
      const ag = roster.find((a) => a.id === id);
      if (ag && (ag.location === 'hq' || ag.zone === 'sleep_pods' || ag.zone === 'lounge' || ag.zone === 'war_room' || ag.zone === 'lab')) {
        if (ag.zone === 'sleep_pods' || ag.zone === 'lounge' || ag.zone === 'war_room' || ag.zone === 'lab') {
          focusHQZone(ag.zone);
        } else {
          focusHQ();
        }
        return;
      }
      if (ag && Number.isFinite(ag.gridX) && Number.isFinite(ag.gridY)) {
        target = ag;
      } else if (ag && ag.buildingId) {
        target = buildings.find((b) => b.id === ag.buildingId);
      }
      if (!target) target = chats.find((c) => c.id === id);
    } else if (kind === 'building') {
      target = buildings.find((b) => b.id === id);
    } else {
      target = chats.find((c) => c.id === id);
      if (target && target.status === 'done' && target.builtBuildingId) {
        const b = buildings.find((x) => x.id === target.builtBuildingId);
        if (b) target = b;
      }
    }
    if (!target) return;
    clearHover();
    hqFocused = false;
    notifyHQMode(false);
    userMovedCamera = true;
    const wp = gridToWorld(target.gridX, target.gridY);
    const targetZ = Math.max(1.18, Math.min(1.68, computeAutoFitZoom(cam.targetPitch) * 1.48));
    const drawerShift = viewW >= 960 ? 145 / targetZ : 0;
    const cY = Math.cos(cam.targetYaw);
    const sY = Math.sin(cam.targetYaw);
    cam.targetX = wp.x + drawerShift * cY;
    cam.targetY = wp.y - drawerShift * sY;
    cam.targetZoom = targetZ;
    if (reducedMotion) {
      cam.x = cam.targetX;
      cam.y = cam.targetY;
      cam.zoom = cam.targetZoom;
    }
  }

  function triggerCelebration(buildingId) {
    const b = buildings.find((x) => x.id === buildingId);
    if (!b) return;
    const anim = buildingAnim.get(buildingId);
    if (anim) {
      anim.celebrateT = 1;
      if (anim.rise >= 0.99 && !reducedMotion) {
        anim.rise = 0.08;
      }
    }
    if (!reducedMotion) {
      const wp = gridToWorld(b.gridX, b.gridY);
      spawnCelebrationBurst(wp.x, wp.y, b.buildingType === 'flat' ? 102 : 48);
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Determine Active Construction Chats vs Built Permanent Buildings
  // -------------------------------------------------------------------------
  function getLinkedDoneBuildingIds() {
    const set = new Set();
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (c.status === 'done' && c.builtBuildingId) {
        set.add(c.builtBuildingId);
      }
    }
    return set;
  }

  function isActiveConstructionChat(chat, buildingIdSet, buildingChatIdSet) {
    if (chat.status === 'done') {
      if (chat.builtBuildingId && buildingIdSet.has(chat.builtBuildingId)) return false;
      if (buildingChatIdSet && buildingChatIdSet.has(chat.id)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Hit Testing & Pointer Interaction
  // -------------------------------------------------------------------------
  function hitTestScreen(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    syncCameraBasis();

    const candidates = [];

    if (!(hqCutaway > 0.35 || hqFocused)) {
      const buildingIds = new Set(buildings.map((b) => b.id));
      const buildingChatIds = new Set(buildings.map((b) => b.chatId).filter(Boolean));

      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        const wp = gridToWorld(b.gridX, b.gridY);
        const topZ = b.buildingType === 'flat' ? 28 + Math.min(12, b.floors || 6) * 12 : 46;
        const pBase = project(wp.x, wp.y, 14);
        const pTop = project(wp.x, wp.y, topZ);
        candidates.push({
          kind: 'building',
          id: b.id,
          building: b,
          depth: pBase.depth,
          sx: pBase.sx,
          topY: Math.min(pBase.sy - 32 * pBase.scale, pTop.sy - 12 * pTop.scale),
          botY: pBase.sy + 38 * pBase.scale,
          rx: 56 * pBase.scale,
        });
      }

      for (let i = 0; i < chats.length; i++) {
        const c = chats[i];
        if (!isActiveConstructionChat(c, buildingIds, buildingChatIds)) continue;
        const wp = gridToWorld(c.gridX, c.gridY);
        const pBase = project(wp.x, wp.y, 20);
        candidates.push({
          kind: 'chat',
          id: c.id,
          chat: c,
          depth: pBase.depth - 2,
          sx: pBase.sx,
          topY: pBase.sy - 72 * pBase.scale,
          botY: pBase.sy + 48 * pBase.scale,
          rx: 60 * pBase.scale,
        });
      }
    }

    // Include HQ building & cutaway interior (Uitvoerder + HQ agents) hitboxes
    for (let i = 0; i < hqHitboxes.length; i++) {
      candidates.push(hqHitboxes[i]);
    }

    // Front-to-back order (smallest camera depth wins)
    candidates.sort((a, b) => a.depth - b.depth);

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (sx >= cand.sx - cand.rx && sx <= cand.sx + cand.rx && sy >= cand.topY && sy <= cand.botY) {
        if (cand.kind === 'hq') {
          return { type: 'hq', kind: 'hq', id: cand.id, hq: cand.hq };
        }
        if (cand.kind === 'foreman') {
          return { type: 'foreman', kind: 'foreman', id: cand.id, foreman: cand.foreman };
        }
        if (cand.kind === 'hq_holo') {
          return { type: 'hq_holo', kind: 'hq_holo', id: cand.id, label: cand.label };
        }
        if (cand.kind === 'hq_zone') {
          return { type: 'hq_zone', kind: 'hq_zone', zone: cand.zone, id: cand.id, label: cand.label };
        }
        if (cand.kind === 'agent') {
          return { type: 'agent', kind: 'agent', id: cand.id, inHQ: true, agent: cand.agent };
        }
        return cand.kind === 'building'
          ? { kind: 'building', id: cand.id, building: cand.building }
          : { kind: 'chat', id: cand.id, chat: cand.chat };
      }
    }
    return null;
  }

  function handleContextMenu(e) {
    e.preventDefault();
  }

  function handlePointerDown(e) {
    const isRight = e.button === 2;
    const isOrbit = isRight || (e.button === 0 && e.shiftKey);
    if (!isOrbit && e.button !== 0 && e.pointerType === 'mouse') return;

    pointer.down = true;
    pointer.dragging = false;
    pointer.mode = isOrbit ? 'orbit' : 'pan';
    pointer.pointerId = e.pointerId;
    pointer.startX = e.clientX;
    pointer.startY = e.clientY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;

    syncCameraBasis();
    const w = unprojectFloor(e.clientX, e.clientY);
    pointer.grabWorldX = w.x;
    pointer.grabWorldY = w.y;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {
      // Ignore synthetic capture failures
    }
  }

  function handlePointerMove(e) {
    if (pointer.down) {
      const dist = Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY);
      if (!pointer.dragging && dist > 5) {
        pointer.dragging = true;
        clearHover();
      }

      if (pointer.dragging) {
        const dx = e.clientX - pointer.lastX;
        const dy = e.clientY - pointer.lastY;
        pointer.lastX = e.clientX;
        pointer.lastY = e.clientY;

        if (pointer.mode === 'orbit') {
          cam.targetYaw += dx * 0.0075;
          cam.targetPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, cam.targetPitch + dy * 0.0055));
          tiltMode = cam.targetPitch >= (PITCH_3D + PITCH_OVERVIEW) * 0.5 ? 'overview' : '3d';
          cam.yaw = cam.targetYaw;
          cam.pitch = cam.targetPitch;
        } else {
          userMovedCamera = true;
          syncCameraBasis();
          const curW = unprojectFloor(e.clientX, e.clientY);
          const pad = 260;
          cam.targetX = Math.max(district.minX - pad, Math.min(district.maxX + pad, cam.x + (pointer.grabWorldX - curW.x)));
          cam.targetY = Math.max(district.minY - pad, Math.min(district.canalY + pad, cam.y + (pointer.grabWorldY - curW.y)));
          cam.x = cam.targetX;
          cam.y = cam.targetY;
        }
        updateCursor();
        return;
      }
    }

    const hit = hitTestScreen(e.clientX, e.clientY);
    const same = hit && hoveredItem && hit.kind === hoveredItem.kind && hit.id === hoveredItem.id;
    if (!same) {
      hoveredItem = hit ? { kind: hit.kind, id: hit.id } : null;
      lastHoverScreen = hit ? { x: e.clientX, y: e.clientY } : null;
      onHover(hit, lastHoverScreen);
    } else if (hit) {
      lastHoverScreen = { x: e.clientX, y: e.clientY };
      onHover(hit, lastHoverScreen);
    }
    updateCursor();
  }

  function handlePointerUp(e) {
    if (!pointer.down) return;
    const wasDragging = pointer.dragging;
    const wasOrbit = pointer.mode === 'orbit';
    pointer.down = false;
    pointer.dragging = false;
    try {
      if (pointer.pointerId != null) canvas.releasePointerCapture(pointer.pointerId);
    } catch (_) {
      // Ignore
    }
    pointer.pointerId = null;

    if (!wasDragging && !wasOrbit) {
      const hit = hitTestScreen(e.clientX, e.clientY);
      const insideHQ = hqCutaway > 0.35 || hqFocused;
      if (insideHQ && (!hit || hit.kind === 'hq')) {
        // Click empty HQ floor -> smoothly glide RPG camera target to that floor point
        syncCameraBasis();
        const w = unprojectFloor(e.clientX, e.clientY);
        const hqW = gridToWorld(hqData?.gridX ?? 0, hqData?.gridY ?? 0);
        const lx = w.x - hqW.x;
        const ly = w.y - hqW.y;
        if (Math.abs(lx) <= HQ_FLOOR_CLICK_X && Math.abs(ly) <= HQ_FLOOR_CLICK_Y) {
          rpg.targetX = Math.max(-HQ_WALK_X, Math.min(HQ_WALK_X, lx));
          rpg.targetY = Math.max(-HQ_WALK_Y, Math.min(HQ_WALK_Y, ly));
          const drawerShiftX = viewW >= 1100 ? 180 / Math.max(1.45, cam.targetZoom) : 0;
          cam.targetX = hqW.x + rpg.targetX + drawerShiftX;
          cam.targetY = hqW.y + rpg.targetY;
          if (reducedMotion) {
            rpg.x = rpg.targetX;
            rpg.y = rpg.targetY;
            cam.x = cam.targetX;
            cam.y = cam.targetY;
          }
        }
      } else if (hit) {
        if (hit.kind === 'hq' && !hqFocused && hqCutaway < 0.45) {
          focusHQ();
        }
        selection = { kind: hit.kind, id: hit.id };
        onSelect(hit);
      } else {
        selection = null;
        onSelect(null);
      }
    }
    updateCursor();
  }

  function handlePointerLeave() {
    if (!pointer.down) clearHover();
  }

  function handleWheel(e) {
    e.preventDefault();
    clearHover();
    userMovedCamera = true;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    cam.targetZoom = Math.max(0.38, Math.min(12.0, cam.targetZoom * factor));
    if (hqFocused && cam.targetZoom < HQ_EXIT_ZOOM) {
      hqFocused = false;
      notifyHQMode(false);
      cam.targetYaw = DEFAULT_YAW;
      cam.targetPitch = PITCH_3D;
    }
    if (reducedMotion) cam.zoom = cam.targetZoom;
  }

  function isTypingInForm() {
    if (typeof document === 'undefined') return false;
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el.isContentEditable);
  }

  function handleKeyDown(e) {
    if (isTypingInForm()) return;
    if (!(hqFocused || hqCutaway > 0.45)) return;
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') {
      keys.up = true;
      if (code === 'ArrowUp') e.preventDefault();
    } else if (code === 'KeyS' || code === 'ArrowDown') {
      keys.down = true;
      if (code === 'ArrowDown') e.preventDefault();
    } else if (code === 'KeyA' || code === 'ArrowLeft') {
      keys.left = true;
      if (code === 'ArrowLeft') e.preventDefault();
    } else if (code === 'KeyD' || code === 'ArrowRight') {
      keys.right = true;
      if (code === 'ArrowRight') e.preventDefault();
    } else if (code === 'KeyE' && !e.repeat && rpg.nearest) {
      e.preventDefault();
      const nr = rpg.nearest;
      selection = { kind: nr.kind, id: nr.id };
      onSelect(nr.payload);
    }
  }

  function handleKeyUp(e) {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.up = false;
    else if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
    else if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
    else if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
  }

  function handleWindowBlur() {
    keys.up = keys.down = keys.left = keys.right = false;
  }

  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
  }

  // -------------------------------------------------------------------------
  // Tokyo Ground, Waterfront Canal, Avenues, Crosswalks & Growth Elements
  // -------------------------------------------------------------------------
  function drawTokyoGroundAndCanal(level) {
    const { minGX, maxGX, minGY, maxGY, minX, maxX, minY, maxY, canalY } = district;

    // 1. Main Urban Asphalt Platform (with clean 3D embankment drop down to Tokyo Canal!)
    const g0 = project(minX, minY, 0);
    const g1 = project(maxX, minY, 0);
    const g2 = project(maxX, maxY, 0);
    const g3 = project(minX, maxY, 0);

    // Concrete seawall embankment along canal edge (z = -14 -> 0)
    const w2 = project(maxX, maxY, -14);
    const w3 = project(minX, maxY, -14);
    fillQuad(ctx, g3, g2, w2, w3, '#2d3748', '#111827', 1);

    // Shimmering Dark-Teal Tokyo Waterfront Canal / Bay
    const cTop = maxY;
    const cBot = canalY + 95;
    const cL = minX - 180;
    const cR = maxX + 180;
    fillQuad(
      ctx,
      project(cL, cTop, -12),
      project(cR, cTop, -12),
      project(cR, cBot, -12),
      project(cL, cBot, -12),
      '#153242',
      'rgba(56, 189, 248, 0.20)',
      1.2
    );

    // Subtle twilight canal water ripples & warm harbor reflections
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.16)';
    ctx.lineWidth = 1.1;
    const waveShift = reducedMotion ? 0 : Math.sin(elapsed * 0.9) * 14;
    for (let r = 0; r < 6; r++) {
      const wy = cTop + 26 + r * 26;
      const wx0 = cL + 90 + ((r * 137) % 240) + waveShift * (r % 2 === 0 ? 1 : -1);
      const p0 = project(wx0, wy, -11.5);
      const p1 = project(wx0 + 110 + (r % 3) * 45, wy, -11.5);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();
    }

    // Warm city reflection glow streaks shimmering on the canal surface
    for (let i = minGX; i <= maxGX; i++) {
      const rx = i * CELL_PITCH;
      const rp = project(rx, cTop + 42, -11);
      stampSprite(ctx, assets.glowTungsten, rp.sx, rp.sy, 46 * rp.scale, 16 * rp.scale, level >= 5 ? 0.34 : 0.20, true);
    }

    // Far-side waterfront promenade strip across the canal (connected by bridges at Level 3+)
    fillQuad(
      ctx,
      project(cL + 60, cBot - 22, -4),
      project(cR - 60, cBot - 22, -4),
      project(cR - 60, cBot + 42, -4),
      project(cL + 60, cBot + 42, -4),
      '#222a36',
      'rgba(148, 163, 184, 0.24)',
      1
    );

    // Level 5: Subtle glowing harbor buoys / lights floating on the canal
    if (level >= 5) {
      for (let i = -2; i <= 2; i++) {
        const bx = i * 195 + (reducedMotion ? 0 : Math.sin(elapsed + i) * 4);
        const by = cTop + 88 + (i % 2) * 18;
        const bp = project(bx, by, -10);
        stampSprite(ctx, i % 2 === 0 ? assets.glowAmber : assets.glowCyan, bp.sx, bp.sy, 16 * bp.scale, 10 * bp.scale, 0.55, true);
        ctx.fillStyle = i % 2 === 0 ? '#fde68a' : '#7dd3fc';
        ctx.beginPath();
        ctx.arc(bp.sx, bp.sy, Math.max(1.3, 2.0 * bp.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Main City Charcoal-Slate Asphalt Ground
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g0.sx, g0.sy);
    ctx.lineTo(g1.sx, g1.sy);
    ctx.lineTo(g2.sx, g2.sy);
    ctx.lineTo(g3.sx, g3.sy);
    ctx.closePath();
    ctx.fillStyle = '#1b212b';
    ctx.fill();
    if (concretePattern) {
      ctx.clip();
      ctx.fillStyle = concretePattern;
      ctx.fillRect(0, 0, viewW, viewH);
    }
    ctx.restore();

    // Crisp outer boulevard concrete curb rim
    fillQuad(ctx, g0, g1, g2, g3, null, 'rgba(148, 163, 184, 0.28)', 1.4);

    // 3. Road Center Lane Markings, Grand Boulevards (gx===0 / gy===0 / |4|), & Shibuya Scramble Crossing!
    const isBoulevard = (g) => g === 0 || Math.abs(g) === 4 || Math.abs(g) === 8;

    // Grand boulevard dual-lane stripes along gx===0 and gy===0
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([8, 10]);
    for (let gy = minGY; gy <= maxGY; gy++) {
      if (!isBoulevard(gy)) continue;
      const by = gy * CELL_PITCH;
      const p0 = project(minX + 14, by, 0.4);
      const p1 = project(maxX - 14, by, 0.4);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();
    }
    for (let gx = minGX; gx <= maxGX; gx++) {
      if (!isBoulevard(gx)) continue;
      const bx = gx * CELL_PITCH;
      const p0 = project(bx, minY + 14, 0.4);
      const p1 = project(bx, maxY - 14, 0.4);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Perimeter crosswalks framing the central Hoofdkantoor (HQ) plaza at (0, 0)
    if (minGX <= 0 && maxGX >= 0 && minGY <= 0 && maxGY >= 0) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.40)';
      ctx.lineWidth = 1.9;
      for (let k = -3; k <= 3; k++) {
        // North & South crosswalks outside HQ plaza
        const n0 = project(k * 13, -58, 0.5);
        const n1 = project(k * 13, -74, 0.5);
        const s0 = project(k * 13, 58, 0.5);
        const s1 = project(k * 13, 74, 0.5);
        ctx.beginPath();
        ctx.moveTo(n0.sx, n0.sy);
        ctx.lineTo(n1.sx, n1.sy);
        ctx.moveTo(s0.sx, s0.sy);
        ctx.lineTo(s1.sx, s1.sy);
        ctx.stroke();
        // East & West crosswalks outside HQ plaza
        const e0 = project(58, k * 13, 0.5);
        const e1 = project(74, k * 13, 0.5);
        const w0 = project(-58, k * 13, 0.5);
        const w1 = project(-74, k * 13, 0.5);
        ctx.beginPath();
        ctx.moveTo(e0.sx, e0.sy);
        ctx.lineTo(e1.sx, e1.sy);
        ctx.moveTo(w0.sx, w0.sy);
        ctx.lineTo(w1.sx, w1.sy);
        ctx.stroke();
      }
    }

    // 4. Raised Concrete Sidewalk Blocks for Parcel Lots (skipping boulevard axes!)
    for (let gx = minGX; gx <= maxGX; gx++) {
      if (isBoulevard(gx)) continue;
      for (let gy = minGY; gy <= maxGY; gy++) {
        if (isBoulevard(gy)) continue;
        const cx = gx * CELL_PITCH;
        const cy = gy * CELL_PITCH;
        const p0 = project(cx - BLOCK_HALF, cy - BLOCK_HALF, 1.8);
        const p1 = project(cx + BLOCK_HALF, cy - BLOCK_HALF, 1.8);
        const p2 = project(cx + BLOCK_HALF, cy + BLOCK_HALF, 1.8);
        const p3 = project(cx - BLOCK_HALF, cy + BLOCK_HALF, 1.8);
        fillQuad(ctx, p0, p1, p2, p3, '#28303c', '#3e4756', 1.0);
      }
    }

    // 5. Level 3+: Elegant Modern 3D Tokyo Canal Bridges spanning the waterway!
    if (level >= 3) {
      const bridgeXs = [0, Math.max(1, maxGX - 1) * CELL_PITCH - CELL_PITCH * 0.5, Math.min(-1, minGX + 1) * CELL_PITCH + CELL_PITCH * 0.5];
      const usedCount = level >= 4 ? 3 : 2;
      for (let b = 0; b < usedCount; b++) {
        drawCanalBridge3D(bridgeXs[b], cTop, cBot - 16);
      }
    }

    // 6. Level 3+: Gliding Street Cars along the Grand Boulevards (x=0, y=0) & Side Streets
    if (level >= 3) {
      const activeCars = level >= 5 ? CAR_COUNT : 6;
      for (let i = 0; i < activeCars; i++) {
        const car = cars[i];
        let wx, wy;
        if (car.axis === 'x') {
          wy = i < 4 ? car.dir * 16 : (Math.max(minGY, Math.min(maxGY, car.laneIdx)) + 0.5) * CELL_PITCH + car.dir * 5;
          wx = car.pos;
          if (wx < minX + 16 || wx > maxX - 16) continue;
        } else {
          wx = i < 4 ? -car.dir * 16 : (Math.max(minGX, Math.min(maxGX, car.laneIdx)) + 0.5) * CELL_PITCH - car.dir * 5;
          wy = car.pos;
          if (wy < minY + 16 || wy > maxY - 16) continue;
        }
        const cp = project(wx, wy, 3.2);
        const cs = cp.scale;
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.ellipse(cp.sx, cp.sy, 5.4 * cs, 3.1 * cs, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm headlights ahead & red taillights behind
        const hx = car.axis === 'x' ? wx + car.dir * 8 : wx;
        const hy = car.axis === 'y' ? wy + car.dir * 8 : wy;
        const tx = car.axis === 'x' ? wx - car.dir * 7 : wx;
        const ty = car.axis === 'y' ? wy - car.dir * 7 : wy;
        const hp = project(hx, hy, 2.5);
        const tp = project(tx, ty, 2.5);
        stampSprite(ctx, assets.glowTungsten, hp.sx, hp.sy, 14 * cs, 10 * cs, 0.48, true);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tp.sx, tp.sy, Math.max(1.1, 1.8 * cs), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCanalBridge3D(bx, yStart, yEnd) {
    const bw = 20;
    const deckZ = 6;
    const midY = (yStart + yEnd) * 0.5;

    // Bridge shadow on water
    fillQuad(
      ctx,
      project(bx - bw + 14, yStart, -11),
      project(bx + bw + 14, yStart, -11),
      project(bx + bw + 14, yEnd, -11),
      project(bx - bw + 14, yEnd, -11),
      'rgba(6, 12, 22, 0.36)'
    );

    // Bridge road deck
    fillQuad(
      ctx,
      project(bx - bw, yStart, deckZ),
      project(bx + bw, yStart, deckZ),
      project(bx + bw, yEnd, deckZ),
      project(bx - bw, yEnd, deckZ),
      '#334155',
      '#94a3b8',
      1.2
    );

    // Elegant white-steel twin arch ribs over canal
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(1.6, 2.6 * project(bx, midY, deckZ).scale);
    for (const side of [-bw + 2, bw - 2]) {
      const a0 = project(bx + side, yStart + 6, deckZ);
      const aPeak = project(bx + side, midY, deckZ + 38);
      const a1 = project(bx + side, yEnd - 6, deckZ);
      ctx.beginPath();
      ctx.moveTo(a0.sx, a0.sy);
      ctx.quadraticCurveTo(aPeak.sx, aPeak.sy, a1.sx, a1.sy);
      ctx.stroke();

      // Warm bridge deck light at arch crown
      const lp = project(bx + side, midY, deckZ + 18);
      stampSprite(ctx, assets.glowTungsten, lp.sx, lp.sy, 18 * lp.scale, 14 * lp.scale, 0.45, true);
    }
  }

  // -------------------------------------------------------------------------
  // Level 4+: Elevated Tokyo Monorail / Metro Viaduct & Gliding Passenger Train
  // -------------------------------------------------------------------------
  function drawTokyoMonorail3D() {
    const pad = 22;
    const lx0 = district.minX + pad;
    const lx1 = district.maxX - pad;
    const ly0 = district.minY + pad;
    const ly1 = district.maxY - pad;
    const vz = 52;

    const corners = [
      [lx0, ly0],
      [lx1, ly0],
      [lx1, ly1],
      [lx0, ly1],
    ];

    // Concrete T-piers around loop (fade foreground piers slightly so desks remain unobstructed)
    for (let e = 0; e < 4; e++) {
      const a = corners[e];
      const b = corners[(e + 1) % 4];
      const steps = 4;
      for (let k = 0; k < steps; k++) {
        const u = k / steps;
        const px = a[0] + (b[0] - a[0]) * u;
        const py = a[1] + (b[1] - a[1]) * u;
        const bot = project(px, py, 0);
        const top = project(px, py, vz);
        ctx.save();
        ctx.globalAlpha = bot.ry > (district.maxY - 40) * 0.55 ? 0.48 : 0.85;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(2, 4.2 * bot.scale);
        ctx.beginPath();
        ctx.moveTo(bot.sx, bot.sy);
        ctx.lineTo(top.sx, top.sy);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Elevated guideway beam loop
    ctx.save();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = Math.max(2.6, 5.4 * project(0, 0, vz).scale);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const c = corners[i % 4];
      const p = project(c[0], c[1], vz);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();

    // Subtle cyan transit guide rail stripe
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = Math.max(0.9, 1.4 * project(0, 0, vz).scale);
    ctx.stroke();
    ctx.restore();

    // Smoothly gliding 4-car illuminated Tokyo Monorail train!
    const wLen = lx1 - lx0;
    const hLen = ly1 - ly0;
    const perim = 2 * (wLen + hLen);

    const sampleLoop = (dist) => {
      let d = ((dist % perim) + perim) % perim;
      if (d < wLen) return { x: lx0 + d, y: ly0 };
      d -= wLen;
      if (d < hLen) return { x: lx1, y: ly0 + d };
      d -= hLen;
      if (d < wLen) return { x: lx1 - d, y: ly1 };
      d -= wLen;
      return { x: lx0, y: ly1 - d };
    };

    const headDist = reducedMotion ? 160 : (elapsed * 125) % perim;
    for (let car = 3; car >= 0; car--) {
      const cFront = sampleLoop(headDist - car * 34);
      const cBack = sampleLoop(headDist - car * 34 - 28);
      const pF = project(cFront.x, cFront.y, vz + 6);
      const pB = project(cBack.x, cBack.y, vz + 6);
      const ts = pF.scale;

      // Sleek silver-white Tokyo train body
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(4, 9.5 * ts);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pB.sx, pB.sy);
      ctx.lineTo(pF.sx, pF.sy);
      ctx.stroke();

      // Warm lit passenger windows stripe
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = Math.max(1.8, 3.8 * ts);
      ctx.beginPath();
      ctx.moveTo(pB.sx, pB.sy);
      ctx.lineTo(pF.sx, pF.sy);
      ctx.stroke();

      if (car === 0) {
        stampSprite(ctx, assets.glowCyan, pF.sx, pF.sy, 22 * ts, 16 * ts, 0.56, true);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Main 60fps Simulation & Render Loop
  // -------------------------------------------------------------------------
  let rafId = null;
  let destroyed = false;
  let lastTs = performance.now();
  let elapsed = 0;

  function step(dt) {
    if (!reducedMotion) elapsed += dt;

    const damp = reducedMotion ? 1 : 1 - Math.exp(-9.5 * dt);
    cam.x += (cam.targetX - cam.x) * damp;
    cam.y += (cam.targetY - cam.y) * damp;
    let dyaw = ((cam.targetYaw - cam.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (dyaw < -Math.PI) dyaw += Math.PI * 2;
    cam.yaw += dyaw * damp;
    cam.pitch += (cam.targetPitch - cam.pitch) * damp;
    cam.zoom += (cam.targetZoom - cam.zoom) * damp;

    // Smooth HQ cutaway transition when focused OR zoomed in close to HQ (0,0)
    const hqW = gridToWorld(hqData?.gridX ?? 0, hqData?.gridY ?? 0);
    let targetCutaway = 0;
    if (hqFocused) {
      targetCutaway = 1;
    } else if (cam.zoom > 1.52) {
      const dist = Math.hypot(cam.x - hqW.x, cam.y - hqW.y);
      if (dist < 260) {
        const zoomFactor = Math.min(1, (cam.zoom - 1.52) / 0.82);
        const distFactor = Math.min(1, (260 - dist) / 130);
        targetCutaway = zoomFactor * distFactor;
      }
    }
    hqCutaway += (targetCutaway - hqCutaway) * damp;
    notifyHQMode(hqFocused || hqCutaway > 0.45);

    // RPG Camera WASD / Arrow movement inside HQ floor bounds
    if (hqFocused || hqCutaway > 0.45) {
      const moveR = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const moveF = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      if (moveR !== 0 || moveF !== 0) {
        const len = Math.hypot(moveR, moveF) || 1;
        const speed = 115 * dt;
        const cY = Math.cos(cam.yaw);
        const sY = Math.sin(cam.yaw);
        const dx = ((moveR / len) * cY + (moveF / len) * -sY) * speed;
        const dy = ((moveR / len) * -sY + (moveF / len) * -cY) * speed;
        rpg.targetX = Math.max(-HQ_WALK_X, Math.min(HQ_WALK_X, rpg.targetX + dx));
        rpg.targetY = Math.max(-HQ_WALK_Y, Math.min(HQ_WALK_Y, rpg.targetY + dy));
        if (cam.targetZoom < 3.4) cam.targetZoom = 3.8;
        const drawerShiftX = viewW >= 1100 ? 180 / Math.max(1.45, cam.targetZoom) : 0;
        cam.targetX = hqW.x + rpg.targetX + drawerShiftX;
        cam.targetY = hqW.y + rpg.targetY;
        userMovedCamera = true;
      }
      rpg.x += (rpg.targetX - rpg.x) * damp;
      rpg.y += (rpg.targetY - rpg.y) * damp;
    }

    // Autonomous walking agents (Kuroda, HQ Lounge agents, active Working site agents)
    const roster = getEffectiveRoster();
    const cYaw = Math.cos(cam.yaw);
    const sYaw = Math.sin(cam.yaw);

    const stepWalker = (id, waypoints, speed, defaultPause, seedOffset) => {
      let m = agentMotion.get(id);
      const h = hashString(id);
      if (!m) {
        const startIdx = (h + seedOffset) % waypoints.length;
        const wp0 = waypoints[startIdx];
        m = {
          x: wp0.x,
          y: wp0.y,
          wpIdx: (startIdx + 1) % waypoints.length,
          pauseT: 0.8 + ((h % 18) / 10),
          walkPhase: (h % 628) / 100,
          facing: 1,
          isWalking: false,
        };
        agentMotion.set(id, m);
      }
      const isPausedByUser =
        reducedMotion ||
        (hoveredItem && hoveredItem.id === id) ||
        (selection && selection.id === id);
      if (isPausedByUser) {
        m.isWalking = false;
        return;
      }
      if (m.pauseT > 0) {
        m.pauseT -= dt;
        m.isWalking = false;
        return;
      }
      const dst = waypoints[m.wpIdx % waypoints.length];
      const dx = dst.x - m.x;
      const dy = dst.y - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1.2) {
        m.x = dst.x;
        m.y = dst.y;
        m.isWalking = false;
        m.wpIdx = (m.wpIdx + 1) % waypoints.length;
        m.pauseT = dst.pause != null ? dst.pause : defaultPause + ((h + m.wpIdx * 7) % 16) / 10;
      } else {
        const stepLen = Math.min(dist, speed * dt);
        const vx = (dx / dist) * stepLen;
        const vy = (dy / dist) * stepLen;
        m.x += vx;
        m.y += vy;
        m.isWalking = true;
        m.walkPhase += dt * 9.5;
        const screenDx = vx * cYaw - vy * sYaw;
        if (Math.abs(screenDx) > 0.001) m.facing = screenDx >= 0 ? 1 : -1;
      }
    };

    // 1. Uitvoerder Kuroda
    const foremanId = hqData?.foreman?.id || 'foreman-uitvoerder';
    stepWalker(foremanId, FOREMAN_WAYPOINTS, 18.0, 3.0, 0);

    // 2. HQ standby agents (lounge / war_room / lab) + active site working agents
    for (let i = 0; i < roster.length; i++) {
      const ag = roster[i];
      const isHQRoam =
        ag.zone === 'lounge' ||
        ag.zone === 'war_room' ||
        ag.zone === 'lab' ||
        (ag.location === 'hq' && ag.zone !== 'sleep_pods' && ag.status !== 'sleeping');
      if (isHQRoam) {
        stepWalker(ag.id, LOUNGE_WAYPOINTS, 20.0, 2.2, i);
      } else if (ag.status === 'working') {
        stepWalker(ag.id, SITE_WAYPOINTS, 13.0, 2.5, i);
      }
    }
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (resolveStatus(c.status) === 'working' && !agentMotion.has(c.id)) {
        stepWalker(c.id, SITE_WAYPOINTS, 13.0, 2.5, i);
      }
    }

    // Update nearest HQ interactable for [E] prompt
    if (hqFocused || hqCutaway > 0.45) {
      let best = null;
      let bestD = 52;
      const checkCand = (lx, ly, kind, id, promptLabel, payload) => {
        const d = Math.hypot(lx - rpg.x, ly - rpg.y);
        if (d < bestD) {
          bestD = d;
          best = { localX: lx, localY: ly, kind, id, promptLabel, payload };
        }
      };
      const fM = agentMotion.get(foremanId);
      const fm = hqData?.foreman || { id: foremanId, name: 'Kuroda', role: 'Uitvoerder' };
      checkCand(
        fM ? fM.x : -18,
        fM ? fM.y : 82,
        'foreman',
        foremanId,
        `Spreek ${fm.name || 'Kuroda'}`,
        { type: 'foreman', kind: 'foreman', id: foremanId, foreman: fm }
      );
      checkCand(-154, -157, 'hq_holo', 'hq-holo-display', 'Stadsstatus Holo', {
        type: 'hq_holo',
        kind: 'hq_holo',
        id: 'hq-holo-display',
        label: 'Stadsstatus Holo-Display',
      });
      for (let i = 0; i < roster.length; i++) {
        const ag = roster[i];
        if (ag.location !== 'hq' && ag.zone !== 'sleep_pods' && ag.zone !== 'lounge' && ag.zone !== 'war_room' && ag.zone !== 'lab') continue;
        const m = agentMotion.get(ag.id);
        let ax = 147;
        let ay = 86;
        if (m) {
          ax = m.x;
          ay = m.y;
        } else if (ag.zone === 'sleep_pods' || ag.status === 'sleeping') {
          ax = -147;
          ay = 86;
        } else if (ag.zone === 'war_room') {
          ax = -120;
          ay = -84;
        } else if (ag.zone === 'lab') {
          ax = 120;
          ay = -84;
        }
        checkCand(ax, ay, 'agent', ag.id, ag.name || 'Agent', {
          type: 'agent',
          kind: 'agent',
          id: ag.id,
          inHQ: true,
          agent: ag,
        });
      }
      rpg.nearest = best;
    } else {
      rpg.nearest = null;
    }

    // Building smooth rise-up (0 -> 1 over ~700ms) & celebration shimmer decay
    const bAlphaDamp = reducedMotion ? 1 : 1 - Math.exp(-8.5 * dt);
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const anim = buildingAnim.get(b.id);
      if (!anim) continue;
      if (anim.rise < 1) {
        anim.rise = reducedMotion ? 1 : Math.min(1, anim.rise + dt / 0.72);
      }
      if (anim.celebrateT > 0) {
        anim.celebrateT = reducedMotion ? 0 : Math.max(0, anim.celebrateT - dt / 1.5);
      }
      // Filter dimming: permanent buildings glow brightly on 'all' or 'done', soften gently as context on active filters
      const targetA = filter === 'all' || filter === 'done' ? 1 : 0.44;
      anim.alpha += (targetA - anim.alpha) * bAlphaDamp;
    }

    // Active construction chats fade & filter dimming
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      const anim = chatAnim.get(c.id);
      if (!anim) continue;
      anim.alpha += (1 - anim.alpha) * bAlphaDamp;
      const matches = filter === 'all' || resolveStatus(c.status) === filter;
      anim.dimAlpha += ((matches ? 1 : 0.24) - anim.dimAlpha) * bAlphaDamp;
    }

    if (!reducedMotion) {
      // Update pooled street cars (Level 3+)
      const level = cityMeta.level || 1;
      if (level >= 3) {
        const span = Math.max(district.maxX - district.minX, district.maxY - district.minY) + 60;
        const half = span * 0.5;
        for (let i = 0; i < CAR_COUNT; i++) {
          const car = cars[i];
          car.pos += car.dir * car.speed * dt;
          if (car.pos > half) car.pos = -half;
          if (car.pos < -half) car.pos = half;
        }
      }

      // Update pooled drifting pink sakura petals
      for (let i = 0; i < PETAL_COUNT; i++) {
        const p = petals[i];
        p.x += (p.vx + Math.sin(elapsed * 1.1 + p.phase) * 8) * dt;
        p.y += (p.vy + Math.cos(elapsed * 0.9 + p.phase) * 5) * dt;
        p.z += p.vz * dt;
        if (p.z < 4) {
          p.z = 160 + (i % 5) * 18;
          p.x = district.minX + ((i * 97 + elapsed * 25) % Math.max(400, district.maxX - district.minX));
          p.y = district.minY + ((i * 131) % Math.max(400, district.maxY - district.minY));
        }
      }

      // Update pooled celebration burst particles
      for (let i = 0; i < BURST_POOL_SIZE; i++) {
        const bp = burstParticles[i];
        if (!bp.active) continue;
        bp.life += dt;
        if (bp.life >= bp.maxLife) {
          bp.active = false;
          continue;
        }
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;
        bp.z += bp.vz * dt;
        bp.vz -= 52 * dt;
      }
    }
  }

  function render() {
    syncCameraBasis();
    const level = Math.max(1, Math.min(5, Number(cityMeta.level) || 1));

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const effectiveRoster = getEffectiveRoster();
    const hqGx = Number.isFinite(hqData?.gridX) ? hqData.gridX : 0;
    const hqGy = Number.isFinite(hqData?.gridY) ? hqData.gridY : 0;
    const hqWp = gridToWorld(hqGx, hqGy);

    // Exclusive HQ RPG Overview Mode: skip exterior city completely when hqCutaway >= 0.92
    if (hqCutaway >= 0.92) {
      hqHitboxes.length = 0;
      ctx.drawImage(assets.hqStudioBackdrop, 0, 0, viewW, viewH);
      drawHoofdkantoor3D(
        ctx,
        project,
        hqWp.x,
        hqWp.y,
        { ...hqData, roster: effectiveRoster },
        {
          cutaway: 1,
          selected: selection,
          hovered: hoveredItem,
          agentMotion,
          rpg,
        },
        elapsed,
        reducedMotion,
        hqHitboxes
      );
      ctx.drawImage(assets.vignette, 0, 0, viewW, viewH);
      ctx.restore();
      return;
    }

    // 1. Pre-baked Tokyo Twilight Sky Backdrop (zero per-frame gradient alloc)
    ctx.drawImage(assets.backdrop, 0, 0, viewW, viewH);

    // 2. Ground Asphalt, Waterfront Canal, Crosswalks, Sidewalk Blocks, Bridges & Cars
    drawTokyoGroundAndCanal(level);

    const buildingIdSet = new Set(buildings.map((b) => b.id));
    const buildingChatIdSet = new Set(buildings.map((b) => b.chatId).filter(Boolean));
    const linkedDoneBuildings = getLinkedDoneBuildingIds();

    // 3. Construction Site Floor Pads & Approval Perimeters
    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i];
      if (!isActiveConstructionChat(chat, buildingIdSet, buildingChatIdSet)) continue;
      const anim = chatAnim.get(chat.id);
      if (!anim) continue;
      const wp = gridToWorld(chat.gridX, chat.gridY);
      drawConstructionFloor3D(
        ctx,
        project,
        wp.x,
        wp.y,
        chat,
        {
          selected: selection?.kind === 'chat' && selection.id === chat.id,
          hovered: hoveredItem?.kind === 'chat' && hoveredItem.id === chat.id,
          alpha: anim.alpha * anim.dimAlpha,
          pulsePhase: anim.pulsePhase,
        },
        elapsed,
        reducedMotion
      );
    }

    // 4. Build True Painter's Depth-Sorted 3D Render Queue
    renderQueue.length = 0;
    hqHitboxes.length = 0;

    // 4a. Central Hoofdkantoor (HQ) at (0,0)
    // When transitioning into HQ (hqCutaway > 0.05), HQ is drawn AFTER the dark studio backdrop fade
    const drawHQOnTop = hqCutaway > 0.05;
    if (!drawHQOnTop) {
      const hqProj = project(hqWp.x, hqWp.y, 16);
      renderQueue.push({ kind: 'hq', depth: hqProj.depth, wx: hqWp.x, wy: hqWp.y });
    }

    // 4b. Permanent Completed 3D Buildings
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const wp = gridToWorld(b.gridX, b.gridY);
      const p = project(wp.x, wp.y, 16);
      renderQueue.push({ kind: 'building', depth: p.depth, b, wx: wp.x, wy: wp.y });
    }

    // 4c. Active AI Construction Sites
    for (let i = 0; i < chats.length; i++) {
      const c = chats[i];
      if (!isActiveConstructionChat(c, buildingIdSet, buildingChatIdSet)) continue;
      const wp = gridToWorld(c.gridX, c.gridY);
      const p = project(wp.x, wp.y, 16);
      renderQueue.push({ kind: 'construction', depth: p.depth, c, wx: wp.x, wy: wp.y });
    }

    // 4d. Level 2+: Warm Sodium-Amber Streetlamps & Blooming Sidewalk Sakura Trees
    if (level >= 2) {
      const { minGX, maxGX, minGY, maxGY, maxY } = district;
      const isBlvd = (g) => g === 0 || Math.abs(g) === 4 || Math.abs(g) === 8;
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (isBlvd(gx)) continue;
        for (let gy = minGY; gy <= maxGY; gy++) {
          if (isBlvd(gy)) continue;
          if ((gx + gy) % 2 !== 0 && Math.abs(gx) !== 1 && Math.abs(gy) !== 1) continue;
          const cornerX = gx > 0 ? -BLOCK_HALF - 3 : BLOCK_HALF + 3;
          const cornerY = gy > 0 ? -BLOCK_HALF - 3 : BLOCK_HALF + 3;
          const lx = gx * CELL_PITCH + cornerX;
          const ly = gy * CELL_PITCH + cornerY;
          const lp = project(lx, ly, 0);
          renderQueue.push({ kind: 'lamp', depth: lp.depth, x: lx, y: ly });
        }
      }
      // Waterfront promenade blooming sakura trees
      const treeStep = level >= 4 ? 1 : 2;
      for (let gx = minGX; gx <= maxGX; gx += treeStep) {
        if (gx === 0) continue;
        const tx = gx * CELL_PITCH;
        const ty = maxY - 12;
        const tp = project(tx, ty, 0);
        renderQueue.push({ kind: 'sakura', depth: tp.depth, x: tx, y: ty, phase: gx * 1.3 });
      }
    }

    // Sort strictly back-to-front (largest camera depth first)
    renderQueue.sort((a, b) => b.depth - a.depth);

    for (let i = 0; i < renderQueue.length; i++) {
      const item = renderQueue[i];
      if (item.kind === 'hq') {
        drawHoofdkantoor3D(
          ctx,
          project,
          item.wx,
          item.wy,
          { ...hqData, roster: effectiveRoster },
          {
            cutaway: hqCutaway,
            selected: selection,
            hovered: hoveredItem,
            agentMotion,
            rpg,
          },
          elapsed,
          reducedMotion,
          hqHitboxes
        );
      } else if (item.kind === 'building') {
        const anim = buildingAnim.get(item.b.id) || { rise: 1, celebrateT: 0, alpha: 1 };
        drawPermanentBuilding3D(
          ctx,
          project,
          item.wx,
          item.wy,
          item.b,
          {
            selected: selection?.kind === 'building' && selection.id === item.b.id,
            hovered: hoveredItem?.kind === 'building' && hoveredItem.id === item.b.id,
            isRecentlyDone: linkedDoneBuildings.has(item.b.id),
            rise: easeOutCubic(anim.rise),
            celebrateT: anim.celebrateT,
            alpha: anim.alpha,
            cityLevel: level,
          },
          elapsed,
          reducedMotion
        );
        // Draw any active working/waiting agents stationed at this building parcel
        const siteAgents = effectiveRoster.filter(
          (a) =>
            (a.status === 'working' || a.status === 'waiting') &&
            (a.buildingId === item.b.id ||
              (Number.isFinite(a.gridX) &&
                Number.isFinite(a.gridY) &&
                a.gridX === item.b.gridX &&
                a.gridY === item.b.gridY))
        );
        if (siteAgents.length > 0) {
          drawSiteAgents3D(
            ctx,
            project,
            item.wx,
            item.wy,
            siteAgents,
            elapsed,
            reducedMotion,
            hqCutaway <= 0.35 && cam.zoom >= 0.78,
            agentMotion
          );
        }
      } else if (item.kind === 'construction') {
        const anim = chatAnim.get(item.c.id) || { alpha: 1, dimAlpha: 1, pulsePhase: 0 };
        drawConstructionSite3D(
          ctx,
          project,
          item.wx,
          item.wy,
          item.c,
          {
            selected: selection?.kind === 'chat' && selection.id === item.c.id,
            hovered: hoveredItem?.kind === 'chat' && hoveredItem.id === item.c.id,
            alpha: anim.alpha * anim.dimAlpha,
            pulsePhase: anim.pulsePhase,
            agentMotion,
          },
          elapsed,
          reducedMotion
        );
      } else if (item.kind === 'lamp') {
        drawStreetlamp3D(ctx, project, item.x, item.y, 1, 1);
      } else if (item.kind === 'sakura') {
        drawSakuraTree3D(ctx, project, item.x, item.y, 0.92, elapsed, item.phase, reducedMotion);
      }
    }

    // 5. Level 4+: Elevated Tokyo Monorail Viaduct & Gliding Illuminated Train
    if (level >= 4) {
      drawTokyoMonorail3D();
    }

    // 5b. Smooth HQ Transition: fade opaque dark studio backdrop over exterior city & render HQ on top
    if (drawHQOnTop) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, hqCutaway * 1.18);
      ctx.drawImage(assets.hqStudioBackdrop, 0, 0, viewW, viewH);
      ctx.restore();
      drawHoofdkantoor3D(
        ctx,
        project,
        hqWp.x,
        hqWp.y,
        { ...hqData, roster: effectiveRoster },
        {
          cutaway: hqCutaway,
          selected: selection,
          hovered: hoveredItem,
          agentMotion,
          rpg,
        },
        elapsed,
        reducedMotion,
        hqHitboxes
      );
    }

    // 6. Drifting Pink Sakura Petals (Level 3+ or light dusk petals) & Celebration Bursts
    const petalLimit = level >= 3 ? PETAL_COUNT : 14;
    for (let i = 0; i < petalLimit; i++) {
      const p = petals[i];
      const sp = project(p.x, p.y, p.z);
      const a = Math.min(0.75, p.z / 40) * 0.72;
      if (a <= 0.03) continue;
      ctx.fillStyle = `rgba(251, 207, 232, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(sp.sx, sp.sy, Math.max(1.2, p.size * sp.scale), Math.max(0.8, p.size * 0.55 * sp.scale), elapsed + p.phase, 0, Math.PI * 2);
      ctx.fill();
    }

    // Celebration emerald-gold & sakura burst particles
    for (let i = 0; i < BURST_POOL_SIZE; i++) {
      const bp = burstParticles[i];
      if (!bp.active) continue;
      const sp = project(bp.x, bp.y, bp.z);
      const fade = 1 - bp.life / bp.maxLife;
      ctx.fillStyle = bp.isGold
        ? `rgba(110, 231, 183, ${(fade * 0.95).toFixed(3)})`
        : `rgba(251, 182, 206, ${(fade * 0.95).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sp.sx, sp.sy, Math.max(1.4, 2.8 * sp.scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Crisp Collision-Culled Architectural Nameplates HUD Pass
    // Hide ALL exterior city tags completely when inside HQ interior mode!
    labelQueue.length = 0;

    if (hqCutaway <= 0.35) {
      // Central Hoofdkantoor (HQ) nameplate
      const hqBaseP = project(hqWp.x, hqWp.y, 0);
      const hqItem = { kind: 'hq', id: hqData?.id || 'hq-central', hq: hqData };
      const hqScale = viewW < 900 ? hqBaseP.scale * 0.88 : hqBaseP.scale;
      const hqMetrics = measureCityLabel(ctx, hqItem, hqScale);
      const isHqSel = selection?.kind === 'hq';
      const isHqHov = hoveredItem?.kind === 'hq';
      labelQueue.push({
        item: hqItem,
        depth: hqBaseP.depth,
        x: hqBaseP.sx,
        y: hqBaseP.sy + 32 * hqBaseP.scale,
        metrics: hqMetrics,
        selected: isHqSel,
        hovered: isHqHov,
        alpha: Math.max(0, 1 - hqCutaway * 2.8),
        prio: isHqSel || isHqHov ? 5 : 4,
        hidden: false,
      });

      // Active construction plots show labels (omit 'done' chats already linked to a permanent building unless selected/hovered/filter==='done')
      for (let i = 0; i < chats.length; i++) {
        const c = chats[i];
        if (!isActiveConstructionChat(c, buildingIdSet, buildingChatIdSet)) continue;
        const isSel = selection?.kind === 'chat' && selection.id === c.id;
        const isHov = hoveredItem?.kind === 'chat' && hoveredItem.id === c.id;
        if (c.status === 'done' && (c.builtBuildingId || buildingChatIdSet.has(c.id)) && !isSel && !isHov && filter !== 'done') {
          continue;
        }
        const anim = chatAnim.get(c.id) || { alpha: 1, dimAlpha: 1 };
        const wp = gridToWorld(c.gridX, c.gridY);
        const baseP = project(wp.x, wp.y, 0);
        const item = { kind: 'chat', id: c.id, chat: c };
        const labelScale = viewW < 900 ? baseP.scale * 0.88 : baseP.scale;
        const metrics = measureCityLabel(ctx, item, labelScale);
        const st = resolveStatus(c.status);
        const prio = isSel || isHov ? 5 : st === 'waiting' || st === 'working' ? 3 : 2;
        labelQueue.push({
          item,
          depth: baseP.depth,
          x: baseP.sx,
          y: baseP.sy + 30 * baseP.scale,
          metrics,
          selected: isSel,
          hovered: isHov,
          alpha: anim.alpha * anim.dimAlpha,
          prio,
          hidden: false,
        });
      }

      // Permanent buildings: show when selected/hovered/filter==='done' or zoomed in, capped when zoomed out
      let ambientBuildingTags = 0;
      const maxAmbientBuildings = cam.zoom >= 1.45 ? 16 : cam.zoom >= 1.1 ? 8 : 0;
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        const isSel = selection?.kind === 'building' && selection.id === b.id;
        const isHov = hoveredItem?.kind === 'building' && hoveredItem.id === b.id;
        const isPriority = isSel || isHov || filter === 'done';
        if (!isPriority) {
          if (ambientBuildingTags >= maxAmbientBuildings) continue;
          ambientBuildingTags++;
        }
        const anim = buildingAnim.get(b.id) || { alpha: 1 };
        const wp = gridToWorld(b.gridX, b.gridY);
        const baseP = project(wp.x, wp.y, 0);
        const item = { kind: 'building', id: b.id, building: b };
        const labelScale = viewW < 900 ? baseP.scale * 0.88 : baseP.scale;
        const metrics = measureCityLabel(ctx, item, labelScale);
        labelQueue.push({
          item,
          depth: baseP.depth,
          x: baseP.sx,
          y: baseP.sy + 28 * baseP.scale,
          metrics,
          selected: isSel,
          hovered: isHov,
          alpha: anim.alpha,
          prio: isSel || isHov ? 5 : 1,
          hidden: false,
        });
      }

      // Priority-sorted greedy screen-space AABB collision culling (6px padding) — zero overlapping piles
      labelQueue.sort((a, b) => (b.prio !== a.prio ? b.prio - a.prio : a.depth - b.depth));
      for (let i = 0; i < labelQueue.length; i++) {
        const cur = labelQueue[i];
        const halfW = cur.metrics.w * 0.5 + 8;
        cur.x = Math.max(halfW, Math.min(viewW - halfW, cur.x));
        cur.y = Math.max(72, Math.min(viewH - 68, cur.y));
        for (let j = 0; j < i; j++) {
          const prev = labelQueue[j];
          if (prev.hidden) continue;
          const overlapX = (cur.metrics.w + prev.metrics.w) * 0.5 + 6 - Math.abs(cur.x - prev.x);
          const overlapY = (cur.metrics.h + prev.metrics.h) * 0.5 + 6 - Math.abs(cur.y - prev.y);
          if (overlapX > 0 && overlapY > 0) {
            cur.hidden = true;
            break;
          }
        }
      }

      for (let i = labelQueue.length - 1; i >= 0; i--) {
        const np = labelQueue[i];
        if (np.hidden) continue;
        drawCityLabelHUD(
          ctx,
          np.x,
          np.y,
          np.metrics,
          np.item,
          { selected: np.selected, hovered: np.hovered, alpha: np.alpha },
          elapsed,
          reducedMotion
        );
      }
    }

    // 8. Pre-baked Twilight Vignette (single drawImage, zero gradient alloc)
    ctx.drawImage(assets.vignette, 0, 0, viewW, viewH);

    ctx.restore();
  }

  function frame(now) {
    if (destroyed) return;
    if (typeof document !== 'undefined' && document.hidden) {
      rafId = null;
      return;
    }
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    step(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (destroyed || rafId != null) return;
    lastTs = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function handleVisibilityChange() {
    if (destroyed) return;
    if (document.hidden) {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      startLoop();
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Initial sizing, framing & start
  recomputeDistrictBounds();
  resize();
  applyAutoFit(true);
  updateCursor();
  if (typeof document === 'undefined' || !document.hidden) {
    startLoop();
  }

  function destroy() {
    destroyed = true;
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('resize', resize);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    canvas.removeEventListener('contextmenu', handleContextMenu);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
    canvas.removeEventListener('pointerleave', handlePointerLeave);
    canvas.removeEventListener('wheel', handleWheel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    }
    if (motionQuery) {
      if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotionChange);
      else if (motionQuery.removeListener) motionQuery.removeListener(onMotionChange);
    }
  }

  return {
    setState,
    setHQ,
    setFilter,
    setSelected,
    zoomIn,
    zoomOut,
    orbit,
    toggleTilt,
    setTilt,
    resetView,
    focusHQ,
    focusHQZone,
    exitHQInterior,
    isHQFocused,
    focusItem,
    triggerCelebration,
    resize,
    destroy,
  };
}

export const createOfficeScene = createCityScene;
