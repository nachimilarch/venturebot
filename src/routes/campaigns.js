import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaigns[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, type, targetAudience, message, scheduledAt } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO campaigns 
       (tenant_id, name, type, target_audience, message, scheduled_at, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, name, type, targetAudience, message, scheduledAt, 'draft']
    );
    
    res.status(201).json({ id: result.insertId, message: 'Campaign created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const { name, type, targetAudience, message, scheduledAt, status } = req.body;
    
    await pool.execute(
      `UPDATE campaigns SET 
       name = ?, type = ?, target_audience = ?, message = ?, 
       scheduled_at = ?, status = ?
       WHERE id = ? AND tenant_id = ?`,
      [name, type, targetAudience, message, scheduledAt, status, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send campaign messages
router.post('/:id/send', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const campaign = campaigns[0];
    
    // Check tenant credits
    const [tenants] = await pool.execute(
      'SELECT credits FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );
    
    if (tenants[0].credits < 10) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }
    
    // Update campaign status
    await pool.execute(
      'UPDATE campaigns SET status = ?, messages_sent = messages_sent + 1 WHERE id = ?',
      ['active', req.params.id]
    );
    
    // Deduct credits (simplified - in production, deduct based on actual sends)
    await pool.execute(
      'UPDATE tenants SET credits = credits - 1, total_messages_sent = total_messages_sent + 1 WHERE id = ?',
      [req.user.tenantId]
    );
    
    res.json({ message: 'Campaign sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
