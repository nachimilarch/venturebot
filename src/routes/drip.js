// routes/drip.js — drip sequence CRUD + enroll
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/drip ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [sequences] = await pool.execute(
      `SELECT s.*,
         (SELECT COUNT(*) FROM drip_steps WHERE sequence_id = s.id) AS step_count,
         (SELECT COUNT(*) FROM drip_enrollments WHERE sequence_id = s.id AND status = 'active') AS active_enrollments
       FROM drip_sequences s
       WHERE s.tenant_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: sequences });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/drip ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const [r] = await pool.execute(
      'INSERT INTO drip_sequences (tenant_id, name, description) VALUES (?, ?, ?)',
      [req.user.tenantId, name, description || null]
    );
    const seqId = r.insertId;

    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.execute(
          'INSERT INTO drip_steps (sequence_id, tenant_id, position, template_name, language, delay_hours) VALUES (?, ?, ?, ?, ?, ?)',
          [seqId, req.user.tenantId, i, s.template_name, s.language || 'en', s.delay_hours || 24]
        );
      }
    }

    res.status(201).json({ success: true, id: seqId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/drip/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [[seq]] = await pool.execute(
      'SELECT * FROM drip_sequences WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!seq) return res.status(404).json({ error: 'Not found' });

    const [steps] = await pool.execute(
      'SELECT * FROM drip_steps WHERE sequence_id = ? ORDER BY position ASC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...seq, steps } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/drip/:id ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, description, is_active, steps } = req.body;
    const [[seq]] = await pool.execute(
      'SELECT id FROM drip_sequences WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!seq) return res.status(404).json({ error: 'Not found' });

    const fields = [], vals = [];
    if (name !== undefined)       { fields.push('name = ?');        vals.push(name); }
    if (description !== undefined){ fields.push('description = ?'); vals.push(description); }
    if (is_active !== undefined)  { fields.push('is_active = ?');   vals.push(is_active ? 1 : 0); }

    if (fields.length) {
      vals.push(req.params.id, req.user.tenantId);
      await pool.execute(
        `UPDATE drip_sequences SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
        vals
      );
    }

    if (Array.isArray(steps)) {
      await pool.execute('DELETE FROM drip_steps WHERE sequence_id = ?', [req.params.id]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.execute(
          'INSERT INTO drip_steps (sequence_id, tenant_id, position, template_name, language, delay_hours) VALUES (?, ?, ?, ?, ?, ?)',
          [req.params.id, req.user.tenantId, i, s.template_name, s.language || 'en', s.delay_hours || 24]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/drip/:id ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM drip_sequences WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/drip/:id/enroll ────────────────────────────────────────────────
// Enroll one or more contacts into a drip sequence
router.post('/:id/enroll', async (req, res) => {
  try {
    const { phones } = req.body; // array of phone strings
    if (!Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ error: 'phones array is required' });
    }

    const [[seq]] = await pool.execute(
      'SELECT id, is_active FROM drip_sequences WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!seq) return res.status(404).json({ error: 'Sequence not found' });
    if (!seq.is_active) return res.status(400).json({ error: 'Sequence is not active' });

    const [[firstStep]] = await pool.execute(
      'SELECT delay_hours FROM drip_steps WHERE sequence_id = ? ORDER BY position ASC LIMIT 1',
      [req.params.id]
    );
    if (!firstStep) return res.status(400).json({ error: 'Sequence has no steps' });

    let enrolled = 0, skipped = 0;
    for (const phone of phones) {
      try {
        await pool.execute(
          `INSERT INTO drip_enrollments (tenant_id, sequence_id, contact_phone, current_step, next_send_at)
           VALUES (?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL ? HOUR))
           ON DUPLICATE KEY UPDATE status = IF(status = 'cancelled', 'active', status),
             current_step = IF(status = 'cancelled', 0, current_step),
             updated_at = NOW()`,
          [req.user.tenantId, req.params.id, phone, firstStep.delay_hours]
        );
        enrolled++;
      } catch { skipped++; }
    }

    res.json({ success: true, enrolled, skipped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/drip/:id/enrollments ────────────────────────────────────────────
router.get('/:id/enrollments', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const [rows] = await pool.execute(
      `SELECT e.*, c.name AS contact_name
       FROM drip_enrollments e
       LEFT JOIN contacts c ON c.tenant_id = e.tenant_id AND c.phone = e.contact_phone
       WHERE e.sequence_id = ? AND e.tenant_id = ?
       ORDER BY e.enrolled_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.params.id, req.user.tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/drip/enrollment/:id/cancel ────────────────────────────────────
router.patch('/enrollment/:id/cancel', async (req, res) => {
  try {
    await pool.execute(
      "UPDATE drip_enrollments SET status = 'cancelled', updated_at = NOW() WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.user.tenantId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
