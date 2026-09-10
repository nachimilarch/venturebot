// services/indiamartScheduler.js
// Polls IndiaMart every 15 minutes per tenant, auto-sends WhatsApp template to new leads
import axios from 'axios';
import pool from '../config/database.js';
import whatsappTemplateService from './whatsappTemplateService.js';

const CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const INDIAMART_API  = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';
const fmt = d => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

async function getSetting(tenantId, key) {
  const [[row]] = await pool.execute(
    'SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
    [tenantId, key]
  );
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
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

async function processOneTenant(tenantId) {
  // Require: API key + auto-reply enabled + template name
  const apiKey      = await getSetting(tenantId, 'indiamart_api_key');
  const autoEnabled = await getSetting(tenantId, 'indiamart_auto_reply_enabled');
  const template    = await getSetting(tenantId, 'indiamart_auto_reply_template');

  if (!apiKey || !autoEnabled || !template) return;

  const waConfig = await getWaConfig(tenantId);
  if (!waConfig) return;

  // Use stored last-checked timestamp, default to 15 minutes ago
  const lastChecked = await getSetting(tenantId, 'indiamart_last_checked');
  const since  = lastChecked ? new Date(lastChecked) : new Date(Date.now() - 15 * 60 * 1000);
  const now    = new Date();

  let leads;
  try {
    const res = await axios.get(INDIAMART_API, {
      params: { glusr_crm_key: apiKey, start_time: fmt(since), end_time: fmt(now) },
      timeout: 15000,
    });
    if (!res.data || res.data.STATUS === 0) return;
    leads = res.data.RESPONSE || [];
  } catch {
    return; // network error — try again next tick
  }

  for (const l of leads) {
    const rawPhone = l.SENDER_MOBILE || l.SENDER_PHONE || '';
    if (!rawPhone) continue;

    const phone = rawPhone.replace(/[^0-9]/g, '');
    const normalizedPhone = (!phone.startsWith('91') && phone.length === 10) ? '91' + phone : phone;
    const name    = l.SENDER_NAME || l.SENDER_COMPANY || 'IndiaMart Lead';
    const queryId = l.UNIQUE_QUERY_ID || '';

    // Skip if we already sent to this query ID
    if (queryId) {
      const [[dup]] = await pool.execute(
        "SELECT id FROM message_logs WHERE tenant_id = ? AND contact_phone = ? AND message = ? LIMIT 1",
        [tenantId, normalizedPhone, `[IndiaMart:${queryId}]`]
      );
      if (dup) continue;
    }

    // Send WhatsApp template
    const result = await whatsappTemplateService.sendTemplateMessage(
      normalizedPhone, template, 'en', [], waConfig
    ).catch(() => ({ success: false }));

    if (result.success) {
      // Log with query ID marker to prevent duplicate sends
      await pool.execute(
        `INSERT INTO message_logs
         (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id)
         VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?)`,
        [tenantId, normalizedPhone, `[IndiaMart:${queryId}]`, result.messageId || null]
      ).catch(() => {});

      // Upsert contact
      await pool.execute(
        `INSERT INTO contacts (tenant_id, phone, name, last_message_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = COALESCE(NULLIF(VALUES(name),''), name), last_message_at = NOW()`,
        [tenantId, normalizedPhone, name]
      ).catch(() => {});

      // Insert lead record
      await pool.execute(
        `INSERT IGNORE INTO leads
         (tenant_id, name, phone, source, notes, status, created_at)
         VALUES (?, ?, ?, 'IndiaMart', ?, 'new', NOW())`,
        [tenantId, name, normalizedPhone,
         [l.QUERY_PRODUCT_NAME, l.QUERY_MESSAGE, l.SENDER_CITY].filter(Boolean).join(' | ') || null]
      ).catch(() => {});
    }
  }

  // Always advance the checkpoint, even if no leads came in
  await saveSetting(tenantId, 'indiamart_last_checked', now.toISOString());
}

async function runCycle() {
  try {
    // Find all tenants that have indiamart_auto_reply_enabled = true/1
    const [rows] = await pool.execute(
      `SELECT DISTINCT tenant_id FROM tenant_settings
       WHERE setting_key = 'indiamart_auto_reply_enabled' AND value IN ('"true"','true','1','"1"')`
    );
    for (const { tenant_id } of rows) {
      await processOneTenant(tenant_id).catch(() => {});
    }
  } catch {
    // Silently ignore DB connectivity issues; next interval will retry
  }
}

export function startIndiamartScheduler() {
  runCycle(); // run immediately on startup
  setInterval(runCycle, CHECK_INTERVAL);
}
