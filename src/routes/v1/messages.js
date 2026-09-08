import express from 'express';
import pool from '../../config/database.js';
import { apiKeyMiddleware } from '../../middleware/apiKeyAuth.js';
import whatsappTemplateService from '../../services/whatsappTemplateService.js';
import { checkCreditAlert } from '../../services/creditAlertService.js';

const router = express.Router();
router.use(apiKeyMiddleware);

function formatPhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return row || null;
}

// ─── POST /api/v1/messages/send ───────────────────────────────────────────────
// Send a single WhatsApp template message. Costs 1 credit.
router.post('/send', async (req, res) => {
  try {
    const { to, templateName, language = 'en', variables = [] } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({ success: false, error: 'to and templateName are required' });
    }

    const tenantId = req.apiTenant.tenantId;

    // Re-fetch credits inside a transaction to avoid race conditions
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const [[tenant]] = await conn.execute(
        'SELECT credits_balance FROM tenants WHERE id = ? FOR UPDATE',
        [tenantId]
      );

      if (!tenant || tenant.credits_balance < 1) {
        await conn.rollback();
        conn.release();
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits. Purchase more at https://vaartabot.com/billing',
          creditsBalance: tenant?.credits_balance ?? 0,
        });
      }

      const waConfig = await getWaConfig(tenantId);
      if (!waConfig) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          success: false,
          error: 'WhatsApp not configured for this account. Connect Meta in Settings.',
        });
      }

      const phone = formatPhone(to);
      const result = await whatsappTemplateService.sendTemplateMessage(
        phone, templateName, language, variables, waConfig
      );

      if (!result.success) {
        await conn.rollback();
        conn.release();
        return res.status(422).json({ success: false, error: result.error });
      }

      // Deduct 1 credit
      await conn.execute(
        'UPDATE tenants SET credits_balance = credits_balance - 1, total_messages_sent = total_messages_sent + 1 WHERE id = ?',
        [tenantId]
      );

      // Log the message
      const [log] = await conn.execute(
        `INSERT INTO message_logs
         (tenant_id, contact_phone, message, status, direction, sent_at, message_id)
         VALUES (?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
        [tenantId, phone, `[Template: ${templateName}]`, result.messageId || null]
      );

      await conn.commit();
      conn.release();

      // Fire-and-forget credit alert check
      checkCreditAlert(tenantId).catch(() => {});

      res.json({
        success: true,
        data: {
          messageId: result.messageId,
          logId: log.insertId,
          to: phone,
          templateName,
          creditsUsed: 1,
        },
      });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error('[v1/messages/send]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/messages/bulk-send ─────────────────────────────────────────
// Send same template to multiple recipients. Each message costs 1 credit.
router.post('/bulk-send', async (req, res) => {
  try {
    const { recipients, templateName, language = 'en' } = req.body;
    // recipients: [{ to: "919876543210", variables: ["John"] }, ...]

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'recipients array is required' });
    }
    if (!templateName) {
      return res.status(400).json({ success: false, error: 'templateName is required' });
    }
    if (recipients.length > 500) {
      return res.status(400).json({ success: false, error: 'Maximum 500 recipients per request' });
    }

    const tenantId = req.apiTenant.tenantId;

    const [[tenant]] = await pool.execute(
      'SELECT credits_balance FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!tenant || tenant.credits_balance < recipients.length) {
      return res.status(402).json({
        success: false,
        error: `Insufficient credits. Need ${recipients.length}, have ${tenant?.credits_balance ?? 0}.`,
        creditsBalance: tenant?.credits_balance ?? 0,
      });
    }

    const waConfig = await getWaConfig(tenantId);
    if (!waConfig) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured for this account.',
      });
    }

    // Filter out opted-out contacts
    const phones = recipients.map(r => formatPhone(r.to));
    const placeholders = phones.map(() => '?').join(',');
    const [optedOut] = await pool.execute(
      `SELECT phone FROM contacts WHERE tenant_id = ? AND opt_out = 1 AND phone IN (${placeholders})`,
      [tenantId, ...phones]
    );
    const optedOutSet = new Set(optedOut.map(r => r.phone));

    let sentCount = 0;
    const results = [];

    for (const item of recipients) {
      const phone = formatPhone(item.to);
      if (optedOutSet.has(phone)) {
        results.push({ to: phone, status: 'skipped', reason: 'opted out' });
        continue;
      }
      try {
        const vars = Array.isArray(item.variables) ? item.variables : [];

        const result = await whatsappTemplateService.sendTemplateMessage(
          phone, templateName, language, vars, waConfig
        );

        if (result.success) {
          sentCount++;
          results.push({ to: phone, status: 'sent', messageId: result.messageId });

          await pool.execute(
            `INSERT INTO message_logs
             (tenant_id, contact_phone, message, status, direction, sent_at, message_id)
             VALUES (?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
            [tenantId, phone, `[Template: ${templateName}]`, result.messageId || null]
          );
        } else {
          results.push({ to: phone, status: 'failed', error: result.error });
        }

        // Respect Meta rate limits
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        results.push({ to: item.to, status: 'failed', error: err.message });
      }
    }

    // Deduct only for actually sent messages
    if (sentCount > 0) {
      await pool.execute(
        'UPDATE tenants SET credits_balance = credits_balance - ?, total_messages_sent = total_messages_sent + ? WHERE id = ?',
        [sentCount, sentCount, tenantId]
      );
    }

    const [[updated]] = await pool.execute('SELECT credits_balance FROM tenants WHERE id = ?', [tenantId]);

    res.json({
      success: true,
      data: {
        sent: sentCount,
        failed: recipients.length - sentCount,
        total: recipients.length,
        creditsUsed: sentCount,
        creditsRemaining: updated.credits_balance,
        results,
      },
    });
  } catch (err) {
    console.error('[v1/messages/bulk-send]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/messages/reply ─────────────────────────────────────────────
// Send a free-text reply within the 24-hour user-initiated conversation window.
// No credit cost. WhatsApp enforces the 24-hr window — calls outside it return 422.
router.post('/reply', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'to and message are required' });
    }
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message must be a non-empty string' });
    }
    if (message.length > 4096) {
      return res.status(400).json({ success: false, error: 'message exceeds the WhatsApp 4096-character limit' });
    }

    const tenantId = req.apiTenant.tenantId;

    const waConfig = await getWaConfig(tenantId);
    if (!waConfig) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured for this account. Connect Meta in Settings.',
      });
    }

    const phone = formatPhone(to);
    const result = await whatsappTemplateService.sendTextMessage(phone, message.trim(), waConfig);

    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error });
    }

    const [log] = await pool.execute(
      `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, sent_at, message_id)
       VALUES (?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
      [tenantId, phone, message.trim(), result.messageId || null]
    );

    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        logId: log.insertId,
        to: phone,
      },
    });
  } catch (err) {
    console.error('[v1/messages/reply]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/messages/status/:messageId ───────────────────────────────────
router.get('/status/:messageId', async (req, res) => {
  try {
    const [[log]] = await pool.execute(
      `SELECT id, contact_phone, status, direction, sent_at, delivered_at, read_at, message_id
       FROM message_logs
       WHERE tenant_id = ? AND message_id = ?
       LIMIT 1`,
      [req.apiTenant.tenantId, req.params.messageId]
    );

    if (!log) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/messages/logs ────────────────────────────────────────────────
// Optional query params: direction=inbound|outbound, phone=<number>, limit, offset
router.get('/logs', async (req, res) => {
  try {
    const limit     = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset    = Math.max(parseInt(req.query.offset) || 0, 0);
    const direction = ['inbound', 'outbound'].includes(req.query.direction)
      ? req.query.direction : null;
    const phone     = req.query.phone ? req.query.phone.replace(/[^0-9]/g, '') : null;

    const params = [req.apiTenant.tenantId];
    let where = 'WHERE tenant_id = ?';
    if (direction) { where += ' AND direction = ?'; params.push(direction); }
    if (phone)     { where += ' AND contact_phone = ?'; params.push(phone); }

    const [rows] = await pool.execute(
      `SELECT id, contact_phone, message, status, direction, sent_at, received_at, delivered_at, read_at, message_id
       FROM message_logs
       ${where}
       ORDER BY COALESCE(sent_at, received_at) DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ success: true, data: rows, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/messages/inbox ───────────────────────────────────────────────
// Returns only inbound messages (replies from WhatsApp users).
// Optional: phone=<number> to get conversation with a specific contact.
router.get('/inbox', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const phone  = req.query.phone ? req.query.phone.replace(/[^0-9]/g, '') : null;

    const params = [req.apiTenant.tenantId];
    let where = "WHERE tenant_id = ? AND direction = 'inbound'";
    if (phone) { where += ' AND contact_phone = ?'; params.push(phone); }

    const [rows] = await pool.execute(
      `SELECT id, contact_phone, message, status, received_at, message_id
       FROM message_logs
       ${where}
       ORDER BY COALESCE(received_at, sent_at) DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ success: true, data: rows, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
