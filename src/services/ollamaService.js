// services/ollamaService.js — Ollama queue + cache + DB-backed daily rate limit
import axios from 'axios';
import pool from '../config/database.js';

const OLLAMA_URL   = 'http://localhost:11434/api/chat';
const MODEL        = 'qwen2.5:1.5b';
const TIMEOUT_MS   = 150_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DAILY_LIMIT  = 1000;            // AI calls per tenant per calendar day (UTC)
const CACHE_MAX    = 300;

// ── Per-tenant serial queues — different tenants run in parallel ──────────────
// Each tenant gets its own promise chain so one slow response doesn't block others.
const tenantQueues = new Map();

function enqueue(tenantId, fn) {
  const prev = tenantQueues.get(tenantId) || Promise.resolve();
  const next = prev.then(fn).catch(() => {});
  tenantQueues.set(tenantId, next);
  // Prune resolved chains to avoid memory growth
  next.finally(() => {
    if (tenantQueues.get(tenantId) === next) tenantQueues.delete(tenantId);
  });
  return prev.then(fn);
}

// ── Response cache (in-process LRU-ish Map) ───────────────────────────────────
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  cache.delete(key);
  cache.set(key, entry); // LRU: move to end
  return entry.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, ts: Date.now() });
}

// ── In-memory daily counters with periodic DB sync ───────────────────────────
// Eliminates 3 DB round-trips per AI call down to 0 on the hot path.
// Persisted to DB every 30 s and on process exit. Loaded from DB on first access.

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// { `tenantId:metric:date` -> { count, dirty, loaded } }
const memCounters = new Map();

function counterKey(tenantId, metric) {
  return `${tenantId}:${metric}:${todayUTC()}`;
}

async function loadCounter(tenantId, metric) {
  const key = counterKey(tenantId, metric);
  if (memCounters.has(key)) return memCounters.get(key);
  const [[row]] = await pool.execute(
    'SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
    [tenantId, `${metric}:${todayUTC()}`]
  );
  const count = row ? (parseInt(row.value, 10) || 0) : 0;
  memCounters.set(key, { count, dirty: false });
  return memCounters.get(key);
}

function incrCounter(tenantId, metric, by = 1) {
  const key = counterKey(tenantId, metric);
  const entry = memCounters.get(key);
  if (entry) {
    entry.count += by;
    entry.dirty = true;
  } else {
    // Not yet loaded — set optimistically; sync will reconcile
    memCounters.set(key, { count: by, dirty: true });
  }
  return memCounters.get(key).count;
}

async function flushCounters() {
  const today = todayUTC();
  for (const [key, entry] of memCounters.entries()) {
    if (!entry.dirty) continue;
    const [tenantId, metric] = key.split(':');
    try {
      await pool.execute(
        `INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()`,
        [tenantId, `${metric}:${today}`, String(entry.count), String(entry.count)]
      );
      entry.dirty = false;
    } catch { /* ignore flush errors */ }
    // Drop counters for past days
    if (!key.endsWith(today)) memCounters.delete(key);
  }
}

// Flush every 30 s
setInterval(flushCounters, 30_000).unref();
// Flush on shutdown
process.on('exit', () => { flushCounters().catch(() => {}); });

// ── Rate limit check (in-memory, 0 DB queries on hot path) ───────────────────
async function withinLimit(tenantId) {
  const entry = await loadCounter(tenantId, 'ai_calls');
  if (entry.count >= DAILY_LIMIT) return false;
  incrCounter(tenantId, 'ai_calls', 1);
  return true;
}

function usageRemainingSync(tenantId) {
  const key = counterKey(tenantId, 'ai_calls');
  const entry = memCounters.get(key);
  return Math.max(0, DAILY_LIMIT - (entry ? entry.count : 0));
}

// ── Daily token tracking ──────────────────────────────────────────────────────
function recordDailyTokens(tenantId, tokens) {
  if (tokens > 0) incrCounter(tenantId, 'ai_tokens', tokens);
}

export async function getDailyTokensUsed(tenantId) {
  const entry = await loadCounter(tenantId, 'ai_tokens');
  return entry.count;
}

// ── Ollama HTTP call ──────────────────────────────────────────────────────────
async function callOllama(systemPrompt, userPrompt, maxTokens = 400) {
  const { data } = await axios.post(
    OLLAMA_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      stream:  false,
      options: { temperature: 0.7, num_predict: maxTokens },
    },
    { timeout: TIMEOUT_MS }
  );
  const text         = (data.message?.content || '').trim();
  const inputTokens  = data.prompt_eval_count  || 0;
  const outputTokens = data.eval_count         || 0;
  return { text, inputTokens, outputTokens };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function ollamaChat({ tenantId, feature, systemPrompt, userPrompt, maxTokens }) {
  if (!(await withinLimit(tenantId))) {
    throw Object.assign(
      new Error(`Daily AI call limit reached (${DAILY_LIMIT}/day). Resets at midnight UTC.`),
      { code: 'RATE_LIMIT' }
    );
  }

  const cacheKey = `${feature}:${userPrompt}`.slice(0, 600);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return {
      text: cached.text, inputTokens: cached.inputTokens, outputTokens: cached.outputTokens,
      cached: true, remaining: usageRemainingSync(tenantId),
    };
  }

  const { text, inputTokens, outputTokens } = await enqueue(tenantId, () => callOllama(systemPrompt, userPrompt, maxTokens));
  cacheSet(cacheKey, { text, inputTokens, outputTokens });
  recordDailyTokens(tenantId, inputTokens + outputTokens);
  return { text, inputTokens, outputTokens, cached: false, remaining: usageRemainingSync(tenantId) };
}
