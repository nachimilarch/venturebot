// services/creditAlertService.js — check and send low-credit alerts
import pool from '../config/database.js';
import { sendEmail } from './emailService.js';

// Call this after any credit deduction
export async function checkCreditAlert(tenantId) {
  try {
    // Fetch tenant balance + admin email + alert threshold setting
    const [[tenant]] = await pool.execute(
      'SELECT t.credits_balance, u.email, u.name FROM tenants t JOIN users u ON u.tenant_id = t.id AND u.role = ? WHERE t.id = ? LIMIT 1',
      ['admin', tenantId]
    );
    if (!tenant) return;

    // Get threshold from tenant_settings (default 50)
    const [[setting]] = await pool.execute(
      "SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = 'credit_alert_threshold'",
      [tenantId]
    );
    const threshold = setting ? parseInt(JSON.parse(JSON.stringify(setting.value))) : 50;

    if (tenant.credits_balance >= threshold) return;

    // Prevent duplicate alert within 24 hours
    const [[recent]] = await pool.execute(
      'SELECT id FROM credit_alerts WHERE tenant_id = ? AND alerted_at >= NOW() - INTERVAL 24 HOUR',
      [tenantId]
    );
    if (recent) return;

    // Log the alert
    await pool.execute(
      'INSERT INTO credit_alerts (tenant_id, balance) VALUES (?, ?)',
      [tenantId, tenant.credits_balance]
    );

    // Send email
    await sendEmail({
      to: tenant.email,
      subject: `⚠️ Low WhatsApp credits — ${tenant.credits_balance} remaining`,
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h2>Low Credit Alert</h2>
          <p>Hi ${tenant.name || 'there'},</p>
          <p>Your Vaartabot account has only <strong>${tenant.credits_balance} credits</strong> remaining,
             which is below your alert threshold of ${threshold}.</p>
          <p>Top up now to keep your campaigns running:</p>
          <a href="https://vaartabot.com/billing" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none">
            Add Credits →
          </a>
        </div>
      `,
      text: `Low credit alert: ${tenant.credits_balance} credits remaining. Top up at https://vaartabot.com/billing`,
    });
  } catch (err) {
    console.error('[creditAlert]', err.message);
  }
}
