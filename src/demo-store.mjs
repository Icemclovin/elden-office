import crypto from 'node:crypto';
import {
  BUILDER_ROLES,
  VALID_STATUSES,
  pickRole,
  statusToLabel,
} from './scanners.mjs';
import { VALID_BUILDING_TYPES } from './city-store.mjs';

const VALID_SOURCES = new Set(['claude', 'antigravity', 'hermes', 'gemini', 'demo']);

export const SPECIALTIES = {
  backend_engineer: { label: 'Backend Engineer', color: '#818cf8' },
  frontend_engineer: { label: 'Frontend Engineer', color: '#38bdf8' },
  tester: { label: 'Tester', color: '#34d399' },
  devops: { label: 'DevOps Engineer', color: '#2dd4bf' },
  cybersecurity: { label: 'Cybersecurity', color: '#f87171' },
  ui_designer: { label: 'UI Designer', color: '#f472b6' },
  team_lead: { label: 'Teamleider', color: '#fbbf24' },
  project_manager: { label: 'Projectmanager', color: '#a78bfa' },
};

const SPECIALTY_KEYS = Object.keys(SPECIALTIES);
const ROLE_TO_SPECIALTY = {
  ingenieur: 'backend_engineer',
  verkeersplanner: 'frontend_engineer',
  tuinarchitect: 'tester',
  stedenbouwer: 'devops',
  constructeur: 'ui_designer',
  architect: 'team_lead',
};

export function resolveSpecialty(chat) {
  let key = chat?.specialty && SPECIALTIES[chat.specialty] ? chat.specialty : null;
  if (!key) {
    const name = String(chat?.name || '').toLowerCase();
    if (/@backend|\bbackend\b|\bapi\b|\bserver\b/.test(name)) key = 'backend_engineer';
    else if (/@renderer|@scene|\bfrontend\b|\b3d\b|\bcamera\b/.test(name)) key = 'frontend_engineer';
    else if (/@verifier|\bqa\b|\btest/.test(name)) key = 'tester';
    else if (/@monitor|\bdevops\b|\bdeploy\b|\binfra\b|\bgateway\b/.test(name)) key = 'devops';
    else if (/\bcyber|\bsec|\bsecurity|\baudit/.test(name)) key = 'cybersecurity';
    else if (/@ui|\bui\b|\bhud\b|\bdesign|\bheader\b/.test(name)) key = 'ui_designer';
    else if (/\bteamlead|\bteamleider|\barchitect|\bschema|\bmigratie/.test(name)) key = 'team_lead';
    else if (/\bprojectmanager|\bplanning|\bsprint|\bcoordinator/.test(name)) key = 'project_manager';
    else if (chat?.role && ROLE_TO_SPECIALTY[chat.role]) key = ROLE_TO_SPECIALTY[chat.role];
    else {
      const seed = `${chat?.id || ''}:${chat?.name || ''}`;
      let h = 0;
      for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
      key = SPECIALTY_KEYS[h % SPECIALTY_KEYS.length];
    }
  }
  const info = SPECIALTIES[key];
  return { specialty: key, specialtyLabel: info.label, color: info.color };
}

function makeStarterBuilders(now) {
  return [
    {
      id: 'demo-haruto-api',
      name: 'Haruto — API Gateway',
      source: 'demo',
      role: 'ingenieur',
      specialty: 'backend_engineer',
      buildingType: 'flat',
      status: 'working',
      statusMode: 'manual',
      statusLabel: statusToLabel('working'),
      summary: 'Bouwt REST-endpoints, JWT-validatie en rate-limiting voor de hoofdserver.',
      lastUserMessage: 'Versterk de authenticatie-middleware en voeg integratietests toe voor alle endpoints.',
      lastAssistantMessage: 'Ik herschrijf nu de token-validatie en draai de testsuite voor de nieuwe API-laag.',
      currentTool: 'edit_file',
      workspace: '~/projecten/tokyo-api',
      filePath: null,
      updatedAt: now - 10 * 1000,
      messageCount: 18,
      isDemo: true,
    },
    {
      id: 'demo-aiko-toren',
      name: 'Aiko — 3D Frontend Engine',
      source: 'demo',
      role: 'verkeersplanner',
      specialty: 'frontend_engineer',
      buildingType: 'wolkenkrabber',
      status: 'working',
      statusMode: 'manual',
      statusLabel: statusToLabel('working'),
      summary: 'Optimaliseert 3D-camera, interactieve HUD-koppeling en 60 fps rendering.',
      lastUserMessage: 'Verbeter de 3D-camera en vloeiende interactie rond het Hoofdkantoor.',
      lastAssistantMessage: 'Ik stem de camera-lerp en grondschaduwen af voor haarscherpe 60 fps weergave.',
      currentTool: 'edit_file',
      workspace: '~/projecten/tokyo-frontend',
      filePath: null,
      updatedAt: now - 25 * 1000,
      messageCount: 26,
      isDemo: true,
    },
    {
      id: 'demo-sakura-schema',
      name: 'Sakura — Technisch Review',
      source: 'demo',
      role: 'architect',
      specialty: 'team_lead',
      buildingType: 'infrastructuur',
      status: 'waiting',
      statusMode: 'manual',
      statusLabel: statusToLabel('waiting'),
      summary: 'Begeleidt architectuur-review en Postgres-migratie — wacht op jouw akkoord.',
      lastUserMessage: 'Beoordeel het datamodel en bereid de migratie voor de nieuwe stadsindex voor.',
      lastAssistantMessage: 'De migratie vervangt de oude kolom `legacy_grid_id`. Zal ik eerst een veilige shadow-tabel aanmaken?',
      currentTool: null,
      workspace: '~/projecten/stads-db',
      filePath: null,
      updatedAt: now - 2 * 60 * 1000,
      messageCount: 12,
      isDemo: true,
    },
    {
      id: 'demo-ren-park',
      name: 'Ren — Playwright Testsuite',
      source: 'demo',
      role: 'tuinarchitect',
      specialty: 'tester',
      hqZone: 'lab',
      buildingType: 'infrastructuur',
      status: 'done',
      statusMode: 'manual',
      statusLabel: statusToLabel('done'),
      summary: 'Playwright E2E-suite en regressietests groen — stand-by in het HQ Testlab.',
      lastUserMessage: 'Draai de volledige Playwright browser-check zonder consolefouten.',
      lastAssistantMessage: 'Alle 1440x900 checks en API-assertions zijn groen. Paraat in het Testlab.',
      currentTool: null,
      workspace: '~/projecten/snelle-scanner',
      filePath: null,
      updatedAt: now - 16 * 60 * 1000,
      messageCount: 14,
      isDemo: true,
    },
    {
      id: 'demo-sora-sec',
      name: 'Sora — Security & SOC Audit',
      source: 'demo',
      role: 'ingenieur',
      specialty: 'cybersecurity',
      hqZone: 'lab',
      buildingType: 'flat',
      status: 'done',
      statusMode: 'manual',
      statusLabel: statusToLabel('done'),
      summary: 'Pentest, CSP-headers en kwetsbaarheidsscan afgerond — paraat in HQ Testlab.',
      lastUserMessage: 'Controleer alle API-routes op pad-traversal, payload-limieten en veilige headers.',
      lastAssistantMessage: 'Nul kritieke bevindingen; pad- en body-validatie zijn dichtgetimmerd.',
      currentTool: null,
      workspace: '~/projecten/tokyo-security',
      filePath: null,
      updatedAt: now - 22 * 60 * 1000,
      messageCount: 15,
      isDemo: true,
    },
    {
      id: 'demo-mei-lounge',
      name: 'Mei — HUD & Glass Design',
      source: 'demo',
      role: 'constructeur',
      specialty: 'ui_designer',
      hqZone: 'lounge',
      buildingType: 'huis',
      status: 'done',
      statusMode: 'manual',
      statusLabel: statusToLabel('done'),
      summary: 'HUD-design, kleurcontrasten en typografie opgeleverd — stand-by in HQ Lounge.',
      lastUserMessage: 'Werk de donkere glasstijl en kleurcontrasten van de HUD bij.',
      lastAssistantMessage: 'Alle HUD-tokens zijn bijgewerkt en gecontroleerd. Beschikbaar in de lounge.',
      currentTool: null,
      workspace: '~/projecten/tokyo-ui',
      filePath: null,
      updatedAt: now - 12 * 60 * 1000,
      messageCount: 11,
      isDemo: true,
    },
    {
      id: 'demo-kenji-woning',
      name: 'Kenji — Sprint & Planning',
      source: 'demo',
      role: 'architect',
      specialty: 'project_manager',
      hqZone: 'war_room',
      buildingType: 'huis',
      status: 'done',
      statusMode: 'manual',
      statusLabel: statusToLabel('done'),
      summary: 'Sprintplanning, oplevering en taakbord bijgewerkt — paraat in de HQ War Room.',
      lastUserMessage: 'Stem de mijlpalen en oplevering tussen backend, 3D en UI af.',
      lastAssistantMessage: 'Alle afhankelijkheden zijn ingepland en het taakbord is bijgewerkt.',
      currentTool: null,
      workspace: '~/projecten/stads-ui',
      filePath: null,
      updatedAt: now - 18 * 60 * 1000,
      messageCount: 7,
      isDemo: true,
    },
    {
      id: 'demo-yumi-archief',
      name: 'Yumi — CI/CD & Infra',
      source: 'demo',
      role: 'stedenbouwer',
      specialty: 'devops',
      buildingType: 'huis',
      status: 'sleeping',
      statusMode: 'manual',
      statusLabel: statusToLabel('sleeping'),
      summary: 'Deploy-pipeline en logboek-monitoring voltooid — rust uit in HQ slaapcabine.',
      lastUserMessage: 'Analyseer de deploy-logs van vorige week en optimaliseer de build-pipeline.',
      lastAssistantMessage: 'Alle drie de knelpunten zijn opgelost. Ik rust uit tot de volgende release.',
      currentTool: null,
      workspace: '~/projecten/observability',
      filePath: null,
      updatedAt: now - 5 * 60 * 60 * 1000,
      messageCount: 6,
      isDemo: true,
    },
  ];
}

function makeFullCuratedBuilders(now) {
  return makeStarterBuilders(now);
}

const FRESH_PROJECTS = [
  {
    name: 'Shinjuku Neon-Spire',
    buildingType: 'wolkenkrabber',
    role: 'architect',
    messageCount: 28,
    summary: 'Hoogbouw met neon-en-LED lichtgevel voor de realtime AI-engine.',
  },
  {
    name: 'Harajuku Winkelgalerij',
    buildingType: 'mall',
    role: 'stedenbouwer',
    messageCount: 16,
    summary: 'Groot overdekt winkelcentrum met glazen atrium en commerce-platform.',
  },
  {
    name: 'Ueno Bloesempark',
    buildingType: 'infrastructuur',
    role: 'tuinarchitect',
    messageCount: 9,
    summary: 'Stadsinfrastructuur en geautomatiseerde testomgeving met kersenbloesemtuin.',
  },
  {
    name: 'Kagurazaka Cederhuis',
    buildingType: 'huis',
    role: 'constructeur',
    messageCount: 5,
    summary: 'Snel gebouwde hulpmodule voor datum- en tijdnotaties in het Nederlands.',
  },
  {
    name: 'Ginza LED-Toren',
    buildingType: 'wolkenkrabber',
    role: 'ingenieur',
    messageCount: 32,
    summary: '24-verdiepingen megatoren met skyline-verlichting voor de core-infrastructuur.',
  },
  {
    name: 'Odaiba Glazen Flat',
    buildingType: 'flat',
    role: 'verkeersplanner',
    messageCount: 14,
    summary: 'Moderne Tokyo glas-en-beton flat voor de nieuwe API- en cachelaag.',
  },
  {
    name: 'Shibuya Arcade Mall',
    buildingType: 'mall',
    role: 'architect',
    messageCount: 18,
    summary: 'Levendige winkelgalerij voor het POS- en catalogussysteem.',
  },
  {
    name: 'Asakusa Poortplein',
    buildingType: 'infrastructuur',
    role: 'tuinarchitect',
    messageCount: 8,
    summary: 'Plein en verbindingsbrug opgeleverd na een succesvolle CI/CD-migratie.',
  },
];

export function createDemoStore() {
  /** @type {Map<string, object>} */
  const demoChats = new Map();
  /** @type {Map<string, { status?: string, name?: string, summary?: string, role?: string, buildingType?: string }>} */
  const overrides = new Map();

  let startupChecked = false;
  let userClearedDemo = false;
  let projectSeq = 0;

  function maybeAutoSeed(realChats) {
    if (startupChecked || userClearedDemo) return;
    startupChecked = true;
    const activeReal = realChats.filter(
      (c) => c.status === 'working' || c.status === 'waiting'
    ).length;
    if (activeReal < 2 && demoChats.size === 0) {
      for (const b of makeStarterBuilders(Date.now())) {
        demoChats.set(b.id, b);
      }
    }
  }

  function applyOverride(chat) {
    const ov = overrides.get(chat.id);
    if (!ov) return chat;
    const nextStatus = ov.status && VALID_STATUSES.has(ov.status) ? ov.status : chat.status;
    return {
      ...chat,
      name: ov.name !== undefined ? ov.name : chat.name,
      summary: ov.summary !== undefined ? ov.summary : chat.summary,
      role: ov.role !== undefined ? ov.role : chat.role,
      buildingType: ov.buildingType !== undefined ? ov.buildingType : chat.buildingType,
      status: nextStatus,
      statusMode: ov.status ? 'manual' : 'auto',
      statusLabel: statusToLabel(nextStatus),
      currentTool: nextStatus === 'working' ? chat.currentTool : null,
    };
  }

  function getMergedChats(realChats) {
    maybeAutoSeed(realChats);

    const mergedReal = realChats.map(applyOverride);
    const mergedDemos = Array.from(demoChats.values());
    const chats = [...mergedDemos, ...mergedReal];

    const prio = { waiting: 0, working: 1, done: 2, sleeping: 3 };
    chats.sort((a, b) => {
      const pa = prio[a.status] ?? 9;
      const pb = prio[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.updatedAt - a.updatedAt;
    });

    return {
      chats,
      realCount: mergedReal.length,
      demoCount: mergedDemos.length,
      demoActive: demoChats.size > 0,
    };
  }

  function createCustomChat(payload = {}) {
    const now = Date.now();
    const shortRand = crypto.randomBytes(3).toString('hex');
    const id = `demo-${shortRand}`;
    const status = VALID_STATUSES.has(payload.status) ? payload.status : 'working';
    const source = VALID_SOURCES.has(payload.source) ? payload.source : 'demo';
    const role = BUILDER_ROLES.includes(payload.role) ? payload.role : pickRole(id);
    const buildingType =
      payload.buildingType && VALID_BUILDING_TYPES.has(payload.buildingType)
        ? payload.buildingType
        : undefined;

    const name =
      typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim().slice(0, 60)
        : `Bouwteam #${shortRand.slice(0, 4).toUpperCase()}`;

    const summary =
      typeof payload.summary === 'string' && payload.summary.trim()
        ? payload.summary.trim().slice(0, 220)
        : status === 'waiting'
          ? 'Wacht op jouw akkoord voordat de volgende bouwfase start.'
          : status === 'done'
            ? 'Bouwopdracht voltooid en blijvend toegevoegd aan Shin-AI Tokyo.'
            : status === 'sleeping'
              ? 'Bouwplaats staat rustig in de avondschemering.'
              : 'Werkt actief aan de constructie en code op deze kavel.';

    const chat = {
      id,
      name,
      source,
      role,
      ...(payload.specialty && SPECIALTIES[payload.specialty] ? { specialty: payload.specialty } : {}),
      ...(buildingType ? { buildingType } : {}),
      status,
      statusMode: 'manual',
      statusLabel: statusToLabel(status),
      summary,
      lastUserMessage:
        typeof payload.lastUserMessage === 'string' && payload.lastUserMessage.trim()
          ? payload.lastUserMessage.trim().slice(0, 280)
          : `Nieuwe bouwopdracht: ${summary}`,
      lastAssistantMessage:
        typeof payload.lastAssistantMessage === 'string' && payload.lastAssistantMessage.trim()
          ? payload.lastAssistantMessage.trim().slice(0, 280)
          : summary,
      currentTool:
        status === 'working'
          ? typeof payload.currentTool === 'string'
            ? payload.currentTool
            : 'edit_file'
          : null,
      workspace:
        typeof payload.workspace === 'string' && payload.workspace.trim()
          ? payload.workspace.trim().slice(0, 120)
          : '~/shin-ai-tokyo/bouwplaats',
      filePath: null,
      updatedAt: now,
      messageCount: Number(payload.messageCount || (buildingType === 'flat' ? 14 : 4)),
      isDemo: true,
    };

    demoChats.set(id, chat);
    userClearedDemo = false;
    return chat;
  }

  function patchChat(id, payload = {}, realChats = []) {
    if (demoChats.has(id)) {
      const existing = demoChats.get(id);
      const next = { ...existing };

      if (typeof payload.name === 'string' && payload.name.trim()) {
        next.name = payload.name.trim().slice(0, 60);
      }
      if (typeof payload.summary === 'string' && payload.summary.trim()) {
        next.summary = payload.summary.trim().slice(0, 220);
      }
      if (BUILDER_ROLES.includes(payload.role)) {
        next.role = payload.role;
      }
      if (payload.buildingType === 'auto') {
        delete next.buildingType;
      } else if (VALID_BUILDING_TYPES.has(payload.buildingType)) {
        next.buildingType = payload.buildingType;
      }

      if (payload.status === 'auto') {
        next.statusMode = 'auto';
      } else if (VALID_STATUSES.has(payload.status)) {
        next.status = payload.status;
        next.statusMode = 'manual';
        next.statusLabel = statusToLabel(payload.status);
        next.currentTool =
          payload.status === 'working' ? existing.currentTool || 'edit_file' : null;
      }

      next.updatedAt = Date.now();
      demoChats.set(id, next);
      return next;
    }

    const real = realChats.find((c) => c.id === id);
    if (!real) return null;

    const currentOv = { ...(overrides.get(id) || {}) };

    if (payload.status === 'auto') {
      delete currentOv.status;
    } else if (VALID_STATUSES.has(payload.status)) {
      currentOv.status = payload.status;
    }

    if (payload.buildingType === 'auto') {
      delete currentOv.buildingType;
    } else if (VALID_BUILDING_TYPES.has(payload.buildingType)) {
      currentOv.buildingType = payload.buildingType;
    }

    if (typeof payload.name === 'string' && payload.name.trim()) {
      currentOv.name = payload.name.trim().slice(0, 60);
    }
    if (typeof payload.summary === 'string' && payload.summary.trim()) {
      currentOv.summary = payload.summary.trim().slice(0, 220);
    }
    if (BUILDER_ROLES.includes(payload.role)) {
      currentOv.role = payload.role;
    }

    if (Object.keys(currentOv).length === 0) {
      overrides.delete(id);
    } else {
      overrides.set(id, currentOv);
    }

    return applyOverride(real);
  }

  function deleteChat(id, realChats = []) {
    if (demoChats.has(id)) {
      demoChats.delete(id);
      return true;
    }
    const real = realChats.find((c) => c.id === id);
    if (real || overrides.has(id)) {
      overrides.delete(id);
      return true;
    }
    return false;
  }

  function seedDemos() {
    userClearedDemo = false;
    startupChecked = true;
    for (const b of makeFullCuratedBuilders(Date.now())) {
      demoChats.set(b.id, b);
    }
  }

  function clearDemos() {
    demoChats.clear();
    userClearedDemo = true;
    startupChecked = true;
  }

  function nextFreshProject() {
    const tpl = FRESH_PROJECTS[projectSeq % FRESH_PROJECTS.length];
    projectSeq++;
    return tpl;
  }

  function spawnFreshWorkingBuilder() {
    const tpl = nextFreshProject();
    return createCustomChat({
      name: tpl.name,
      buildingType: tpl.buildingType,
      role: tpl.role,
      status: 'working',
      summary: tpl.summary,
      messageCount: tpl.messageCount,
      currentTool: 'edit_file',
    });
  }

  /**
   * Immediately completes one working/waiting demo builder (or spawns + completes a fresh
   * Tokyo project) and returns the completed chat so cityStore persists a permanent building.
   */
  function buildOne(cityStore) {
    const demos = Array.from(demoChats.values());
    const candidate =
      demos.find((d) => d.status === 'working' && !cityStore.findBuildingByChatId(d.id)) ||
      demos.find((d) => d.status === 'waiting' && !cityStore.findBuildingByChatId(d.id));

    if (candidate) {
      const doneChat = {
        ...candidate,
        status: 'done',
        statusMode: 'manual',
        statusLabel: statusToLabel('done'),
        summary: `Opgeleverd: ${candidate.summary}`,
        lastAssistantMessage: 'Bouw afgerond en blijvend vastgelegd in het stadsregister van Shin-AI Tokyo.',
        currentTool: null,
        updatedAt: Date.now(),
        messageCount: candidate.messageCount + 1,
      };
      demoChats.set(candidate.id, doneChat);
      const { building } = cityStore.recordBuildingForChat(doneChat);
      // Keep the construction scene lively by starting a new site on the next free parcel
      spawnFreshWorkingBuilder();
      return { building, chat: doneChat };
    }

    // No active unbuilt demo builder: spawn & complete a fresh Tokyo project
    const tpl = nextFreshProject();
    const fresh = createCustomChat({
      name: tpl.name,
      buildingType: tpl.buildingType,
      role: tpl.role,
      status: 'done',
      summary: tpl.summary,
      messageCount: tpl.messageCount,
    });
    const { building } = cityStore.recordBuildingForChat(fresh);
    return { building, chat: fresh };
  }

  /**
   * Advances 1-2 demo builders:
   * - Turns a working builder into a permanent completed building + opens a new construction site
   * - Advances a waiting/sleeping builder to working or waiting
   */
  function cycleDemos(cityStore) {
    const demos = Array.from(demoChats.values());
    if (demos.length === 0) return 0;

    const now = Date.now();
    let changed = 0;

    const working = demos.find(
      (d) => d.status === 'working' && !cityStore.findBuildingByChatId(d.id)
    );
    if (working) {
      const completed = {
        ...working,
        status: 'done',
        statusMode: 'manual',
        statusLabel: statusToLabel('done'),
        summary: `Bouw voltooid — blijvend toegevoegd aan Shin-AI Tokyo.`,
        lastAssistantMessage: 'Alle controles zijn geslaagd; het nieuwe bouwwerk staat nu permanent in de stad.',
        currentTool: null,
        updatedAt: now,
        messageCount: working.messageCount + 1,
      };
      demoChats.set(working.id, completed);
      cityStore.recordBuildingForChat(completed);
      spawnFreshWorkingBuilder();
      changed++;
    }

    const waiting = demos.find((d) => d.status === 'waiting');
    if (waiting) {
      demoChats.set(waiting.id, {
        ...waiting,
        status: 'working',
        statusMode: 'manual',
        statusLabel: statusToLabel('working'),
        summary: 'Akkoord ontvangen — voert de goedgekeurde bouwfase uit.',
        lastAssistantMessage: 'Helder, ik pak de wijzigingen direct op en test het eindresultaat.',
        currentTool: 'edit_file',
        updatedAt: now,
        messageCount: waiting.messageCount + 1,
      });
      changed++;
    } else if (changed < 2) {
      const sleeping = demos.find((d) => d.status === 'sleeping');
      if (sleeping) {
        demoChats.set(sleeping.id, {
          ...sleeping,
          status: 'waiting',
          statusMode: 'manual',
          statusLabel: statusToLabel('waiting'),
          summary: 'Heropend — wacht op jouw keuze voor de volgende bouwstap.',
          lastAssistantMessage: 'De kavel is weer actief. Wil je dat ik een huis, flat of park uitwerk?',
          currentTool: null,
          updatedAt: now,
          messageCount: sleeping.messageCount + 1,
        });
        changed++;
      }
    }

    if (changed === 0) {
      spawnFreshWorkingBuilder();
      changed = 1;
    }

    return changed;
  }

  return {
    getMergedChats,
    createCustomChat,
    patchChat,
    deleteChat,
    seedDemos,
    clearDemos,
    buildOne,
    cycleDemos,
  };
}
