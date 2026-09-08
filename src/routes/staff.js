// routes/staff.js — team member management for multi-user tenants
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();
router.use(authMiddleware);

const generateTempPassword = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase() +
  Math.random().toString(36).slice(2, 6);

// GET /api/staff — list all users in this tenant
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at ASC',
      [req.user.tenantId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/invite — create user + send welcome email (admin only)
router.post('/invite', roleMiddleware(['admin']), async (req, res) => {
  const { name, email, role = 'staff' } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const allowed = ['admin', 'staff', 'viewer'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    // Check not already a user in this tenant
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
      [email, req.user.tenantId],
    );
    if (existing.length > 0) return res.status(409).json({ error: 'User already exists in this tenant' });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.execute(
      'INSERT INTO users (tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenantId, name, email, hash, role],
    );

    await sendEmail({
      to: email,
      subject: 'You have been invited to Vaartabot',
      html: `
        <p>Hi ${name},</p>
        <p>${req.user.name} has invited you to join their Vaartabot workspace.</p>
        <p>Your temporary credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> <code>${tempPassword}</code></li>
        </ul>
        <p>Please log in at <a href="https://vaartabot.com/login">vaartabot.com/login</a> and change your password in Settings.</p>
      `,
    });

    res.json({ success: true, message: 'Invite sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id/role — change role (admin only)
router.patch('/:id/role', roleMiddleware(['admin']), async (req, res) => {
  const { role } = req.body;
  const allowed = ['admin', 'staff', 'viewer'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  // Prevent removing own admin role
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  try {
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ? AND tenant_id = ?',
      [role, req.params.id, req.user.tenantId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id — remove from tenant (admin only)
router.delete('/:id', roleMiddleware(['admin']), async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'Cannot remove yourself' });
  }
  try {
    await pool.execute(
      'DELETE FROM users WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
