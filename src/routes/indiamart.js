// src/routes/indiamart.js — IndiaMart Lead Manager API integration
import express from 'express';
import axios from 'axios';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';

const router = express.Router();
router.use(authMiddleware);

const INDIAMART_API = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';

async function getSetting(tenantId, key) {
  const [[row]] = await pool.execute(
    'SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
    [tenantId, key]
  );
  return row ? row.value : null;
}

async function saveSetting(tenantId, key, value) {
  await pool.execute(
    `INSERT INTO tenant_settings (tenant_id, setting_key, value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
    [tenantId, key, JSON.stringify(value)]
  );
}

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return row || null;
}

// ─── GET /api/indiamart/config ─────────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const apiKey = await getSetting(req.user.tenantId, 'indiamart_api_key');
    res.json({ success: true, configured: !!apiKey, api_key_hint: apiKey ? `${String(apiKey).slice(0, 4)}****` : null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/indiamart/config ─────────────────────────────────────────────────
router.put('/config', async (req, res) => {
  try {
    const { api_key } = req.body;
    if (!api_key?.trim()) return res.status(400).json({ success: false, error: 'api_key is required' });
    await saveSetting(req.user.tenantId, 'indiamart_api_key', api_key.trim());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/indiamart/leads ──────────────────────────────────────────────────
// Fetches raw leads from IndiaMart API. Query params: start_time, end_time (YYYY-MM-DD HH:MM:SS)
router.get('/leads', async (req, res) => {
  try {
    const apiKey = await getSetting(req.user.tenantId, 'indiamart_api_key');
    if (!apiKey) return res.status(400).json({ success: false, error: 'IndiaMart API key not configured. Go to Settings → IndiaMart.' });

    // Default: last 7 days
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fmt = d => d.toISOString().slice(0, 19).replace('T', ' ');

    const params = {
      glusr_crm_key: apiKey,
      start_time:    req.query.start_time || fmt(weekAgo),
      end_time:      req.query.end_time   || fmt(now),
    };

    const response = await axios.get(INDIAMART_API, { params, timeout: 15000 });

    // IndiaMart returns { STATUS: 1, RESPONSE: [...] } or { STATUS: 0, MESSAGE: "..." }
    const data = response.data;

    if (!data || data.STATUS === 0) {
      return res.status(422).json({
        success: false,
        error: data?.MESSAGE || 'IndiaMart API returned an error. Check your API key.',
      });
    }

    const leads = (data.RESPONSE || []).map(l => ({
      query_id:   l.UNIQUE_QUERY_ID,
      name:       l.SENDER_NAME        || '',
      company:    l.SENDER_COMPANY     || '',
      phone:      l.SENDER_MOBILE      || l.SENDER_PHONE || '',
      email:      l.SENDER_EMAIL       || '',
      product:    l.QUERY_PRODUCT_NAME || '',
      message:    l.QUERY_MESSAGE      || '',
      city:       l.SENDER_CITY        || '',
      state:      l.SENDER_STATE       || '',
      received_at: l.QUERY_TIME        || '',
    }));

    res.json({ success: true, data: leads, total: leads.length });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ success: false, error: `IndiaMart API error: ${err.response.status}` });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/indiamart/sync ──────────────────────────────────────────────────
// Saves IndiaMart leads to contacts + leads tables
// body: { leads: [...] }  (pass the array from /leads response)
router.post('/sync', async (req, res) => {
  try {
    const { leads = [] } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'leads array is required' });
    }

    const tenantId = req.user.tenantId;
    let imported = 0;
    let skipped  = 0;

    for (const lead of leads) {
      if (!lead.phone) { skipped++; continue; }

      const phone = lead.phone.replace(/[^0-9]/g, '');
      const normalizedPhone = (!phone.startsWith('91') && phone.length === 10) ? '91' + phone : phone;

      // Upsert contact
      await pool.execute(
        `INSERT INTO contacts (tenant_id, phone, name, last_message_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           name           = COALESCE(NULLIF(VALUES(name), ''), name),
           last_message_at = NOW()`,
        [tenantId, normalizedPhone, lead.name || lead.company || 'IndiaMart Lead']
      ).catch(() => {});

      // Insert into leads table if it exists
      try {
        await pool.execute(
          `INSERT IGNORE INTO leads
           (tenant_id, name, company, phone, email, source, notes, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'IndiaMart', ?, 'new', NOW())`,
          [tenantId, lead.name || '', lead.company || '', normalizedPhone,
           lead.email || '', [lead.product, lead.message, lead.city].filter(Boolean).join(' | ') || null]
        );
      } catch (_) {
        // leads table might not exist for all tenants — silently skip
      }

      imported++;
    }

    res.json({ success: true, imported, skipped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/indiamart/initiate ─────────────────────────────────────────────
// Send a WhatsApp template to one IndiaMart lead to start a conversation
// body: { phone, name, template_name, language?, variables? }
router.post('/initiate', async (req, res) => {
  try {
    const { phone, name, template_name, language = 'en', variables = [] } = req.body;
    if (!phone || !template_name) {
      return res.status(400).json({ success: false, error: 'phone and template_name are required' });
    }

    const tenantId = req.user.tenantId;
    const waConfig = await getWaConfig(tenantId);
    if (!waConfig) return res.status(400).json({ success: false, error: 'WhatsApp not configured' });

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const result = await whatsappTemplateService.sendTemplateMessage(
      cleanPhone, template_name, language, variables, waConfig
    );

    if (!result.success) return res.status(422).json({ success: false, error: result.error });

    // Log the outbound message
    await pool.execute(
      `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id)
       VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?)`,
      [tenantId, cleanPhone, `[Template: ${template_name}]`, result.messageId || null]
    ).catch(() => {});

    res.json({ success: true, messageId: result.messageId, phone: cleanPhone, name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
