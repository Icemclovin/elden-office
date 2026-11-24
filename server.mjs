import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { scanAllRealChats } from './src/scanners.mjs';
import { createCityStore } from './src/city-store.mjs';
import { createDemoStore } from './src/demo-store.mjs';
import { listLocalProjects } from './src/project-scanner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, 'public');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3737;
const POLL_INTERVAL_MS = 2500;
const SSE_PING_MS = 15000;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_STATIC_CACHE_ENTRIES = 64;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.json': 'application/json; charset=utf-8',
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json']);

const startedAt = Date.now();
const cityStore = createCityStore();
const demoStore = createDemoStore();
const sseClients = new Set();

// In-memory static asset cache: targetFile -> { mtimeMs, size, etag, mime, raw, gzip }
const staticCache = new Map();

let latestRealChats = [];
let latestState = {
  chats: [],
  buildings: [],
  city: cityStore.getCityMetrics(),
  counts: { total: 0, working: 0, waiting: 0, done: 0, sleeping: 0 },
  demoActive: false,
  updatedAt: Date.now(),
};
let latestStateRaw = Buffer.from(JSON.stringify(latestState), 'utf8');
let latestStateGzip = zlib.gzipSync(latestStateRaw, { level: 6 });
let latestRealCount = 0;
let latestDemoCount = 0;
let lastSnapshotSignature = '';
let refreshInFlight = null;

function acceptsGzip(req) {
  const enc = req.headers['accept-encoding'];
  return typeof enc === 'string' && /\bgzip\b/i.test(enc);
}

function broadcastState(stateJsonStr) {
  if (sseClients.size === 0) return;
  const payload = `event: state\ndata: ${stateJsonStr}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function commitState(forceBroadcast = false) {
  const merged = demoStore.getMergedChats(latestRealChats);
  const enrichedChats = cityStore.syncChatsWithCity(merged.chats);
  const buildings = cityStore.getBuildings();

  latestRealCount = merged.realCount;
  latestDemoCount = merged.demoCount;

  const counts = {
    total: enrichedChats.length,
    working: 0,
    waiting: 0,
    done: 0,
    sleeping: 0,
  };
  for (const c of enrichedChats) {
    if (counts[c.status] !== undefined) counts[c.status]++;
  }

  const city = cityStore.getCityMetrics({
    activeWorkers: counts.working,
    waitingWorkers: counts.waiting,
    totalAgents: enrichedChats.length,
  });

  const signature = JSON.stringify({
    chats: enrichedChats,
    buildings,
    city,
    counts,
    demoActive: merged.demoActive,
  });

  if (signature !== lastSnapshotSignature) {
    lastSnapshotSignature = signature;
    latestState = {
      chats: enrichedChats,
      buildings,
      city,
      counts,
      demoActive: merged.demoActive,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(latestState);
    latestStateRaw = Buffer.from(serialized, 'utf8');
    latestStateGzip = zlib.gzipSync(latestStateRaw, { level: 6 });
    broadcastState(serialized);
    return true;
  }

  if (forceBroadcast) {
    broadcastState(latestStateRaw.toString('utf8'));
  }
  return false;
}

async function refreshFromDisk() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      latestRealChats = await scanAllRealChats();
      await cityStore.ensureInitialCity(latestRealChats);
      commitState(false);
    } catch (err) {
      console.error('[Shin-AI Tokyo] Scanfout:', err?.message || err);
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function sendJson(req, res, statusCode, data, allowGzip = false) {
  const raw = Buffer.from(JSON.stringify(data), 'utf8');
  if (allowGzip && raw.length >= 256 && acceptsGzip(req)) {
    const gz = zlib.gzipSync(raw, { level: 6 });
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Encoding': 'gzip',
      Vary: 'Accept-Encoding',
      'Content-Length': gz.length,
    });
    res.end(gz);
    return;
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(allowGzip ? { Vary: 'Accept-Encoding' } : {}),
    'Content-Length': raw.length,
  });
  res.end(raw);
}

function sendCachedState(req, res) {
  if (acceptsGzip(req)) {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Encoding': 'gzip',
      Vary: 'Accept-Encoding',
      'Content-Length': latestStateGzip.length,
    });
    res.end(latestStateGzip);
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Accept-Encoding',
    'Content-Length': latestStateRaw.length,
  });
  res.end(latestStateRaw);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload te groot'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(Object.assign(new Error('JSON-object verwacht'), { statusCode: 400 }));
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Ongeldige JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

async function getStaticAsset(targetFile) {
  let st = await fs.stat(targetFile);
  if (st.isDirectory()) {
    targetFile = path.join(targetFile, 'index.html');
    st = await fs.stat(targetFile);
  }

  const cached = staticCache.get(targetFile);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
    return cached;
  }

  const raw = await fs.readFile(targetFile);
  const ext = path.extname(targetFile).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const etag = `W/"${st.size.toString(16)}-${Math.trunc(st.mtimeMs).toString(16)}"`;
  const gzip =
    COMPRESSIBLE_EXTS.has(ext) && raw.length >= 256 ? zlib.gzipSync(raw, { level: 6 }) : null;

  const entry = { mtimeMs: st.mtimeMs, size: st.size, etag, mime, raw, gzip };
  if (staticCache.size >= MAX_STATIC_CACHE_ENTRIES) {
    const oldestKey = staticCache.keys().next().value;
    if (oldestKey) staticCache.delete(oldestKey);
  }
  staticCache.set(targetFile, entry);
  return entry;
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  if (decodedPath.includes('\0')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, relativePath);

  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const asset = await getStaticAsset(resolved);
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === asset.etag) {
      res.writeHead(304, {
        ETag: asset.etag,
        'Cache-Control': 'no-cache',
        Vary: 'Accept-Encoding',
      });
      res.end();
      return;
    }

    const useGzip = Boolean(asset.gzip) && acceptsGzip(req);
    const payload = useGzip ? asset.gzip : asset.raw;
    const headers = {
      'Content-Type': asset.mime,
      'Content-Length': payload.length,
      'Cache-Control': 'no-cache',
      ETag: asset.etag,
      'X-Content-Type-Options': 'nosniff',
    };
    if (asset.gzip) {
      headers.Vary = 'Accept-Encoding';
      if (useGzip) headers['Content-Encoding'] = 'gzip';
    }

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(payload);
    }
  } catch (err) {
    if (err?.code === 'ENOENT' || err?.code === 'ENOTDIR') {
      staticCache.delete(resolved);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Niet gevonden');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Interne serverfout');
    }
  }
}

async function handleApi(req, res, pathname) {
  const method = req.method || 'GET';

  if (method === 'GET' && pathname === '/api/health') {
    const city = latestState.city;
    return sendJson(req, res, 200, {
      ok: true,
      port: PORT,
      uptimeMs: Date.now() - startedAt,
      realCount: latestRealCount,
      demoCount: latestDemoCount,
      buildingCount: latestState.buildings.length,
      cityLevel: city.level,
    });
  }

  if (method === 'GET' && (pathname === '/api/state' || pathname === '/api/chats')) {
    return sendCachedState(req, res);
  }

  if (method === 'GET' && pathname === '/api/projects') {
    const payload = await listLocalProjects(cityStore);
    return sendJson(req, res, 200, payload, true);
  }

  if (method === 'POST' && pathname === '/api/city/import-projects') {
    const body = await readJsonBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const { built, skipped } = cityStore.importProjects(items);
    if (built.length > 0) {
      commitState(false);
      await cityStore.flush();
    }
    return sendJson(req, res, 200, { ok: true, built, skipped, state: latestState }, true);
  }

  if (method === 'DELETE' && pathname.startsWith('/api/buildings/')) {
    const rawId = pathname.slice('/api/buildings/'.length);
    if (!rawId || rawId.includes('/')) {
      return sendJson(req, res, 404, { error: 'Niet gevonden' });
    }
    let id;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      return sendJson(req, res, 400, { error: 'Ongeldig gebouw-id' });
    }
    const removed = cityStore.deleteBuilding(id);
    if (!removed) {
      return sendJson(req, res, 404, { error: 'Gebouw niet gevonden' });
    }
    commitState(false);
    await cityStore.flush();
    return sendJson(req, res, 200, { ok: true, state: latestState }, true);
  }

  if (method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: state\ndata: ${latestStateRaw.toString('utf8')}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/chats') {
    const body = await readJsonBody(req);
    const created = demoStore.createCustomChat(body);
    if (created.status === 'done') {
      cityStore.recordBuildingForChat(created);
    }
    commitState(false);
    await cityStore.flush();
    const enriched = latestState.chats.find((c) => c.id === created.id) || created;
    return sendJson(req, res, 201, enriched);
  }

  if (method === 'POST' && pathname === '/api/demo/seed') {
    demoStore.seedDemos();
    commitState(false);
    await cityStore.flush();
    return sendCachedState(req, res);
  }

  if (method === 'POST' && pathname === '/api/demo/build-one') {
    const { building } = demoStore.buildOne(cityStore);
    commitState(false);
    await cityStore.flush();
    return sendJson(req, res, 200, { ok: true, building, state: latestState }, true);
  }

  if (method === 'POST' && pathname === '/api/demo/cycle') {
    demoStore.cycleDemos(cityStore);
    commitState(false);
    await cityStore.flush();
    return sendCachedState(req, res);
  }

  if (method === 'POST' && pathname === '/api/demo/clear') {
    demoStore.clearDemos();
    commitState(false);
    return sendCachedState(req, res);
  }

  if (method === 'POST' && pathname === '/api/city/reset') {
    await cityStore.resetCity();
    commitState(false);
    return sendCachedState(req, res);
  }

  // Dynamic routes under /api/chats/:id and /api/chats/:id/complete
  if (pathname.startsWith('/api/chats/')) {
    const rest = pathname.slice('/api/chats/'.length);
    const parts = rest.split('/').filter(Boolean);
    if (parts.length === 0 || parts.length > 2) {
      return sendJson(req, res, 404, { error: 'Niet gevonden' });
    }

    let id;
    try {
      id = decodeURIComponent(parts[0]);
    } catch {
      return sendJson(req, res, 400, { error: 'Ongeldige chat-id' });
    }

    // POST /api/chats/:id/complete
    if (parts.length === 2 && parts[1] === 'complete' && method === 'POST') {
      const updated = demoStore.patchChat(id, { status: 'done' }, latestRealChats);
      if (!updated) {
        return sendJson(req, res, 404, { error: 'Chat niet gevonden' });
      }
      const { building } = cityStore.recordBuildingForChat(updated);
      commitState(false);
      await cityStore.flush();
      return sendJson(req, res, 200, { ok: true, building, state: latestState }, true);
    }

    if (parts.length === 1 && method === 'PATCH') {
      const body = await readJsonBody(req);
      const updated = demoStore.patchChat(id, body, latestRealChats);
      if (!updated) {
        return sendJson(req, res, 404, { error: 'Chat niet gevonden' });
      }
      if (updated.status === 'done') {
        cityStore.recordBuildingForChat(updated);
      }
      commitState(false);
      await cityStore.flush();
      const enriched = latestState.chats.find((c) => c.id === id) || updated;
      return sendJson(req, res, 200, enriched);
    }

    if (parts.length === 1 && method === 'DELETE') {
      const removed = demoStore.deleteChat(id, latestRealChats);
      if (!removed) {
        return sendJson(req, res, 404, { error: 'Chat niet gevonden' });
      }
      commitState(false);
      return sendJson(req, res, 200, { ok: true });
    }
  }

  return sendJson(req, res, 404, { error: 'API-route niet gevonden' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
    } else {
      await serveStatic(req, res, pathname);
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    if (!res.headersSent) {
      sendJson(req, res, status, { error: err?.message || 'Interne serverfout' });
    } else {
      res.end();
    }
  }
});

// Initial disk load & city hydration before accepting requests
await refreshFromDisk();

const pollTimer = setInterval(() => {
  refreshFromDisk();
}, POLL_INTERVAL_MS);
pollTimer.unref();

const pingTimer = setInterval(() => {
  for (const res of sseClients) {
    try {
      res.write(': ping\n\n');
    } catch {
      sseClients.delete(res);
    }
  }
}, SSE_PING_MS);
pingTimer.unref();

server.listen(PORT, HOST, () => {
  console.log(
    `[Shin-AI Tokyo] Server draait op http://${HOST}:${PORT} (${latestRealCount} echte chats, ${latestDemoCount} demo-bouwers, ${latestState.buildings.length} gebouwen — Niveau ${latestState.city.level} ${latestState.city.name})`
  );
});

async function shutdown(signal) {
  console.log(`[Shin-AI Tokyo] Afsluiten (${signal})...`);
  clearInterval(pollTimer);
  clearInterval(pingTimer);
  staticCache.clear();
  for (const res of sseClients) {
    try {
      res.end();
    } catch {
      // ignore
    }
  }
  sseClients.clear();
  await cityStore.flush();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
