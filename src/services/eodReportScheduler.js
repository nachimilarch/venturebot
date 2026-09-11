// services/eodReportScheduler.js — sends a WhatsApp summary to the tenant's own number at 7 PM IST
import pool from '../config/database.js';
import whatsappTemplateService from './whatsappTemplateService.js';

const CHECK_INTERVAL = 60_000; // check every minute
const REPORT_HOUR_UTC = 13;    // 7 PM IST = 13:30 UTC
const REPORT_MIN_UTC  = 30;
const SETTING_KEY     = 'eod_report_sent';  // tracks last-sent date per tenant

function todayIST() {
  // Returns YYYY-MM-DD in IST (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function formatPhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[^0-9]/g, '');
  if (p.length === 10) p = '91' + p;
  return p || null;
}

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return row || null;
}

async function getSetting(tenantId, key) {
  const [[row]] = await pool.execute(
    'SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ?',
    [tenantId, key]
  );
  return row?.value ?? null;
}

async function setSetting(tenantId, key, value) {
  await pool.execute(
    `INSERT INTO tenant_settings (tenant_id, setting_key, value, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
    [tenantId, key, value]
  );
}

async function buildReport(tenantId) {
  const today = todayIST();
  const startOfDay = `${today} 00:00:00`;
  const endOfDay   = `${today} 23:59:59`;

  const [[msgStats]] = await pool.execute(
    `SELECT
       COUNT(CASE WHEN direction = 'inbound' THEN 1 END)  AS received,
       COUNT(CASE WHEN direction = 'outbound' THEN 1 END) AS sent,
       COUNT(CASE WHEN direction = 'outbound' AND message LIKE '[AI]%' OR source = 'ai' THEN 1 END) AS ai_sent
     FROM message_logs
     WHERE tenant_id = ? AND COALESCE(sent_at, received_at) BETWEEN ? AND ?`,
    [tenantId, startOfDay, endOfDay]
  );

  const [[newLeads]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM contacts WHERE tenant_id = ? AND created_at BETWEEN ? AND ?`,
    [tenantId, startOfDay, endOfDay]
  );

  const [[appts]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM appointments WHERE tenant_id = ? AND created_at BETWEEN ? AND ?`,
    [tenantId, startOfDay, endOfDay]
  );

  const [[aiUsage]] = await pool.execute(
    `SELECT COALESCE(SUM(total_tokens),0) AS tokens FROM ai_usage_logs WHERE tenant_id = ? AND created_at BETWEEN ? AND ?`,
    [tenantId, startOfDay, endOfDay]
  );

  return {
    date: today,
    received:  Number(msgStats?.received  || 0),
    sent:      Number(msgStats?.sent      || 0),
    newLeads:  Number(newLeads?.cnt       || 0),
    appts:     Number(appts?.cnt          || 0),
    aiTokens:  Number(aiUsage?.tokens     || 0),
  };
}

function buildMessage(tenantName, r) {
  const lines = [
    `📊 *Daily Report — ${r.date}*`,
    `Hi ${tenantName} team! Here's your WhatsApp summary for today:`,
    '',
    `💬 Messages received: *${r.received}*`,
    `📤 Messages sent: *${r.sent}*`,
    `🤖 AI auto-replies: included in sent`,
    `👤 New contacts: *${r.newLeads}*`,
    r.appts > 0 ? `📅 New appointments booked: *${r.appts}*` : null,
    `⚡ AI tokens used today: *${r.aiTokens.toLocaleString()}*`,
    '',
    `Have a great evening! 🌙`,
  ].filter(l => l !== null);
  return lines.join('\n');
}

async function runReports() {
  try {
    const [tenants] = await pool.execute(
      `SELECT t.id, t.name,
              (SELECT value FROM tenant_settings WHERE tenant_id = t.id AND setting_key = 'owner_whatsapp' LIMIT 1) AS owner_whatsapp,
              (SELECT value FROM tenant_settings WHERE tenant_id = t.id AND setting_key = 'daily_report_enabled' LIMIT 1) AS report_enabled
       FROM tenants t WHERE t.id > 0`
    );

    const today = todayIST();

    for (const tenant of tenants) {
      try {
        const enabled = tenant.report_enabled === 'true' || tenant.report_enabled === true;
        if (!enabled) continue;

        const ownerPhone = formatPhone(tenant.owner_whatsapp?.replace(/^"|"$/g, ''));
        if (!ownerPhone) continue;

        const lastSent = await getSetting(tenant.id, SETTING_KEY);
        if (lastSent === today) continue; // already sent today

        const waConfig = await getWaConfig(tenant.id);
        if (!waConfig) continue;

        const report  = await buildReport(tenant.id);
        const message = buildMessage(tenant.name, report);

        const result = await whatsappTemplateService.sendTextMessage(ownerPhone, message, waConfig);
        if (result?.success !== false) {
          await setSetting(tenant.id, SETTING_KEY, today);
          console.log(`[EOD Report] Sent to tenant ${tenant.id} (${tenant.name}) → ${ownerPhone}`);
        } else {
          console.warn(`[EOD Report] Failed for tenant ${tenant.id}:`, result?.error);
        }
      } catch (err) {
        console.error(`[EOD Report] Error for tenant ${tenant.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[EOD Report] scheduler error:', err.message);
  }
}

export function startEodReportScheduler() {
  setInterval(() => {
    const now = new Date();
    if (now.getUTCHours() === REPORT_HOUR_UTC && now.getUTCMinutes() === REPORT_MIN_UTC) {
      runReports();
    }
  }, CHECK_INTERVAL).unref();

  console.log('[EOD Report] Scheduler started — reports fire at 7:30 PM IST');
}
