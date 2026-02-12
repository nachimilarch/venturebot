import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `SELECT a.*, l.name as lead_name 
       FROM appointments a 
       LEFT JOIN leads l ON a.lead_id = l.id 
       WHERE a.tenant_id = ? 
       ORDER BY a.date DESC, a.time DESC`,
      [req.user.tenantId]
    );
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { leadId, date, time, type, property, agent, notes } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO appointments (tenant_id, lead_id, date, time, type, property, agent, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.tenantId, leadId, date, time, type, property, agent, notes, 'scheduled']
    );
    
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { date, time, type, property, agent, notes, status } = req.body;
    
    await pool.execute(
      `UPDATE appointments SET date = ?, time = ?, type = ?, property = ?, agent = ?, notes = ?, status = ?
       WHERE id = ? AND tenant_id = ?`,
      [date, time, type, property, agent, notes, status, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Appointment updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;