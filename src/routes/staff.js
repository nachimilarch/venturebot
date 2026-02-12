import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all staff members
router.get('/', async (req, res) => {
  try {
    const [staff] = await pool.execute(
      'SELECT id, name, email, role, phone, status, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single staff member
router.get('/:id', async (req, res) => {
  try {
    const [staff] = await pool.execute(
      'SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    res.json(staff[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create staff member (admin only)
router.post('/', roleMiddleware(['admin', 'manager']), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (tenant_id, name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenantId, name, email, hashedPassword, role || 'agent', phone, 'active']
    );
    
    res.status(201).json({ id: result.insertId, message: 'Staff member created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update staff member
router.put('/:id', roleMiddleware(['admin', 'manager']), async (req, res) => {
  try {
    const { name, email, role, phone, status } = req.body;
    
    await pool.execute(
      'UPDATE users SET name = ?, email = ?, role = ?, phone = ?, status = ? WHERE id = ? AND tenant_id = ?',
      [name, email, role, phone, status, req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Staff member updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff member (admin only)
router.delete('/:id', roleMiddleware(['admin']), async (req, res) => {
  try {
    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    await pool.execute(
      'DELETE FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
