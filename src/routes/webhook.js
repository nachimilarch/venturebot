// src/routes/webhook.js
import express from 'express';
import pool from '../config/database.js';
import { processFlow } from '../services/flowEngine.js';
import { getTenantByPhoneNumberId } from '../services/whatsappConfigService.js';
import { pushToSubscribers } from '../services/webhookPushService.js';

const router = express.Router();

const TEMPLATE_PAYLOAD_MAP = {
  'Get Started': 'hi',
  'Talk to Team': 'menu_talk_team',
  'Book Appointment': 'menu_book_appt',
  'Book a Demo': 'menu_talk_team',
  'My Appointments': 'menu_my_appts',
  'Confirm ✅': 'confirm_yes',
  'Reschedule 🔄': 'menu_book_appt',
  'Book Appointment 📅': 'menu_book_appt',
  'Talk to Team 💬': 'menu_talk_team',
  'Contact Us 📞': 'menu_talk_team',
  'Contact Us': 'menu_talk_team',
  'contact us': 'menu_talk_team',
};

function normaliseTemplatePayload(payload) {
  if (!payload) return '';
  if (TEMPLATE_PAYLOAD_MAP[payload]) return TEMPLATE_PAYLOAD_MAP[payload];
  return payload.toLowerCase();
}

function extractValue(body) {
  return body?.entry?.[0]?.changes?.[0]?.value || null;
}

function extractPhoneNumberId(value) {
  return (
    value?.metadata?.phone_number_id ||
    value?.statuses?.[0]?.recipient_id ||
    null
  );
}

async function resolveTenant(phoneNumberId) {
  if (!phoneNumberId) return null;

  try {
    const tenant = await getTenantByPhoneNumberId(phoneNumberId);
    if (tenant) {
      return {
        tenantId: tenant.tenant_id,
        tenantName: tenant.tenant_name || null,
        source: 'whatsapp_config_service',
      };
    }
  } catch (err) {
    console.warn('[Webhook] getTenantByPhoneNumberId failed:', err.message);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id AS tenant_id, name AS tenant_name
       FROM tenants
       WHERE whatsapp_phone_id = ?
       LIMIT 1`,
      [phoneNumberId]
    );

    if (rows.length > 0) {
      return {
        tenantId: rows[0].tenant_id,
        tenantName: rows[0].tenant_name || null,
        source: 'tenants.whatsapp_phone_id',
      };
    }
  } catch (err) {
    console.error('[Webhook] tenants lookup failed:', err.message);
  }

  return null;
}

// GET /api/whatsapp/webhook
router.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[Webhook:GET] Verification attempt', {
    mode,
    tokenPresent: !!token,
    challengePresent: !!challenge,
  });

  if (mode !== 'subscribe') {
    console.warn('[Webhook:GET] Rejected: mode is not subscribe');
    return res.sendStatus(403);
  }

  if (!token || !challenge) {
    console.warn('[Webhook:GET] Rejected: missing token or challenge');
    return res.sendStatus(400);
  }

  try {
    try {
      const [configRows] = await pool.execute(
        `SELECT tenant_id
         FROM whatsapp_config
         WHERE verify_token = ? AND is_active = 1
         LIMIT 1`,
        [token]
      );

      if (configRows.length > 0) {
        console.log(`[Webhook:GET] Verified via whatsapp_config for tenant ${configRows[0].tenant_id}`);
        return res.status(200).send(challenge);
      }
    } catch (err) {
      console.warn('[Webhook:GET] whatsapp_config lookup failed:', err.message);
    }

    try {
      const [tenantRows] = await pool.execute(
        `SELECT id AS tenant_id
         FROM tenants
         WHERE verify_token = ?
         LIMIT 1`,
        [token]
      );

      if (tenantRows.length > 0) {
        console.log(`[Webhook:GET] Verified via tenants.verify_token for tenant ${tenantRows[0].tenant_id}`);
        return res.status(200).send(challenge);
      }
    } catch (err) {
      console.warn('[Webhook:GET] tenants.verify_token lookup failed:', err.message);
    }

    if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.warn('[Webhook:GET] Verified via env fallback');
      return res.status(200).send(challenge);
    }

    console.error('[Webhook:GET] Verification failed: no matching token');
    return res.sendStatus(403);
  } catch (err) {
    console.error('[Webhook:GET] Unexpected error:', err.message);
    return res.sendStatus(500);
  }
});

// POST /api/whatsapp/webhook
router.post('/webhook', express.json({ limit: '2mb' }), async (req, res) => {
  res.sendStatus(200);

  try {
    console.log('[Webhook:POST] RAW BODY:', JSON.stringify(req.body, null, 2));

    const body = req.body;
    const value = extractValue(body);

    if (!value) {
      console.log('[Webhook:POST] No value object found; ignoring payload');
      return;
    }

    const phoneNumberId = value?.metadata?.phone_number_id || null;
    let tenantInfo = null;

    if (phoneNumberId) {
      tenantInfo = await resolveTenant(phoneNumberId);
    }

    if (!tenantInfo && value?.statuses?.length) {
      console.warn(
        '[Webhook:POST] Status payload received but tenant could not be resolved from metadata.phone_number_id',
        JSON.stringify(value.statuses[0], null, 2)
      );
    }

    if (!tenantInfo && !value?.messages?.length && !value?.statuses?.length) {
      console.log(
        `[Webhook:POST] Non-message payload ignored. Keys: ${Object.keys(value).join(', ')}`
      );
      return;
    }

    if (!tenantInfo) {
      console.error(
        '[Webhook:POST] No tenant resolved; dropping payload. BODY:',
        JSON.stringify(req.body, null, 2)
      );
      return;
    }

    const { tenantId, tenantName, source } = tenantInfo;

    console.log(
      `[Webhook:POST] Routed to tenant ${tenantId} (${tenantName || 'unknown'}) via ${source}` +
      (phoneNumberId ? ` | phone_number_id: ${phoneNumberId}` : '')
    );

    if (value?.statuses?.length) {
      await handleStatusUpdate(value.statuses[0], tenantId);
      return;
    }

    if (!value?.messages?.length) {
      console.log(`[Webhook:POST] No messages present for tenant ${tenantId}; ignoring`);
      return;
    }

    const message = value.messages[0];
    const from = message.from;

    const inboundText =
      message.text?.body ||
      message.button?.payload ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      message.image?.caption ||
      message.document?.caption ||
      `[${message.type}]`;

    // Extract media metadata for image/document messages
    const mediaId       = message.image?.id || message.document?.id || null;
    const mediaType     = message.image?.mime_type || message.document?.mime_type || null;
    const mediaCaption  = message.image?.caption || message.document?.caption || null;
    const mediaFilename = message.document?.filename || null;

    try {
      await pool.execute(
        `INSERT INTO message_logs
          (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id,
           media_id, media_type, media_caption, media_filename)
         VALUES (?, NULL, ?, ?, 'received', 'inbound', NOW(), ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = 'received'`,
        [tenantId, from, inboundText, message.id,
         mediaId, mediaType, mediaCaption, mediaFilename]
      );
    } catch (err) {
      // Fallback: insert without media columns (pre-migration compatibility)
      try {
        await pool.execute(
          `INSERT INTO message_logs
            (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id)
           VALUES (?, NULL, ?, ?, 'received', 'inbound', NOW(), ?)
           ON DUPLICATE KEY UPDATE status = 'received'`,
          [tenantId, from, inboundText, message.id]
        );
      } catch (err2) {
        console.error('[Webhook:POST] message_logs insert failed:', err2.message);
      }
    }

    // Upsert contact + update last_message_at (fire-and-forget)
    pool.execute(
      `INSERT INTO contacts (tenant_id, phone, last_message_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_message_at = NOW()`,
      [tenantId, from]
    ).catch(() => {});

    // Opt-out detection — mark contact if they send STOP / UNSUBSCRIBE / OPTOUT
    const stopWords = ['stop', 'unsubscribe', 'optout', 'opt out', 'opt-out'];
    if (stopWords.includes(inboundText.toLowerCase().trim())) {
      pool.execute(
        'UPDATE contacts SET opt_out = 1, opt_out_at = NOW() WHERE tenant_id = ? AND phone = ?',
        [tenantId, from]
      ).catch(() => {});
      console.log(`[Webhook:POST] Opt-out recorded for ${from} on tenant ${tenantId}`);
    }

    // Push to any registered CRM webhook subscriptions (fire-and-forget)
    pushToSubscribers(tenantId, 'message.received', {
      message_id:   message.id,
      from,
      type:         message.type,
      text:         inboundText,
      received_at:  new Date().toISOString(),
    });

    let userInput = '';

    switch (message.type) {
      case 'text':
        userInput = message.text?.body?.trim() ?? '';
        break;

      case 'interactive':
        userInput =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          '';
        break;

      case 'button':
        userInput = normaliseTemplatePayload(message.button?.payload?.trim() ?? '');
        console.log(
          `[Webhook:POST] Template button payload "${message.button?.payload}" -> "${userInput}"`
        );
        break;

      case 'image':
        userInput = '__image__';
        break;

      case 'document':
        userInput = '__document__';
        break;

      case 'audio':
        userInput = '__audio__';
        break;

      case 'video':
        userInput = '__video__';
        break;

      case 'location':
        userInput = message.location
          ? `__location__:${message.location.latitude},${message.location.longitude}`
          : '__location__';
        break;

      default:
        console.log(`[Webhook:POST] Unhandled message type "${message.type}" from ${from}`);
        return;
    }

    if (!userInput) {
      console.log(`[Webhook:POST] Empty userInput after normalization for type "${message.type}"`);
      return;
    }

    console.log(
      `[Webhook:POST] tenant:${tenantId} from:${from} type:${message.type} input:"${userInput}"`
    );

    await processFlow(tenantId, from, userInput, message);
  } catch (err) {
    console.error('[Webhook:POST] Unhandled post-ACK error:', err.message);
    console.error(err.stack);
  }
});

async function handleStatusUpdate(status, tenantId) {
  console.log('[Webhook:Status] FULL STATUS:', JSON.stringify(status, null, 2));

  const wamid = status.id;
  const newStatus = status.status;

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(newStatus)) {
    console.log(`[Webhook:Status] Unknown status "${newStatus}" for wamid ${wamid}; ignoring`);
    return;
  }

  try {
    const [result] = await pool.execute(
      `UPDATE message_logs
       SET status = ?
       WHERE message_id = ?
         AND tenant_id = ?`,
      [newStatus, wamid, tenantId]
    );

    if (result.affectedRows === 0) {
      console.warn(
        `[Webhook:Status] No message_logs row found for wamid ${wamid} and tenant ${tenantId}`
      );
    } else {
      console.log(`[Webhook:Status] Updated ${wamid} -> ${newStatus} for tenant ${tenantId}`);
    }
  } catch (err) {
    console.error(`[Webhook:Status] DB update failed for wamid ${wamid}:`, err.message);
  }

  if (newStatus === 'failed' && status.errors?.length) {
    const firstError = status.errors[0];
    console.error(
      `[Webhook:Status] FAILED wamid:${wamid} tenant:${tenantId}` +
      ` code:${firstError.code}` +
      ` title:${firstError.title}` +
      ` details:${firstError.error_data?.details ?? 'none'}`
    );
  }
}

export default router;