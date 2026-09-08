// services/campaignScheduler.js — run pending scheduled campaigns
import pool from '../config/database.js';
import whatsappTemplateService from './whatsappTemplateService.js';

const CHECK_INTERVAL = 60_000; // every minute

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

async function runCampaign(campaign) {
  const { id, tenant_id, template_name, template_language, recipients, target_audience } = campaign;

  console.log(`[scheduler] starting campaign ${id} (tenant ${tenant_id})`);

  await pool.execute(
    "UPDATE campaigns SET status = 'running', updated_at = NOW() WHERE id = ?",
    [id]
  );

  const waConfig = await getWaConfig(tenant_id);
  if (!waConfig) {
    await pool.execute(
      "UPDATE campaigns SET status = 'failed', updated_at = NOW() WHERE id = ?",
      [id]
    );
    console.warn(`[scheduler] campaign ${id} failed — no WhatsApp config`);
    return;
  }

  // Resolve recipients: stored JSON array, or fall back to contacts with matching tag
  let phones = [];
  if (recipients && Array.isArray(recipients)) {
    phones = recipients;
  } else if (target_audience) {
    const [contacts] = await pool.execute(
      `SELECT phone FROM contacts
       WHERE tenant_id = ? AND opt_out = 0
         AND (JSON_CONTAINS(tags, JSON_QUOTE(?)) OR ? = 'all')`,
      [tenant_id, target_audience, target_audience]
    );
    phones = contacts.map(c => c.phone);
  }

  if (phones.length === 0) {
    await pool.execute(
      "UPDATE campaigns SET status = 'completed', updated_at = NOW() WHERE id = ?",
      [id]
    );
    return;
  }

  let sent = 0, failed = 0;
  const lang = template_language || 'en';

  // Filter opted-out
  const placeholders = phones.map(() => '?').join(',');
  const [optedOut] = await pool.execute(
    `SELECT phone FROM contacts WHERE tenant_id = ? AND opt_out = 1 AND phone IN (${placeholders})`,
    [tenant_id, ...phones]
  );
  const optedOutSet = new Set(optedOut.map(r => r.phone));

  for (const rawPhone of phones) {
    const phone = formatPhone(String(rawPhone));
    if (!phone) { failed++; continue; }
    if (optedOutSet.has(phone)) { failed++; continue; }

    try {
      const result = await whatsappTemplateService.sendTemplateMessage(
        phone, template_name, lang, [], waConfig
      );

      if (result.success) {
        sent++;
        await pool.execute(
          `INSERT INTO message_logs
           (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id)
           VALUES (?, ?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
          [tenant_id, id, phone, `[Campaign: ${template_name}]`, result.messageId || null]
        );
      } else {
        failed++;
      }

      await new Promise(r => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  // Deduct credits
  if (sent > 0) {
    await pool.execute(
      'UPDATE tenants SET credits_balance = credits_balance - ?, total_messages_sent = total_messages_sent + ? WHERE id = ?',
      [sent, sent, tenant_id]
    );
  }

  await pool.execute(
    `UPDATE campaigns
     SET status = 'completed', messages_sent = messages_sent + ?,
         messages_failed = messages_failed + ?, updated_at = NOW()
     WHERE id = ?`,
    [sent, failed, id]
  );

  console.log(`[scheduler] campaign ${id} done — sent ${sent}, failed ${failed}`);
}

export function startCampaignScheduler() {
  setInterval(async () => {
    try {
      const [due] = await pool.execute(
        `SELECT id, tenant_id, template_name, template_language, recipients, target_audience
         FROM campaigns
         WHERE status = 'pending' AND scheduled_at <= NOW() AND template_name IS NOT NULL`
      );
      for (const campaign of due) {
        runCampaign(campaign).catch(err =>
          console.error(`[scheduler] campaign ${campaign.id} error:`, err.message)
        );
      }
    } catch (err) {
      console.error('[scheduler] check error:', err.message);
    }
  }, CHECK_INTERVAL);

  console.log('[scheduler] campaign scheduler started');
}
