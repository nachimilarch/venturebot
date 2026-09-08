import express from 'express';
import pool from '../../config/database.js';
import { apiKeyMiddleware } from '../../middleware/apiKeyAuth.js';

const router = express.Router();
router.use(apiKeyMiddleware);

function formatPhone(phone) {
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

// ─── GET /api/v1/contacts ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tenantId = req.apiTenant.tenantId;
    const limit    = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset   = Math.max(parseInt(req.query.offset) || 0,  0);
    const search   = req.query.search?.trim() || null;
    const tag      = req.query.tag?.trim()    || null;

    const params = [tenantId];
    let where = 'WHERE tenant_id = ? AND opt_out = 0';

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (tag) {
      where += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }

    const [rows] = await pool.execute(
      `SELECT id, name, phone, email, tags, notes, custom_variables, last_message_at, created_at
       FROM contacts ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ success: true, data: rows, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/contacts ────────────────────────────────────────────────────
// Upsert — if phone exists for tenant, update; otherwise create.
router.post('/', async (req, res) => {
  try {
    const tenantId = req.apiTenant.tenantId;
    const { name, phone, email, tags, notes, custom_variables } = req.body;

    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });

    const formatted = formatPhone(phone);

    const [result] = await pool.execute(
      `INSERT INTO contacts (tenant_id, name, phone, email, tags, notes, custom_variables)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name             = COALESCE(VALUES(name), name),
         email            = COALESCE(VALUES(email), email),
         tags             = COALESCE(VALUES(tags), tags),
         notes            = COALESCE(VALUES(notes), notes),
         custom_variables = COALESCE(VALUES(custom_variables), custom_variables)`,
      [tenantId, name || null, formatted, email || null,
       tags ? JSON.stringify(tags) : null,
       notes || null,
       custom_variables ? JSON.stringify(custom_variables) : null]
    );

    res.status(result.insertId ? 201 : 200).json({
      success: true,
      data: { phone: formatted, created: result.insertId > 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/contacts/:phone ──────────────────────────────────────────────
router.get('/:phone', async (req, res) => {
  try {
    const tenantId = req.apiTenant.tenantId;
    const phone    = formatPhone(req.params.phone);

    const [[contact]] = await pool.execute(
      `SELECT id, name, phone, email, tags, opt_out, notes, custom_variables,
              last_message_at, created_at
       FROM contacts WHERE tenant_id = ? AND phone = ?`,
      [tenantId, phone]
    );

    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/v1/contacts/:phone ────────────────────────────────────────────
router.patch('/:phone', async (req, res) => {
  try {
    const tenantId = req.apiTenant.tenantId;
    const phone    = formatPhone(req.params.phone);
    const { name, email, tags, notes, custom_variables } = req.body;

    const updates = [];
    const params  = [];

    if (name  !== undefined) { updates.push('name = ?');  params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (tags  !== undefined) { updates.push('tags = ?');  params.push(JSON.stringify(tags)); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (custom_variables !== undefined) { updates.push('custom_variables = ?'); params.push(JSON.stringify(custom_variables)); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });

    params.push(tenantId, phone);
    const [result] = await pool.execute(
      `UPDATE contacts SET ${updates.join(', ')} WHERE tenant_id = ? AND phone = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/v1/contacts/:phone ───────────────────────────────────────────
router.delete('/:phone', async (req, res) => {
  try {
    const tenantId = req.apiTenant.tenantId;
    const phone    = formatPhone(req.params.phone);
    const [result] = await pool.execute(
      'DELETE FROM contacts WHERE tenant_id = ? AND phone = ?',
      [tenantId, phone]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
