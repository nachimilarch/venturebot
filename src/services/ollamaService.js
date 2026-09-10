// services/ollamaService.js — Ollama queue + cache + DB-backed daily rate limit
import axios from 'axios';
import pool from '../config/database.js';

const OLLAMA_URL   = 'http://localhost:11434/api/chat';
const MODEL        = 'llama3.2:3b';
const TIMEOUT_MS   = 150_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DAILY_LIMIT  = 1000;            // AI calls per tenant per calendar day (UTC)
const CACHE_MAX    = 300;

// ── Serial queue — Ollama handles one request at a time on CPU ────────────────
let queue = Promise.resolve();
function enqueue(fn) {
  const p = queue.then(fn);
  queue = p.catch(() => {});
  return p;
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

// ── DB-backed daily counters ──────────────────────────────────────────────────
// Keys stored in tenant_settings: `ai_calls:YYYY-MM-DD` and `ai_tokens:YYYY-MM-DD`
// Values are plain integer strings. Old date rows accumulate harmlessly.

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function dbGetCounter(tenantId, metric) {
  const [[row]] = await pool.execute(
    'SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
    [tenantId, `${metric}:${todayUTC()}`]
  );
  return row ? (parseInt(row.value, 10) || 0) : 0;
}

// Atomically increments the counter by `by` and returns the new value.
async function dbIncrCounter(tenantId, metric, by = 1) {
  const key = `${metric}:${todayUTC()}`;
  await pool.execute(
    `INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       value      = CAST(CAST(value AS UNSIGNED) + ? AS CHAR),
       updated_at = NOW()`,
    [tenantId, key, String(by), by]
  );
  // Re-read so the returned value is always accurate
  return dbGetCounter(tenantId, metric);
}

// ── Rate limit check (DB-backed, survives restarts) ───────────────────────────
async function withinLimit(tenantId) {
  const count = await dbGetCounter(tenantId, 'ai_calls');
  if (count >= DAILY_LIMIT) return false;
  await dbIncrCounter(tenantId, 'ai_calls', 1);
  return true;
}

async function usageRemaining(tenantId) {
  const count = await dbGetCounter(tenantId, 'ai_calls');
  return Math.max(0, DAILY_LIMIT - count);
}

// ── Daily token tracking (DB-backed) ─────────────────────────────────────────
async function recordDailyTokens(tenantId, tokens) {
  if (tokens > 0) await dbIncrCounter(tenantId, 'ai_tokens', tokens);
}

export async function getDailyTokensUsed(tenantId) {
  return dbGetCounter(tenantId, 'ai_tokens');
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
      cached: true, remaining: await usageRemaining(tenantId),
    };
  }

  const { text, inputTokens, outputTokens } = await enqueue(() => callOllama(systemPrompt, userPrompt, maxTokens));
  cacheSet(cacheKey, { text, inputTokens, outputTokens });
  await recordDailyTokens(tenantId, inputTokens + outputTokens);
  return { text, inputTokens, outputTokens, cached: false, remaining: await usageRemaining(tenantId) };
}
