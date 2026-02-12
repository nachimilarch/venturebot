import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transactions[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction (purchase credits)
router.post('/purchase', async (req, res) => {
  try {
    const { amount, credits } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create transaction record
      const [result] = await connection.execute(
        `INSERT INTO transactions (tenant_id, type, amount, credits, description, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.tenantId, 'purchase', amount, credits, `Purchase of ${credits} credits`, 'completed']
      );
      
      // Update tenant credits
      await connection.execute(
        'UPDATE tenants SET credits = credits + ? WHERE id = ?',
        [credits, req.user.tenantId]
      );
      
      await connection.commit();
      connection.release();
      
      res.status(201).json({ 
        id: result.insertId, 
        message: 'Credits purchased successfully',
        credits 
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
     } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  });

// Record usage transaction
router.post('/usage', async (req, res) => {
  try {
    const { credits, description } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO transactions (tenant_id, type, amount, credits, description, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, 'usage', 0, credits, description || 'Credit usage', 'completed']
    );
    
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

