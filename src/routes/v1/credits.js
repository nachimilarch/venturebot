import express from 'express';
import pool from '../../config/database.js';
import { apiKeyMiddleware } from '../../middleware/apiKeyAuth.js';

const router = express.Router();
router.use(apiKeyMiddleware);

// GET /api/v1/credits/balance
router.get('/balance', async (req, res) => {
  try {
    const [[tenant]] = await pool.execute(
      'SELECT credits_balance, total_messages_sent FROM tenants WHERE id = ?',
      [req.apiTenant.tenantId]
    );
    res.json({
      success: true,
      data: {
        creditsBalance: tenant.credits_balance,
        totalMessagesSent: tenant.total_messages_sent,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/credits/packages
router.get('/packages', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Starter',    credits: 500,   price: 999,   currency: 'INR' },
      { id: 2, name: 'Basic',      credits: 2000,  price: 3499,  currency: 'INR' },
      { id: 3, name: 'Growth',     credits: 5000,  price: 8499,  currency: 'INR' },
      { id: 4, name: 'Pro',        credits: 15000, price: 23999, currency: 'INR' },
      { id: 5, name: 'Enterprise', credits: 30000, price: 44999, currency: 'INR' },
    ],
  });
});

// GET /api/v1/credits/transactions
router.get('/transactions', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const [rows] = await pool.execute(
      `SELECT id, type, amount, credits, description, status, created_at
       FROM transactions
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.apiTenant.tenantId]
    );
    res.json({ success: true, data: rows, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
