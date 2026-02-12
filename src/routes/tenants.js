import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get tenant information
router.get('/', async (req, res) => {
  try {
    const [tenants] = await pool.execute(
      'SELECT id, name, email, logo, industry, phone, address, credits, total_messages_sent, created_at FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );
    
    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenants[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant information (admin only)
router.put('/', roleMiddleware(['admin']), async (req, res) => {
  try {
    const { name, email, logo, industry, phone, address } = req.body;
    
    await pool.execute(
      'UPDATE tenants SET name = ?, email = ?, logo = ?, industry = ?, phone = ?, address = ? WHERE id = ?',
      [name, email, logo, industry, phone, address, req.user.tenantId]
    );
    
    res.json({ message: 'Tenant information updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tenant credits
router.get('/credits', async (req, res) => {
  try {
    const [tenants] = await pool.execute(
      'SELECT credits FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );
    
    res.json({ credits: tenants[0].credits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
