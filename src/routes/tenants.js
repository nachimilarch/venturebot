// src/routes/tenants.js
import express from 'express';
import * as db from '../config/database.js';
const pool = db.default || db;
import * as authPkg from '../middleware/auth.js';

const { authMiddleware, roleMiddleware } = authPkg;

const router = express.Router();

router.use(authMiddleware);

// Get tenant information for current user
router.get('/', async (req, res) => {
  try {
    const [tenants] = await pool.execute(
      `SELECT 
         id, 
         name, 
         industry, 
         credits_balance AS credits, 
         total_messages_sent, 
         created_at 
       FROM tenants 
       WHERE id = ?`,
      [req.user.tenantId]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ success: true, data: tenants[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant information (admin only)
router.put('/', roleMiddleware(['admin']), async (req, res) => {
  try {
    const { name, industry } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    await pool.execute(
      'UPDATE tenants SET name = ?, industry = ? WHERE id = ?',
      [name.trim(), industry || null, req.user.tenantId]
    );

    res.json({ success: true, message: 'Tenant information updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tenant credits (for Billing)
router.get('/credits', async (req, res) => {
  try {
    const [tenants] = await pool.execute(
      'SELECT credits_balance AS credits FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );

    res.json({ success: true, credits: tenants[0]?.credits || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
