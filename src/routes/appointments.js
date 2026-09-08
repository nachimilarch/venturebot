// routes/appointments.js
import express      from 'express';
import pool         from '../config/database.js';
import * as authPkg from '../middleware/auth.js';

const { authMiddleware } = authPkg;
const router = express.Router();
router.use(authMiddleware);

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled'];


// ── GET /api/appointments ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `SELECT
         a.id, a.lead_id, a.tenant_id, a.date, a.time,
         a.type, a.status, a.notes, a.booked_via, a.created_at,
         l.name  AS lead_name,
         l.phone AS lead_phone
       FROM appointments a
       LEFT JOIN leads l ON a.lead_id = l.id
       WHERE a.tenant_id = ?
       ORDER BY a.date DESC, a.time DESC`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: appointments });
  } catch (err) {
    console.error('[Appointments:GET]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ── POST /api/appointments ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { lead_id, new_name, new_phone, date, time, type, notes } = req.body;

  if (!date || !time || !type) {
    return res.status(400).json({
      success: false, error: 'date, time and type are required',
    });
  }

  // Must provide either an existing lead_id OR both new_name + new_phone
  if (!lead_id && !(new_name && new_phone)) {
    return res.status(400).json({
      success: false,
      error: 'Provide either lead_id or both new_name and new_phone',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let resolvedLeadId = lead_id;

    // ── Create new lead on the fly if needed ──────────────────────────────
    if (!lead_id) {
      // Check for duplicate phone under this tenant first
      const [[existing]] = await conn.execute(
        `SELECT id FROM leads WHERE tenant_id = ? AND phone = ? LIMIT 1`,
        [req.user.tenantId, new_phone]
      );

      if (existing) {
        // Re-use existing lead rather than creating a duplicate
        resolvedLeadId = existing.id;
      } else {
        const [insertResult] = await conn.execute(
          `INSERT INTO leads (tenant_id, name, phone, source, status, created_at)
           VALUES (?, ?, ?, 'manual', 'new', NOW())`,
          [req.user.tenantId, new_name.trim(), new_phone.trim()]
        );
        resolvedLeadId = insertResult.insertId;
      }
    }

    // ── Insert appointment ────────────────────────────────────────────────
    const [result] = await conn.execute(
      `INSERT INTO appointments
         (tenant_id, lead_id, date, time, type, status, notes, booked_via, created_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, 'dashboard', NOW())`,
      [req.user.tenantId, resolvedLeadId, date, time, type, notes || null]
    );

    // ── Sync lead status ──────────────────────────────────────────────────
    await conn.execute(
      `UPDATE leads SET status = 'appointment' WHERE id = ? AND tenant_id = ?`,
      [resolvedLeadId, req.user.tenantId]
    );

    await conn.commit();

    // ── Return full appointment row with lead name + phone ────────────────
    const [[newAppt]] = await pool.execute(
      `SELECT
         a.id, a.lead_id, a.date, a.time, a.type,
         a.status, a.notes, a.booked_via, a.created_at,
         l.name  AS lead_name,
         l.phone AS lead_phone
       FROM appointments a
       LEFT JOIN leads l ON a.lead_id = l.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newAppt });
  } catch (err) {
    await conn.rollback();
    console.error('[Appointments:POST]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});


// ── PATCH /api/appointments/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?`,
      [status, req.params.id, req.user.tenantId]
    );

    // Sync lead status
    if (status === 'completed') {
      await conn.execute(
        `UPDATE leads SET status = 'closed'
         WHERE id = (SELECT lead_id FROM appointments WHERE id = ? AND tenant_id = ?)
           AND tenant_id = ?`,
        [req.params.id, req.user.tenantId, req.user.tenantId]
      );
    } else if (status === 'cancelled') {
      await conn.execute(
        `UPDATE leads SET status = 'contacted'
         WHERE id = (SELECT lead_id FROM appointments WHERE id = ? AND tenant_id = ?)
           AND tenant_id = ?`,
        [req.params.id, req.user.tenantId, req.user.tenantId]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('[Appointments:PATCH]', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});


// ── PUT /api/appointments/:id ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { date, time, type, notes, status } = req.body;

  if (!date || !time || !type || !status) {
    return res.status(400).json({
      success: false, error: 'date, time, type and status are required',
    });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }

  try {
    await pool.execute(
      `UPDATE appointments
       SET date = ?, time = ?, type = ?, notes = ?, status = ?
       WHERE id = ? AND tenant_id = ?`,
      [date, time, type, notes || null, status, req.params.id, req.user.tenantId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Appointments:PUT]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;