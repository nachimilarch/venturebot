import crypto from 'crypto';
import axios from 'axios';
import pool from '../config/database.js';

/**
 * Push an event to all active webhook subscriptions for a tenant.
 * Fire-and-forget — never throws or blocks the caller.
 */
export async function pushToSubscribers(tenantId, event, data) {
  try {
    const [subs] = await pool.execute(
      `SELECT id, url, secret FROM webhook_subscriptions
       WHERE tenant_id = ? AND is_active = 1 AND FIND_IN_SET(?, events)`,
      [tenantId, event]
    );

    if (!subs.length) return;

    const payload = JSON.stringify({
      event,
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
      data,
    });

    for (const sub of subs) {
      const sig = 'sha256=' + crypto.createHmac('sha256', sub.secret).update(payload).digest('hex');
      deliverWithRetry(sub, payload, sig, event);
    }
  } catch (err) {
    console.error('[webhookPush] Error fetching subscriptions:', err.message);
  }
}

const MAX_ATTEMPTS = 4;
const BACKOFF_MS   = [0, 5000, 30000, 120000]; // immediate, 5s, 30s, 2min

async function deliverWithRetry(sub, payload, sig, event, attempt = 0) {
  try {
    await axios.post(sub.url, payload, {
      headers: {
        'Content-Type':          'application/json',
        'X-Vaartabot-Signature': sig,
        'X-Vaartabot-Event':     event,
      },
      timeout: 8000,
    });
    pool.execute(
      'UPDATE webhook_subscriptions SET last_triggered = NOW(), failure_count = 0 WHERE id = ?',
      [sub.id]
    ).catch(() => {});
  } catch (err) {
    const next = attempt + 1;
    pool.execute(
      'UPDATE webhook_subscriptions SET failure_count = failure_count + 1 WHERE id = ?',
      [sub.id]
    ).catch(() => {});

    if (next < MAX_ATTEMPTS) {
      console.warn(`[webhookPush] sub ${sub.id} attempt ${next} failed — retrying in ${BACKOFF_MS[next]}ms`);
      setTimeout(() => deliverWithRetry(sub, payload, sig, event, next), BACKOFF_MS[next]);
    } else {
      // Disable after 4 consecutive failures across all events (failure_count threshold)
      pool.execute(
        `UPDATE webhook_subscriptions SET is_active = 0
         WHERE id = ? AND failure_count >= 10`,
        [sub.id]
      ).catch(() => {});
      console.error(`[webhookPush] sub ${sub.id} exhausted ${MAX_ATTEMPTS} attempts — giving up`);
    }
  }
}
