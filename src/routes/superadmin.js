// src/routes/superadmin.js — fully corrected for your actual schema

import express from 'express';
import pool from '../config/database.js';
import { superAdminMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(superAdminMiddleware);

// ── Stats ──────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM tenants)                                                   AS totalTenants,
        (SELECT COALESCE(SUM(credits), 0) FROM transactions WHERE type = 'credit')      AS totalCreditsIssued,
        (SELECT COALESCE(SUM(ABS(credits)), 0) FROM transactions WHERE type = 'debit')  AS totalMessagesSent,
        (SELECT COUNT(*) FROM credit_requests WHERE status = 'pending')                 AS pendingRequests
    `);
        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('[SA:stats]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── All tenants ────────────────────────────────────────────────────────────
router.get('/tenants', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT
        t.id,
        t.name,
        t.industry,
        t.credits_balance,
        t.subscription_plan   AS plan,
        t.subscription_status AS status,
        t.created_at,
        MAX(u.email) AS email,
        MAX(u.phone) AS phone
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      GROUP BY
        t.id,
        t.name,
        t.industry,
        t.credits_balance,
        t.subscription_plan,
        t.subscription_status,
        t.created_at
      ORDER BY t.created_at DESC
    `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[SA:tenants]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Single tenant WhatsApp config ──────────────────────────────────────────
router.get('/tenants/:id/whatsapp', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT
        phone_number_id,
        business_account_id,
        access_token,
        verify_token          AS webhook_verify_token,
        display_phone_number  AS display_phone,
        IF(is_active = 1, 'active', 'inactive') AS status
      FROM whatsapp_config
      WHERE tenant_id = ?
      LIMIT 1
    `, [req.params.id]);
        res.json({ success: true, data: rows[0] || null });
    } catch (err) {
        console.error('[SA:whatsapp]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Single tenant transactions ─────────────────────────────────────────────
router.get('/tenants/:id/transactions', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT * FROM transactions
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[SA:tenant-txns]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── All transactions (across all tenants) ─────────────────────────────────
router.get('/transactions', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT * FROM transactions
      ORDER BY created_at DESC
      LIMIT 200
    `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[SA:transactions]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Update tenant status ───────────────────────────────────────────────────
router.patch('/tenants/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.execute(
            `UPDATE tenants SET subscription_status = ? WHERE id = ?`,
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[SA:tenant-status]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Disburse credits ───────────────────────────────────────────────────────
router.post('/tenants/:id/disburse', async (req, res) => {
    const { credits, amount, note } = req.body;
    const tenantId = req.params.id;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            `UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?`,
            [credits, tenantId]
        );

        await conn.execute(
            `INSERT INTO transactions
         (tenant_id, type, credits, amount, description, status, created_at)
       VALUES (?, 'credit', ?, ?, ?, 'completed', NOW())`,
            [tenantId, credits, amount ?? 0, note || `Admin credit disbursal — ₹${amount ?? 0}`]
        );

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error('[SA:disburse]', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
});

// ── All credit requests ────────────────────────────────────────────────────
router.get('/credit-requests', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT
        cr.*,
        t.name  AS tenant_name,
        u.email AS tenant_email
      FROM credit_requests cr
      JOIN tenants t ON t.id = cr.tenant_id
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      ORDER BY cr.created_at DESC
    `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[SA:credit-requests]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Approve / reject credit request ───────────────────────────────────────
router.patch('/credit-requests/:id', async (req, res) => {
    try {
        const { status, admin_note } = req.body;
        await pool.execute(
            `UPDATE credit_requests SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?`,
            [status, admin_note || null, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[SA:credit-request-patch]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;