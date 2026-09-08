// services/ollamaService.js — Ollama queue + cache + per-tenant rate limit
import axios from 'axios';

const OLLAMA_URL   = 'http://localhost:11434/api/chat';
const MODEL        = 'llama3.2:3b';
const TIMEOUT_MS   = 90_000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DAILY_LIMIT  = 100;             // AI calls per tenant per day
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
  // Move to end (LRU)
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { value, ts: Date.now() });
}

// ── Daily rate limit (in-memory, resets on server restart — good enough) ──────
const usageMap = new Map(); // `${tenantId}:YYYY-MM-DD` → count

function withinLimit(tenantId) {
  const today = new Date().toISOString().slice(0, 10);
  const key   = `${tenantId}:${today}`;
  const count = usageMap.get(key) || 0;
  if (count >= DAILY_LIMIT) return false;
  usageMap.set(key, count + 1);
  return true;
}

function usageRemaining(tenantId) {
  const today = new Date().toISOString().slice(0, 10);
  const count = usageMap.get(`${tenantId}:${today}`) || 0;
  return Math.max(0, DAILY_LIMIT - count);
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
  return (data.message?.content || '').trim();
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function ollamaChat({ tenantId, feature, systemPrompt, userPrompt, maxTokens }) {
  if (!withinLimit(tenantId)) {
    throw Object.assign(new Error('Daily AI limit reached (100/day). Resets at midnight.'), { code: 'RATE_LIMIT' });
  }

  const cacheKey = `${feature}:${userPrompt}`.slice(0, 600);
  const cached = cacheGet(cacheKey);
  if (cached) return { text: cached, cached: true, remaining: usageRemaining(tenantId) };

  const text = await enqueue(() => callOllama(systemPrompt, userPrompt, maxTokens));
  cacheSet(cacheKey, text);
  return { text, cached: false, remaining: usageRemaining(tenantId) };
}
