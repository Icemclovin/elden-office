import { createCityScene } from './scene.js';
import { createAudio } from './audio.js';

const STATUS_META = {
  waiting: { label: 'Wacht op mij', order: 0 },
  working: { label: 'Aan het werk', order: 1 },
  done: { label: 'Klaar', order: 2 },
  sleeping: { label: 'Slaapt', order: 3 }
};

const SOURCE_LABELS = {
  claude: 'Claude Code',
  antigravity: 'Antigravity',
  hermes: 'Hermes',
  gemini: 'Gemini',
  project: 'Lokaal project',
  demo: 'Simulatie'
};

const ROLE_LABELS = {
  architect: 'Architect',
  constructeur: 'Constructeur',
  stedenbouwer: 'Stedenbouwer',
  ingenieur: 'Ingenieur',
  tuinarchitect: 'Tuinarchitect',
  verkeersplanner: 'Verkeersplanner'
};

const BUILDING_TYPE_LABELS = {
  huis: 'Huis',
  flat: 'Flat',
  wolkenkrabber: 'Wolkenkrabber',
  mall: 'Winkelcentrum',
  infrastructuur: 'Infrastructuur'
};

const SUBTYPE_LABELS = {
  machiya: 'Machiya-stadshuis',
  cedar_house: 'Cederhout-woning',
  courtyard_home: 'Binnentuin-woning',
  glass_flat: 'Glas-en-beton flat',
  cedar_tower: 'Cederhouten woontoren',
  neon_flat: 'Moderne stadsflat',
  neon_spire: 'Neon-wolkenkrabber',
  led_tower: 'LED-skyline toren',
  cyber_citadel: 'Tokyo Megatoren',
  shibuya_mall: 'Shibuya Winkelcentrum',
  arcade_galleria: 'Glazen Winkelgalerij',
  sakura_park: 'Kersenbloesempark',
  metro_station: 'Metrostation',
  canal_bridge: 'Kanaalbrug',
  solar_hub: 'Zonne-energieplein',
  torii_plaza: 'Stadsplein met poort',
  townhouse: 'Rechtsegoing',
  zen_garden_home: 'Zen-tuinhuis',
  zen_penthouse: 'Zen-penthhouse flat',
  residence_tower: 'Residentie-toren',
  solar_tower: 'Jade Zonnpoon',
  aoyama_tower: 'Aoyama Hot-Pink flat',
  department_store: 'Warenhuis',
  night_bazaar: 'Avondmarkt in mall',
  harbor_lighthouse: 'Havenvuurtoren',
  waterfront_market: 'Havenmarkt'
};

const MILESTONES = [
  { level: 1, name: 'Kustdorp', min: 0 },
  { level: 2, name: 'Woonwijk', min: 4 },
  { level: 3, name: 'Groeiende Stad', min: 8 },
  { level: 4, name: 'Bruisende Wijk', min: 14 },
  { level: 5, name: 'Tokyo Metropool', min: 22 },
  { level: 6, name: 'Neon Megastad', min: 35 }
];

// Uniform 1.5px stroke SVG icons for building categories
const BUILDING_TYPE_SVGS = {
  huis: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5 12 4.5l8.5 7"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5V14h4v5.5"/></svg>',
  flat: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 20.5V4.5h13v16"/><path d="M3.5 20.5h17"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>',
  wolkenkrabber: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5v3M8 20.5V7.5l4-2 4 2v13M4 20.5h16M10.5 10.5h3M10.5 14h3M10.5 17.5h3"/></svg>',
  mall: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20.5h18M4.5 20.5V9.5h15v11M3.5 9.5 6 5.5h12l2.5 4M9.5 20.5v-5.5h5v5.5"/></svg>',
  infrastructuur: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 17.5h17"/><path d="M6 17.5a6 6 0 0 1 12 0"/><path d="M12 5.5v6M9.5 8l2.5-2.5L14.5 8"/></svg>'
};

const state = {
  chats: [],
  buildings: [],
  city: {
    level: 1,
    name: 'Kustdorp',
    totalBuildings: 0,
    houses: 0,
    flats: 0,
    skyscrapers: 0,
    malls: 0,
    infrastructure: 0,
    population: 0,
    beautyScore: 0,
    nextMilestone: 4,
    nextMilestoneName: 'Woonwijk',
    unlockedFeatures: [],
    hq: {
      id: 'hq-shin-ai',
      name: 'Shin-AI Hoofdkantoor',
      gridX: 1,
      gridY: -1,
      activeWorkers: 0,
      waitingWorkers: 0,
      totalAgents: 0,
      level: 1
    }
  },
  counts: { total: 0, working: 0, waiting: 0, done: 0, sleeping: 0 },
  demoActive: false,
  filter: 'all',
  selection: null, // { kind: 'chat' | 'building', id: string } | null
  registerOpen: false,
  registerTab: 'active', // 'active' | 'city'
  registerQuery: '',
  buildOpen: false,
  projectsOpen: false,
  projectsLoading: false,
  projectsError: '',
  projects: [],
  projectsQuery: '',
  selectedProjectPaths: new Set(),
  projectTypeOverrides: new Map(),
  tiltMode: '3d',
  hasInitialState: false,
  prevChatStatuses: new Map(),
  knownBuildingIds: new Set(),
  lastTopbarSig: '',
  lastDemoSig: '',
  lastRegisterSig: '',
  lastInspectorSig: ''
};

// DOM References
const els = {
  canvas: document.getElementById('city-canvas'),
  connStatus: document.getElementById('connection-status'),
  connLabel: document.querySelector('#connection-status .conn-label'),
  btnCityProgress: document.getElementById('btn-city-progress'),
  cityProgressText: document.getElementById('city-progress-text'),
  cityProgressFill: document.getElementById('city-progress-fill'),
  filterButtons: Array.from(document.querySelectorAll('.filter-pill')),
  waitingFilterBtn: document.querySelector('.filter-pill[data-filter="waiting"]'),
  countNodes: {
    total: document.querySelector('[data-count="total"]'),
    working: document.querySelector('[data-count="working"]'),
    waiting: document.querySelector('[data-count="waiting"]'),
    done: document.querySelector('[data-count="done"]'),
    sleeping: document.querySelector('[data-count="sleeping"]')
  },
  btnProjects: document.getElementById('btn-projects'),
  projectsBackdrop: document.getElementById('projects-backdrop'),
  projectsModal: document.getElementById('projects-modal'),
  btnProjectsClose: document.getElementById('btn-projects-close'),
  projectsSearch: document.getElementById('projects-search'),
  projectsList: document.getElementById('projects-list'),
  projectsSelectedCount: document.getElementById('projects-selected-count'),
  btnProjectsClear: document.getElementById('btn-projects-clear'),
  btnProjectsImport: document.getElementById('btn-projects-import'),
  btnBuildOrder: document.getElementById('btn-build-order'),
  buildPopover: document.getElementById('build-popover'),
  btnBuildClose: document.getElementById('btn-build-close'),
  buildForm: document.getElementById('build-form'),
  buildName: document.getElementById('build-name'),
  buildType: document.getElementById('build-type'),
  buildStatus: document.getElementById('build-status'),
  buildSummary: document.getElementById('build-summary'),
  buildFeedback: document.getElementById('build-feedback'),
  btnDemoBuildOne: document.getElementById('btn-demo-build-one'),
  btnDemoSeed: document.getElementById('btn-demo-seed'),
  btnDemoCycle: document.getElementById('btn-demo-cycle'),
  btnDemoClear: document.getElementById('btn-demo-clear'),
  btnCityReset: document.getElementById('btn-city-reset'),
  btnAudio: document.getElementById('btn-audio'),
  iconAudioOff: document.getElementById('icon-audio-off'),
  iconAudioOn: document.getElementById('icon-audio-on'),
  toastContainer: document.getElementById('toast-container'),
  registerDrawer: document.getElementById('register-drawer'),
  btnRegister: document.getElementById('btn-register'),
  btnRegisterClose: document.getElementById('btn-register-close'),
  btnRegisterCount: document.getElementById('btn-register-count'),
  tabActive: document.getElementById('tab-active'),
  tabCity: document.getElementById('tab-city'),
  tabActiveCount: document.getElementById('tab-active-count'),
  tabCityCount: document.getElementById('tab-city-count'),
  registerSearch: document.getElementById('register-search'),
  registerContent: document.getElementById('register-content'),
  inspectorDrawer: document.getElementById('inspector-drawer'),
  inspectorChatView: document.getElementById('inspector-chat-view'),
  inspectorBuildingView: document.getElementById('inspector-building-view'),
  inspectorHqView: document.getElementById('inspector-hq-view'),
  inspHqName: document.getElementById('insp-hq-name'),
  inspHqLevel: document.getElementById('insp-hq-level'),
  inspHqWorking: document.getElementById('insp-hq-working'),
  inspHqWaiting: document.getElementById('insp-hq-waiting'),
  inspHqDone: document.getElementById('insp-hq-done'),
  inspHqSleeping: document.getElementById('insp-hq-sleeping'),
  inspHqBuilt: document.getElementById('insp-hq-built'),
  inspHqPop: document.getElementById('insp-hq-pop'),
  inspHqCoords: document.getElementById('insp-hq-coords'),
  inspHqAgents: document.getElementById('insp-hq-agents'),
  btnFocusHq: document.getElementById('btn-focus-hq'),
  btnFocusHqBar: document.getElementById('btn-focus-hq-bar'),
  inspectorCloseBtns: Array.from(document.querySelectorAll('.btn-inspector-close')),
  inspChatIcon: document.getElementById('insp-chat-icon'),
  inspChatName: document.getElementById('insp-chat-name'),
  inspChatSource: document.getElementById('insp-chat-source'),
  inspChatRole: document.getElementById('insp-chat-role'),
  inspStatusDot: document.getElementById('insp-status-dot'),
  inspStatusText: document.getElementById('insp-status-text'),
  inspModePill: document.getElementById('insp-mode-pill'),
  btnCompleteBuild: document.getElementById('btn-complete-build'),
  statusControlButtons: Array.from(document.querySelectorAll('.status-btn')),
  inspPlannedLabel: document.getElementById('insp-planned-label'),
  typeControlButtons: Array.from(document.querySelectorAll('.type-btn')),
  inspUpdated: document.getElementById('insp-updated'),
  inspMessages: document.getElementById('insp-messages'),
  inspLotRow: document.getElementById('insp-lot-row'),
  inspLot: document.getElementById('insp-lot'),
  inspToolRow: document.getElementById('insp-tool-row'),
  inspTool: document.getElementById('insp-tool'),
  inspWorkspaceRow: document.getElementById('insp-workspace-row'),
  inspWorkspace: document.getElementById('insp-workspace'),
  inspSummary: document.getElementById('insp-summary'),
  inspUserMsg: document.getElementById('insp-user-msg'),
  inspAssistantMsg: document.getElementById('insp-assistant-msg'),
  btnFocusChat: document.getElementById('btn-focus-chat'),
  btnDeleteChat: document.getElementById('btn-delete-chat'),
  inspBldgIcon: document.getElementById('insp-bldg-icon'),
  inspBldgName: document.getElementById('insp-bldg-name'),
  inspBldgCode: document.getElementById('insp-bldg-code'),
  inspBldgType: document.getElementById('insp-bldg-type'),
  inspBldgSource: document.getElementById('insp-bldg-source'),
  inspBldgSubtype: document.getElementById('insp-bldg-subtype'),
  inspBldgFloorsRow: document.getElementById('insp-bldg-floors-row'),
  inspBldgFloors: document.getElementById('insp-bldg-floors'),
  inspBldgDate: document.getElementById('insp-bldg-date'),
  inspBldgCoords: document.getElementById('insp-bldg-coords'),
  inspBldgPathRow: document.getElementById('insp-bldg-path-row'),
  inspBldgPath: document.getElementById('insp-bldg-path'),
  inspBldgSummary: document.getElementById('insp-bldg-summary'),
  btnFocusBuilding: document.getElementById('btn-focus-building'),
  btnDeleteBuilding: document.getElementById('btn-delete-building'),
  hoverTooltip: document.getElementById('hover-tooltip'),
  tooltipName: document.getElementById('tooltip-name'),
  tooltipDot: document.getElementById('tooltip-dot'),
  tooltipStatusLabel: document.getElementById('tooltip-status-label'),
  tooltipDetail: document.getElementById('tooltip-detail'),
  tooltipHint: document.getElementById('tooltip-hint'),
  emptyHint: document.getElementById('empty-hint'),
  btnEmptyBuild: document.getElementById('btn-empty-build'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnZoomReset: document.getElementById('btn-zoom-reset'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnOrbitLeft: document.getElementById('btn-orbit-left'),
  btnOrbitRight: document.getElementById('btn-orbit-right'),
  btnTiltToggle: document.getElementById('btn-tilt-toggle'),
  tiltToggleLabel: document.getElementById('tilt-toggle-label'),
  statusLegend: document.getElementById('status-legend'),
  legendBuildings: document.getElementById('legend-buildings')
};

const audio = createAudio();

const scene = createCityScene(els.canvas, {
  onSelect(item) {
    if (!item) {
      setSelection(null);
      return;
    }
    setSelection({ kind: item.kind, id: item.id });
  },
  onHover(item, pos) {
    if (
      state.buildOpen ||
      state.projectsOpen ||
      (item && state.selection && item.kind === state.selection.kind && item.id === state.selection.id)
    ) {
      renderTooltip(null, null);
      return;
    }
    renderTooltip(item, pos);
  }
});

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatRelativeDutch(epochMs) {
  if (!epochMs || !Number.isFinite(epochMs)) return 'Onbekend';
  const diffSec = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
  if (diffSec < 15) return 'Zojuist';
  if (diffSec < 60) return `${diffSec} sec geleden`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} uur geleden`;
  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? '1 dag geleden' : `${diffDay} dagen geleden`;
}

function formatExactTime(epochMs) {
  if (!epochMs || !Number.isFinite(epochMs)) return 'Onbekend';
  try {
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(epochMs));
  } catch {
    return 'Onbekend';
  }
}

function getStatusInfo(status) {
  return STATUS_META[status] || STATUS_META.sleeping;
}

function getSourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'Onbekend';
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || 'Architect';
}

function getBuildingTypeLabel(type) {
  return BUILDING_TYPE_LABELS[type] || 'Huis';
}

function getSubtypeLabel(subtype, type) {
  if (subtype && subtype in SUBTYPE_LABELS) return SUBTYPE_LABELS[subtype];
  return getBuildingTypeLabel(type);
}

function formatPlannedBuilding(chat) {
  const label = getBuildingTypeLabel(chat.buildingType);
  if ((chat.buildingType === 'flat' || chat.buildingType === 'wolkenkrabber') && chat.plannedFloors) {
    return `${label} (${chat.plannedFloors} verd.)`;
  }
  if (chat.plannedSubtype) {
    return `${label} · ${getSubtypeLabel(chat.plannedSubtype, chat.buildingType)}`;
  }
  return label;
}

function computeCounts(chats) {
  const counts = { total: chats.length, working: 0, waiting: 0, done: 0, sleeping: 0 };
  for (const c of chats) {
    if (c.status in counts) counts[c.status] += 1;
  }
  return counts;
}

function deriveCityFallback(buildings) {
  const total = buildings.length;
  let houses = 0;
  let flats = 0;
  let skyscrapers = 0;
  let malls = 0;
  let infrastructure = 0;
  let population = 0;
  for (const b of buildings) {
    if (b.buildingType === 'wolkenkrabber') {
      skyscrapers += 1;
      population += (b.floors || 20) * 28;
    } else if (b.buildingType === 'mall') {
      malls += 1;
      population += 180;
    } else if (b.buildingType === 'flat') {
      flats += 1;
      population += (b.floors || 6) * 18;
    } else if (b.buildingType === 'infrastructuur') {
      infrastructure += 1;
      population += 25;
    } else {
      houses += 1;
      population += 4;
    }
  }
  let current = MILESTONES[0];
  let next = MILESTONES[1];
  for (let i = 0; i < MILESTONES.length; i++) {
    if (total >= MILESTONES[i].min) {
      current = MILESTONES[i];
      next = MILESTONES[i + 1] || null;
    }
  }
  return {
    level: current.level,
    name: current.name,
    totalBuildings: total,
    houses,
    flats,
    skyscrapers,
    malls,
    infrastructure,
    population,
    beautyScore: Math.min(100, total * 5),
    nextMilestone: next ? next.min : null,
    nextMilestoneName: next ? next.name : null,
    unlockedFeatures: [],
    hq: {
      id: 'hq-shin-ai',
      name: 'Shin-AI Hoofdkantoor',
      gridX: 1,
      gridY: -1,
      activeWorkers: 0,
      waitingWorkers: 0,
      totalAgents: 0,
      level: current.level
    }
  };
}

// ============================================================================
// State Application & Diffing
// ============================================================================

function applyPayload(payload) {
  if (!payload || !Array.isArray(payload.chats)) return;
  const chats = payload.chats;
  const buildings = Array.isArray(payload.buildings) ? payload.buildings : [];
  const city = payload.city || deriveCityFallback(buildings);
  const counts = payload.counts || computeCounts(chats);

  if (state.hasInitialState) {
    // 1. Detect newly completed permanent buildings
    for (const b of buildings) {
      if (!state.knownBuildingIds.has(b.id)) {
        scene.triggerCelebration?.(b.id);
        audio.playComplete();
        const typeLabel = getBuildingTypeLabel(b.buildingType);
        showToast(
          `${b.code || '#'} opgeleverd — ${b.name} (${typeLabel}) blijft in de stad!`,
          'done',
          { kind: 'building', id: b.id }
        );
      }
    }

    // 2. Detect chats transitioning into urgent waiting state
    for (const chat of chats) {
      const prev = state.prevChatStatuses.get(chat.id);
      if (prev && prev !== chat.status && chat.status === 'waiting') {
        audio.playWaiting();
        showToast(`${chat.name} wacht op jouw akkoord`, 'waiting', { kind: 'chat', id: chat.id });
      }
    }
  } else {
    state.hasInitialState = true;
  }

  const nextStatuses = new Map();
  for (const chat of chats) {
    nextStatuses.set(chat.id, chat.status);
  }
  state.prevChatStatuses = nextStatuses;

  const nextBuildingIds = new Set();
  for (const b of buildings) {
    nextBuildingIds.add(b.id);
  }
  state.knownBuildingIds = nextBuildingIds;

  state.chats = chats;
  state.buildings = buildings;
  state.city = city;
  state.counts = counts;
  state.demoActive = Boolean(payload.demoActive || chats.some((c) => c.isDemo));

  // If selected item was removed, close inspector cleanly (HQ is permanent)
  if (state.selection && state.selection.kind !== 'hq') {
    const exists = state.selection.kind === 'building'
      ? buildings.some((b) => b.id === state.selection.id)
      : chats.some((c) => c.id === state.selection.id);
    if (!exists) {
      state.selection = null;
      scene.setSelected?.(null);
      closeInspectorDrawer();
    }
  }

  scene.setState?.({ chats, buildings, city });
  renderTopbarAndLegend();
  renderDemoControls();
  renderRegister();
  if (state.selection) {
    renderInspector();
  }
}

// ============================================================================
// Rendering (Signature-Cached for Zero-Jank Live Updates)
// ============================================================================

function setConnectionState(connState, text) {
  els.connStatus.dataset.state = connState;
  els.connLabel.textContent = text;
}

function renderTopbarAndLegend() {
  const { counts, city } = state;
  const totalBldg = city.totalBuildings ?? state.buildings.length;
  const sig = [
    counts.total ?? 0,
    counts.working ?? 0,
    counts.waiting ?? 0,
    counts.done ?? 0,
    counts.sleeping ?? 0,
    city.level,
    city.name,
    totalBldg,
    city.houses ?? 0,
    city.flats ?? 0,
    city.skyscrapers ?? 0,
    city.malls ?? 0,
    city.infrastructure ?? 0,
    city.nextMilestone ?? 'max'
  ].join('|');

  if (sig === state.lastTopbarSig) return;
  state.lastTopbarSig = sig;

  for (const key of Object.keys(els.countNodes)) {
    const node = els.countNodes[key];
    if (node) node.textContent = String(counts[key] ?? 0);
  }
  els.waitingFilterBtn?.classList.toggle('has-urgent', (counts.waiting ?? 0) > 0);

  const bldgWord = totalBldg === 1 ? 'gebouw' : 'gebouwen';
  els.cityProgressText.textContent = `Niv. ${city.level} · ${city.name} · ${totalBldg} ${bldgWord}`;

  // Progress within current level toward nextMilestone
  let pct = 100;
  if (city.nextMilestone && city.nextMilestone > 0) {
    const curMilestone = MILESTONES.find((m) => m.level === city.level) || MILESTONES[0];
    const span = Math.max(1, city.nextMilestone - curMilestone.min);
    pct = Math.max(6, Math.min(100, Math.round(((totalBldg - curMilestone.min) / span) * 100)));
  }
  els.cityProgressFill.style.width = `${pct}%`;

  els.btnRegisterCount.textContent = String((counts.total ?? 0) + totalBldg);
  els.tabActiveCount.textContent = String(counts.total ?? 0);
  els.tabCityCount.textContent = String(totalBldg);

  if (els.legendBuildings) {
    const hCount = city.houses ?? 0;
    const fCount = city.flats ?? 0;
    const sCount = city.skyscrapers ?? 0;
    const mCount = city.malls ?? 0;
    const iCount = city.infrastructure ?? 0;
    const hWord = hCount === 1 ? 'Huis' : 'Huizen';
    const fWord = fCount === 1 ? 'Flat' : 'Flats';
    const sWord = sCount === 1 ? 'Toren' : 'Torens';
    const mWord = mCount === 1 ? 'Mall' : 'Malls';
    els.legendBuildings.textContent = `${hCount} ${hWord} · ${fCount} ${fWord} · ${sCount} ${sWord} · ${mCount} ${mWord} · ${iCount} Infra`;
  }
}

function renderDemoControls() {
  const hasDemo = state.chats.some((c) => c.isDemo);
  const hasAny = state.chats.length > 0 || state.buildings.length > 0;
  const sig = `${hasDemo ? 1 : 0}|${hasAny ? 1 : 0}`;
  if (sig === state.lastDemoSig) return;
  state.lastDemoSig = sig;

  els.btnDemoCycle.disabled = !hasDemo;
  els.btnDemoClear.disabled = !hasDemo;
  els.emptyHint.classList.toggle('is-hidden', hasAny);
}

function setFilter(nextFilter) {
  state.filter = nextFilter;
  scene.setFilter?.(nextFilter);
  for (const btn of els.filterButtons) {
    const active = btn.dataset.filter === nextFilter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  renderRegister();
}

function setSelection(nextSelection, { focus = false } = {}) {
  renderTooltip(null, null);
  state.selection = nextSelection ? { kind: nextSelection.kind, id: nextSelection.id } : null;
  scene.setSelected?.(state.selection);

  if (state.selection) {
    renderInspector(true);
    openInspectorDrawer();
    if (focus) {
      scene.focusItem?.(state.selection.kind, state.selection.id);
    }
  } else {
    closeInspectorDrawer();
  }
  renderRegister();
}

function openInspectorDrawer() {
  els.inspectorDrawer.classList.remove('is-closed');
  els.inspectorDrawer.setAttribute('aria-hidden', 'false');
  els.statusLegend?.classList.add('is-obscured');
}

function closeInspectorDrawer() {
  state.lastInspectorSig = '';
  resetDeleteBuildingConfirm();
  els.inspectorDrawer.classList.add('is-closed');
  els.inspectorDrawer.setAttribute('aria-hidden', 'true');
  els.statusLegend?.classList.remove('is-obscured');
}

function renderInspector(force = false) {
  if (!state.selection) return;
  if (state.selection.kind === 'hq') {
    renderHqInspector(force);
  } else if (state.selection.kind === 'building') {
    renderBuildingInspector(force);
  } else {
    renderChatInspector(force);
  }
}

function renderHqInspector(force) {
  const { city, counts, chats } = state;
  const hq = city.hq || { id: 'hq-shin-ai', name: 'Shin-AI Hoofdkantoor', gridX: 1, gridY: -1 };
  const activeBuilders = chats
    .slice()
    .sort((a, b) => {
      const orderDiff = getStatusInfo(a.status).order - getStatusInfo(b.status).order;
      if (orderDiff !== 0) return orderDiff;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const sig = [
    'hq',
    hq.name,
    city.level,
    city.name,
    city.totalBuildings,
    city.population,
    counts.working,
    counts.waiting,
    counts.done,
    counts.sleeping,
    activeBuilders.map((c) => `${c.id}:${c.status}:${c.name}:${c.buildingType}`).join(',')
  ].join('\u001f');

  if (!force && sig === state.lastInspectorSig) return;
  state.lastInspectorSig = sig;
  resetDeleteBuildingConfirm();

  els.inspectorChatView.classList.add('is-hidden');
  els.inspectorBuildingView.classList.add('is-hidden');
  els.inspectorHqView.classList.remove('is-hidden');

  els.inspHqName.textContent = hq.name || 'Shin-AI Hoofdkantoor';
  els.inspHqLevel.textContent = `Niv. ${city.level} · ${city.name}`;
  els.inspHqWorking.textContent = String(counts.working ?? 0);
  els.inspHqWaiting.textContent = String(counts.waiting ?? 0);
  els.inspHqDone.textContent = String(counts.done ?? 0);
  els.inspHqSleeping.textContent = String(counts.sleeping ?? 0);

  const totalB = city.totalBuildings ?? state.buildings.length;
  els.inspHqBuilt.textContent = totalB === 1 ? '1 gebouw' : `${totalB} gebouwen`;
  els.inspHqPop.textContent = String(city.population ?? 0);
  els.inspHqCoords.textContent = `(${hq.gridX ?? 1}, ${hq.gridY ?? -1})`;

  const listEl = els.inspHqAgents;
  listEl.textContent = '';

  if (activeBuilders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hq-empty';
    empty.textContent = 'Geen actieve AI-bouwers uitgezonden.';
    listEl.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const chat of activeBuilders) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'hq-agent-row';
    row.setAttribute('role', 'listitem');

    const left = document.createElement('span');
    left.className = 'hq-agent-left';

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.dataset.status = chat.status;

    const name = document.createElement('span');
    name.className = 'hq-agent-name';
    name.textContent = chat.name || 'AI-bouwer';

    left.append(dot, name);

    const tag = document.createElement('span');
    tag.className = 'hq-agent-tag';
    tag.textContent = getBuildingTypeLabel(chat.buildingType);

    row.append(left, tag);
    row.addEventListener('click', () => {
      setSelection({ kind: 'chat', id: chat.id }, { focus: true });
    });

    frag.appendChild(row);
  }
  listEl.appendChild(frag);
}

function renderChatInspector(force) {
  const chat = state.chats.find((c) => c.id === state.selection.id);
  if (!chat) return;

  const relTime = formatRelativeDutch(chat.updatedAt);
  const sig = [
    'chat',
    chat.id,
    chat.name,
    chat.source,
    chat.role,
    chat.status,
    chat.statusMode,
    chat.buildingType,
    chat.plannedSubtype,
    chat.plannedFloors,
    chat.gridX,
    chat.gridY,
    relTime,
    chat.messageCount ?? 0,
    chat.currentTool || '',
    chat.workspace || '',
    chat.summary || '',
    chat.lastUserMessage || '',
    chat.lastAssistantMessage || '',
    chat.isDemo ? '1' : '0'
  ].join('\u001f');

  if (!force && sig === state.lastInspectorSig) return;
  state.lastInspectorSig = sig;

  els.inspectorBuildingView.classList.add('is-hidden');
  els.inspectorHqView.classList.add('is-hidden');
  els.inspectorChatView.classList.remove('is-hidden');

  const typeKey = chat.buildingType in BUILDING_TYPE_SVGS ? chat.buildingType : 'huis';
  els.inspChatIcon.innerHTML = BUILDING_TYPE_SVGS[typeKey];
  els.inspChatName.textContent = chat.name || 'Naamloze bouwtaak';
  els.inspChatSource.textContent = getSourceLabel(chat.source);
  els.inspChatRole.textContent = getRoleLabel(chat.role);

  const statusInfo = getStatusInfo(chat.status);
  els.inspStatusDot.dataset.status = chat.status;
  els.inspStatusText.textContent = statusInfo.label;

  const isManual = chat.statusMode === 'manual';
  els.inspModePill.textContent = isManual ? 'Handmatig' : 'Automatisch';
  els.inspModePill.classList.toggle('is-manual', isManual);

  els.btnCompleteBuild.classList.toggle('is-hidden', chat.status === 'done');

  for (const btn of els.statusControlButtons) {
    const target = btn.dataset.setStatus;
    if (target === 'auto') {
      btn.classList.toggle('is-current', !isManual);
      btn.disabled = !isManual;
    } else {
      btn.classList.toggle('is-current', chat.status === target);
      btn.disabled = false;
    }
  }

  els.inspPlannedLabel.textContent = formatPlannedBuilding(chat);
  for (const btn of els.typeControlButtons) {
    btn.classList.toggle('is-current', btn.dataset.setType === chat.buildingType);
  }

  els.inspUpdated.textContent = relTime;
  els.inspUpdated.title = formatExactTime(chat.updatedAt);
  els.inspMessages.textContent = String(chat.messageCount ?? 0);

  if (Number.isFinite(chat.gridX) && Number.isFinite(chat.gridY)) {
    els.inspLot.textContent = `(${chat.gridX}, ${chat.gridY})`;
    els.inspLotRow.classList.remove('is-hidden');
  } else {
    els.inspLotRow.classList.add('is-hidden');
  }

  if (chat.currentTool) {
    els.inspTool.textContent = chat.currentTool;
    els.inspToolRow.classList.remove('is-hidden');
  } else {
    els.inspToolRow.classList.add('is-hidden');
  }

  if (chat.workspace) {
    els.inspWorkspace.textContent = chat.workspace;
    els.inspWorkspace.title = chat.workspace;
    els.inspWorkspaceRow.classList.remove('is-hidden');
  } else {
    els.inspWorkspaceRow.classList.add('is-hidden');
  }

  if (chat.summary) {
    els.inspSummary.textContent = chat.summary;
    els.inspSummary.classList.remove('is-hidden');
  } else {
    els.inspSummary.classList.add('is-hidden');
  }

  setMessageText(els.inspUserMsg, chat.lastUserMessage, 'Geen opdracht vastgelegd.');
  setMessageText(els.inspAssistantMsg, chat.lastAssistantMessage, 'Geen antwoord vastgelegd.');

  els.btnDeleteChat.classList.toggle('is-hidden', !chat.isDemo);
}

function renderBuildingInspector(force) {
  const b = state.buildings.find((item) => item.id === state.selection.id);
  if (!b) return;

  const relDate = formatRelativeDutch(b.builtAt);
  const sig = [
    'building',
    b.id,
    b.code,
    b.name,
    b.buildingType,
    b.subtype,
    b.floors,
    b.source,
    b.gridX,
    b.gridY,
    b.projectPath || '',
    relDate,
    b.summary || ''
  ].join('\u001f');

  if (!force && sig === state.lastInspectorSig) return;
  state.lastInspectorSig = sig;
  resetDeleteBuildingConfirm();

  els.inspectorChatView.classList.add('is-hidden');
  els.inspectorHqView.classList.add('is-hidden');
  els.inspectorBuildingView.classList.remove('is-hidden');

  const typeKey = b.buildingType in BUILDING_TYPE_SVGS ? b.buildingType : 'huis';
  els.inspBldgIcon.innerHTML = BUILDING_TYPE_SVGS[typeKey];
  els.inspBldgName.textContent = b.name || 'Opgeleverd bouwwerk';
  els.inspBldgCode.textContent = b.code || `#${String(b.catalogNumber || 1).padStart(3, '0')}`;
  els.inspBldgType.textContent = getBuildingTypeLabel(b.buildingType);
  els.inspBldgSource.textContent = getSourceLabel(b.source);

  const subtypeLabel = getSubtypeLabel(b.subtype, b.buildingType);
  els.inspBldgSubtype.textContent = (b.buildingType === 'flat' || b.buildingType === 'wolkenkrabber') && b.floors
    ? `${subtypeLabel} (${b.floors} verd.)`
    : subtypeLabel;

  if (b.buildingType === 'infrastructuur') {
    els.inspBldgFloorsRow.classList.add('is-hidden');
  } else {
    const fl = b.floors || (b.buildingType === 'wolkenkrabber' ? 20 : b.buildingType === 'flat' ? 6 : b.buildingType === 'mall' ? 4 : 2);
    els.inspBldgFloors.textContent = fl === 1 ? '1 verdieping' : `${fl} verdiepingen`;
    els.inspBldgFloorsRow.classList.remove('is-hidden');
  }

  els.inspBldgDate.textContent = `${formatExactTime(b.builtAt)} (${relDate})`;
  els.inspBldgCoords.textContent = `${b.code || '#'} · (${b.gridX}, ${b.gridY})`;

  if (b.projectPath) {
    els.inspBldgPath.textContent = b.projectPath;
    els.inspBldgPath.title = b.projectPath;
    els.inspBldgPathRow.classList.remove('is-hidden');
  } else {
    els.inspBldgPathRow.classList.add('is-hidden');
  }

  setMessageText(els.inspBldgSummary, b.summary, 'Opgeleverd vanuit een afgeronde AI-sessie.');
}

function setMessageText(node, value, fallback) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (cleaned) {
    node.textContent = cleaned;
    node.classList.remove('is-empty');
  } else {
    node.textContent = fallback;
    node.classList.add('is-empty');
  }
}

// ============================================================================
// Left Stadsregister Drawer (Tabs: Actief & Stad)
// ============================================================================

function setRegisterTab(tab) {
  state.registerTab = tab === 'city' ? 'city' : 'active';
  const isCity = state.registerTab === 'city';
  els.tabActive.classList.toggle('is-active', !isCity);
  els.tabActive.setAttribute('aria-selected', !isCity ? 'true' : 'false');
  els.tabCity.classList.toggle('is-active', isCity);
  els.tabCity.setAttribute('aria-selected', isCity ? 'true' : 'false');
  state.lastRegisterSig = '';
  renderRegister(true);
}

function renderRegister(force = false) {
  if (!state.registerOpen && !force) return;

  const query = state.registerQuery.trim().toLowerCase();
  if (state.registerTab === 'city') {
    renderCityCatalogTab(query, force);
  } else {
    renderActiveBuildersTab(query, force);
  }
}

function renderActiveBuildersTab(query, force) {
  let list = state.chats.slice();
  if (state.filter !== 'all') {
    list = list.filter((c) => c.status === state.filter);
  }
  if (query) {
    list = list.filter((c) => {
      const hay = `${c.name || ''} ${c.summary || ''} ${getSourceLabel(c.source)} ${getBuildingTypeLabel(c.buildingType)} ${c.workspace || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }

  list.sort((a, b) => {
    const orderDiff = getStatusInfo(a.status).order - getStatusInfo(b.status).order;
    if (orderDiff !== 0) return orderDiff;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const selKey = state.selection ? `${state.selection.kind}:${state.selection.id}` : '';
  const sigParts = ['active', state.filter, query, selKey];
  for (const c of list) {
    sigParts.push(`${c.id}:${c.status}:${c.name || ''}:${c.buildingType}:${c.currentTool || ''}:${c.summary || ''}:${formatRelativeDutch(c.updatedAt)}`);
  }
  const sig = sigParts.join('\u001e');
  if (!force && sig === state.lastRegisterSig) return;
  state.lastRegisterSig = sig;

  const container = els.registerContent;
  container.textContent = '';

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'register-empty';
    empty.textContent = query
      ? 'Geen actieve AI-bouwers gevonden voor deze zoekopdracht.'
      : 'Geen actieve bouwopdrachten in deze filterweergave.';
    container.appendChild(empty);
    return;
  }

  let currentGroup = null;
  const frag = document.createDocumentFragment();

  for (const chat of list) {
    if (chat.status !== currentGroup) {
      currentGroup = chat.status;
      const header = document.createElement('div');
      header.className = 'register-group-header';
      header.textContent = getStatusInfo(chat.status).label;
      frag.appendChild(header);
    }

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'register-item';
    if (state.selection?.kind === 'chat' && state.selection.id === chat.id) {
      item.classList.add('is-selected');
    }

    const top = document.createElement('div');
    top.className = 'register-item-top';

    const nameWrap = document.createElement('span');
    nameWrap.className = 'register-item-name';

    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.dataset.status = chat.status;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'register-item-name-text';
    nameSpan.textContent = chat.name || 'Naamloze bouwtaak';

    nameWrap.append(dot, nameSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'register-item-time';
    timeSpan.textContent = formatRelativeDutch(chat.updatedAt);

    top.append(nameWrap, timeSpan);

    const meta = document.createElement('div');
    meta.className = 'register-item-meta';

    const summarySpan = document.createElement('span');
    summarySpan.className = 'register-item-summary';
    const typeTag = getBuildingTypeLabel(chat.buildingType);
    summarySpan.textContent = chat.currentTool
      ? `${typeTag} · ${chat.currentTool}`
      : `${typeTag} · ${chat.summary || getSourceLabel(chat.source)}`;

    meta.appendChild(summarySpan);
    item.append(top, meta);

    item.addEventListener('click', () => {
      setSelection({ kind: 'chat', id: chat.id }, { focus: true });
    });

    frag.appendChild(item);
  }

  container.appendChild(frag);
}

function renderCityCatalogTab(query, force) {
  let list = state.buildings.slice();
  if (query) {
    list = list.filter((b) => {
      const hay = `${b.code || ''} ${b.name || ''} ${b.summary || ''} ${getBuildingTypeLabel(b.buildingType)} ${getSubtypeLabel(b.subtype, b.buildingType)} ${getSourceLabel(b.source)}`.toLowerCase();
      return hay.includes(query);
    });
  }
  list.sort((a, b) => (b.catalogNumber || 0) - (a.catalogNumber || 0));

  const { city } = state;
  const selKey = state.selection ? `${state.selection.kind}:${state.selection.id}` : '';
  const sigParts = [
    'city',
    query,
    selKey,
    city.level,
    city.totalBuildings,
    city.houses,
    city.flats,
    city.skyscrapers,
    city.malls,
    city.infrastructure,
    city.population
  ];
  for (const b of list) {
    sigParts.push(`${b.id}:${b.code}:${b.name}:${b.buildingType}:${b.floors}`);
  }
  const sig = sigParts.join('\u001e');
  if (!force && sig === state.lastRegisterSig) return;
  state.lastRegisterSig = sig;

  const container = els.registerContent;
  container.textContent = '';
  const frag = document.createDocumentFragment();

  // City stats strip (6 concise metrics in a 3x2 flat grid)
  const stats = document.createElement('div');
  stats.className = 'city-stats-strip';
  const statDefs = [
    { val: city.houses ?? 0, label: 'Huizen' },
    { val: city.flats ?? 0, label: 'Flats' },
    { val: city.skyscrapers ?? 0, label: 'Torens' },
    { val: city.malls ?? 0, label: 'Malls' },
    { val: city.infrastructure ?? 0, label: 'Infra' },
    { val: city.population ?? 0, label: 'Inwoners' }
  ];
  for (const s of statDefs) {
    const cell = document.createElement('div');
    cell.className = 'city-stat';
    const val = document.createElement('span');
    val.className = 'city-stat-val';
    val.textContent = String(s.val);
    const lbl = document.createElement('span');
    lbl.className = 'city-stat-label';
    lbl.textContent = s.label;
    cell.append(val, lbl);
    stats.appendChild(cell);
  }
  frag.appendChild(stats);

  // Growth milestones list
  const msBlock = document.createElement('div');
  msBlock.className = 'milestones-block';
  const msTitle = document.createElement('h3');
  msTitle.className = 'section-heading';
  msTitle.textContent = 'Groeimijlpalen';
  msBlock.appendChild(msTitle);

  const msList = document.createElement('ul');
  msList.className = 'milestones-list';
  const totalB = city.totalBuildings ?? state.buildings.length;
  for (const m of MILESTONES) {
    const li = document.createElement('li');
    li.className = 'milestone-row';
    if (totalB >= m.min) li.classList.add('is-unlocked');
    if (city.level === m.level) li.classList.add('is-current');

    const left = document.createElement('span');
    left.className = 'milestone-left';
    const dot = document.createElement('span');
    dot.className = 'milestone-dot';
    const name = document.createElement('span');
    name.textContent = `Niv. ${m.level} · ${m.name}`;
    left.append(dot, name);

    const req = document.createElement('span');
    req.className = 'milestone-req';
    req.textContent = m.min === 0 ? 'Start' : `${m.min}+ geb.`;

    li.append(left, req);
    msList.appendChild(li);
  }
  msBlock.appendChild(msList);
  frag.appendChild(msBlock);

  // Catalog header
  const catHeader = document.createElement('div');
  catHeader.className = 'register-group-header';
  catHeader.textContent = `Opgeleverde gebouwen (${list.length})`;
  frag.appendChild(catHeader);

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'register-empty';
    empty.textContent = query
      ? 'Geen gebouwen gevonden voor deze zoekopdracht.'
      : 'Nog geen blijvende gebouwen opgeleverd.';
    frag.appendChild(empty);
  } else {
    for (const b of list) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'register-item';
      if (state.selection?.kind === 'building' && state.selection.id === b.id) {
        item.classList.add('is-selected');
      }

      const top = document.createElement('div');
      top.className = 'register-item-top';

      const nameWrap = document.createElement('span');
      nameWrap.className = 'register-item-name';

      const code = document.createElement('span');
      code.className = 'code-pill tabular';
      code.textContent = b.code || `#${String(b.catalogNumber || 1).padStart(3, '0')}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'register-item-name-text';
      nameSpan.textContent = b.name || 'Opgeleverd gebouw';

      nameWrap.append(code, nameSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'register-item-time';
      timeSpan.textContent = getBuildingTypeLabel(b.buildingType);

      top.append(nameWrap, timeSpan);

      const meta = document.createElement('div');
      meta.className = 'register-item-meta is-building';

      const detailSpan = document.createElement('span');
      detailSpan.className = 'register-item-summary';
      const sub = getSubtypeLabel(b.subtype, b.buildingType);
      detailSpan.textContent = (b.buildingType === 'flat' || b.buildingType === 'wolkenkrabber') && b.floors
        ? `${sub} · ${b.floors} verd.`
        : sub;

      meta.appendChild(detailSpan);
      item.append(top, meta);

      item.addEventListener('click', () => {
        setSelection({ kind: 'building', id: b.id }, { focus: true });
      });

      frag.appendChild(item);
    }
  }

  container.appendChild(frag);
}

// ============================================================================
// Floating Hover Tooltip & Toasts
// ============================================================================

function renderTooltip(item, pos) {
  const tip = els.hoverTooltip;
  if (!item || !pos) {
    tip.classList.add('is-hidden');
    tip.setAttribute('aria-hidden', 'true');
    return;
  }

  if (item.kind === 'hq') {
    const hq = item.hq || state.city.hq || { name: 'Shin-AI Hoofdkantoor' };
    els.tooltipName.textContent = hq.name || 'Shin-AI Hoofdkantoor';
    els.tooltipDot.dataset.status = state.counts.waiting > 0 ? 'waiting' : 'working';
    els.tooltipStatusLabel.textContent = `Niv. ${state.city.level}`;
    els.tooltipDetail.textContent = `${state.counts.working ?? 0} aan het werk · ${state.counts.waiting ?? 0} wacht op akkoord`;
    els.tooltipHint.textContent = 'Klik voor hoofdkantoor';
  } else if (item.kind === 'building') {
    const b = item.building || state.buildings.find((x) => x.id === item.id);
    if (!b) {
      tip.classList.add('is-hidden');
      return;
    }
    els.tooltipName.textContent = `${b.code || '#'} ${b.name || 'Bouwwerk'}`;
    els.tooltipDot.dataset.status = 'done';
    els.tooltipStatusLabel.textContent = getBuildingTypeLabel(b.buildingType);
    const sub = getSubtypeLabel(b.subtype, b.buildingType);
    els.tooltipDetail.textContent = b.summary ? `${sub} — ${b.summary}` : sub;
    els.tooltipHint.textContent = 'Klik voor gebouwgegevens';
  } else {
    const chat = item.chat || state.chats.find((x) => x.id === item.id);
    if (!chat) {
      tip.classList.add('is-hidden');
      return;
    }
    const info = getStatusInfo(chat.status);
    els.tooltipName.textContent = chat.name || 'AI-bouwer';
    els.tooltipDot.dataset.status = chat.status;
    els.tooltipStatusLabel.textContent = info.label;
    els.tooltipDetail.textContent = chat.currentTool
      ? `Gereedschap: ${chat.currentTool}`
      : (chat.summary || formatPlannedBuilding(chat));
    els.tooltipHint.textContent = 'Klik voor inspectie';
  }

  tip.classList.remove('is-hidden');
  tip.setAttribute('aria-hidden', 'false');

  const margin = 12;
  const topOffset = 66;
  const rect = tip.getBoundingClientRect();
  let left = pos.x + 18;
  let top = pos.y + 18;

  if (left + rect.width + margin > window.innerWidth) {
    left = pos.x - rect.width - 18;
  }
  if (top + rect.height + margin > window.innerHeight) {
    top = pos.y - rect.height - 18;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
  top = Math.max(topOffset, Math.min(top, window.innerHeight - rect.height - margin));

  tip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
}

function showToast(message, type, targetSelection) {
  const container = els.toastContainer;
  while (container.children.length >= 3) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.type = type;
  toast.setAttribute('role', 'status');

  const dot = document.createElement('span');
  dot.className = 'status-dot';
  dot.dataset.status = type;

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;

  toast.append(dot, text);

  if (targetSelection) {
    toast.addEventListener('click', () => {
      setSelection(targetSelection, { focus: true });
      dismissToast(toast);
    });
  }

  container.appendChild(toast);
  window.setTimeout(() => dismissToast(toast), 5600);
}

function dismissToast(toast) {
  if (!toast || !toast.isConnected) return;
  toast.classList.add('is-leaving');
  window.setTimeout(() => toast.remove(), 220);
}

// ============================================================================
// Popover & Drawer Toggles
// ============================================================================

let resetConfirmTimer = null;
let deleteBldgConfirmTimer = null;

function resetDangerButtonState() {
  if (resetConfirmTimer) {
    window.clearTimeout(resetConfirmTimer);
    resetConfirmTimer = null;
  }
  els.btnCityReset.dataset.confirm = 'false';
  els.btnCityReset.textContent = 'Reset stad (0 gebouwen)';
}

function resetDeleteBuildingConfirm() {
  if (deleteBldgConfirmTimer) {
    window.clearTimeout(deleteBldgConfirmTimer);
    deleteBldgConfirmTimer = null;
  }
  if (els.btnDeleteBuilding) {
    els.btnDeleteBuilding.dataset.confirm = 'false';
    els.btnDeleteBuilding.textContent = 'Verwijder uit stad';
  }
}

// ============================================================================
// Selective Local Project Import Modal
// ============================================================================

function setProjectsModalOpen(open) {
  state.projectsOpen = open;
  if (open) {
    renderTooltip(null, null);
    if (state.buildOpen) setBuildPopoverOpen(false);
    state.selectedProjectPaths.clear();
    state.projectsQuery = '';
    els.projectsSearch.value = '';
  }
  els.projectsBackdrop.classList.toggle('is-hidden', !open);
  els.projectsBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  els.btnProjects.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    loadProjects();
    els.projectsSearch.focus();
  }
}

async function loadProjects() {
  state.projectsLoading = true;
  state.projectsError = '';
  renderProjectsList();
  try {
    const data = await apiRequest('/api/projects', { method: 'GET' });
    state.projects = Array.isArray(data?.projects) ? data.projects : [];
    state.projectTypeOverrides.clear();
    for (const p of state.projects) {
      state.projectTypeOverrides.set(p.path, p.suggestedType || 'huis');
    }
  } catch (err) {
    state.projectsError = err.message || 'Kon lokale projecten niet ophalen.';
    state.projects = [];
  } finally {
    state.projectsLoading = false;
    renderProjectsList();
  }
}

function updateProjectsFooter() {
  const count = state.selectedProjectPaths.size;
  els.projectsSelectedCount.textContent = `${count} geselecteerd`;
  els.btnProjectsClear.disabled = count === 0;
  els.btnProjectsImport.disabled = count === 0;
  els.btnProjectsImport.textContent = `Bouw geselecteerde (${count})`;
}

function renderProjectsList() {
  const container = els.projectsList;
  container.textContent = '';

  if (state.projectsLoading) {
    const msg = document.createElement('p');
    msg.className = 'projects-state-msg';
    msg.textContent = 'Lokale projectmappen scannen…';
    container.appendChild(msg);
    updateProjectsFooter();
    return;
  }

  if (state.projectsError) {
    const msg = document.createElement('p');
    msg.className = 'projects-state-msg';
    msg.textContent = state.projectsError;
    container.appendChild(msg);
    updateProjectsFooter();
    return;
  }

  const query = state.projectsQuery.trim().toLowerCase();
  const filtered = state.projects.filter((p) => {
    if (!query) return true;
    const hay = `${p.name || ''} ${p.path || ''} ${p.tech || ''}`.toLowerCase();
    return hay.includes(query);
  });

  if (filtered.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'projects-state-msg';
    msg.textContent = query
      ? 'Geen projecten gevonden voor deze zoekopdracht.'
      : 'Geen geschikte lokale projectmappen gevonden.';
    container.appendChild(msg);
    updateProjectsFooter();
    return;
  }

  const frag = document.createDocumentFragment();
  for (const p of filtered) {
    const isChecked = !p.alreadyBuilt && state.selectedProjectPaths.has(p.path);
    const currentType = state.projectTypeOverrides.get(p.path) || p.suggestedType || 'huis';

    const row = document.createElement('div');
    row.className = 'project-row';
    row.setAttribute('role', 'listitem');
    if (p.alreadyBuilt) row.classList.add('is-built');
    if (isChecked) row.classList.add('is-checked');

    const label = document.createElement('label');
    label.className = 'project-check-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'project-checkbox';
    checkbox.checked = isChecked;
    checkbox.disabled = Boolean(p.alreadyBuilt);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.selectedProjectPaths.add(p.path);
        row.classList.add('is-checked');
      } else {
        state.selectedProjectPaths.delete(p.path);
        row.classList.remove('is-checked');
      }
      updateProjectsFooter();
    });

    const info = document.createElement('div');
    info.className = 'project-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'project-title-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'project-name';
    nameSpan.textContent = p.name || 'Project';
    titleRow.appendChild(nameSpan);

    if (p.alreadyBuilt) {
      const builtBadge = document.createElement('span');
      builtBadge.className = 'project-built-badge';
      builtBadge.textContent = p.buildingCode ? `Al gebouwd (${p.buildingCode})` : 'Al gebouwd';
      titleRow.appendChild(builtBadge);
    }

    const metaRow = document.createElement('div');
    metaRow.className = 'project-meta-row';

    const techSpan = document.createElement('span');
    techSpan.className = 'project-tech';
    const fileWord = p.fileCount === 1 ? 'bestand' : 'bestanden';
    techSpan.textContent = `${p.tech || 'Project'} · ${p.fileCount ?? 0} ${fileWord}`;

    const pathSpan = document.createElement('span');
    pathSpan.className = 'project-path';
    pathSpan.textContent = p.path;
    pathSpan.title = p.path;

    metaRow.append(techSpan, pathSpan);
    info.append(titleRow, metaRow);
    label.append(checkbox, info);

    const select = document.createElement('select');
    select.className = 'project-type-select';
    select.setAttribute('aria-label', `Bouwtype voor ${p.name}`);
    select.disabled = Boolean(p.alreadyBuilt);

    const options = [
      { value: 'huis', text: 'Huis' },
      { value: 'flat', text: 'Flat' },
      { value: 'wolkenkrabber', text: 'Wolkenkrabber' },
      { value: 'mall', text: 'Mall' },
      { value: 'infrastructuur', text: 'Infra' }
    ];
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.text;
      if (opt.value === currentType) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      state.projectTypeOverrides.set(p.path, select.value);
    });

    row.append(label, select);
    frag.appendChild(row);
  }

  container.appendChild(frag);
  updateProjectsFooter();
}

async function handleImportSelectedProjects() {
  if (state.selectedProjectPaths.size === 0) return;

  const items = [];
  for (const p of state.projects) {
    if (!p.alreadyBuilt && state.selectedProjectPaths.has(p.path)) {
      const chosenType = state.projectTypeOverrides.get(p.path) || p.suggestedType || 'huis';
      items.push({
        path: p.path,
        name: p.name,
        buildingType: chosenType,
        tech: p.tech,
        fileCount: p.fileCount,
        summary: `Lokaal project (${p.tech || 'Code'}, ${p.fileCount ?? 0} bestanden)`
      });
    }
  }
  if (items.length === 0) return;

  els.btnProjectsImport.disabled = true;
  els.btnProjectsImport.textContent = 'Bouwen…';

  try {
    const res = await apiRequest('/api/city/import-projects', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
    const built = Array.isArray(res?.built) ? res.built : [];

    // Pre-mark built IDs so applyPayload does not spam one toast per building
    for (const b of built) {
      state.knownBuildingIds.add(b.id);
    }

    if (res?.state) {
      applyPayload(res.state);
    } else {
      await fetchState();
    }

    setProjectsModalOpen(false);

    if (built.length > 0) {
      for (const b of built) {
        scene.triggerCelebration?.(b.id);
      }
      audio.playComplete();
      const newest = built[built.length - 1];
      scene.focusItem?.('building', newest.id);

      const toastMsg = built.length === 1
        ? `${newest.code || '#'} opgeleverd — ${newest.name} (${getBuildingTypeLabel(newest.buildingType)}) blijft in de stad!`
        : `${built.length} projecten gebouwd als blijvende gebouwen!`;
      showToast(toastMsg, 'done', { kind: 'building', id: newest.id });
    } else {
      showToast('Geselecteerde projecten stonden al in de stad.', 'done', null);
    }
  } catch (err) {
    showToast(err.message || 'Importeren mislukt — probeer opnieuw', 'waiting', null);
    updateProjectsFooter();
  }
}

function setBuildPopoverOpen(open) {
  state.buildOpen = open;
  if (open) {
    renderTooltip(null, null);
  } else {
    resetDangerButtonState();
  }
  els.buildPopover.classList.toggle('is-hidden', !open);
  els.btnBuildOrder.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    setBuildFeedback('');
    els.buildName.focus();
  }
}

function setRegisterOpen(open, tabOverride = null) {
  state.registerOpen = open;
  if (open) {
    renderTooltip(null, null);
    if (tabOverride) {
      setRegisterTab(tabOverride);
    }
  }
  els.registerDrawer.classList.toggle('is-closed', !open);
  els.registerDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  els.btnRegister.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    renderRegister(true);
  }
}

function setBuildFeedback(message, isError = false) {
  els.buildFeedback.textContent = message;
  els.buildFeedback.classList.toggle('is-error', isError);
}

// ============================================================================
// API Calls & Live SSE
// ============================================================================

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const errMsg = data?.error || `Verzoek mislukt (${res.status})`;
    throw new Error(errMsg);
  }
  return data;
}

async function fetchState() {
  try {
    const data = await apiRequest('/api/state', { method: 'GET' });
    applyPayload(data);
  } catch {
    setConnectionState('offline', 'Niet verbonden');
  }
}

let eventSource = null;
let reconnectTimer = null;
let reconnectDelay = 1500;

function connectSSE() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  setConnectionState('reconnecting', state.hasInitialState ? 'Herverbinden…' : 'Verbinden…');

  try {
    const es = new EventSource('/api/events');
    eventSource = es;

    es.onopen = () => {
      reconnectDelay = 1500;
      setConnectionState('connected', 'Verbonden');
    };

    es.addEventListener('state', (evt) => {
      reconnectDelay = 1500;
      setConnectionState('connected', 'Verbonden');
      try {
        const payload = JSON.parse(evt.data);
        applyPayload(payload);
      } catch {
        // Ignore malformed frame
      }
    });

    es.onerror = () => {
      setConnectionState('reconnecting', 'Herverbinden…');
      if (es.readyState === EventSource.CLOSED) {
        es.close();
        scheduleReconnect();
      }
    };
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    fetchState();
    connectSSE();
  }, reconnectDelay);
  reconnectDelay = Math.min(10000, Math.round(reconnectDelay * 1.5));
}

// ============================================================================
// Event Listeners
// ============================================================================

els.canvas.addEventListener('pointerleave', () => {
  renderTooltip(null, null);
});

els.btnCityProgress.addEventListener('click', () => {
  if (state.registerOpen && state.registerTab === 'city') {
    setRegisterOpen(false);
  } else {
    setRegisterOpen(true, 'city');
  }
});

for (const btn of els.filterButtons) {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter || 'all');
  });
}

// Build Order Popover
els.btnBuildOrder.addEventListener('click', () => {
  setBuildPopoverOpen(!state.buildOpen);
});
els.btnBuildClose.addEventListener('click', () => setBuildPopoverOpen(false));

document.addEventListener('pointerdown', (evt) => {
  if (!state.buildOpen) return;
  if (els.buildPopover.contains(evt.target) || els.btnBuildOrder.contains(evt.target)) return;
  setBuildPopoverOpen(false);
});

els.buildForm.addEventListener('submit', async (evt) => {
  evt.preventDefault();
  const payload = {
    name: els.buildName.value.trim() || undefined,
    buildingType: els.buildType.value,
    status: els.buildStatus.value,
    summary: els.buildSummary.value.trim() || undefined
  };

  try {
    setBuildFeedback('Bouwopdracht wordt gestart…');
    const created = await apiRequest('/api/chats', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    els.buildForm.reset();
    setBuildFeedback('');
    setBuildPopoverOpen(false);
    await fetchState();
    if (created?.builtBuildingId) {
      setSelection({ kind: 'building', id: created.builtBuildingId }, { focus: true });
    } else if (created?.id) {
      setSelection({ kind: 'chat', id: created.id }, { focus: true });
    }
  } catch (err) {
    setBuildFeedback(err.message || 'Starten mislukt.', true);
  }
});

// Simulation Actions
async function handleBuildOne() {
  try {
    setBuildFeedback('Bouwwerk wordt opgeleverd…');
    const res = await apiRequest('/api/demo/build-one', { method: 'POST' });
    if (res?.state) {
      applyPayload(res.state);
    } else {
      await fetchState();
    }
    if (res?.building) {
      setBuildFeedback(`${res.building.code} ${res.building.name} opgeleverd.`);
      scene.focusItem?.('building', res.building.id);
    }
  } catch (err) {
    setBuildFeedback(err.message || 'Opleveren mislukt.', true);
  }
}

els.btnDemoBuildOne.addEventListener('click', handleBuildOne);
els.btnEmptyBuild.addEventListener('click', handleBuildOne);

els.btnDemoSeed.addEventListener('click', async () => {
  try {
    setBuildFeedback('AI-bouwers worden geplaatst…');
    await apiRequest('/api/demo/seed', { method: 'POST' });
    await fetchState();
    setBuildFeedback('Zes AI-bouwers actief in de stad.');
  } catch (err) {
    setBuildFeedback(err.message || 'Laden mislukt.', true);
  }
});

els.btnDemoCycle.addEventListener('click', async () => {
  try {
    await apiRequest('/api/demo/cycle', { method: 'POST' });
    await fetchState();
    setBuildFeedback('Simulatiestap uitgevoerd.');
  } catch (err) {
    setBuildFeedback(err.message || 'Simuleren mislukt.', true);
  }
});

els.btnDemoClear.addEventListener('click', async () => {
  try {
    await apiRequest('/api/demo/clear', { method: 'POST' });
    await fetchState();
    setBuildFeedback('Demo-bouwers verwijderd; gebouwen blijven behouden.');
  } catch (err) {
    setBuildFeedback(err.message || 'Verwijderen mislukt.', true);
  }
});

// Deliberate 2-click confirm for City Reset
els.btnCityReset.addEventListener('click', async () => {
  if (els.btnCityReset.dataset.confirm !== 'true') {
    els.btnCityReset.dataset.confirm = 'true';
    els.btnCityReset.textContent = 'Klik nogmaals om te bevestigen';
    resetConfirmTimer = window.setTimeout(() => {
      resetDangerButtonState();
    }, 4500);
    return;
  }

  resetDangerButtonState();
  try {
    const res = await apiRequest('/api/city/reset', { method: 'POST' });
    setSelection(null);
    if (res?.state) {
      applyPayload(res.state);
    } else {
      await fetchState();
    }
    setBuildFeedback('Stad teruggezet naar 0 gebouwen.');
  } catch (err) {
    setBuildFeedback(err.message || 'Resetten mislukt.', true);
  }
});

// Audio Toggle
els.btnAudio.addEventListener('click', () => {
  const on = audio.toggle();
  els.btnAudio.setAttribute('aria-pressed', on ? 'true' : 'false');
  els.iconAudioOn.classList.toggle('is-hidden', !on);
  els.iconAudioOff.classList.toggle('is-hidden', on);
});

// Stadsregister Drawer
els.btnRegister.addEventListener('click', () => setRegisterOpen(!state.registerOpen));
els.btnRegisterClose.addEventListener('click', () => setRegisterOpen(false));
els.tabActive.addEventListener('click', () => setRegisterTab('active'));
els.tabCity.addEventListener('click', () => setRegisterTab('city'));
els.registerSearch.addEventListener('input', () => {
  state.registerQuery = els.registerSearch.value;
  renderRegister();
});

// Inspector Drawer
for (const btn of els.inspectorCloseBtns) {
  btn.addEventListener('click', () => setSelection(null));
}

els.btnCompleteBuild.addEventListener('click', async () => {
  if (state.selection?.kind !== 'chat') return;
  const chatId = state.selection.id;
  try {
    const res = await apiRequest(`/api/chats/${encodeURIComponent(chatId)}/complete`, {
      method: 'POST'
    });
    if (res?.state) {
      applyPayload(res.state);
    } else {
      await fetchState();
    }
    if (res?.building) {
      setSelection({ kind: 'building', id: res.building.id }, { focus: true });
    }
  } catch {
    showToast('Opleveren mislukt — probeer opnieuw', 'waiting', null);
  }
});

for (const btn of els.statusControlButtons) {
  btn.addEventListener('click', async () => {
    if (state.selection?.kind !== 'chat') return;
    const nextStatus = btn.dataset.setStatus;
    try {
      await apiRequest(`/api/chats/${encodeURIComponent(state.selection.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      await fetchState();
    } catch {
      showToast('Status wijzigen mislukt — probeer opnieuw', 'waiting', null);
    }
  });
}

for (const btn of els.typeControlButtons) {
  btn.addEventListener('click', async () => {
    if (state.selection?.kind !== 'chat') return;
    const nextType = btn.dataset.setType;
    try {
      await apiRequest(`/api/chats/${encodeURIComponent(state.selection.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ buildingType: nextType })
      });
      await fetchState();
    } catch {
      showToast('Type wijzigen mislukt — probeer opnieuw', 'waiting', null);
    }
  });
}

els.btnFocusChat.addEventListener('click', () => {
  if (state.selection?.kind === 'chat') {
    scene.focusItem?.('chat', state.selection.id);
  }
});

els.btnFocusBuilding.addEventListener('click', () => {
  if (state.selection?.kind === 'building') {
    scene.focusItem?.('building', state.selection.id);
  }
});

// Deliberate 2-click confirm for removing a single permanent building
els.btnDeleteBuilding?.addEventListener('click', async () => {
  if (state.selection?.kind !== 'building') return;
  if (els.btnDeleteBuilding.dataset.confirm !== 'true') {
    els.btnDeleteBuilding.dataset.confirm = 'true';
    els.btnDeleteBuilding.textContent = 'Bevestig verwijderen?';
    deleteBldgConfirmTimer = window.setTimeout(() => {
      resetDeleteBuildingConfirm();
    }, 4500);
    return;
  }

  const targetId = state.selection.id;
  const targetBldg = state.buildings.find((b) => b.id === targetId);
  resetDeleteBuildingConfirm();

  try {
    const res = await apiRequest(`/api/buildings/${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });
    setSelection(null);
    if (res?.state) {
      applyPayload(res.state);
    } else {
      await fetchState();
    }
    const label = targetBldg ? `${targetBldg.code || '#'} ${targetBldg.name}` : 'Gebouw';
    showToast(`${label} verwijderd uit de stad`, 'done', null);
  } catch (err) {
    showToast(err.message || 'Verwijderen mislukt — probeer opnieuw', 'waiting', null);
  }
});

// Project Import Modal Listeners
els.btnProjects?.addEventListener('click', () => {
  setProjectsModalOpen(!state.projectsOpen);
});
els.btnProjectsClose?.addEventListener('click', () => setProjectsModalOpen(false));
els.projectsBackdrop?.addEventListener('pointerdown', (evt) => {
  if (evt.target === els.projectsBackdrop) {
    setProjectsModalOpen(false);
  }
});
els.projectsSearch?.addEventListener('input', () => {
  state.projectsQuery = els.projectsSearch.value;
  renderProjectsList();
});
els.btnProjectsClear?.addEventListener('click', () => {
  state.selectedProjectPaths.clear();
  renderProjectsList();
});
els.btnProjectsImport?.addEventListener('click', handleImportSelectedProjects);

els.btnDeleteChat.addEventListener('click', async () => {
  if (state.selection?.kind !== 'chat') return;
  const id = state.selection.id;
  try {
    await apiRequest(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setSelection(null);
    await fetchState();
  } catch {
    showToast('Verwijderen mislukt — probeer opnieuw', 'waiting', null);
  }
});

// 3D Camera Controls
function syncTiltUI(mode) {
  state.tiltMode = mode === 'overview' ? 'overview' : '3d';
  const isOverview = state.tiltMode === 'overview';
  els.btnTiltToggle?.setAttribute('aria-pressed', isOverview ? 'true' : 'false');
  if (els.tiltToggleLabel) {
    els.tiltToggleLabel.textContent = isOverview ? 'Bovenaanzicht' : '3D';
  }
}

function toggleTiltMode() {
  const returned = scene.toggleTilt?.();
  if (returned === '3d' || returned === 'overview') {
    syncTiltUI(returned);
  } else {
    const next = state.tiltMode === '3d' ? 'overview' : '3d';
    scene.setTilt?.(next);
    syncTiltUI(next);
  }
}

function focusHq() {
  const hqId = state.city?.hq?.id || 'hq-shin-ai';
  setSelection({ kind: 'hq', id: hqId }, { focus: true });
}

els.btnFocusHq?.addEventListener('click', () => {
  const hqId = state.city?.hq?.id || 'hq-shin-ai';
  scene.focusItem?.('hq', hqId);
});
els.btnFocusHqBar?.addEventListener('click', focusHq);

els.btnZoomIn.addEventListener('click', () => scene.zoomIn?.());
els.btnZoomOut.addEventListener('click', () => scene.zoomOut?.());
els.btnZoomReset.addEventListener('click', () => {
  scene.resetView?.();
  syncTiltUI('3d');
});
els.btnOrbitLeft?.addEventListener('click', () => scene.orbit?.(-0.45));
els.btnOrbitRight?.addEventListener('click', () => scene.orbit?.(0.45));
els.btnTiltToggle?.addEventListener('click', () => toggleTiltMode());

// Keyboard Shortcuts
document.addEventListener('keydown', (evt) => {
  const tag = evt.target?.tagName;
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || evt.target?.isContentEditable;

  if (evt.key === 'Escape') {
    if (state.projectsOpen) {
      setProjectsModalOpen(false);
    } else if (state.buildOpen) {
      setBuildPopoverOpen(false);
    } else if (state.selection) {
      setSelection(null);
    } else if (state.registerOpen) {
      setRegisterOpen(false);
    }
    return;
  }

  if (isTyping || evt.ctrlKey || evt.metaKey || evt.altKey) return;

  switch (evt.key) {
    case '1':
      setFilter('all');
      break;
    case '2':
      setFilter('working');
      break;
    case '3':
      setFilter('waiting');
      break;
    case '4':
      setFilter('done');
      break;
    case '5':
      setFilter('sleeping');
      break;
    case 'r':
    case 'R':
      scene.resetView?.();
      syncTiltUI('3d');
      break;
    case 'q':
    case 'Q':
      scene.orbit?.(-0.45);
      break;
    case 'e':
    case 'E':
      scene.orbit?.(0.45);
      break;
    case 'v':
    case 'V':
      toggleTiltMode();
      break;
    case 'h':
    case 'H':
      focusHq();
      break;
    case '+':
    case '=':
      scene.zoomIn?.();
      break;
    case '-':
      scene.zoomOut?.();
      break;
    default:
      break;
  }
});

// Keep relative timestamps fresh
window.setInterval(() => {
  if (state.selection) {
    renderInspector();
  }
  if (state.registerOpen) {
    renderRegister();
  }
}, 30000);

window.addEventListener('resize', () => {
  scene.resize?.();
});

window.addEventListener('beforeunload', () => {
  if (eventSource) eventSource.close();
  scene.destroy?.();
});

// Boot
fetchState().finally(() => {
  connectSSE();
});
