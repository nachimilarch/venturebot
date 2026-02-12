import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Get all leads for tenant
router.get('/', async (req, res) => {
  try {
    const [leads] = await pool.execute(
      'SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lead
router.get('/:id', async (req, res) => {
  try {
    const [leads] = await pool.execute(
      'SELECT * FROM leads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (leads.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(leads[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, status, source, property, budget, notes, assignedTo } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO leads 
       (tenant_id, name, email, phone, status, source, property, budget, notes, assigned_to) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, name, email, phone, status || 'new', source, property, budget, notes, assignedTo]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Lead created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, status, source, property, budget, notes, assignedTo, score } = req.body;
    
    await pool.execute(
      `UPDATE leads SET 
       name = ?, email = ?, phone = ?, status = ?, source = ?, 
       property = ?, budget = ?, notes = ?, assigned_to = ?, score = ?
       WHERE id = ? AND tenant_id = ?`,
      [name, email, phone, status, source, property, budget, notes, assignedTo, score, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM leads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;