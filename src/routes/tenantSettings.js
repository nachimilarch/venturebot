// routes/tenantSettings.js — get/set tenant settings (business hours, credit threshold, etc.)
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/tenant-settings ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_key, value FROM tenant_settings WHERE tenant_id = ?',
      [req.user.tenantId]
    );
    const settings = {};
    for (const r of rows) {
      settings[r.setting_key] = r.value;
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/tenant-settings/:key ────────────────────────────────────────────
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const ALLOWED_KEYS = [
      'credit_alert_threshold',
      'business_hours',
      'notifications',
      'ai_autoresponder_enabled',
      'ai_system_prompt',
    ];
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ success: false, error: 'Unknown setting key' });
    }

    const value = req.body.value;
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'value is required' });
    }

    await pool.execute(
      `INSERT INTO tenant_settings (tenant_id, setting_key, value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [req.user.tenantId, key, JSON.stringify(value)]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/tenant-settings/invoice/:month ──────────────────────────────────
// Returns a simple HTML invoice for the given month (YYYY-MM)
router.get('/invoice/:month', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const month    = req.params.month; // e.g. 2026-08

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }

    const [[tenant]] = await pool.execute(
      'SELECT name, industry FROM tenants WHERE id = ?',
      [tenantId]
    );

    const [[admin]] = await pool.execute(
      "SELECT name, email FROM users WHERE tenant_id = ? AND role = 'admin' LIMIT 1",
      [tenantId]
    );

    const [transactions] = await pool.execute(
      `SELECT price AS amount, credits, package_label, created_at
       FROM credit_requests
       WHERE tenant_id = ? AND status = 'approved'
         AND DATE_FORMAT(created_at, '%Y-%m') = ?
       ORDER BY created_at ASC`,
      [tenantId, month]
    );

    const total = transactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const rows = transactions.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(t.created_at).toLocaleDateString('en-IN')}</td>
        <td>${t.package_label || 'WhatsApp Credits'} — ${t.credits} credits</td>
        <td>Online</td>
        <td style="text-align:right">₹${parseFloat(t.amount || 0).toFixed(2)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #111; max-width: 720px; margin: auto; }
  h1   { font-size: 28px; color: #6366f1; margin-bottom: 4px; }
  .meta { display: flex; justify-content: space-between; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th    { background: #6366f1; color: #fff; padding: 8px 12px; text-align: left; font-size: 13px; }
  td    { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .total { text-align: right; font-weight: bold; font-size: 15px; margin-top: 16px; }
  .footer { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { button { display: none; } }
</style>
</head><body>
<h1>Vaartabot</h1>
<p style="margin:0;color:#888">Tax Invoice</p>
<div class="meta">
  <div>
    <strong>${tenant?.name || 'Tenant'}</strong><br>
    ${admin?.name || ''}<br>
    ${admin?.email || ''}
  </div>
  <div style="text-align:right">
    <strong>Invoice Month</strong><br>${month}<br>
    <strong>Generated</strong><br>${new Date().toLocaleDateString('en-IN')}
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Method</th><th>Amount</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No transactions this month</td></tr>'}</tbody>
</table>
<div class="total">Total: ₹${total.toFixed(2)}</div>
<div class="footer">
  Vaartabot — WhatsApp Business Messaging Platform<br>
  vaartabot.com | support@vaartabot.com
</div>
<br>
<button onclick="window.print()" style="padding:8px 20px;background:#6366f1;color:#fff;border:none;border-radius:4px;cursor:pointer">Print / Save PDF</button>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
