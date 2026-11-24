import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { hashString } from './scanners.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');

const CACHE_TTL_MS = 15_000;
const MAX_COUNTED_FILES = 200;
const MAX_SCAN_DEPTH = 3;

const IGNORED_DIRS = new Set([
  'desktop',
  'documents',
  'downloads',
  'music',
  'pictures',
  'public',
  'templates',
  'videos',
  'yay-bin',
  'volume',
  'spotube',
  'obsidian vault',
  'dotfiles',
  'projects',
  'c0-bin',
  'node_modules',
]);

const SKIP_SUBDIRS = new Set([
  'node_modules',
  '.git',
  'target',
  'bin',
  'obj',
  'dist',
  'build',
  '.venv',
  'venv',
  '__pycache__',
  '.next',
  '.nuxt',
  'vendor',
  '.cache',
  'coverage',
]);

const SOURCE_EXTS = new Set([
  '.c',
  '.h',
  '.cpp',
  '.hpp',
  '.py',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.rs',
  '.cs',
  '.go',
  '.java',
  '.rb',
  '.php',
  '.sh',
  '.html',
  '.css',
  '.svelte',
  '.vue',
  '.sql',
]);

const INFRA_NAME_RE =
  /\b(dotsync|dotvault|c-tools|shell|quicknote|cli|tool|tools|sync|script|scripts|infra|gateway|docker|proxy|mycat|filter|bridge|park|metro|scanner|config|setup|deploy|monitor|daemon|bot)\b/i;

const MALL_NAME_RE =
  /\b(kassasysteem|kassa|pos|shop|store|mall|market|winkel|commerce|catalog|portfolio|craft|scentlabs|galleria)\b/i;

const SKYSCRAPER_NAME_RE =
  /\b(metropool|skyline|platform|engine|harness|system|ai|3d|full|monorepo|zenith|deepseek|odysseus|tokyo)\b/i;

const FLAT_NAME_RE =
  /\b(dashboard|frontend|backend|server|api|app|web|ui|game|office|studio|systeem)\b/i;

let cachedScan = null; // { scannedAt, rawProjects }

export function makeProjectId(absPath) {
  const base = path.basename(absPath).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  const shortHash = hashString(absPath).toString(16).padStart(8, '0').slice(0, 6);
  return `proj:${base.slice(0, 28)}-${shortHash}`;
}

function formatDisplayName(folderName, absPath, pkgName) {
  if (absPath === APP_ROOT && pkgName === 'shin-ai-tokyo') {
    return 'Shin-AI Tokyo';
  }
  const clean = folderName.trim();
  if (!clean) return 'Project';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function shouldIgnoreDirName(name) {
  if (!name || name.startsWith('.')) return true;
  const lower = name.toLowerCase();
  if (IGNORED_DIRS.has(lower)) return true;
  if (lower.startsWith('mt7902')) return true;
  return false;
}

async function countSourceFiles(dirPath, depth, state) {
  if (depth > MAX_SCAN_DEPTH || state.count >= MAX_COUNTED_FILES) return;
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    if (state.count >= MAX_COUNTED_FILES) break;
    if (e.name.startsWith('.')) continue;

    if (e.isDirectory()) {
      if (SKIP_SUBDIRS.has(e.name)) continue;
      if (depth < MAX_SCAN_DEPTH) {
        await countSourceFiles(path.join(dirPath, e.name), depth + 1, state);
      }
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (SOURCE_EXTS.has(ext) || e.name === 'Makefile' || e.name === 'Dockerfile') {
        state.count++;
        state.extCounts.set(ext, (state.extCounts.get(ext) || 0) + 1);
      }
    }
  }
}

async function inspectProjectDir(dirPath, folderName) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return null;
  }

  let hasGit = false;
  let hasPkgJson = false;
  let hasCargo = false;
  let hasDotnet = false;
  let hasPython = false;
  let hasGo = false;
  let hasMakeOrCmake = false;
  let hasIndexHtml = false;
  let hasSrcDir = false;
  let hasTopSourceFile = false;

  for (const e of entries) {
    const n = e.name;
    const nl = n.toLowerCase();
    if (n === '.git') hasGit = true;
    else if (e.isFile()) {
      if (n === 'package.json') hasPkgJson = true;
      else if (n === 'Cargo.toml') hasCargo = true;
      else if (nl.endsWith('.csproj') || nl.endsWith('.sln')) hasDotnet = true;
      else if (n === 'pyproject.toml' || n === 'requirements.txt' || n === 'setup.py') hasPython = true;
      else if (n === 'go.mod') hasGo = true;
      else if (n === 'Makefile' || n === 'CMakeLists.txt') hasMakeOrCmake = true;
      else if (nl === 'index.html') hasIndexHtml = true;
      else if (SOURCE_EXTS.has(path.extname(nl))) hasTopSourceFile = true;
    } else if (e.isDirectory()) {
      if (n === 'src' || n === 'app' || n === 'lib') hasSrcDir = true;
    }
  }

  const isCodeProject =
    hasGit ||
    hasPkgJson ||
    hasCargo ||
    hasDotnet ||
    hasPython ||
    hasGo ||
    hasMakeOrCmake ||
    hasIndexHtml ||
    hasSrcDir ||
    hasTopSourceFile;

  if (!isCodeProject) return null;

  let mtimeMs = 0;
  try {
    const st = await fs.stat(dirPath);
    mtimeMs = Math.round(st.mtimeMs);
  } catch {
    mtimeMs = Date.now();
  }

  let pkgName = null;
  if (hasPkgJson) {
    try {
      const rawPkg = await fs.readFile(path.join(dirPath, 'package.json'), 'utf8');
      const parsedPkg = JSON.parse(rawPkg);
      if (typeof parsedPkg?.name === 'string') pkgName = parsedPkg.name.trim();
    } catch {
      // ignore invalid package.json
    }
  }

  const counter = { count: 0, extCounts: new Map() };
  await countSourceFiles(dirPath, 0, counter);
  const fileCount = counter.count;

  // Skip empty directories that only happened to have an empty src/ or stale folder
  if (fileCount === 0 && !hasGit && !hasPkgJson && !hasCargo && !hasDotnet && !hasGo) {
    return null;
  }

  let tech = 'Git-project';
  if (hasCargo || (counter.extCounts.get('.rs') || 0) > 0) tech = 'Rust';
  else if (hasDotnet || (counter.extCounts.get('.cs') || 0) > 0) tech = 'C# / .NET';
  else if (hasGo || (counter.extCounts.get('.go') || 0) > 0) tech = 'Go';
  else if (hasPkgJson) tech = 'Node.js';
  else if (hasPython || (counter.extCounts.get('.py') || 0) > 0) tech = 'Python';
  else if (
    hasMakeOrCmake ||
    (counter.extCounts.get('.c') || 0) + (counter.extCounts.get('.cpp') || 0) > 0
  ) {
    tech = 'C';
  } else if (
    hasIndexHtml ||
    (counter.extCounts.get('.js') || 0) +
      (counter.extCounts.get('.ts') || 0) +
      (counter.extCounts.get('.html') || 0) >
      0
  ) {
    tech = 'Web';
  }

  const displayName = formatDisplayName(folderName, dirPath, pkgName);
  const nameCheck = `${folderName} ${pkgName || ''} ${displayName}`;

  let suggestedType = 'huis';
  if (MALL_NAME_RE.test(nameCheck)) {
    suggestedType = 'mall';
  } else if (fileCount >= 35 || SKYSCRAPER_NAME_RE.test(nameCheck)) {
    suggestedType = 'wolkenkrabber';
  } else if (INFRA_NAME_RE.test(nameCheck) && !FLAT_NAME_RE.test(nameCheck)) {
    suggestedType = 'infrastructuur';
  } else if (fileCount >= 15 || FLAT_NAME_RE.test(nameCheck)) {
    suggestedType = 'flat';
  } else if (INFRA_NAME_RE.test(nameCheck)) {
    suggestedType = 'infrastructuur';
  } else {
    suggestedType = 'huis';
  }

  let suggestedFloors = 2;
  if (suggestedType === 'wolkenkrabber') {
    suggestedFloors = Math.min(28, Math.max(16, 16 + Math.floor(fileCount / 16)));
  } else if (suggestedType === 'mall') {
    suggestedFloors = fileCount >= 15 ? 5 : fileCount >= 8 ? 4 : 3;
  } else if (suggestedType === 'flat') {
    suggestedFloors = Math.min(12, Math.max(5, 5 + Math.floor(fileCount / 18)));
  } else if (suggestedType === 'infrastructuur') {
    suggestedFloors = 2;
  } else {
    suggestedFloors = fileCount <= 3 ? 1 : fileCount <= 8 ? 2 : 3;
  }

  return {
    id: makeProjectId(dirPath),
    name: displayName,
    path: dirPath,
    tech,
    fileCount,
    mtimeMs,
    suggestedType,
    suggestedFloors,
  };
}

async function scanRawProjects(homeDir = os.homedir()) {
  const now = Date.now();
  if (cachedScan && now - cachedScan.scannedAt < CACHE_TTL_MS) {
    return cachedScan.rawProjects;
  }

  const roots = [
    homeDir,
    path.join(homeDir, 'Projects'),
    path.join(homeDir, 'projects'),
  ];

  const seenRealPaths = new Set();
  const candidates = [];

  for (const root of roots) {
    let entries;
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;
      if (shouldIgnoreDirName(dirent.name)) continue;

      const fullPath = path.join(root, dirent.name);
      let realPath = fullPath;
      try {
        realPath = await fs.realpath(fullPath);
      } catch {
        continue;
      }
      if (seenRealPaths.has(realPath)) continue;
      seenRealPaths.add(realPath);

      candidates.push({ dirPath: realPath, folderName: dirent.name });
    }
  }

  const inspected = await Promise.all(
    candidates.map((c) => inspectProjectDir(c.dirPath, c.folderName).catch(() => null))
  );

  const rawProjects = inspected.filter(Boolean);
  cachedScan = { scannedAt: now, rawProjects };
  return rawProjects;
}

/**
 * Return local projects annotated live with alreadyBuilt & buildingCode from cityStore.
 */
export async function listLocalProjects(cityStore, homeDir = os.homedir()) {
  const raw = await scanRawProjects(homeDir);
  const annotated = raw.map((proj) => {
    const existing = cityStore.findBuildingByProject(proj.id, proj.path);
    return {
      ...proj,
      alreadyBuilt: Boolean(existing),
      buildingCode: existing ? existing.code : null,
    };
  });

  // Sort: unbuilt first, multi-file projects (>=3) ahead of tiny 1-2 file exercises, then mtime desc, then fileCount desc
  annotated.sort((a, b) => {
    if (a.alreadyBuilt !== b.alreadyBuilt) return a.alreadyBuilt ? 1 : -1;
    const multiA = a.fileCount >= 3 ? 0 : 1;
    const multiB = b.fileCount >= 3 ? 0 : 1;
    if (multiA !== multiB) return multiA - multiB;
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return b.fileCount - a.fileCount;
  });

  return {
    projects: annotated,
    updatedAt: Date.now(),
  };
}
