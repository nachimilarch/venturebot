import express from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseCsvBuffer } from '../services/csvService.js';

const router = express.Router();
router.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function formatPhone(phone) {
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

// ─── GET /api/contacts ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const limit    = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset   = Math.max(parseInt(req.query.offset) || 0,  0);
    const search   = req.query.search?.trim() || null;
    const tag      = req.query.tag?.trim()    || null;
    const optOut   = req.query.opt_out;

    const params = [tenantId];
    let where = 'WHERE tenant_id = ?';

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (tag) {
      where += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }
    if (optOut === '1')      { where += ' AND opt_out = 1'; }
    else if (optOut === '0') { where += ' AND opt_out = 0'; }

    const [rows] = await pool.execute(
      `SELECT id, name, phone, email, tags, opt_out, opt_out_at, notes,
              last_message_at, custom_variables, created_at
       FROM contacts ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM contacts ${where}`, params
    );

    res.json({ success: true, data: rows, total, limit, offset });
  } catch (err) {
    console.error('[contacts/list]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/contacts ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, phone, email, tags, notes, custom_variables } = req.body;

    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });

    const formatted = formatPhone(phone);

    const [[existing]] = await pool.execute(
      'SELECT id FROM contacts WHERE tenant_id = ? AND phone = ?',
      [tenantId, formatted]
    );
    if (existing) {
      return res.status(409).json({ success: false, error: 'Contact with this phone already exists', id: existing.id });
    }

    const [result] = await pool.execute(
      `INSERT INTO contacts (tenant_id, name, phone, email, tags, notes, custom_variables)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, name || null, formatted, email || null,
       tags ? JSON.stringify(tags) : null,
       notes || null,
       custom_variables ? JSON.stringify(custom_variables) : null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, phone: formatted } });
  } catch (err) {
    console.error('[contacts/create]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/contacts/import ────────────────────────────────────────────────
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!req.file) return res.status(400).json({ success: false, error: 'CSV file required (field: file)' });

    const rows = await parseCsvBuffer(req.file.buffer);
    if (!rows.length) return res.status(400).json({ success: false, error: 'No rows found in CSV' });

    let inserted = 0, skipped = 0;
    for (const row of rows) {
      if (!row.phone) { skipped++; continue; }
      const phone = formatPhone(row.phone);
      try {
        await pool.execute(
          `INSERT INTO contacts (tenant_id, name, phone, email, tags, notes, custom_variables)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name  = COALESCE(VALUES(name), name),
             email = COALESCE(VALUES(email), email)`,
          [tenantId, row.name || null, phone, row.email || null,
           row.tags ? JSON.stringify(Array.isArray(row.tags) ? row.tags : row.tags.split(',').map(t => t.trim())) : null,
           row.notes || null,
           row.custom_variables ? JSON.stringify(row.custom_variables) : null]
        );
        inserted++;
      } catch { skipped++; }
    }

    res.json({ success: true, inserted, skipped, total: rows.length });
  } catch (err) {
    console.error('[contacts/import]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/contacts/:id/thread ─────────────────────────────────────────────
router.get('/:id/thread', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const [[contact]] = await pool.execute(
      'SELECT id, name, phone FROM contacts WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const [messages] = await pool.execute(
      `SELECT id, message, status, direction, sent_at, received_at, delivered_at, read_at, message_id
       FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY COALESCE(sent_at, received_at) DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [tenantId, contact.phone]
    );

    res.json({ success: true, contact, data: messages, limit, offset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/contacts/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [[contact]] = await pool.execute(
      'SELECT * FROM contacts WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/contacts/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, email, tags, notes, opt_out, custom_variables } = req.body;

    const [[existing]] = await pool.execute(
      'SELECT id FROM contacts WHERE id = ? AND tenant_id = ?',
      [req.params.id, tenantId]
    );
    if (!existing) return res.status(404).json({ success: false, error: 'Contact not found' });

    const updates = [];
    const params  = [];

    if (name  !== undefined) { updates.push('name = ?');  params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (tags  !== undefined) { updates.push('tags = ?');  params.push(JSON.stringify(tags)); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (custom_variables !== undefined) { updates.push('custom_variables = ?'); params.push(JSON.stringify(custom_variables)); }
    if (opt_out !== undefined) {
      updates.push('opt_out = ?', 'opt_out_at = ?');
      params.push(opt_out ? 1 : 0, opt_out ? new Date() : null);
    }

    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });

    params.push(req.params.id, tenantId);
    await pool.execute(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/contacts/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM contacts WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
