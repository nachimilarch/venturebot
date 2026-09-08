import crypto from 'crypto';
import pool from '../config/database.js';

// Per-key sliding-window rate limiter (in-memory)
// 200 requests per 60 seconds per key hash
const RATE_LIMIT    = 200;
const RATE_WINDOW   = 60_000;
const rateBuckets   = new Map(); // keyHash → { count, windowStart }

function checkRateLimit(keyHash) {
  const now    = Date.now();
  const bucket = rateBuckets.get(keyHash);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW) {
    rateBuckets.set(keyHash, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  bucket.count++;
  const remaining = RATE_LIMIT - bucket.count;
  return { allowed: remaining >= 0, remaining: Math.max(0, remaining) };
}

// Prevent unbounded Map growth — prune stale buckets every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [k, v] of rateBuckets) {
    if (v.windowStart < cutoff) rateBuckets.delete(k);
  }
}, 300_000);

export async function apiKeyMiddleware(req, res, next) {
  const raw = req.headers['x-api-key'];
  if (!raw) {
    return res.status(401).json({ success: false, error: 'Missing X-API-Key header' });
  }

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const { allowed, remaining } = checkRateLimit(hash);
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Max ${RATE_LIMIT} requests per minute per key.`,
    });
  }
  res.setHeader('X-RateLimit-Remaining', remaining);

  const [[row]] = await pool.execute(
    `SELECT ak.id, ak.tenant_id, t.credits_balance
     FROM api_keys ak
     JOIN tenants t ON t.id = ak.tenant_id
     WHERE ak.key_hash = ? AND ak.is_active = 1
     LIMIT 1`,
    [hash]
  );

  if (!row) {
    return res.status(401).json({ success: false, error: 'Invalid or revoked API key' });
  }

  // Update last_used async — don't block the request
  pool.execute('UPDATE api_keys SET last_used = NOW() WHERE id = ?', [row.id]).catch(() => {});

  req.apiTenant = {
    tenantId: row.tenant_id,
    creditsBalance: row.credits_balance,
    apiKeyId: row.id,
  };

  next();
}
