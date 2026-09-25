// src/routes/public.js — Unauthenticated endpoints for the marketing website widget.
// No JWT, no API key — reachable by anyone, so kept deliberately narrow:
// only two whitelisted templates, hardcoded to tenant 4 (MILARCH TECH), rate-limited,
// with a 24h per-phone cooldown as the main defense against being used to spam numbers.
import express from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../config/database.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';

const router = express.Router();

const ALLOWED_TEMPLATES = {
  vaartabot_welcome:        { variables: 0 },
  milarch_vaartabot_promo:  { variables: 1 },
};

const DEMO_TENANT_ID = 4; // MILARCH TECH — the only tenant this public widget may send from

const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

function formatPhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

router.post('/demo-message', demoLimiter, async (req, res) => {
  try {
    const { phone, name, template } = req.body;

    if (!ALLOWED_TEMPLATES[template]) {
      return res.status(400).json({ success: false, error: 'Unknown template' });
    }

    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const needsName = ALLOWED_TEMPLATES[template].variables > 0;
    const cleanName = (name || '').trim().slice(0, 60);
    if (needsName && !cleanName) {
      return res.status(400).json({ success: false, error: 'Name is required for this message' });
    }
    const variables = needsName ? [cleanName] : [];

    // Cooldown: block re-sending to the same number within 24h, regardless of who
    // submits the form. This is the main defense against the widget being used to
    // spam arbitrary numbers.
    const [[recent]] = await pool.execute(
      `SELECT id FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ? AND direction = 'outbound'
         AND message LIKE '[Template:%'
         AND sent_at > NOW() - INTERVAL 24 HOUR
       LIMIT 1`,
      [DEMO_TENANT_ID, formattedPhone]
    );
    if (recent) {
      return res.status(429).json({
        success: false,
        error: 'This number was already messaged recently. Please try again tomorrow.',
      });
    }

    const [[tenant]] = await pool.execute(
      'SELECT credits_balance FROM tenants WHERE id = ?',
      [DEMO_TENANT_ID]
    );
    if (!tenant || tenant.credits_balance < 1) {
      return res.status(503).json({ success: false, error: 'Demo temporarily unavailable. Please try again later.' });
    }

    const [[waConfig]] = await pool.execute(
      'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
      [DEMO_TENANT_ID]
    );
    if (!waConfig) {
      return res.status(503).json({ success: false, error: 'Demo temporarily unavailable. Please try again later.' });
    }

    const result = await whatsappTemplateService.sendTemplateMessage(
      formattedPhone, template, 'en', variables, waConfig
    );

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'Could not send message. Please check the number and try again.',
      });
    }

    await pool.execute(
      'UPDATE tenants SET credits_balance = credits_balance - 1, total_messages_sent = total_messages_sent + 1 WHERE id = ?',
      [DEMO_TENANT_ID]
    );
    await pool.execute(
      `INSERT INTO message_logs (tenant_id, contact_phone, message, status, direction, sent_at, message_id)
       VALUES (?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
      [DEMO_TENANT_ID, formattedPhone, `[Template: ${template}]`, result.messageId || null]
    );

    res.json({ success: true, message: 'Message sent! Check WhatsApp.' });
  } catch (err) {
    console.error('[public/demo-message]', err.message);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

export default router;
