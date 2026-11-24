import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const BUILDER_ROLES = [
  'architect',
  'constructeur',
  'stedenbouwer',
  'ingenieur',
  'tuinarchitect',
  'verkeersplanner',
];

export const STATUS_LABELS = {
  working: 'Aan het werk',
  waiting: 'Wacht op mij',
  done: 'Klaar',
  sleeping: 'Slaapt',
};

export const VALID_STATUSES = new Set(['working', 'waiting', 'done', 'sleeping']);

const WORKING_RECENT_MS = 30 * 1000;
const WORKING_ACTIVE_EVENT_MS = 5 * 60 * 1000;
const WAITING_WINDOW_MS = 15 * 60 * 1000;
const DONE_WINDOW_MS = 3 * 60 * 60 * 1000;
const MAX_REAL_CHATS = 16;

// Bounded head/tail chunk sizes for multi-MB JSONL files (zero full-file reads)
const JSONL_HEAD_BYTES = 8192;
const JSONL_TAIL_BYTES = 32768;

// Stat-cached parsed results keyed by filePath -> { mtimeMs, size, parsed }
const fileCache = new Map();

/**
 * Deterministic FNV-1a 32-bit hash for stable role/subtype assignment & short IDs.
 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickRole(id) {
  return BUILDER_ROLES[hashString(String(id)) % BUILDER_ROLES.length];
}

export function statusToLabel(status) {
  return STATUS_LABELS[status] || STATUS_LABELS.sleeping;
}

/**
 * Clean raw AI transcript text, stripping XML wrappers, slash-command tags,
 * local-command stdout noise, and placeholder markers.
 */
function cleanText(raw, maxLen = 280) {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw
    .replace(/<SYSTEM_MESSAGE>[\s\S]*?<\/SYSTEM_MESSAGE>/gi, ' ')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' ')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/gi, ' ')
    .replace(/<local-command-stderr>[\s\S]*?<\/local-command-stderr>/gi, ' ')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/gi, ' ')
    .replace(/<command-name>[\s\S]*?<\/command-name>/gi, ' ')
    .replace(/<command-message>[\s\S]*?<\/command-message>/gi, ' ')
    .replace(/<command-args>[\s\S]*?<\/command-args>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s
    .replace(/^(?:[a-z0-9_-]+:[a-z0-9_-]+\s+)+/i, '')
    .replace(/^\/[a-z0-9_:-]+(?:\s+|$)/i, '')
    .trim();

  if (
    !s ||
    /^\(no content\)$/i.test(s) ||
    /^\[Request interrupted/i.test(s) ||
    /^plugin\s+(marketplace|install|uninstall|list|enable|disable)\b/i.test(s) ||
    /^(clear|compact|exit|quit|help|status|model|mcp|login|logout|cost|doctor|resume|init|config|review)\b$/i.test(s)
  ) {
    return '';
  }

  if (s.length > maxLen) {
    s = s.slice(0, maxLen - 1).trimEnd() + '…';
  }
  return s;
}

function makeShortTitleSnippet(text, maxLen = 28) {
  const cleaned = cleanText(text, 120)
    .replace(/[`*_#]/g, '')
    .replace(/^[-•:\s]+/, '')
    .trim();
  if (!cleaned || cleaned.length < 3) return '';
  const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();
  const base = firstSentence.length >= 6 ? firstSentence : cleaned;
  const titled = base.charAt(0).toUpperCase() + base.slice(1);
  if (titled.length <= maxLen) return titled;
  const cut = titled.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function looksLikeQuestionOrInputRequest(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const tail = trimmed.slice(-260);
  if (/\?\s*["')\]*`]*$/.test(tail)) return true;
  if (/\?\s+/.test(tail.slice(-140))) return true;
  return /\b(wil je|zal ik|laat (me |het )?weten|geef aan|bevestig|goedkeur|kies een|welke optie|would you like|should i|do you want|let me know|please confirm|awaiting your|need your input|approve|permission|which option|choose one)\b/i.test(
    tail
  );
}

export function classifyStatus({
  updatedAt,
  hasActiveTool = false,
  awaitingAssistant = false,
  pendingApproval = false,
  lastAssistantMessage = '',
  lastRole = null,
  now = Date.now(),
}) {
  const ageMs = Math.max(0, now - (updatedAt || 0));

  if (ageMs <= WORKING_RECENT_MS) {
    return 'working';
  }
  if (ageMs <= WORKING_ACTIVE_EVENT_MS && (hasActiveTool || awaitingAssistant)) {
    return 'working';
  }
  if (ageMs <= WAITING_WINDOW_MS) {
    if (pendingApproval) return 'waiting';
    if (lastRole === 'assistant' && looksLikeQuestionOrInputRequest(lastAssistantMessage)) {
      return 'waiting';
    }
    if (lastRole === 'assistant' && ageMs <= 10 * 60 * 1000 && !lastAssistantMessage) {
      return 'waiting';
    }
    if (lastRole === 'user') {
      return 'waiting';
    }
  }
  if (ageMs <= DONE_WINDOW_MS) {
    return 'done';
  }
  return 'sleeping';
}

function decodeUtf8BoundarySafe(buf, trimStart, trimEnd) {
  let start = 0;
  let end = buf.length;

  if (trimStart) {
    while (start < end && (buf[start] & 0xc0) === 0x80) {
      start++;
    }
  }

  if (trimEnd && end > start) {
    let i = end - 1;
    let cont = 0;
    while (i >= start && (buf[i] & 0xc0) === 0x80 && cont < 3) {
      i--;
      cont++;
    }
    if (i >= start) {
      const lead = buf[i];
      let expected = 1;
      if ((lead & 0xe0) === 0xc0) expected = 2;
      else if ((lead & 0xf0) === 0xe0) expected = 3;
      else if ((lead & 0xf8) === 0xf0) expected = 4;
      if (end - i < expected) {
        end = i;
      }
    }
  }

  return buf.subarray(start, end).toString('utf8');
}

async function readHeadAndTail(
  filePath,
  size,
  headBytes = JSONL_HEAD_BYTES,
  tailBytes = JSONL_TAIL_BYTES
) {
  if (size <= headBytes + tailBytes) {
    const content = await fs.readFile(filePath, 'utf8');
    return { head: content, tail: content, full: true };
  }
  let fh;
  try {
    fh = await fs.open(filePath, 'r');
    const headBuf = Buffer.allocUnsafe(headBytes);
    const tailBuf = Buffer.allocUnsafe(tailBytes);
    const headRes = await fh.read(headBuf, 0, headBytes, 0);
    const tailOffset = Math.max(0, size - tailBytes);
    const tailRes = await fh.read(tailBuf, 0, tailBytes, tailOffset);
    return {
      head: decodeUtf8BoundarySafe(headBuf.subarray(0, headRes.bytesRead), false, true),
      tail: decodeUtf8BoundarySafe(tailBuf.subarray(0, tailRes.bytesRead), true, false),
      full: false,
    };
  } finally {
    if (fh) await fh.close().catch(() => {});
  }
}

function parseJsonLines(text, dropFirstPartial = false, dropLastPartial = false) {
  if (!text) return [];
  const lines = text.split('\n');
  if (dropFirstPartial && lines.length > 1) lines.shift();
  if (dropLastPartial && lines.length > 1) lines.pop();
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t[0] !== '{') continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // Ignore malformed or truncated lines
    }
  }
  return out;
}

function extractClaudeText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text);
    }
  }
  return parts.join('\n').trim();
}

function deriveClaudeProjectName(folderName, cwd) {
  if (cwd && typeof cwd === 'string') {
    const normalized = cwd.replace(/\/+$/, '');
    if (normalized === os.homedir()) {
      return 'Home Werkruimte';
    }
    if (normalized.includes('scratch-workspaces')) {
      return 'Claude Scratch';
    }
    const base = path.basename(normalized);
    if (base && base.length <= 40 && !/^[0-9a-f-]{24,}$/i.test(base)) {
      return base;
    }
  }

  if (!folderName) return 'Claude Sessie';
  if (folderName === `-home-${os.userInfo().username}`) {
    return 'Home Werkruimte';
  }
  if (folderName.includes('scratch-workspaces')) {
    return 'Claude Scratch';
  }
  const stripped = folderName
    .replace(/^-home-[^-]+-?/, '')
    .replace(/^Projects-/i, '')
    .replace(/^projects-/i, '')
    .replace(/^-+/, '');
  if (!stripped) return 'Home Werkruimte';
  const segments = stripped.split('-').filter(Boolean);
  const candidate = segments.slice(-2).join('-');
  return candidate.length > 32 ? candidate.slice(0, 32) : candidate;
}

function titleCaseFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildSummary({ lastAssistantMessage, lastUserMessage, currentTool, sourceName }) {
  if (currentTool) {
    return `Gebruikt ${currentTool}${lastUserMessage ? ` — ${cleanText(lastUserMessage, 90)}` : ''}`;
  }
  if (lastAssistantMessage) {
    return cleanText(lastAssistantMessage, 140) || `${sourceName} sessie`;
  }
  if (lastUserMessage) {
    return cleanText(lastUserMessage, 140) || `${sourceName} sessie`;
  }
  return `${sourceName} sessie`;
}

// Scanner 1: Claude Code (~/.claude/projects/*/*.jsonl)
async function scanClaudeChats(homeDir, seenPaths) {
  const root = path.join(homeDir, '.claude', 'projects');
  let projectDirs;
  try {
    projectDirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const candidates = [];
  for (const dirent of projectDirs) {
    if (!dirent.isDirectory()) continue;
    const projPath = path.join(root, dirent.name);
    let entries;
    try {
      entries = await fs.readdir(projPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const file of entries) {
      if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
      const fullPath = path.join(projPath, file.name);
      try {
        const st = await fs.stat(fullPath);
        if (st.size < 120) continue;
        candidates.push({
          folderName: dirent.name,
          fileName: file.name,
          filePath: fullPath,
          mtimeMs: st.mtimeMs,
          size: st.size,
        });
      } catch {
        continue;
      }
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const results = [];

  for (const cand of candidates.slice(0, 24)) {
    seenPaths.add(cand.filePath);
    try {
      let cached = fileCache.get(cand.filePath);
      if (!cached || cached.mtimeMs !== cand.mtimeMs || cached.size !== cand.size) {
        const { head, tail, full } = await readHeadAndTail(cand.filePath, cand.size);
        const headObjs = parseJsonLines(head, false, !full);
        const tailObjs = full ? headObjs : parseJsonLines(tail, true, false);

        let cwd = '';
        let sessionId = path.basename(cand.fileName, '.jsonl');
        let firstUserPrompt = '';
        let lastUserMessage = '';
        let lastAssistantMessage = '';
        let lastPromptField = '';
        let currentTool = null;
        let hasActiveTool = false;
        let awaitingAssistant = false;
        let lastRole = null;
        let messageCount = 0;

        for (const obj of headObjs) {
          if (!cwd && typeof obj.cwd === 'string') cwd = obj.cwd;
          if (obj.sessionId && typeof obj.sessionId === 'string') sessionId = obj.sessionId;
          if (!firstUserPrompt && obj.type === 'user' && !obj.isMeta) {
            const t = cleanText(extractClaudeText(obj.message?.content), 160);
            if (t) firstUserPrompt = t;
          }
        }

        const pendingToolIds = new Set();
        for (const obj of tailObjs) {
          if (!cwd && typeof obj.cwd === 'string') cwd = obj.cwd;
          if (obj.type === 'last-prompt' && typeof obj.lastPrompt === 'string') {
            const cleanedLP = cleanText(obj.lastPrompt, 240);
            if (cleanedLP) lastPromptField = cleanedLP;
          }

          if (obj.type === 'user' && !obj.isMeta) {
            const content = obj.message?.content;
            if (Array.isArray(content)) {
              let sawToolResult = false;
              for (const block of content) {
                if (block?.type === 'tool_result') {
                  sawToolResult = true;
                  if (block.tool_use_id) pendingToolIds.delete(block.tool_use_id);
                }
              }
              const txt = cleanText(extractClaudeText(content), 280);
              if (txt) {
                lastUserMessage = txt;
                if (!firstUserPrompt) firstUserPrompt = txt;
                lastRole = 'user';
                messageCount++;
                awaitingAssistant = true;
              } else if (sawToolResult) {
                awaitingAssistant = true;
              }
            } else if (typeof content === 'string') {
              const txt = cleanText(content, 280);
              if (txt) {
                lastUserMessage = txt;
                if (!firstUserPrompt) firstUserPrompt = txt;
                lastRole = 'user';
                messageCount++;
                awaitingAssistant = true;
              }
            }
          } else if (obj.type === 'assistant') {
            const content = obj.message?.content;
            const txt = cleanText(extractClaudeText(content), 280);
            if (txt) {
              lastAssistantMessage = txt;
              messageCount++;
            }
            lastRole = 'assistant';
            awaitingAssistant = false;

            let toolInThisTurn = null;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block?.type === 'tool_use' && block.name) {
                  toolInThisTurn = block.name;
                  if (block.id) pendingToolIds.add(block.id);
                }
              }
            }
            if (toolInThisTurn && obj.message?.stop_reason === 'tool_use') {
              currentTool = toolInThisTurn;
              hasActiveTool = true;
            } else if (obj.message?.stop_reason === 'end_turn') {
              currentTool = null;
              hasActiveTool = false;
              pendingToolIds.clear();
            }
          }
        }

        if (!lastUserMessage && lastPromptField) {
          lastUserMessage = lastPromptField;
          if (!firstUserPrompt) firstUserPrompt = lastPromptField;
        }
        if (pendingToolIds.size > 0) {
          hasActiveTool = true;
        }

        if (!lastUserMessage && !lastAssistantMessage && !firstUserPrompt) {
          cached = { mtimeMs: cand.mtimeMs, size: cand.size, parsed: null };
        } else {
          const projectName = deriveClaudeProjectName(cand.folderName, cwd);
          const shortId = sessionId.slice(0, 8);
          const titlePrompt = makeShortTitleSnippet(
            firstUserPrompt || lastUserMessage || lastAssistantMessage,
            26
          );

          const displayName =
            projectName === 'Home Werkruimte'
              ? titlePrompt
                ? `Claude: ${titlePrompt}`
                : `Claude Werkruimte (${shortId.slice(0, 4)})`
              : `${titleCaseFirst(projectName)} (${shortId.slice(0, 4)})`;

          const approxMessages = full
            ? Math.max(1, messageCount)
            : Math.max(messageCount, Math.round(cand.size / 6500));

          cached = {
            mtimeMs: cand.mtimeMs,
            size: cand.size,
            parsed: {
              id: `claude-${shortId}`,
              name: displayName,
              source: 'claude',
              summary: buildSummary({
                lastAssistantMessage,
                lastUserMessage: lastUserMessage || firstUserPrompt,
                currentTool: hasActiveTool ? currentTool : null,
                sourceName: 'Claude Code',
              }),
              lastUserMessage: lastUserMessage || firstUserPrompt || 'Geen gebruikersbericht gevonden.',
              lastAssistantMessage:
                lastAssistantMessage || 'Geen antwoord geregistreerd in de recente log.',
              currentTool: hasActiveTool ? currentTool : null,
              workspace: cwd || cand.folderName,
              filePath: cand.filePath,
              updatedAt: Math.round(cand.mtimeMs),
              messageCount: Math.max(1, approxMessages),
              signals: {
                hasActiveTool,
                awaitingAssistant,
                pendingApproval: false,
                lastRole,
              },
            },
          };
        }
        fileCache.set(cand.filePath, cached);
      }

      if (cached.parsed) {
        results.push(cached.parsed);
      }
    } catch {
      continue;
    }
  }

  return results;
}

// Scanner 2: Antigravity CLI (~/.gemini/antigravity-cli/brain/*/.system_generated/logs/transcript.jsonl)
async function scanAntigravityCli(homeDir, seenPaths) {
  const root = path.join(homeDir, '.gemini', 'antigravity-cli', 'brain');
  let dirs;
  try {
    dirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const results = [];
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const convId = dirent.name;
    const transcriptPath = path.join(root, convId, '.system_generated', 'logs', 'transcript.jsonl');
    let st;
    try {
      st = await fs.stat(transcriptPath);
    } catch {
      continue;
    }
    if (st.size < 40) continue;

    seenPaths.add(transcriptPath);
    try {
      let cached = fileCache.get(transcriptPath);
      if (!cached || cached.mtimeMs !== st.mtimeMs || cached.size !== st.size) {
        const { head, tail, full } = await readHeadAndTail(transcriptPath, st.size);
        const headObjs = parseJsonLines(head, false, !full);
        const tailObjs = full ? headObjs : parseJsonLines(tail, true, false);

        let firstPrompt = '';
        let lastUserMessage = '';
        let lastAssistantMessage = '';
        let currentTool = null;
        let hasActiveTool = false;
        let awaitingAssistant = false;
        let lastRole = null;
        let messageCount = 0;

        for (const obj of headObjs) {
          if (!firstPrompt && obj.source === 'USER' && typeof obj.content === 'string') {
            firstPrompt = cleanText(obj.content, 160);
          } else if (!firstPrompt && obj.source === 'SYSTEM' && typeof obj.content === 'string') {
            const m = obj.content.match(/recorded on the board as #\d+ for (@[\w-]+)/i);
            if (m) {
              firstPrompt = `Swarm ${m[1]}`;
            }
          }
        }

        for (const obj of tailObjs) {
          const src = obj.source;
          const typ = obj.type;
          const stStatus = obj.status;

          if (src === 'USER' && typeof obj.content === 'string') {
            const t = cleanText(obj.content, 280);
            if (t) {
              lastUserMessage = t;
              lastRole = 'user';
              awaitingAssistant = true;
              messageCount++;
            }
          } else if (src === 'MODEL' && typ === 'PLANNER_RESPONSE') {
            messageCount++;
            lastRole = 'assistant';
            awaitingAssistant = false;

            const resp =
              typeof obj.response === 'string'
                ? obj.response
                : typeof obj.content === 'string'
                  ? obj.content
                  : '';
            const cleanedResp = cleanText(resp, 280);
            if (cleanedResp) {
              lastAssistantMessage = cleanedResp;
            } else if (typeof obj.thinking === 'string' && !lastAssistantMessage) {
              lastAssistantMessage = cleanText(obj.thinking, 220);
            }

            if (Array.isArray(obj.tool_calls) && obj.tool_calls.length > 0) {
              const lastTc = obj.tool_calls[obj.tool_calls.length - 1];
              currentTool = lastTc?.name || lastTc?.tool || 'tool_call';
              hasActiveTool = true;
            } else if (stStatus === 'RUNNING' || stStatus === 'PENDING') {
              hasActiveTool = true;
            } else {
              currentTool = null;
              hasActiveTool = false;
            }
          } else if (src === 'MODEL' && typ === 'GENERIC') {
            if (stStatus === 'RUNNING' || stStatus === 'PENDING') {
              hasActiveTool = true;
            } else {
              awaitingAssistant = true;
            }
          }
        }

        const shortId = convId.slice(0, 8);
        const snippet = makeShortTitleSnippet(firstPrompt, 24);
        const name = snippet
          ? `Antigravity: ${snippet}`
          : `Antigravity CLI (${shortId.slice(0, 4)})`;

        cached = {
          mtimeMs: st.mtimeMs,
          size: st.size,
          parsed: {
            id: `agy-cli-${shortId}`,
            name,
            source: 'antigravity',
            summary: buildSummary({
              lastAssistantMessage,
              lastUserMessage: lastUserMessage || firstPrompt,
              currentTool: hasActiveTool ? currentTool : null,
              sourceName: 'Antigravity CLI',
            }),
            lastUserMessage: lastUserMessage || firstPrompt || 'Antigravity CLI sessie actief.',
            lastAssistantMessage:
              lastAssistantMessage || 'Bezig met planning en uitvoering van stappen.',
            currentTool: hasActiveTool ? currentTool : null,
            workspace: path.join(root, convId),
            filePath: transcriptPath,
            updatedAt: Math.round(st.mtimeMs),
            messageCount: Math.max(1, messageCount),
            signals: {
              hasActiveTool,
              awaitingAssistant,
              pendingApproval: false,
              lastRole,
            },
          },
        };
        fileCache.set(transcriptPath, cached);
      }

      if (cached.parsed) results.push(cached.parsed);
    } catch {
      continue;
    }
  }

  return results;
}

// Scanner 3: Antigravity IDE (~/.gemini/antigravity/brain/*/)
async function scanAntigravityIde(homeDir, seenPaths) {
  const root = path.join(homeDir, '.gemini', 'antigravity', 'brain');
  let dirs;
  try {
    dirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const candidates = [];
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const convDir = path.join(root, dirent.name);
    try {
      const st = await fs.stat(convDir);
      candidates.push({ convId: dirent.name, convDir, mtimeMs: st.mtimeMs });
    } catch {
      continue;
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const results = [];

  for (const cand of candidates.slice(0, 8)) {
    const cacheKey = `ide:${cand.convDir}`;
    seenPaths.add(cacheKey);
    try {
      let cached = fileCache.get(cacheKey);
      const transcriptPath = path.join(cand.convDir, '.system_generated', 'logs', 'transcript.jsonl');
      let latestMtime = cand.mtimeMs;
      let tStat = null;
      try {
        tStat = await fs.stat(transcriptPath);
        if (tStat.mtimeMs > latestMtime) latestMtime = tStat.mtimeMs;
      } catch {
        // optional
      }
      const statSize = tStat ? tStat.size : 0;

      if (!cached || cached.mtimeMs !== latestMtime || cached.size !== statSize) {
        let summary = '';
        let title = '';
        let lastAssistantMessage = '';
        let filePath = cand.convDir;
        let messageCount = 1;

        const entries = await fs.readdir(cand.convDir, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
          const p = path.join(cand.convDir, e.name);
          try {
            const st = await fs.stat(p);
            if (st.mtimeMs > latestMtime) latestMtime = st.mtimeMs;
            if (e.isFile() && e.name.endsWith('.metadata.json')) {
              const raw = await fs.readFile(p, 'utf8');
              const meta = JSON.parse(raw);
              if (!summary && typeof meta.summary === 'string') {
                summary = cleanText(meta.summary, 140);
              }
            } else if (e.isFile() && (e.name === 'task.md' || e.name === 'implementation_plan.md')) {
              const raw = await fs.readFile(p, 'utf8');
              const firstHeading = raw.match(/^#\s+(.+)$/m);
              if (firstHeading && !title) title = cleanText(firstHeading[1], 34);
              if (!lastAssistantMessage) lastAssistantMessage = cleanText(raw, 200);
              filePath = p;
            }
          } catch {
            continue;
          }
        }

        if (tStat && tStat.size > 40) {
          filePath = transcriptPath;
          const { tail, full } = await readHeadAndTail(transcriptPath, tStat.size, 4096, 16384);
          const objs = parseJsonLines(tail, !full, false);
          messageCount = Math.max(1, objs.length);
          for (const o of objs) {
            if (o.source === 'MODEL' && typeof o.response === 'string') {
              const cleaned = cleanText(o.response, 220);
              if (cleaned) lastAssistantMessage = cleaned;
            }
          }
        }

        const shortId = cand.convId.slice(0, 8);
        cached = {
          mtimeMs: latestMtime,
          size: statSize,
          parsed: {
            id: `agy-ide-${shortId}`,
            name: title ? `IDE: ${title}` : `Antigravity IDE (${shortId.slice(0, 4)})`,
            source: 'antigravity',
            summary: summary || lastAssistantMessage || 'Antigravity IDE werkruimte-sessie',
            lastUserMessage: title || 'IDE-gesprek uit breinarchief',
            lastAssistantMessage: lastAssistantMessage || 'Archiefsessie opgeslagen in Antigravity IDE.',
            currentTool: null,
            workspace: cand.convDir,
            filePath,
            updatedAt: Math.round(latestMtime),
            messageCount,
            signals: {
              hasActiveTool: false,
              awaitingAssistant: false,
              pendingApproval: false,
              lastRole: 'assistant',
            },
          },
        };
        fileCache.set(cacheKey, cached);
      }

      if (cached.parsed) results.push(cached.parsed);
    } catch {
      continue;
    }
  }

  return results;
}

// Scanner 4: Hermes (~/.hermes/sessions/sessions.json, dumps, and ~/.hermes/gateway_state.json)
async function scanHermes(homeDir, seenPaths) {
  const hermesDir = path.join(homeDir, '.hermes');
  const results = [];

  const gwPath = path.join(hermesDir, 'gateway_state.json');
  try {
    const st = await fs.stat(gwPath);
    seenPaths.add(gwPath);
    let cached = fileCache.get(gwPath);
    if (!cached || cached.mtimeMs !== st.mtimeMs || cached.size !== st.size) {
      const raw = await fs.readFile(gwPath, 'utf8');
      const gw = JSON.parse(raw);
      const gwUpdated = gw.updated_at ? Date.parse(gw.updated_at) || st.mtimeMs : st.mtimeMs;
      const isRunning = gw.gateway_state === 'running';
      const activeAgents = Number(gw.active_agents || 0);
      const hasActiveWork = Boolean(gw.active_work) || activeAgents > 0;

      let parsed = null;
      if (isRunning || hasActiveWork) {
        const workDesc =
          typeof gw.active_work === 'string'
            ? gw.active_work
            : gw.active_work && typeof gw.active_work === 'object'
              ? JSON.stringify(gw.active_work).slice(0, 120)
              : activeAgents > 0
                ? `${activeAgents} actieve Hermes-agent(en)`
                : `Gateway draait (v${gw.code_version || '?'}) — stand-by voor berichten`;

        parsed = {
          id: 'hermes-gateway',
          name: 'Hermes Gateway',
          source: 'hermes',
          summary: cleanText(workDesc, 140) || 'Hermes Gateway',
          lastUserMessage: `Profielen: ${(gw.served_profiles || ['default']).join(', ')}`,
          lastAssistantMessage: workDesc,
          currentTool: hasActiveWork ? 'hermes-gateway' : null,
          workspace: gw.hermes_home || hermesDir,
          filePath: gwPath,
          updatedAt: Math.round(gwUpdated),
          messageCount: Math.max(1, activeAgents),
          signals: {
            hasActiveTool: hasActiveWork,
            awaitingAssistant: false,
            pendingApproval: false,
            lastRole: 'assistant',
            forceIdleStatus: !hasActiveWork ? 'sleeping' : null,
          },
        };
      }
      cached = { mtimeMs: st.mtimeMs, size: st.size, parsed };
      fileCache.set(gwPath, cached);
    }
    if (cached.parsed) results.push(cached.parsed);
  } catch {
    // Missing or unreadable gateway_state.json
  }

  const sessionsPath = path.join(hermesDir, 'sessions', 'sessions.json');
  try {
    const st = await fs.stat(sessionsPath);
    seenPaths.add(sessionsPath);
    let cached = fileCache.get(sessionsPath);
    if (!cached || cached.mtimeMs !== st.mtimeMs || cached.size !== st.size) {
      const raw = await fs.readFile(sessionsPath, 'utf8');
      const data = JSON.parse(raw);
      const sessionEntries = [];
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith('_') || !val || typeof val !== 'object') continue;
        const updatedMs = Date.parse(val.updated_at || val.created_at || '') || 0;
        sessionEntries.push({ key, val, updatedMs });
      }
      sessionEntries.sort((a, b) => b.updatedMs - a.updatedMs);

      const parsedList = [];
      for (const item of sessionEntries.slice(0, 4)) {
        const { key, val, updatedMs } = item;
        const sid = String(val.session_id || key);
        const shortId = hashString(sid).toString(16).slice(0, 6);
        const platform = val.origin?.platform || key.split(':')[2] || 'local';
        const label =
          val.display_name ||
          val.title ||
          `Hermes ${titleCaseFirst(platform)} (${shortId.slice(0, 4)})`;

        parsedList.push({
          id: `hermes-${shortId}`,
          name: cleanText(label, 34) || `Hermes (${shortId.slice(0, 4)})`,
          source: 'hermes',
          summary: cleanText(val.last_message || val.summary || `Hermes ${platform}-sessie`, 140),
          lastUserMessage: cleanText(val.last_user_message || `Sessie ${sid.slice(0, 18)}`, 220),
          lastAssistantMessage: cleanText(
            val.last_assistant_message || val.last_message || 'Opgeslagen in Hermes sessie-index.',
            220
          ),
          currentTool: null,
          workspace: path.join(hermesDir, 'sessions'),
          filePath: sessionsPath,
          updatedAt: updatedMs || Date.now() - 24 * 60 * 60 * 1000,
          messageCount: Number(val.message_count || val.turn_count || 1),
          signals: {
            hasActiveTool: false,
            awaitingAssistant: false,
            pendingApproval: false,
            lastRole: 'assistant',
          },
        });
      }
      cached = { mtimeMs: st.mtimeMs, size: st.size, parsed: parsedList };
      fileCache.set(sessionsPath, cached);
    }
    if (Array.isArray(cached.parsed)) {
      results.push(...cached.parsed);
    }
  } catch {
    // Missing or invalid sessions.json
  }

  return results;
}

// Scanner 5: Gemini CLI (~/.gemini/tmp/*/logs.json)
async function scanGeminiCli(homeDir, seenPaths) {
  const root = path.join(homeDir, '.gemini', 'tmp');
  let dirs;
  try {
    dirs = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const results = [];
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const logsPath = path.join(root, dirent.name, 'logs.json');
    try {
      const st = await fs.stat(logsPath);
      if (st.size < 10) continue;
      seenPaths.add(logsPath);

      let cached = fileCache.get(logsPath);
      if (!cached || cached.mtimeMs !== st.mtimeMs || cached.size !== st.size) {
        const raw = await fs.readFile(logsPath, 'utf8');
        const arr = JSON.parse(raw);
        let parsed = null;
        if (Array.isArray(arr) && arr.length > 0) {
          let lastUser = '';
          let lastAssistant = '';
          let lastTs = st.mtimeMs;
          let lastRole = null;

          for (const entry of arr.slice(-40)) {
            if (!entry || typeof entry !== 'object') continue;
            const ts = Date.parse(entry.timestamp || entry.createdAt || '');
            if (!Number.isNaN(ts) && ts > lastTs) lastTs = ts;
            const msg = cleanText(entry.message || entry.text || entry.content || '', 260);
            if (!msg) continue;
            if (entry.type === 'user' || entry.role === 'user') {
              lastUser = msg;
              lastRole = 'user';
            } else if (entry.type === 'assistant' || entry.role === 'model' || entry.role === 'assistant') {
              lastAssistant = msg;
              lastRole = 'assistant';
            }
          }

          if (lastUser || lastAssistant) {
            const shortId = hashString(logsPath).toString(16).slice(0, 6);
            parsed = {
              id: `gemini-${shortId}`,
              name: `Gemini CLI (${dirent.name})`,
              source: 'gemini',
              summary: buildSummary({
                lastAssistantMessage: lastAssistant,
                lastUserMessage: lastUser,
                currentTool: null,
                sourceName: 'Gemini CLI',
              }),
              lastUserMessage: lastUser || 'Gemini CLI opdracht',
              lastAssistantMessage: lastAssistant || 'Geen modelantwoord vastgelegd.',
              currentTool: null,
              workspace: path.join(root, dirent.name),
              filePath: logsPath,
              updatedAt: Math.round(lastTs),
              messageCount: arr.length,
              signals: {
                hasActiveTool: false,
                awaitingAssistant: lastRole === 'user',
                pendingApproval: false,
                lastRole,
              },
            };
          }
        }
        cached = { mtimeMs: st.mtimeMs, size: st.size, parsed };
        fileCache.set(logsPath, cached);
      }
      if (cached.parsed) results.push(cached.parsed);
    } catch {
      continue;
    }
  }

  return results;
}

const STATUS_PRIORITY = {
  waiting: 0,
  working: 1,
  done: 2,
  sleeping: 3,
};

export async function scanAllRealChats(homeDir = os.homedir()) {
  const now = Date.now();
  const seenPaths = new Set();

  const [claude, agyCli, agyIde, hermes, gemini] = await Promise.all([
    scanClaudeChats(homeDir, seenPaths).catch(() => []),
    scanAntigravityCli(homeDir, seenPaths).catch(() => []),
    scanAntigravityIde(homeDir, seenPaths).catch(() => []),
    scanHermes(homeDir, seenPaths).catch(() => []),
    scanGeminiCli(homeDir, seenPaths).catch(() => []),
  ]);

  for (const key of fileCache.keys()) {
    if (!seenPaths.has(key)) {
      fileCache.delete(key);
    }
  }

  const rawAll = [...claude, ...agyCli, ...agyIde, ...hermes, ...gemini];

  const seen = new Map();
  for (const item of rawAll) {
    const existing = seen.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      seen.set(item.id, item);
    }
  }

  const agents = [];
  for (const raw of seen.values()) {
    const sig = raw.signals || {};
    const status =
      sig.forceIdleStatus ||
      classifyStatus({
        updatedAt: raw.updatedAt,
        hasActiveTool: sig.hasActiveTool,
        awaitingAssistant: sig.awaitingAssistant,
        pendingApproval: sig.pendingApproval,
        lastAssistantMessage: raw.lastAssistantMessage,
        lastRole: sig.lastRole,
        now,
      });

    agents.push({
      id: raw.id,
      name: raw.name,
      source: raw.source,
      role: pickRole(raw.id),
      status,
      statusMode: 'auto',
      statusLabel: statusToLabel(status),
      summary: raw.summary,
      lastUserMessage: raw.lastUserMessage,
      lastAssistantMessage: raw.lastAssistantMessage,
      currentTool: status === 'working' ? raw.currentTool : null,
      workspace: raw.workspace,
      filePath: raw.filePath,
      updatedAt: raw.updatedAt,
      messageCount: raw.messageCount,
      isDemo: false,
    });
  }

  agents.sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 9;
    const pb = STATUS_PRIORITY[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    return b.updatedAt - a.updatedAt;
  });

  return agents.slice(0, MAX_REAL_CHATS);
}
