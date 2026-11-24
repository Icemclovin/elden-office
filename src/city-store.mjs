import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hashString } from './scanners.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CITY_FILE = path.resolve(__dirname, '..', 'data', 'city.json');

export const VALID_BUILDING_TYPES = new Set([
  'huis',
  'flat',
  'wolkenkrabber',
  'mall',
  'infrastructuur',
]);

export const HQ_LOT = { gridX: 1, gridY: -1 };

const FLAT_SUBTYPES = ['glass_flat', 'cedar_tower', 'neon_flat', 'zen_penthouse', 'residence_tower'];
const SKYSCRAPER_SUBTYPES = ['neon_spire', 'led_tower', 'cyber_citadel', 'solar_tower', 'aoyama_tower'];
const MALL_SUBTYPES = ['shibuya_mall', 'arcade_galleria', 'department_store', 'night_bazaar'];
const INFRA_SUBTYPES = [
  'sakura_park',
  'metro_station',
  'canal_bridge',
  'solar_hub',
  'torii_plaza',
  'harbor_lighthouse',
  'waterfront_market',
];
const HOUSE_SUBTYPES = ['machiya', 'cedar_house', 'courtyard_home', 'townhouse', 'zen_garden_home'];

const SKYSCRAPER_REGEX =
  /\b(metropool|skyline|platform|engine|harness|system|ai|3d|full|monorepo|zenith|deepseek|wolkenkrabber|megatoren|spire)\b/i;
const MALL_REGEX =
  /\b(kassa|pos|shop|store|mall|market|winkel|commerce|catalog|portfolio|craft|scentlabs|galleria)\b/i;
const FLAT_REGEX =
  /\b(api|app|ui|build|feature|refactor|server|dashboard|frontend|scene|stad|systeem|project|backend|architectuur|database|schema|toren|flat|woontoren)\b/i;
const INFRA_REGEX =
  /\b(tool|setup|config|git|docker|test|fix|infra|gateway|sync|deploy|scanner|bridge|park|metro|dotsync|hermes|plugin|vm|ci|pipeline|netwerk|brug|spoor|station|zonne|migratie)\b/i;

const MILESTONES = [
  {
    level: 1,
    min: 0,
    name: 'Kustdorp',
    nextMilestone: 4,
    nextMilestoneName: 'Woonwijk',
    unlockedFeatures: ['basisstraten'],
  },
  {
    level: 2,
    min: 4,
    name: 'Woonwijk',
    nextMilestone: 8,
    nextMilestoneName: 'Groeiende Stad',
    unlockedFeatures: ['basisstraten', 'straatlantaarns', 'bloesembomen'],
  },
  {
    level: 3,
    min: 8,
    name: 'Groeiende Stad',
    nextMilestone: 14,
    nextMilestoneName: 'Bruisende Wijk',
    unlockedFeatures: [
      'basisstraten',
      'straatlantaarns',
      'bloesembomen',
      'stadsverkeer',
      'kanaalbruggen',
    ],
  },
  {
    level: 4,
    min: 14,
    name: 'Bruisende Wijk',
    nextMilestone: 22,
    nextMilestoneName: 'Tokyo Metropool',
    unlockedFeatures: [
      'basisstraten',
      'straatlantaarns',
      'bloesembomen',
      'stadsverkeer',
      'kanaalbruggen',
      'verhoogde_monorail',
      'skyline',
    ],
  },
  {
    level: 5,
    min: 22,
    name: 'Tokyo Metropool',
    nextMilestone: 35,
    nextMilestoneName: 'Neon Megastad',
    unlockedFeatures: [
      'basisstraten',
      'straatlantaarns',
      'bloesembomen',
      'stadsverkeer',
      'kanaalbruggen',
      'verhoogde_monorail',
      'skyline',
      'metropool_gloed',
      'haven',
    ],
  },
  {
    level: 6,
    min: 35,
    name: 'Neon Megastad',
    nextMilestone: null,
    nextMilestoneName: null,
    unlockedFeatures: [
      'basisstraten',
      'straatlantaarns',
      'bloesembomen',
      'stadsverkeer',
      'kanaalbruggen',
      'verhoogde_monorail',
      'skyline',
      'metropool_gloed',
      'haven',
      'megastad_skyline',
      'neon_district',
    ],
  },
];

// Infinite auto-expanding spiral parcel catalog around the central Tokyo crossroads/canal.
// Skips all boulevard axes (x % 4 === 0, y % 4 === 0) and reserves (1, -1) for the AI HQ landmark.
// Expands by circular shells (d^2 <= R^2) so existing lotIndex -> (gridX, gridY) mappings NEVER shift.
const PARCEL_RING_CACHE = [];
let cachedMaxRadius = 0;

function ensureParcelCount(needed) {
  while (PARCEL_RING_CACHE.length < needed) {
    const prevR2 = cachedMaxRadius * cachedMaxRadius;
    const nextR = cachedMaxRadius + 6;
    const nextR2 = nextR * nextR;

    const shell = [];
    for (let x = -nextR; x <= nextR; x++) {
      if (x % 4 === 0) continue;
      for (let y = -nextR; y <= nextR; y++) {
        if (y % 4 === 0) continue;
        if (x === HQ_LOT.gridX && y === HQ_LOT.gridY) continue;
        const d2 = x * x + y * y;
        if (d2 > prevR2 && d2 <= nextR2) {
          shell.push({ gridX: x, gridY: y, d2 });
        }
      }
    }

    shell.sort((a, b) => {
      if (a.d2 !== b.d2) return a.d2 - b.d2;
      const aa = Math.atan2(a.gridY, a.gridX);
      const ab = Math.atan2(b.gridY, b.gridX);
      if (aa !== ab) return aa - ab;
      return a.gridX - b.gridX;
    });

    for (const c of shell) {
      PARCEL_RING_CACHE.push({
        lotIndex: PARCEL_RING_CACHE.length,
        gridX: c.gridX,
        gridY: c.gridY,
      });
    }
    cachedMaxRadius = nextR;
  }
}

export function getParcelByIndex(lotIndex) {
  ensureParcelCount(lotIndex + 12);
  return PARCEL_RING_CACHE[lotIndex];
}

export function formatCatalogCode(num) {
  return `#${String(num).padStart(3, '0')}`;
}

/**
 * Classify a chat into { buildingType, subtype, floors }.
 * Honors explicit buildingType if provided ('huis' | 'flat' | 'wolkenkrabber' | 'mall' | 'infrastructuur').
 */
export function classifyBuilding(chat, explicitType = null) {
  const seedStr = `${chat?.id || ''}:${chat?.name || ''}`;
  const h = hashString(seedStr);
  const text = `${chat?.name || ''} ${chat?.summary || ''} ${chat?.lastUserMessage || ''} ${chat?.workspace || ''}`;
  const msgCount = Number(chat?.messageCount || 1);

  let buildingType =
    explicitType && VALID_BUILDING_TYPES.has(explicitType)
      ? explicitType
      : chat?.buildingType && VALID_BUILDING_TYPES.has(chat.buildingType)
        ? chat.buildingType
        : null;

  if (!buildingType) {
    const isMall = MALL_REGEX.test(text);
    const isSkyscraper = msgCount >= 24 || SKYSCRAPER_REGEX.test(text);
    const isInfra = INFRA_REGEX.test(text);
    const isFlat = FLAT_REGEX.test(text);

    if (isMall) {
      buildingType = 'mall';
    } else if (isSkyscraper && !/\b(dotsync|quicknote|c-tools)\b/i.test(text)) {
      buildingType = 'wolkenkrabber';
    } else if (isInfra && !/\b(dashboard|frontend|scene|woontoren|flat)\b/i.test(text)) {
      buildingType = 'infrastructuur';
    } else if (isFlat || msgCount >= 10) {
      buildingType = 'flat';
    } else if (isInfra) {
      buildingType = 'infrastructuur';
    } else {
      buildingType = 'huis';
    }
  }

  if (buildingType === 'wolkenkrabber') {
    const subtype = SKYSCRAPER_SUBTYPES[h % SKYSCRAPER_SUBTYPES.length];
    const floors = Math.min(28, Math.max(16, 16 + Math.floor(msgCount / 3) + (h % 5)));
    return { buildingType, subtype, floors };
  }

  if (buildingType === 'mall') {
    const subtype = MALL_SUBTYPES[h % MALL_SUBTYPES.length];
    const floors = 3 + (h % 3); // 3..5 brede etages
    return { buildingType, subtype, floors };
  }

  if (buildingType === 'flat') {
    const subtype = FLAT_SUBTYPES[h % FLAT_SUBTYPES.length];
    const baseFloors = Math.min(12, Math.max(4, 4 + Math.floor(msgCount / 4) + (h % 4)));
    return { buildingType, subtype, floors: baseFloors };
  }

  if (buildingType === 'infrastructuur') {
    let subtype = INFRA_SUBTYPES[h % INFRA_SUBTYPES.length];
    if (/park|sakura|bloesem|tuin/i.test(text)) subtype = 'sakura_park';
    else if (/metro|station|spoor|trein/i.test(text)) subtype = 'metro_station';
    else if (/bridge|brug|kanaal|canal/i.test(text)) subtype = 'canal_bridge';
    else if (/solar|zonne|energie|grid|hub|gateway/i.test(text)) subtype = 'solar_hub';
    else if (/plaza|plein|torii|poort/i.test(text)) subtype = 'torii_plaza';
    const floors = subtype === 'metro_station' ? 2 : 1;
    return { buildingType, subtype, floors };
  }

  const subtype = HOUSE_SUBTYPES[h % HOUSE_SUBTYPES.length];
  const floors = 1 + (h % 3); // 1..3 verdiepingen
  return { buildingType: 'huis', subtype, floors };
}

function makeStarterBuildings(now) {
  return [
    {
      chatId: 'starter-shibuya-ceder',
      name: 'Shibuya Cederhuis',
      source: 'demo',
      buildingType: 'huis',
      subtype: 'machiya',
      floors: 2,
      builtAt: now - 3 * 60 * 60 * 1000,
      summary: 'Compacte Japanse cederhout-woning opgeleverd na een snelle refactor van de opstartmodule.',
    },
    {
      chatId: 'starter-sakura-park',
      name: 'Kersenbloesempark',
      source: 'demo',
      buildingType: 'infrastructuur',
      subtype: 'sakura_park',
      floors: 1,
      builtAt: now - 2.5 * 60 * 60 * 1000,
      summary: 'Rustige groene stadsoase met koivijver, aangelegd na het inrichten van de teststraat.',
    },
    {
      chatId: 'starter-aoyama-toren',
      name: 'Aoyama Glastoren',
      source: 'demo',
      buildingType: 'flat',
      subtype: 'glass_flat',
      floors: 8,
      builtAt: now - 2 * 60 * 60 * 1000,
      summary: 'Moderne Tokyo woontoren van glas en beton, opgetrokken tijdens de volledige API-bouw.',
    },
    {
      chatId: 'starter-ginza-spire',
      name: 'Ginza Neon-Spire',
      source: 'demo',
      buildingType: 'wolkenkrabber',
      subtype: 'neon_spire',
      floors: 22,
      builtAt: now - 90 * 60 * 1000,
      summary: 'Iconische neon-en-LED wolkenkrabber voor het 3D stadsplatform en live datastreams.',
    },
    {
      chatId: 'starter-shibuya-mall',
      name: 'Shibuya Winkelgalerij',
      source: 'demo',
      buildingType: 'mall',
      subtype: 'shibuya_mall',
      floors: 4,
      builtAt: now - 40 * 60 * 1000,
      summary: 'Overdekt Tokyo winkelcentrum met glazen atrium en LED-luifel voor commerce-projecten.',
    },
  ];
}

export function computeCityMetrics(buildings, hqStats = null) {
  const totalBuildings = buildings.length;
  let houses = 0;
  let flats = 0;
  let skyscrapers = 0;
  let malls = 0;
  let infrastructure = 0;
  let flatFloorsSum = 0;
  let skyscraperFloorsSum = 0;

  for (const b of buildings) {
    if (b.buildingType === 'wolkenkrabber') {
      skyscrapers++;
      skyscraperFloorsSum += Number(b.floors || 20);
    } else if (b.buildingType === 'mall') {
      malls++;
    } else if (b.buildingType === 'flat') {
      flats++;
      flatFloorsSum += Number(b.floors || 6);
    } else if (b.buildingType === 'infrastructuur') {
      infrastructure++;
    } else {
      houses++;
    }
  }

  let milestone = MILESTONES[0];
  for (const m of MILESTONES) {
    if (totalBuildings >= m.min) milestone = m;
  }

  const population =
    houses * 4 +
    flatFloorsSum * 18 +
    skyscraperFloorsSum * 28 +
    malls * 180 +
    infrastructure * 25;

  const typesPresent =
    (houses > 0 ? 1 : 0) +
    (flats > 0 ? 1 : 0) +
    (skyscrapers > 0 ? 1 : 0) +
    (malls > 0 ? 1 : 0) +
    (infrastructure > 0 ? 1 : 0);
  const diversityScore = Math.min(45, typesPresent * 9);
  const infraBonus = Math.min(25, (infrastructure + malls) * 6);
  const growthBonus = Math.min(30, Math.round(totalBuildings * 1.3));
  const beautyScore =
    totalBuildings === 0 ? 0 : Math.min(100, diversityScore + infraBonus + growthBonus);

  const hq = {
    id: 'hq-shin-ai',
    name: 'Shin-AI Hoofdkantoor',
    gridX: HQ_LOT.gridX,
    gridY: HQ_LOT.gridY,
    activeWorkers: Number(hqStats?.activeWorkers || 0),
    waitingWorkers: Number(hqStats?.waitingWorkers || 0),
    totalAgents: Number(hqStats?.totalAgents || 0),
    level: milestone.level,
  };

  return {
    level: milestone.level,
    name: milestone.name,
    nextMilestone: milestone.nextMilestone,
    nextMilestoneName: milestone.nextMilestoneName,
    totalBuildings,
    houses,
    flats,
    skyscrapers,
    malls,
    infrastructure,
    population,
    beautyScore,
    unlockedFeatures: [...milestone.unlockedFeatures],
    hq,
  };
}

export function createCityStore(cityFilePath = process.env.CITY_DATA_PATH || DEFAULT_CITY_FILE) {
  let buildings = [];
  let nextCatalogNumber = 1;
  let resetAt = 0;
  let initializedFromDisk = false;
  let hadExistingFile = false;

  // Stable lot assignments for currently active (unbuilt) chats so construction sites don't jump
  const activeLotByChatId = new Map();

  // Serialized atomic write queue so rapid API bursts never collide on rename
  let writeChain = Promise.resolve();

  function getOccupiedLots(extraOccupied = null) {
    const occupied = new Set();
    for (const b of buildings) {
      occupied.add(b.lotIndex);
    }
    if (extraOccupied) {
      for (const idx of extraOccupied) occupied.add(idx);
    }
    return occupied;
  }

  function allocateFreeLot(occupied) {
    let idx = 0;
    while (occupied.has(idx)) idx++;
    occupied.add(idx);
    return getParcelByIndex(idx);
  }

  function schedulePersist() {
    const snapshot = JSON.stringify(
      {
        version: 1,
        nextCatalogNumber,
        resetAt,
        buildings,
      },
      null,
      2
    );

    writeChain = writeChain
      .then(async () => {
        const dir = path.dirname(cityFilePath);
        await fs.mkdir(dir, { recursive: true });
        const tmpFile = `${cityFilePath}.tmp.${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
        await fs.writeFile(tmpFile, snapshot, 'utf8');
        await fs.rename(tmpFile, cityFilePath);
      })
      .catch((err) => {
        console.error('[Shin-AI Tokyo] Fout bij opslaan city.json:', err?.message || err);
      });

    return writeChain;
  }

  async function flush() {
    await writeChain;
  }

  async function load() {
    if (initializedFromDisk) return;
    initializedFromDisk = true;
    try {
      const raw = await fs.readFile(cityFilePath, 'utf8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.buildings)) {
        buildings = data.buildings;
        const maxCat = buildings.reduce((m, b) => Math.max(m, Number(b.catalogNumber || 0)), 0);
        nextCatalogNumber = Math.max(Number(data.nextCatalogNumber || 1), maxCat + 1);
        resetAt = Number(data.resetAt || 0);
        hadExistingFile = true;

        // Relocate any legacy building that sits on the reserved AI HQ landmark parcel (1, -1)
        let relocated = false;
        const occupied = getOccupiedLots();
        for (const b of buildings) {
          if (b.gridX === HQ_LOT.gridX && b.gridY === HQ_LOT.gridY) {
            const parcel = allocateFreeLot(occupied);
            b.lotIndex = parcel.lotIndex;
            b.gridX = parcel.gridX;
            b.gridY = parcel.gridY;
            relocated = true;
          }
        }
        if (relocated) {
          await schedulePersist();
        }
      }
    } catch (err) {
      if (err?.code !== 'ENOENT') {
        console.error('[Shin-AI Tokyo] Kan city.json niet lezen, start schoon:', err?.message || err);
      }
      hadExistingFile = false;
    }
  }

  function findBuildingByChatId(chatId) {
    if (!chatId) return null;
    return buildings.find((b) => b.chatId === chatId) || null;
  }

  function findBuildingByProject(projectId, projectPath) {
    return (
      buildings.find(
        (b) =>
          (projectId && b.chatId === projectId) ||
          (projectPath && b.projectPath === projectPath)
      ) || null
    );
  }

  /**
   * Permanently record a building for a completed chat (idempotent per chatId unless forceNew).
   * Reuses the chat's active construction lot if it already had one!
   */
  function recordBuildingForChat(chat, { forceNew = false, explicitType = null } = {}) {
    if (!forceNew && chat?.id) {
      const existing = findBuildingByChatId(chat.id);
      if (existing) return { building: existing, created: false };
    }

    const occupied = getOccupiedLots();
    let parcel = null;

    if (!forceNew && chat?.id && activeLotByChatId.has(chat.id)) {
      const prevLot = activeLotByChatId.get(chat.id);
      if (!occupied.has(prevLot)) {
        parcel = getParcelByIndex(prevLot);
        occupied.add(prevLot);
      }
      activeLotByChatId.delete(chat.id);
    }

    if (!parcel) {
      parcel = allocateFreeLot(occupied);
    }

    const spec = classifyBuilding(chat, explicitType);
    const catalogNumber = nextCatalogNumber++;
    const code = formatCatalogCode(catalogNumber);
    const id = `bldg-${String(catalogNumber).padStart(3, '0')}`;

    const building = {
      id,
      catalogNumber,
      code,
      chatId: forceNew ? `${chat?.id || 'build'}-${catalogNumber}` : chat?.id || id,
      name: String(chat?.name || `Bouwwerk ${code}`).slice(0, 64),
      source: chat?.source || 'demo',
      buildingType: spec.buildingType,
      subtype: chat?.plannedSubtype && !explicitType ? chat.plannedSubtype : spec.subtype,
      floors:
        typeof chat?.plannedFloors === 'number' && !explicitType && chat.buildingType === spec.buildingType
          ? chat.plannedFloors
          : spec.floors,
      lotIndex: parcel.lotIndex,
      gridX: parcel.gridX,
      gridY: parcel.gridY,
      builtAt: Date.now(),
      summary: String(chat?.summary || 'Opgeleverd en blijvend opgenomen in Shin-AI Tokyo.').slice(0, 220),
    };

    buildings.push(building);
    schedulePersist();
    return { building, created: true };
  }

  /**
   * First-boot seeding when data/city.json does not exist yet:
   * records real done chats, then tops up to 5 tasteful starter Tokyo buildings.
   */
  async function ensureInitialCity(realChats = []) {
    await load();
    if (hadExistingFile) return;

    let changed = false;
    for (const chat of realChats) {
      if (chat.status === 'done') {
        const res = recordBuildingForChat(chat);
        if (res.created) changed = true;
      }
    }

    if (buildings.length < 5) {
      const starters = makeStarterBuildings(Date.now());
      for (const s of starters) {
        if (buildings.length >= 5) break;
        const occupied = getOccupiedLots();
        const parcel = allocateFreeLot(occupied);
        const catalogNumber = nextCatalogNumber++;
        const code = formatCatalogCode(catalogNumber);
        buildings.push({
          id: `bldg-${String(catalogNumber).padStart(3, '0')}`,
          catalogNumber,
          code,
          chatId: s.chatId,
          name: s.name,
          source: s.source,
          buildingType: s.buildingType,
          subtype: s.subtype,
          floors: s.floors,
          lotIndex: parcel.lotIndex,
          gridX: parcel.gridX,
          gridY: parcel.gridY,
          builtAt: s.builtAt,
          summary: s.summary,
        });
        changed = true;
      }
    }

    hadExistingFile = true;
    if (changed || buildings.length > 0) {
      await schedulePersist();
    }
  }

  /**
   * Sync chats against the persistent city:
   * - Auto-record any newly-done chat (respecting resetAt for old real chats)
   * - Enrich every chat with buildingType, plannedSubtype, plannedFloors, lotIndex, gridX, gridY, builtBuildingId
   */
  function syncChatsWithCity(chats) {
    // Pass 1: auto-persist done chats into permanent buildings
    for (const chat of chats) {
      if (chat.status === 'done') {
        const existing = findBuildingByChatId(chat.id);
        if (!existing) {
          // After an explicit city reset, don't immediately re-add pre-reset done chats or starter demo done chats
          const isSuppressedPreReset =
            resetAt > 0 && ((chat.updatedAt || 0) <= resetAt || chat.id === 'demo-kenji-woning');
          if (!isSuppressedPreReset) {
            recordBuildingForChat(chat);
          }
        }
      }
    }

    // Pass 2: assign stable non-overlapping lots to active chats & attach permanent building links
    const occupied = getOccupiedLots();
    const activeIds = new Set();

    // Reserve existing valid active lots first so seats stay completely stable
    for (const chat of chats) {
      const built = findBuildingByChatId(chat.id);
      if (built) {
        activeLotByChatId.delete(chat.id);
        continue;
      }
      activeIds.add(chat.id);
      if (activeLotByChatId.has(chat.id)) {
        const prevLot = activeLotByChatId.get(chat.id);
        if (!occupied.has(prevLot)) {
          occupied.add(prevLot);
        } else {
          activeLotByChatId.delete(chat.id);
        }
      }
    }

    // Prune vanished chats from activeLotByChatId
    for (const cid of activeLotByChatId.keys()) {
      if (!activeIds.has(cid)) {
        activeLotByChatId.delete(cid);
      }
    }

    return chats.map((chat) => {
      const built = findBuildingByChatId(chat.id);
      const spec = classifyBuilding(chat);

      if (built) {
        return {
          ...chat,
          buildingType: built.buildingType,
          plannedSubtype: built.subtype,
          plannedFloors: built.floors,
          lotIndex: built.lotIndex,
          gridX: built.gridX,
          gridY: built.gridY,
          builtBuildingId: built.id,
        };
      }

      let lotIndex = activeLotByChatId.get(chat.id);
      let parcel;
      if (lotIndex !== undefined) {
        parcel = getParcelByIndex(lotIndex);
      } else {
        parcel = allocateFreeLot(occupied);
        activeLotByChatId.set(chat.id, parcel.lotIndex);
      }

      return {
        ...chat,
        buildingType: spec.buildingType,
        plannedSubtype: spec.subtype,
        plannedFloors: spec.floors,
        lotIndex: parcel.lotIndex,
        gridX: parcel.gridX,
        gridY: parcel.gridY,
        builtBuildingId: null,
      };
    });
  }

  async function resetCity() {
    buildings = [];
    nextCatalogNumber = 1;
    resetAt = Date.now();
    activeLotByChatId.clear();
    hadExistingFile = true;
    await schedulePersist();
  }

  /**
   * Import selected local projects as permanent CityBuildings (idempotent by projectPath / chatId).
   */
  function importProjects(items = []) {
    const built = [];
    let skipped = 0;

    if (!Array.isArray(items)) {
      return { built, skipped };
    }

    const occupied = getOccupiedLots();

    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const projPath = typeof rawItem.path === 'string' ? rawItem.path.trim() : '';
      if (!projPath) continue;

      const folderBase = path.basename(projPath) || 'Project';
      const slug =
        folderBase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
      const shortHash = hashString(projPath).toString(16).padStart(8, '0').slice(0, 6);
      const projectId =
        typeof rawItem.id === 'string' && rawItem.id.startsWith('proj:')
          ? rawItem.id
          : `proj:${slug.slice(0, 28)}-${shortHash}`;

      if (findBuildingByProject(projectId, projPath)) {
        skipped++;
        continue;
      }

      const explicitType =
        rawItem.buildingType && VALID_BUILDING_TYPES.has(rawItem.buildingType)
          ? rawItem.buildingType
          : null;

      const displayName =
        typeof rawItem.name === 'string' && rawItem.name.trim()
          ? rawItem.name.trim().slice(0, 64)
          : folderBase.charAt(0).toUpperCase() + folderBase.slice(1);

      const fileCount = Number(rawItem.fileCount || 0);
      const tech = typeof rawItem.tech === 'string' && rawItem.tech.trim() ? rawItem.tech.trim() : '';
      const defaultSummary = tech
        ? `Geïmporteerd lokaal ${tech}-project${fileCount > 0 ? ` (${fileCount} bronbestanden)` : ''} uit ${projPath}.`
        : `Geïmporteerd lokaal project uit ${projPath}.`;
      const summary =
        typeof rawItem.summary === 'string' && rawItem.summary.trim()
          ? rawItem.summary.trim().slice(0, 220)
          : defaultSummary.slice(0, 220);

      const spec = classifyBuilding(
        {
          id: projectId,
          name: displayName,
          summary,
          workspace: projPath,
          messageCount: Math.max(4, Math.round(fileCount / 2)),
        },
        explicitType
      );

      // Scale floors cleanly by fileCount for imported projects across all 5 building types
      let floors = spec.floors;
      if (spec.buildingType === 'wolkenkrabber') {
        floors = fileCount > 0 ? Math.min(28, Math.max(16, 16 + Math.floor(fileCount / 16))) : spec.floors;
      } else if (spec.buildingType === 'mall') {
        floors = fileCount >= 15 ? 5 : fileCount >= 8 ? 4 : 3;
      } else if (spec.buildingType === 'flat' && fileCount > 0) {
        floors = Math.min(12, Math.max(5, 5 + Math.floor(fileCount / 18)));
      } else if (spec.buildingType === 'infrastructuur') {
        floors = 2;
      } else if (spec.buildingType === 'huis' && fileCount > 0) {
        floors = fileCount <= 3 ? 1 : fileCount <= 8 ? 2 : 3;
      }

      const parcel = allocateFreeLot(occupied);
      const catalogNumber = nextCatalogNumber++;
      const code = formatCatalogCode(catalogNumber);
      const id = `bldg-${String(catalogNumber).padStart(3, '0')}`;

      const building = {
        id,
        catalogNumber,
        code,
        chatId: projectId,
        name: displayName,
        source: 'project',
        buildingType: spec.buildingType,
        subtype: spec.subtype,
        floors,
        lotIndex: parcel.lotIndex,
        gridX: parcel.gridX,
        gridY: parcel.gridY,
        builtAt: Date.now(),
        summary,
        projectPath: projPath,
      };

      buildings.push(building);
      built.push(building);
    }

    if (built.length > 0) {
      schedulePersist();
    }

    return { built, skipped };
  }

  /**
   * Remove a single permanent building by id from data/city.json without resetting the city.
   */
  function deleteBuilding(id) {
    const idx = buildings.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    buildings.splice(idx, 1);
    schedulePersist();
    return true;
  }

  function getBuildings() {
    return buildings;
  }

  function getCityMetrics(hqStats = null) {
    return computeCityMetrics(buildings, hqStats);
  }

  return {
    load,
    flush,
    ensureInitialCity,
    syncChatsWithCity,
    recordBuildingForChat,
    findBuildingByChatId,
    findBuildingByProject,
    importProjects,
    deleteBuilding,
    resetCity,
    getBuildings,
    getCityMetrics,
  };
}
